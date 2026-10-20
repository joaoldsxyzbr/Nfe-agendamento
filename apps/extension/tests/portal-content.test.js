import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync(new URL('../src/portal-content.js', import.meta.url), 'utf8');
describe('Portal content script invariants', () => {
    it('remains event-driven without periodic polling', () => {
        expect(source).toContain('new MutationObserver');
        expect(source).toContain("document.addEventListener('input', scheduleTick, true)");
        expect(source).toContain("document.addEventListener('change', scheduleTick, true)");
        expect(source).toContain("window.addEventListener('message', scheduleTick)");
        expect(source).toContain("window.addEventListener('focus', scheduleTick)");
        expect(source).toContain("window.addEventListener('pageshow', scheduleTick)");
        expect(source).toContain("document.addEventListener('visibilitychange'");
        expect(source).toContain('createEventDrivenScheduler(tick)');
        expect(source).not.toContain('setInterval');
    });
    it('requires a human captcha response before submitting the official consultation', () => {
        expect(source).toContain('isCaptchaResponseReady(captchaResponse.value)');
        expect(source).toContain('isOfficialConsultUrl(location.href)');
        expect(source).toContain('!isDisabled(consultButton)');
        expect(source).toContain("type: 'submitting'");
        expect(source).toContain('consultButton.click()');
        expect(source).not.toContain('hcaptcha.execute');
        expect(source).not.toContain('grecaptcha.execute');
    });
    it('arms the official download before clicking it and keeps finite deadlines', () => {
        expect(source).toContain("type: 'download_ready'");
        expect(source).toMatch(/if\s*\(!armed\?\.armed\)\s*return;/);
        expect(source).toContain('control.click()');
        expect(source).toContain('RESULT_TIMEOUT_MS');
        expect(source).toContain('DOWNLOAD_TIMEOUT_MS');
        expect(source).toContain('globalThis.setTimeout');
    });
});
