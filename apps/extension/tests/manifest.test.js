import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const manifestUrl = new URL('../manifest.json', import.meta.url);
describe('extension manifest', () => {
    it('uses Manifest V3 with only Portal/site hosts and required permissions', () => {
        expect(existsSync(manifestUrl)).toBe(true);
        if (!existsSync(manifestUrl))
            return;
        const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
        expect(manifest.manifest_version).toBe(3);
        expect(manifest.version).toBe('0.2.16');
        expect(Number(manifest.minimum_chrome_version)).toBeGreaterThanOrEqual(120);
        expect([...(manifest.permissions ?? [])].sort()).toEqual(['scripting', 'storage', 'webRequest']);
        expect([...(manifest.host_permissions ?? [])].sort()).toEqual([
            'https://nfeagendamento.joaolds.xyz.br/*',
            'https://www.nfe.fazenda.gov.br/*',
        ]);
        expect(JSON.stringify(manifest)).not.toContain('www1.nfe.fazenda.gov.br');
        expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
        expect(manifest.background).toEqual({ service_worker: 'background.js', type: 'module' });
        expect(manifest.options_page).toBe('options.html');
        const scripts = manifest.content_scripts ?? [];
        expect(scripts).toHaveLength(2);
        expect(scripts.map((item) => item.matches?.[0]).sort()).toEqual([
            'https://nfeagendamento.joaolds.xyz.br/*',
            'https://www.nfe.fazenda.gov.br/portal/*',
        ]);
    });
});
