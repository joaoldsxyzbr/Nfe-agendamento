import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const releaseUrl = new URL('../../../.github/workflows/release.yml', import.meta.url);

describe('release quality gate', () => {
  it('publishes normal releases after CI while keeping physical acceptance traceable', async () => {
    const release = await readFile(releaseUrl, 'utf8');

    expect(release).toContain('docs/testing/acceptance-results/v${version}.md');
    expect(release).toContain('Release: v${version}');
    expect(release).toContain('Extension: ${extension_version}');
    expect(release).toContain("^Status: (PENDENTE|APROVADO)$");
    expect(release).toContain("^Chrome: (NÃO EXECUTADO|APROVADO)$");
    expect(release).toContain("^Edge: (NÃO EXECUTADO|APROVADO)$");
    expect(release).not.toContain('--prerelease');
    expect(release).not.toContain('--latest=false');
    expect(release).not.toContain('Status: APROVADO');
    expect(release).not.toContain('Chrome: APROVADO');
    expect(release).not.toContain('Edge: APROVADO');
  });
});
