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

function portalSender(tabId: number, windowId: number) {
  return {
    url: PORTAL_URL,
    tab: {
      id: tabId,
      windowId,
      url: PORTAL_URL,
    },
  };
}

function portalXml(accessKey: string): string {
  return `<nfeProc><NFe><infNFe Id="NFe${accessKey}"></infNFe></NFe></nfeProc>`;
}

async function startToWaitingResult(fake: FakeChromeController) {
  const started = await fake.emitRuntimeMessage(
    startCommand('request-start', ACCESS_KEY_A),
    siteSender(),
  ) as any;
  let operation = fake.sessionState.get('activePortalOperation') as any;
  const sender = portalSender(operation.portalTabId, operation.portalWindowId);

  await fake.emitRuntimeMessage({ source: 'portal', type: 'ready' }, sender);
  await fake.emitRuntimeMessage({ source: 'portal', type: 'submitting' }, sender);
  await fake.emitRuntimeMessage({ source: 'portal', type: 'download_ready' }, sender);

  operation = fake.sessionState.get('activePortalOperation') as any;
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


});
