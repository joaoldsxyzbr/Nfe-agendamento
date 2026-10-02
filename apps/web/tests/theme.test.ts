import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const danfeStyles = readFileSync(new URL('../src/danfe/styles.css', import.meta.url), 'utf8');

describe('site theme', () => {
  it('keeps the application dark with a restrained blue primary while DANFE stays white', () => {
    expect(styles).toContain('color-scheme: dark');
    expect(styles).toContain('--bg: #0b0f14');
    expect(styles).toContain('--blue: #4c8dff');
    expect(styles).toContain('--blue-strong: #3378e8');
    expect(styles).toContain('--yellow: #d9ae42');
    expect(styles).toMatch(/\.lookup-card[\s\S]*background:/);
    expect(danfeStyles).toMatch(/\.danfe-page[\s\S]*background:\s*#fff/);
  });

  it('keeps one consultation card with a reset action for the unified flow', () => {
    expect(main).toContain('<section class="lookup-card"');
    expect(main).toContain('id="batch-consultation-panel"');
    expect(main).toContain('id="batch-list"');
    expect(main).not.toContain('class="result-card"');
    expect(main).toContain('id="batch-reset"');
    expect(main).toContain("batchReset.addEventListener('click', () => batchController.reset())");
    expect(styles).toContain('.lookup-reset');
  });
});
