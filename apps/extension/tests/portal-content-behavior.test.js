import { afterEach, describe, expect, it, vi } from 'vitest';
const PORTAL_URL = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const ACCESS_KEY = '42260812345678000123550010000012341000012342';
async function loadPortal(options = {}) {
    vi.resetModules();
    const documentListeners = new Map();
    let notifyMutation = () => { };
    let resolveSubmission = () => { };
    let showDownload = false;
    let showUnknownDownload = false;
    const keyField = { value: '', dispatchEvent: vi.fn(), focus: vi.fn() };
    const captchaField = { value: options.initialCaptcha ?? '' };
    class Button {
        tagName = 'BUTTON';
        disabled = false;
        textContent = 'Consultar';
        click = vi.fn();
        getAttribute = vi.fn(() => null);
    }
    class Link {
        tagName = 'A';
        href = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx';
        textContent = 'Download do documento';
        click = vi.fn();
    }
    class Input {
        tagName = 'INPUT';
        value = '';
    }
    const consultButton = new Button();
    const downloadLink = new Link();
    const unknownDownload = new Button();
    unknownDownload.textContent = 'Baixar XML';
    const documentRef = {
        documentElement: {},
        visibilityState: 'visible',
        addEventListener: vi.fn((type, listener) => documentListeners.set(type, listener)),
        querySelector: vi.fn((selector) => {
            if (selector.includes('txtChaveAcessoResumo'))
                return keyField;
            if (selector.includes('h-captcha-response'))
                return captchaField;
            if (selector.includes('btnConsultar'))
                return consultButton;
            return null;
        }),
        querySelectorAll: vi.fn(() => showDownload ? [downloadLink] : showUnknownDownload ? [unknownDownload] : []),
    };
    const sendMessage = vi.fn(async (message) => {
        if (message.type === 'ready') {
            return {
                accessKey: ACCESS_KEY,
                state: 'waiting_user',
                stateChangedAt: Date.now(),
            };
        }
        if (message.type === 'submitting') {
            if (options.delaySubmission) {
                return new Promise((resolve) => { resolveSubmission = resolve; });
            }
            return { ok: true };
        }
        if (message.type === 'download_ready')
            return { armed: true };
        return { handled: true };
    });
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    vi.stubGlobal('location', { origin: 'https://www.nfe.fazenda.gov.br', pathname: '/portal/consultaRecaptcha.aspx', href: PORTAL_URL });
    vi.stubGlobal('window', { addEventListener: vi.fn() });
    vi.stubGlobal('document', documentRef);
    vi.stubGlobal('HTMLButtonElement', Button);
    vi.stubGlobal('HTMLInputElement', Input);
    vi.stubGlobal('HTMLAnchorElement', Link);
    vi.stubGlobal('MutationObserver', class {
        constructor(callback) { notifyMutation = callback; }
        observe() { }
    });
    // Ignore long deadline timers: these tests exercise DOM events, not timeouts.
    vi.stubGlobal('setTimeout', vi.fn(() => 1));
    vi.stubGlobal('clearTimeout', vi.fn());
    await import('../src/portal-content');
    for (let attempt = 0; attempt < 15; attempt += 1)
        await Promise.resolve();
    return {
        sendMessage,
        keyField,
        captchaField,
        consultButton,
        downloadLink,
        unknownDownload,
        notifyMutation: () => notifyMutation(),
        notifyChange: () => documentListeners.get('change')?.(),
        displayDownload: () => { showDownload = true; },
        displayUnknownDownload: () => { showUnknownDownload = true; },
        releaseSubmission: () => resolveSubmission({ ok: true }),
        flush: async () => { for (let attempt = 0; attempt < 20; attempt += 1)
            await Promise.resolve(); },
    };
}
afterEach(() => {
    vi.unstubAllGlobals();
});
describe('real Portal content-script event handling (fake browser environment)', () => {
    it('fills the key but does not submit without a human-produced hCaptcha token', async () => {
        const portal = await loadPortal();
        expect(portal.keyField.value).toBe(ACCESS_KEY);
        expect(portal.sendMessage.mock.calls.filter(([value]) => value.type === 'submitting')).toHaveLength(0);
        portal.captchaField.value = 'human-captcha-response';
        portal.notifyChange();
        await portal.flush();
        expect(portal.sendMessage.mock.calls.filter(([value]) => value.type === 'submitting')).toHaveLength(1);
        expect(portal.consultButton.click).toHaveBeenCalledTimes(1);
    });
    it('relata candidato neural desconhecido sem clicar e sem dados fiscais', async () => {
        const portal = await loadPortal({ initialCaptcha: 'human-captcha-response' });
        portal.displayUnknownDownload();
        portal.notifyMutation();
        await portal.flush();
        const reports = portal.sendMessage.mock.calls
            .map(([message]) => message)
            .filter((message) => message.type === 'intelligence_diagnostic');
        expect(reports).toHaveLength(1);
        expect(reports[0].diagnostic).toMatchObject({
            code: 'neural_candidate_unverified',
            state: 'submitting',
        });
        expect(JSON.stringify(reports[0])).not.toContain(ACCESS_KEY);
        expect(portal.unknownDownload.click).not.toHaveBeenCalled();
        expect(portal.sendMessage.mock.calls.filter(([message]) => message.type === 'download_ready')).toHaveLength(0);
        portal.notifyMutation();
        await portal.flush();
        expect(portal.sendMessage.mock.calls.filter(([message]) => message.type === 'intelligence_diagnostic')).toHaveLength(1);
    });
    it('replays a download event arriving while submission is still awaiting background', async () => {
        const portal = await loadPortal({ initialCaptcha: 'human-captcha-response', delaySubmission: true });
        expect(portal.sendMessage.mock.calls.filter(([value]) => value.type === 'submitting')).toHaveLength(1);
        expect(portal.consultButton.click).not.toHaveBeenCalled();
        portal.displayDownload();
        portal.notifyMutation();
        portal.releaseSubmission();
        await portal.flush();
        expect(portal.consultButton.click).toHaveBeenCalledTimes(1);
        expect(portal.sendMessage.mock.calls.filter(([value]) => value.type === 'download_ready')).toHaveLength(1);
        expect(portal.downloadLink.click).toHaveBeenCalledTimes(1);
    });
});
