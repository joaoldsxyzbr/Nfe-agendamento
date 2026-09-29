import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const releaseUrl = new URL('../../../.github/workflows/release.yml', import.meta.url);

describe('release quality gate', () => {
  it('keeps stable releases behind approved physical acceptance', async () => {
    const release = await readFile(releaseUrl, 'utf8');

    expect(release).toContain('docs/testing/acceptance-results/v${version}.md');
    expect(release).toContain('Status: APROVADO');
    expect(release).toContain('Chrome: APROVADO');
    expect(release).toContain('Edge: APROVADO');
    expect(release).toContain('Extension: ${extension_version}');
  });

  it('publishes release candidates as prereleases without claiming physical approval', async () => {
    const release = await readFile(releaseUrl, 'utf8');

    expect(release).toContain('-rc\\\\.[0-9]+');
    expect(release).toContain('Status: PENDENTE');
    expect(release).toContain('--prerelease');
    expect(release).toContain('--latest=false');
  });
});
