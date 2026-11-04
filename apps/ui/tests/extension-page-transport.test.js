import { describe, expect, it, vi } from 'vitest';
import { ExtensionPageTransport } from '../src/portal/extension-client.js';

describe('ExtensionPageTransport MV3', () => {
    it('sends commands from the internal UI with its own tab id', async () => {
        const sendMessage = vi.fn(async () => ({ type: 'ready', version: '0.3.0' }));
        const listeners = new Set();
        const api = {
            tabs: { getCurrent: vi.fn(async () => ({ id: 22 })) },
            runtime: {
                sendMessage,
                onMessage: {
                    addListener: (listener) => listeners.add(listener),
                    removeListener: (listener) => listeners.delete(listener),
                },
            },
        };
        const transport = new ExtensionPageTransport(api);
        const response = await transport.request({ type: 'ping', requestId: 't-1' });
        expect(response.type).toBe('ready');
        expect(sendMessage).toHaveBeenCalledWith({
            source: 'app',
            appTabId: 22,
            command: { type: 'ping', requestId: 't-1' },
        });
        const received = [];
        const unsubscribe = transport.subscribe((event) => received.push(event));
        for (const listener of listeners) {
            listener({ source: 'background', siteTabId: 33, event: { type: 'failed' } });
            listener({ source: 'background', siteTabId: 22, event: { type: 'completed', operationId: 'abc' } });
        }
        await Promise.resolve();
        await Promise.resolve();
        expect(received).toEqual([{ type: 'completed', operationId: 'abc' }]);
        unsubscribe();
        expect(listeners.size).toBe(0);
    });
    it('cleans up the original event even if chrome.runtime.onMessage disappears on pagehide', async () => {
        const listeners = new Set();
        const onMessage = {
            addListener: vi.fn((listener) => listeners.add(listener)),
            removeListener: vi.fn((listener) => listeners.delete(listener)),
        };
        const api = {
            tabs: { getCurrent: async () => ({ id: 22 }) },
            runtime: { onMessage },
        };
        const transport = new ExtensionPageTransport(api);
        const stop = transport.subscribe(vi.fn());
        expect(listeners.size).toBe(1);
        delete api.runtime.onMessage;
        expect(() => stop()).not.toThrow();
        expect(listeners.size).toBe(0);
        expect(onMessage.removeListener).toHaveBeenCalledTimes(1);
        expect(() => stop()).not.toThrow();
        expect(onMessage.removeListener).toHaveBeenCalledTimes(1);
    });
    it('does not reread chrome.runtime after that namespace disappears on pagehide', () => {
        const onMessage = {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        };
        const api = {
            tabs: { getCurrent: async () => ({ id: 22 }) },
            runtime: { onMessage },
        };
        const stop = new ExtensionPageTransport(api).subscribe(vi.fn());
        // Reproduz exatamente a exceção "reading 'onMessage'" do screenshot.
        delete api.runtime;
        expect(() => stop()).not.toThrow();
        expect(onMessage.removeListener).toHaveBeenCalledTimes(1);
    });
    it('does not crash while cleaning up an invalidated extension context', () => {
        const removeListener = vi.fn(() => {
            throw new Error('Extension context invalidated.');
        });
        const api = {
            tabs: { getCurrent: async () => ({ id: 22 }) },
            runtime: {
                onMessage: { addListener: vi.fn(), removeListener },
            },
        };
        const stop = new ExtensionPageTransport(api).subscribe(vi.fn());
        expect(() => stop()).not.toThrow();
        expect(removeListener).toHaveBeenCalledTimes(1);
    });
    it('keeps a stale context without onMessage from throwing during subscription', () => {
        const api = {
            tabs: { getCurrent: async () => ({ id: 22 }) },
            runtime: {},
        };
        const transport = new ExtensionPageTransport(api);
        const stop = transport.subscribe(vi.fn());
        expect(typeof stop).toBe('function');
        expect(() => stop()).not.toThrow();
    });
    it('rejects a non-tab extension page rather than impersonating another tab', async () => {
        const api = {
            tabs: { getCurrent: async () => null },
            runtime: { sendMessage: vi.fn() },
        };
        const transport = new ExtensionPageTransport(api);
        await expect(transport.request({ type: 'ping', requestId: 't-2' }))
            .rejects.toThrow('precisa estar aberto em uma janela');
        expect(api.runtime.sendMessage).not.toHaveBeenCalled();
    });
});
