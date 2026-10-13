import { afterEach, describe, expect, it, vi } from 'vitest';

const PORTAL_URL = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const ACCESS_KEY = '42260812345678000123550010000012341000012342';

type Signal = () => void;

async function loadPortal(options: { initialCaptcha?: string; delaySubmission?: boolean } = {}) {
  vi.resetModules();
  const documentListeners = new Map<string, Signal>();
  let notifyMutation: Signal = () => {};
  let resolveSubmission: (value: unknown) => void = () => {};
  let showDownload = false;
  const keyField = { value: '', dispatchEvent: vi.fn(), focus: vi.fn() };
  const captchaField = { value: options.initialCaptcha ?? '' };

  class Button {
    disabled = false;
    textContent = 'Consultar';
    click = vi.fn();
    getAttribute = vi.fn(() => null);
  }
  class Link {
    href = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx';
    textContent = 'Download do documento';
    click = vi.fn();
  }
  class Input {
    value = '';
  }

  const consultButton = new Button();
  const downloadLink = new Link();
  const documentRef = {
    documentElement: {},
    visibilityState: 'visible',
    addEventListener: vi.fn((type: string, listener: Signal) => documentListeners.set(type, listener)),
    querySelector: vi.fn((selector: string) => {
      if (selector.includes('txtChaveAcessoResumo')) return keyField;
      if (selector.includes('h-captcha-response')) return captchaField;
      if (selector.includes('btnConsultar')) return consultButton;
      return null;
    }),
    querySelectorAll: vi.fn(() => showDownload ? [downloadLink] : []),
  };
  const sendMessage = vi.fn(async (message: { type: string }) => {
    if (message.type === 'ready') {
      return {
        accessKey: ACCESS_KEY,
        state: 'waiting_user',
        stateChangedAt: Date.now(),
      };
    }
    if (message.type === 'submitting') {
      if (options.delaySubmission) {
        return new Promise<unknown>((resolve) => { resolveSubmission = resolve; });
      }
      return { ok: true };
    }
    if (message.type === 'download_ready') return { armed: true };
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
    constructor(callback: Signal) { notifyMutation = callback; }
    observe() {}
  });
  // Ignore long deadline timers: these tests exercise DOM events, not timeouts.
  vi.stubGlobal('setTimeout', vi.fn(() => 1));
  vi.stubGlobal('clearTimeout', vi.fn());

  await import('../src/portal-content');
  for (let attempt = 0; attempt < 15; attempt += 1) await Promise.resolve();

  return {
    sendMessage,
    keyField,
    captchaField,
    consultButton,
    downloadLink,
    notifyMutation: () => notifyMutation(),
    notifyChange: () => documentListeners.get('change')?.(),
    displayDownload: () => { showDownload = true; },
    releaseSubmission: () => resolveSubmission({ ok: true }),
    flush: async () => { for (let attempt = 0; attempt < 20; attempt += 1) await Promise.resolve(); },
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
