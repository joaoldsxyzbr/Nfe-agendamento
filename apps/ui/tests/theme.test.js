import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const batchStyles = readFileSync(new URL('../src/batch.css', import.meta.url), 'utf8');
const danfeStyles = readFileSync(new URL('../src/danfe/styles.css', import.meta.url), 'utf8');
const lightStyles = readFileSync(new URL('../src/theme-light.css', import.meta.url), 'utf8');
const optionsHtml = readFileSync(new URL('../../extension/options.html', import.meta.url), 'utf8');

// WCAG: o texto funcional precisa de contraste mínimo de 4,5:1 em ambos os temas.
function themeColor(css, token) {
    const color = css.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
    if (!color) throw new Error(`Token de cor ausente: ${token}`);
    return color;
}
function relativeLuminance(hex) {
    const rgb = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrastRatio(first, second) {
    const [low, high] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => a - b);
    return (high + 0.05) / (low + 0.05);
}
describe('site theme', () => {
    it('maintains accessible text contrast and low-glare surfaces in dark and light themes', () => {
        expect(lightStyles).toContain('--bg: #e4e9e4');
        expect(optionsHtml).toContain('--bg: #151c1d');
        for (const palette of [styles, lightStyles]) {
            for (const [foreground, background] of [
                ['text', 'bg'],
                ['text', 'surface-2'],
                ['muted', 'surface'],
                ['muted-2', 'control-bg'],
                ['on-accent', 'blue-strong'],
            ]) {
                expect(contrastRatio(themeColor(palette, foreground), themeColor(palette, background))).toBeGreaterThanOrEqual(4.5);
            }
        }
        expect(contrastRatio('#edf4f0', '#32776f')).toBeGreaterThanOrEqual(4.5);
    });
    it('keeps the petroleum palette, visible focus and white fiscal DANFE', () => {
        expect(styles).toContain('color-scheme: dark');
        expect(styles).toContain('--bg: #151c1d');
        expect(styles).toContain('--blue: #70bfb7');
        expect(styles).toContain('--blue-strong: #286d68');
        expect(styles).toContain('--yellow: #c4ae91');
        expect(styles).toMatch(/\.lookup-card[\s\S]*background:/);
        expect(danfeStyles).toMatch(/\.danfe-page[\s\S]*background:\s*#fff/);
    });
    it('keeps one fixed consultation layout for single and batch input', () => {
        expect(styles).toContain('scrollbar-gutter: stable');
        expect(main).not.toContain('syncCompactMode');
        expect(main).not.toContain('is-compact-single');
        expect(batchStyles).not.toContain('is-compact-single');
        expect(batchStyles).toContain('grid-template-columns: 26px minmax(0, 1fr) 118px 280px');
        expect(batchStyles).toContain('box-shadow: inset 3px 0 0 var(--green)');
        expect(batchStyles).toContain('#batch-start:not(:disabled)');
        expect(batchStyles).toContain('background: var(--blue-strong)');
        expect(batchStyles).toContain('background: var(--surface-2)');
        expect(batchStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
        expect(batchStyles).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
        expect(batchStyles).toContain(".batch-list[data-count='1'] .batch-list-header");
        expect(batchStyles).not.toContain("grid-row: 2;");
        expect(batchStyles).toContain('min-height: 34px');
        expect(batchStyles).toContain('max-height: 148px');
        expect(batchStyles).toContain('.batch-form-footer > div:first-child');
        expect(styles).toContain('padding: 18px;');
    });
    it('keeps one consultation card with a reset action for the unified flow', () => {
        expect(main).toContain('<section class="lookup-card"');
        expect(main).toContain('id="batch-consultation-panel"');
        expect(main).toContain('id="batch-list"');
        expect(main).not.toContain('class="result-card"');
        expect(main).toContain('id="batch-reset"');
        expect(main).toContain("batchReset.addEventListener('click', () => {");
        expect(main).toContain('batchController.reset();');
        expect(main).toContain('updateKeyCount();');
        expect(styles).toContain('.lookup-reset');
    });
});
