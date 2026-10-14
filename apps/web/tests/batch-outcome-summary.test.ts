import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/batch/controller.ts', import.meta.url), 'utf8');

describe('batch outcome summary regression', () => {
  it('counts completed and failed items separately after a batch', () => {
    expect(source).toContain("items.filter((item) => item.status === 'success').length");
    expect(source).toContain("items.filter((item) => item.status === 'portal_error').length");
    expect(source).toContain('Lote finalizado');
  });
  it('preserves explicit per-item retry and sequential Portal processing', () => {
    expect(source).toContain("item.status !== 'portal_error'");
    expect(source).toContain('await processPortalItem(item, abortController.signal)');
    expect(source).toContain('await processPortalItem(item);');
  });
});
