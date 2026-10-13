import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const backgroundUrl = new URL('../src/background.ts', import.meta.url);
const portalContentUrl = new URL('../src/portal-content.ts', import.meta.url);
const portalFetchUrl = new URL('../src/portal-fetch.ts', import.meta.url);

describe('extension background contract', () => {
  it('uses only the Portal popup, session storage and host-scoped non-blocking webRequest', () => {
    expect(existsSync(backgroundUrl)).toBe(true);
    if (!existsSync(backgroundUrl)) return;
    const source = readFileSync(backgroundUrl, 'utf8');

    expect(source).toContain('chrome.windows.create');
    expect(source).toContain("type: 'popup'");
    expect(source).toContain('chrome.tabs.query({ windowId: portalWindowId })');
    expect(source).toContain('chrome.storage.session');
    expect(source).toContain('chrome.webRequest.onBeforeRequest');
    expect(source).toContain('chrome.storage.onChanged.addListener');
    expect(source).toContain('invalidateSupplierConfigCache');
    expect(source).toContain('fetchPortalXmlInPage');
    expect(source).toContain("world: 'MAIN'");
    const capture = readFileSync(portalFetchUrl, 'utf8');
    expect(source).toContain('func: capturePortalXmlPage');
    expect(capture).toContain("credentials: 'include'");
    expect(capture).toContain('response.body.getReader()');
    expect(capture).toContain('controller.abort()');
    expect(source).not.toContain('direct_lookup');
    expect(source).not.toContain('runDirectLookupInPage');
    expect(source).not.toContain('checkFiscalUsage');
    expect(source).not.toContain('recordFiscalAttempt');
    expect(source).not.toContain('blockFiscalUsage');
    expect(source).not.toContain('webRequestBlocking');
  });

  it('never executes or fabricates captcha tokens', () => {
    expect(existsSync(portalContentUrl)).toBe(true);
    if (!existsSync(portalContentUrl)) return;
    const source = readFileSync(portalContentUrl, 'utf8');

    expect(source).not.toContain('hcaptcha.execute');
    expect(source).not.toContain('grecaptcha.execute');
    expect(source).toContain('READY_ATTEMPTS');
    expect(source).toContain('sendReadyWithRetry');
    expect(source).toContain('MutationObserver');
    expect(source).toContain("window.addEventListener('message', scheduleTick)");
    expect(source).toContain('armResultTimeout');
    expect(source).toContain('armDownloadTimeout');
    expect(source).not.toContain('setInterval');
    expect(source).not.toContain('FALLBACK_TICK_MS');
    expect(source).toContain('h-captcha-response');
    expect(source).toContain('isOfficialConsultUrl(location.href)');
  });
});
