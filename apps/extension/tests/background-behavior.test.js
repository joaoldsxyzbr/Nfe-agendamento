import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeChrome, } from './fake-chrome';
const SITE_URL = 'https://nfeagendamento.joaolds.xyz.br/';
const PORTAL_URL = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const ACCESS_KEY_A = '123456ABCDEFGHIJKL00000000000000000000000000';
const ACCESS_KEY_B = '654321MNOPQRSTUVWX11111111111111111111111111';
afterEach(() => {
    vi.unstubAllGlobals();
});
async function loadBackground(options = {}) {
    vi.resetModules();
    const fake = createFakeChrome(options);
    vi.stubGlobal('chrome', fake.chrome);
    await import('../src/background');
    await fake.flush();
    return fake;
}
function siteSender(tabId = 10) {
    return {
        url: SITE_URL,
        tab: {
            id: tabId,
            url: SITE_URL,
        },
    };
}
function startCommand(requestId, accessKey) {
    return {
        source: 'site',
        command: {
            type: 'start',
            requestId,
            accessKey,
        },
    };
}
function portalSender(tabId, windowId) {
    return {
        url: PORTAL_URL,
        tab: {
            id: tabId,
            windowId,
            url: PORTAL_URL,
        },
    };
}
function portalXml(accessKey) {
    return `<nfeProc><NFe><infNFe Id="NFe${accessKey}"></infNFe></NFe></nfeProc>`;
}
async function startToWaitingResult(fake) {
    const started = await fake.emitRuntimeMessage(startCommand('request-start', ACCESS_KEY_A), siteSender());
    let operation = fake.sessionState.get('activePortalOperation');
    const sender = portalSender(operation.portalTabId, operation.portalWindowId);
    await fake.emitRuntimeMessage({ source: 'portal', type: 'ready' }, sender);
    await fake.emitRuntimeMessage({ source: 'portal', type: 'submitting' }, sender);
    await fake.emitRuntimeMessage({ source: 'portal', type: 'download_ready' }, sender);
    operation = fake.sessionState.get('activePortalOperation');
    expect(operation.state).toBe('waiting_result');
    return { started, operation };
}
function storedOperation() {
    return {
        operationId: 'operation-stored',
        accessKey: ACCESS_KEY_A,
        siteTabId: 10,
        portalTabId: 1_000,
        portalWindowId: 100,
        state: 'waiting_user',
        stateChangedAt: 1_700_000_000_000,
    };
}
describe('extension background behavior', () => {
    it('registers background listeners against the fake Chrome runtime', async () => {
        const fake = await loadBackground();
        const chromeApi = fake.chrome;
        expect(chromeApi.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
        expect(chromeApi.windows.onRemoved.addListener).toHaveBeenCalledTimes(1);
        expect(chromeApi.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1);
        expect(chromeApi.webRequest.onBeforeRequest.addListener).toHaveBeenCalledTimes(1);
    });
    it('rejects site commands from a sender outside SITE_ORIGIN', async () => {
        const fake = await loadBackground();
        const response = await fake.emitRuntimeMessage({
            source: 'site',
            command: { type: 'ping', requestId: 'request-invalid-origin' },
        }, {
            url: 'https://example.invalid/',
            tab: { id: 11, url: 'https://example.invalid/' },
        });
        expect(response).toMatchObject({
            type: 'failed',
            code: 'extension_error',
            message: 'Origem da mensagem não autorizada.',
        });
    });
    it('reuses the active operation when the same site tab retries the same access key', async () => {
        const fake = await loadBackground();
        const sender = siteSender();
        const first = await fake.emitRuntimeMessage(startCommand('request-1', ACCESS_KEY_A), sender);
        const second = await fake.emitRuntimeMessage(startCommand('request-2', ACCESS_KEY_A), sender);
        expect(first.type).toBe('started');
        expect(second.type).toBe('started');
        expect(second.operationId).toBe(first.operationId);
        expect(second.resumed).toBe(true);
        expect(fake.createdWindows).toHaveLength(1);
    });
    it('rejects another operation while one is active', async () => {
        const fake = await loadBackground();
        const [first, second] = await Promise.all([
            fake.emitRuntimeMessage(startCommand('request-1', ACCESS_KEY_A), siteSender(10)),
            fake.emitRuntimeMessage(startCommand('request-2', ACCESS_KEY_B), siteSender(20)),
        ]);
        const failed = [first, second].find((response) => response?.type === 'failed');
        const started = [first, second].find((response) => response?.type === 'started');
        expect(started?.type).toBe('started');
        expect(failed).toMatchObject({
            type: 'failed',
            code: 'portal_operation_active',
        });
        expect(fake.createdWindows).toHaveLength(1);
    });
    it('cancel clears the current operation and closes its popup', async () => {
        const fake = await loadBackground();
        const sender = siteSender();
        const started = await fake.emitRuntimeMessage(startCommand('request-start', ACCESS_KEY_A), sender);
        const operation = fake.sessionState.get('activePortalOperation');
        const response = await fake.emitRuntimeMessage({
            source: 'site',
            command: {
                type: 'cancel',
                requestId: 'request-cancel',
                operationId: started.operationId,
            },
        }, sender);
        expect(response).toMatchObject({
            type: 'cancelled',
            operationId: started.operationId,
        });
        expect(fake.sessionState.has('activePortalOperation')).toBe(false);
        expect(fake.removedWindows).toContain(operation.portalWindowId);
    });
    it('closing the Portal window cancels the active operation and notifies the site', async () => {
        const fake = await loadBackground();
        const started = await fake.emitRuntimeMessage(startCommand('request-start', ACCESS_KEY_A), siteSender());
        const operation = fake.sessionState.get('activePortalOperation');
        await fake.emitWindowRemoved(operation.portalWindowId);
        expect(fake.sessionState.has('activePortalOperation')).toBe(false);
        expect(fake.createdWindows).toHaveLength(1);
        expect(fake.sentSiteEvents).toContainEqual({
            tabId: 10,
            message: {
                source: 'background',
                event: {
                    type: 'cancelled',
                    operationId: started.operationId,
                    message: 'A janela do Portal foi fechada antes da conclusão.',
                },
            },
        });
    });
    it('keeps a valid active operation after the service worker reloads', async () => {
        const operation = storedOperation();
        const fake = await loadBackground({
            sessionState: { activePortalOperation: operation },
            windows: [{ id: operation.portalWindowId }],
            tabs: [
                { id: operation.siteTabId, url: SITE_URL },
                { id: operation.portalTabId, windowId: operation.portalWindowId, url: PORTAL_URL },
            ],
        });
        expect(fake.sessionState.get('activePortalOperation')).toEqual(operation);
        expect(fake.removedWindows).toEqual([]);
    });
    it('clears a stale stored operation whose Portal tab no longer exists', async () => {
        const operation = storedOperation();
        const fake = await loadBackground({
            sessionState: { activePortalOperation: operation },
            windows: [{ id: operation.portalWindowId }],
            tabs: [
                { id: operation.siteTabId, url: SITE_URL },
            ],
        });
        expect(fake.sessionState.has('activePortalOperation')).toBe(false);
        expect(fake.removedWindows).toContain(operation.portalWindowId);
    });
    it('claims a Portal XML download only once when duplicate requests arrive', async () => {
        const responseUrl = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx?id=test';
        const fake = await loadBackground({
            executeScriptResults: [
                [],
                [{
                        result: {
                            ok: true,
                            status: 200,
                            redirected: false,
                            url: responseUrl,
                            payload: portalXml(ACCESS_KEY_A),
                            networkError: null,
                        },
                    }],
            ],
        });
        const { operation } = await startToWaitingResult(fake);
        const details = {
            url: responseUrl,
            method: 'GET',
            initiator: 'https://www.nfe.fazenda.gov.br',
            tabId: operation.portalTabId,
        };
        await Promise.all([
            fake.emitBeforeRequest(details),
            fake.emitBeforeRequest(details),
        ]);
        await fake.waitForWindowRemoval(operation.portalWindowId);
        await fake.flush();
        const replayExecutions = fake.scriptExecutions.filter((input) => Array.isArray(input.args) && input.args.length === 2);
        const terminalEvents = fake.sentSiteEvents.filter((entry) => ['completed', 'failed', 'cancelled'].includes(entry?.message?.event?.type));
        expect(replayExecutions).toHaveLength(1);
        // A leitura volta ao MAIN world, como na versão 0.2.13 confirmada no Portal real.
        expect(replayExecutions[0].world).toBe('MAIN');
        // A confirmação oficial continua no MAIN world para interceptar só o diálogo esperado.
        expect(fake.scriptExecutions[0].world).toBe('MAIN');
        expect(terminalEvents).toHaveLength(1);
        expect(terminalEvents[0].message.event).toMatchObject({
            type: 'completed',
            operationId: operation.operationId,
        });
        expect(fake.sessionState.has('activePortalOperation')).toBe(false);
        expect(fake.removedWindows).toContain(operation.portalWindowId);
    });
    it('fails the operation when the Portal XML belongs to another access key', async () => {
        const responseUrl = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx?id=test';
        const fake = await loadBackground({
            executeScriptResults: [
                [],
                [{
                        result: {
                            ok: true,
                            status: 200,
                            redirected: false,
                            url: responseUrl,
                            payload: portalXml(ACCESS_KEY_B),
                            networkError: null,
                        },
                    }],
            ],
        });
        const { operation } = await startToWaitingResult(fake);
        await fake.emitBeforeRequest({
            url: responseUrl,
            method: 'GET',
            initiator: 'https://www.nfe.fazenda.gov.br',
            tabId: operation.portalTabId,
        });
        await fake.waitForWindowRemoval(operation.portalWindowId);
        await fake.flush();
        const failed = fake.sentSiteEvents.find((entry) => entry?.message?.event?.type === 'failed');
        expect(failed?.message?.event).toMatchObject({
            type: 'failed',
            code: 'portal_xml_invalid',
            operationId: operation.operationId,
        });
        expect(fake.sessionState.has('activePortalOperation')).toBe(false);
    });
    it.each(['portal_xml_too_large'])('closes and reports a captured XML failure: %s', async (errorCode) => {
        const responseUrl = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx?id=test';
        const fake = await loadBackground({
            executeScriptResults: [
                [],
                [{
                        result: {
                            ok: false,
                            status: 0,
                            redirected: false,
                            url: responseUrl,
                            payload: '',
                            networkError: null,
                            errorCode,
                        },
                    }],
            ],
        });
        const { operation } = await startToWaitingResult(fake);
        await fake.emitBeforeRequest({
            url: responseUrl,
            method: 'GET',
            initiator: 'https://www.nfe.fazenda.gov.br',
            tabId: operation.portalTabId,
        });
        await fake.waitForWindowRemoval(operation.portalWindowId);
        await fake.flush();
        expect(fake.sentSiteEvents).toContainEqual({
            tabId: operation.siteTabId,
            message: {
                source: 'background',
                event: expect.objectContaining({
                    type: 'failed',
                    code: errorCode,
                    operationId: operation.operationId,
                }),
            },
        });
        expect(fake.sessionState.has('activePortalOperation')).toBe(false);
    });
});
