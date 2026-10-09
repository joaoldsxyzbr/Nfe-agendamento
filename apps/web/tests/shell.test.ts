import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const fromWeb = (path: string) => new URL(`../${path}`, import.meta.url);

describe('application shell', () => {
  it('ships only the site + extension Portal runtime', () => {
    for (const path of [
      'index.html',
      'src/main.ts',
      'src/portal/extension-client.ts',
      'src/portal/contracts.ts',
      'src/batch/controller.ts',
      'src/nfe/manual-xml-import.ts',
      'src/danfe/viewer.ts',
    ]) expect(existsSync(fromWeb(path)), path).toBe(true);

    expect(existsSync(fromWeb('src/bridge'))).toBe(false);
    expect(existsSync(fromWeb('src/portal/fallback.ts'))).toBe(false);

    const main = readFileSync(fromWeb('src/main.ts'), 'utf8');
    expect(main).toContain('Extensão conectada');
    expect(main).toContain('Portal Nacional');
    expect(main).not.toContain('Bridge');
    expect(main).not.toContain('Consulta direta');
    expect(main).not.toContain('SEFAZ');
    expect(main).not.toContain('certificate-select');
  });

  it('keeps one unified consultation UI with DANFE/XML and recovery actions', () => {
    const main = readFileSync(fromWeb('src/main.ts'), 'utf8');
    const batch = readFileSync(fromWeb('src/batch/controller.ts'), 'utf8');

    expect(main).toContain('id="batch-keys"');
    expect(main).toContain('id="batch-key-count"');
    expect(main).toContain('rows="1"');
    expect(main).toContain('id="batch-run-toolbar" hidden');
    expect(main).toContain('id="batch-list" class="batch-list" aria-live="polite" hidden');
    expect(main).toContain('id="batch-start"');
    expect(main).toContain('id="batch-reset"');
    expect(main).not.toContain('id="mode-single"');
    expect(main).not.toContain('id="mode-batch"');
    expect(batch).toContain('Visualizar DANFE');
    expect(batch).toContain("print.textContent = 'Imprimir'");
    expect(batch).toContain('row.preview.hidden = item.parsed === null');
    expect(batch).toContain('elements.list.hidden = !hasRun');
    expect(batch).toContain('Baixar XML');
    expect(batch).toContain('Importar XML');
    expect(main).toContain('Baixar XMLs (.zip)');
    expect(main).toContain('Imprimir DANFEs');
  });
});
