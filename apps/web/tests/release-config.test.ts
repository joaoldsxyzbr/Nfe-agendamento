import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const releaseUrl = new URL('../../../.github/workflows/release.yml', import.meta.url);

describe('release quality gate', () => {
  it('requires approved physical acceptance for the same release and extension version', async () => {
    const release = await readFile(releaseUrl, 'utf8');

    expect(release).toContain('docs/testing/acceptance-results/v${version}.md');
    expect(release).toContain('Status: APROVADO');
    expect(release).toContain('Chrome: APROVADO');
    expect(release).toContain('Edge: APROVADO');
    expect(release).toContain('Extension: ${extension_version}');
  });
});
