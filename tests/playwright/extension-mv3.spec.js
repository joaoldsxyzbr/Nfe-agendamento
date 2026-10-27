// P5: smoke real da extensão empacotada no Chromium automatizado.
// NÃO consulta Portal oficial, não resolve captcha e não usa documentos reais.
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect, test } from '@playwright/test';

const extensionDir = fileURLToPath(new URL('../../apps/extension/dist/', import.meta.url));
const secret = 'CANARY_FISCAL_NAO_PERSISTIR_42260812345678000123550010000012341000012342';

test('extensão MV3 real: service worker, opções, diagnósticos privados e exclusão', async () => {
    const profile = await mkdtemp(join(tmpdir(), 'nfe-mv3-p5-'));
    let context;
    try {
        context = await chromium.launchPersistentContext(profile, {
            channel: 'chromium',
            headless: true,
            acceptDownloads: true,
            args: [
                '--disable-extensions-except=' + extensionDir,
                '--load-extension=' + extensionDir,
            ],
        });
        const serviceWorker = context.serviceWorkers()[0] ??
            await context.waitForEvent('serviceworker', { timeout: 15000 });
        expect(serviceWorker.url()).toMatch(/^chrome-extension:\/\/[a-z]{32}\/background\.js$/);
        const extensionId = new URL(serviceWorker.url()).host;
        const options = await context.newPage();
        const externalRequests = [];
        options.on('request', (request) => {
            if (!request.url().startsWith('chrome-extension://')) externalRequests.push(request.url());
        });
        await options.goto('chrome-extension://' + extensionId + '/options.html');
        await expect(options.getByRole('heading', { name: 'Diagnósticos da mini-IA (experimental)' })).toBeVisible();
        await expect(options.locator('#diagnostics-analyze')).toBeVisible();
        await expect(options.locator('#diagnostics-export')).toBeVisible();
        await expect(options.locator('#diagnostics-clear')).toBeVisible();

        const manifest = await options.evaluate(() => chrome.runtime.getManifest());
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.permissions).toEqual(['scripting', 'storage', 'webRequest']);
        expect(manifest.host_permissions).toEqual(['https://www.nfe.fazenda.gov.br/*']);

        const at = new Date().toISOString();
        await options.evaluate(({ at, secret }) => chrome.storage.local.set({
            unrelatedPreferences: { theme: 'dark' },
            nfeIntelligenceDiagnosticsV1: Array.from({ length: 3 }, () => ({
                at, code: 'portal_operation_failed', state: 'failed',
                failureCode: 'portal_session_lost', modelVersion: 'portal-download-trained-0.2',
                xml: '<nfeProc>' + secret + '</nfeProc>',
                accessKey: secret,
                portalUrl: 'https://example.invalid/?accessKey=' + secret,
            })),
        }), { at, secret });
        await options.locator('#diagnostics-analyze').click();
        await expect(options.locator('#diagnostics-insights')).toContainText('Falhas recorrentes no Portal: 3');

        const [download] = await Promise.all([
            options.waitForEvent('download'),
            options.locator('#diagnostics-export').click(),
        ]);
        expect(download.suggestedFilename()).toBe('nfe-intelligence-diagnosticos.json');
        const downloadedPath = await download.path();
        expect(downloadedPath).not.toBeNull();
        const exported = await readFile(downloadedPath, 'utf8');
        const parsed = JSON.parse(exported);
        expect(parsed.schemaVersion).toBe(2);
        expect(parsed.records).toHaveLength(3);
        expect(parsed.insights).toContainEqual(expect.objectContaining({
            kind: 'repeated_portal_failure', count: 3,
        }));
        expect(exported).not.toContain(secret);
        expect(exported).not.toContain('nfeProc');
        expect(exported).not.toContain('example.invalid');

        await options.locator('#diagnostics-clear').click();
        await expect(options.locator('#diagnostics-status')).toContainText('apagados');
        const retained = await options.evaluate(() => chrome.storage.local.get([
            'nfeIntelligenceDiagnosticsV1', 'unrelatedPreferences',
        ]));
        expect(retained).not.toHaveProperty('nfeIntelligenceDiagnosticsV1');
        expect(retained.unrelatedPreferences).toEqual({ theme: 'dark' });
        expect(externalRequests).toEqual([]);
    } finally {
        await context?.close();
        await rm(profile, { recursive: true, force: true });
    }
});
