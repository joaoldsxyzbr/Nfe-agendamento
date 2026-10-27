import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
const root = new URL('../../../', import.meta.url);
const manifestUrl = new URL('../../extension/manifest.json', import.meta.url);
const extBuildUrl = new URL('../../extension/scripts/build.mjs', import.meta.url);
const ciUrl = new URL('../../../.github/workflows/ci.yml', import.meta.url);
describe('extension-only distribution boundaries', () => {
    it('bundles the UI workspace without a hosted website dependency', async () => {
        const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.host_permissions).toEqual(['https://www.nfe.fazenda.gov.br/*']);
        expect(manifest.content_scripts).toHaveLength(1);
        const build = await readFile(extBuildUrl, 'utf8');
        expect(build).toContain("new URL('../../ui/', import.meta.url)");
        expect(build).toContain("new URL('app.html', outdir)");
        expect(build).not.toContain("['site-bridge.js'");
    });
    it('contains no active Worker, .NET service or Cloudflare deployment configuration', async () => {
        await expect(access(new URL('wrangler.jsonc', root))).rejects.toBeDefined();
        await expect(access(new URL('worker/index.js', root))).rejects.toBeDefined();
        await expect(access(new URL('global.json', root))).rejects.toBeDefined();
    });
    it('keeps CI quality checks without any Cloudflare deploy step', async () => {
        const ci = await readFile(ciUrl, 'utf8');
        for (const required of [
            'npm ci', 'npm run test:ui', 'npm run test:extension',
            'npm run build:extension', 'npm audit --audit-level=high',
            'npm test --prefix tests/playwright',
        ])
            expect(ci).toContain(required);
        expect(ci).not.toContain('wrangler deploy');
    });
    it('preserves the required web check with real UI validation', async () => {
        const ci = await readFile(ciUrl, 'utf8');
        const webJob = ci.split(/\n(?=  [\w-]+:\n)/).find((part) => part.startsWith('  web:\n'));
        expect(webJob).toBeDefined();
        for (const command of [
            'npm run lint:ui', 'npm run format:check:ui', 'npm run test:ui',
            'npm run coverage:ui', 'npm run build:ui',
        ])
            expect(webJob).toContain(command);
    });
    it('requires Mini-IA safety checks in the extension job before distribution', async () => {
        const ci = await readFile(ciUrl, 'utf8');
        const extensionJob = ci.split(/\n(?=  [\w-]+:\n)/).find((part) => part.startsWith('  extension:\n'));
        expect(extensionJob).toBeDefined();
        for (const command of [
            'node scripts/train-mini-ai.mjs --check',
            'node scripts/evaluate-mini-ai-adversarial.mjs',
            'node --test scripts/tests/review-mini-ai-report.test.mjs',
            'npm run test:extension', 'npm run coverage:extension', 'npm run build:extension',
        ])
            expect(extensionJob).toContain(command);
    });
    it('keeps the experimental release isolated from production', async () => {
        const workflow = await readFile(new URL('../../../.github/workflows/release-extension-pilot.yml', import.meta.url), 'utf8');
        expect(workflow).toContain("github.repository == 'joaoldsxyzbr/Nfe-agendamento'");
        expect(workflow).toContain("github.ref == 'refs/heads/nfe-agendamento'");
        expect(workflow).toContain("tag='v0.3.0-pilot.3'");
        expect(workflow).toContain('--prerelease');
        expect(workflow).toContain('--latest=false');
        for (const command of [
            'npm run test:ui', 'npm run coverage:ui', 'npm run test:extension',
            'npm run coverage:extension', 'node scripts/train-mini-ai.mjs --check',
            'node scripts/evaluate-mini-ai-adversarial.mjs',
            'node --test scripts/tests/review-mini-ai-report.test.mjs',
            'npm test --prefix tests/playwright',
        ])
            expect(workflow).toContain(command);
        expect(workflow).not.toContain('wrangler deploy');
    });
});
