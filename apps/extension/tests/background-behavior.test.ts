import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFakeChrome,
  type FakeChromeController,
  type FakeChromeOptions,
} from './fake-chrome';

const SITE_URL = 'https://nfeagendamento.joaolds.xyz.br/';
const PORTAL_URL = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const ACCESS_KEY_A = '123456ABCDEFGHIJKL00000000000000000000000000';
const ACCESS_KEY_B = '654321MNOPQRSTUVWX11111111111111111111111111';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadBackground(options: FakeChromeOptions = {}): Promise<FakeChromeController> {
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

function startCommand(requestId: string, accessKey: string) {
  return {
    source: 'site',
    command: {
      type: 'start',
      requestId,
      accessKey,
    },
  };
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
    const chromeApi = fake.chrome as any;

    expect(chromeApi.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(chromeApi.windows.onRemoved.addListener).toHaveBeenCalledTimes(1);
    expect(chromeApi.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1);
    expect(chromeApi.webRequest.onBeforeRequest.addListener).toHaveBeenCalledTimes(1);
  });

  it('rejects site commands from a sender outside SITE_ORIGIN', async () => {
    const fake = await loadBackground();

    const response = await fake.emitRuntimeMessage(
      {
        source: 'site',
        command: { type: 'ping', requestId: 'request-invalid-origin' },
      },
      {
        url: 'https://example.invalid/',
        tab: { id: 11, url: 'https://example.invalid/' },
      },
    );

    expect(response).toMatchObject({
      type: 'failed',
      code: 'extension_error',
      message: 'Origem da mensagem não autorizada.',
    });
  });

  it('reuses the active operation when the same site tab retries the same access key', async () => {
    const fake = await loadBackground();
    const sender = siteSender();

    const first = await fake.emitRuntimeMessage(startCommand('request-1', ACCESS_KEY_A), sender) as any;
    const second = await fake.emitRuntimeMessage(startCommand('request-2', ACCESS_KEY_A), sender) as any;

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
    ]) as any[];

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
    const started = await fake.emitRuntimeMessage(
      startCommand('request-start', ACCESS_KEY_A),
      sender,
    ) as any;
    const operation = fake.sessionState.get('activePortalOperation') as any;

    const response = await fake.emitRuntimeMessage(
      {
        source: 'site',
        command: {
          type: 'cancel',
          requestId: 'request-cancel',
          operationId: started.operationId,
        },
      },
      sender,
    );

    expect(response).toMatchObject({
      type: 'cancelled',
      operationId: started.operationId,
    });
    expect(fake.sessionState.has('activePortalOperation')).toBe(false);
    expect(fake.removedWindows).toContain(operation.portalWindowId);
  });

  it('closing the Portal window cancels the active operation and notifies the site', async () => {
    const fake = await loadBackground();
    const started = await fake.emitRuntimeMessage(
      startCommand('request-start', ACCESS_KEY_A),
      siteSender(),
    ) as any;
    const operation = fake.sessionState.get('activePortalOperation') as any;

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
});
