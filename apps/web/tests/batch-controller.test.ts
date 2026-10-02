import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createBatchController, type BatchItemView } from '../src/batch/controller';

const A = '42260912345678000195550010000000011123456786';
const B = '35260812345678000195550010000000011000000018';
const el = <T extends object>(value: T): T => value;

function harness(
  overrides: Record<string, unknown> = {},
  importManualXml: () => Promise<any> = async () => null,
) {
  const snapshots: BatchItemView[][] = [];
  const portalStarts: string[] = [];
  const input = el({ value: '', disabled: false, focus: () => {} } as unknown as HTMLTextAreaElement);
  const route = el({ textContent: '' } as HTMLElement);
  const zipButton = el({ disabled: true } as HTMLButtonElement);
  const printButton = el({ disabled: true } as HTMLButtonElement);
  const portal = {
    getInfo: async () => ({
      version: '0.2.11',
      capabilities: { openOptions: true, portalLookup: true, supplierResolution: true },
    }),
    start: async (key: string) => { portalStarts.push(key); return `op-${portalStarts.length}`; },
    waitForResult: async (operationId: string) => ({
      operationId,
      state: 'completed' as const,
      message: null,
      xml: '<xml />',
    }),
    cancel: async () => {},
    resolveSupplier: async () => ({ supplierId: null }),
    ...overrides,
  };
  const controller = createBatchController({
    elements: {
      keysInput: input,
      inputSummary: el({ textContent: '' } as HTMLElement),
      startButton: el({ disabled: false } as HTMLButtonElement),
      cancelButton: el({ hidden: true } as HTMLButtonElement),
      zipButton,
      printButton,
      progress: el({ textContent: '' } as HTMLElement),
      routeText: route,
      resetButton: el({ hidden: true, disabled: false } as HTMLButtonElement),
    },
    portal: portal as never,
    parseXml: (xml, accessKey) => ({
      accessKey,
      originalXml: xml,
      issuer: { taxId: '12345678000195', name: 'Emitente' },
      totals: { invoice: 10 },
      number: '1',
      series: '1',
    } as never),
    createZip: () => new Blob(),
    downloadBlob: () => {},
    openDanfe: () => {},
    downloadXml: () => {},
    openDanfeDocuments: () => {},
    printWindow: () => {},
    importManualXml,
    renderRows: (items) => snapshots.push(items.map((item) => ({ ...item }))),
  });

  return { controller, input, route, zipButton, printButton, portalStarts, snapshots };
}

describe('batch controller Portal-only', () => {
  it('processes every item sequentially through the Portal', async () => {
    const h = harness();
    h.input.value = `${A}\n${B}`;
    h.controller.syncDraft();
    await h.controller.start();

    expect(h.portalStarts).toEqual([A, B]);
    expect(h.snapshots.at(-1)?.every((item) => item.source === 'Portal')).toBe(true);
  });

  it('serializes the preflight so double submit cannot start parallel batches', async () => {
    let resolveInfo!: (value: unknown) => void;
    let infoCalls = 0;
    const h = harness({
      getInfo: () => new Promise((resolve) => {
        infoCalls += 1;
        resolveInfo = resolve;
      }),
    });
    h.input.value = `${A}\n${B}`;
    h.controller.syncDraft();

    const first = h.controller.start();
    const second = h.controller.start();

    expect(infoCalls).toBe(1);
    expect(h.controller.isBusy()).toBe(true);
    resolveInfo({
      version: '0.2.11',
      capabilities: { openOptions: true, portalLookup: true, supplierResolution: true },
    });
    await Promise.all([first, second]);

    expect(h.portalStarts).toEqual([A, B]);
  });

  it('does not start when the extension is missing', async () => {
    const h = harness({ getInfo: async () => null });
    h.input.value = `${A}\n${B}`;
    h.controller.syncDraft();
    await h.controller.start();

    expect(h.portalStarts).toHaveLength(0);
    expect(h.route.textContent).toContain('Extensão não conectada');
    expect(h.snapshots.at(-1)?.map((item) => item.status)).toEqual(['queued', 'queued']);
  });

  it('restores completed-result actions when a later preflight exits early', async () => {
    let infoCalls = 0;
    const h = harness({
      getInfo: async () => {
        infoCalls += 1;
        if (infoCalls === 1) {
          return {
            version: '0.2.11',
            capabilities: { openOptions: true, portalLookup: true, supplierResolution: true },
          };
        }
        return null;
      },
    });
    h.input.value = A;
    h.controller.syncDraft();
    await h.controller.start();

    expect(h.zipButton.disabled).toBe(false);
    expect(h.printButton.disabled).toBe(false);

    await h.controller.start();

    expect(h.zipButton.disabled).toBe(false);
    expect(h.printButton.disabled).toBe(false);
    expect(h.route.textContent).toContain('Extensão não conectada');
  });

  it('keeps a failed Portal item available for explicit recovery', async () => {
    let attempts = 0;
    const h = harness({
      waitForResult: async (operationId: string) => {
        attempts += 1;
        return {
          operationId,
          state: 'failed' as const,
          message: 'Portal indisponível',
          xml: null,
        };
      },
    });
    h.input.value = A;
    h.controller.syncDraft();
    await h.controller.start();

    expect(h.snapshots.at(-1)?.[0]?.status).toBe('portal_error');
    expect(attempts).toBe(1);
  });

  it('recovers a failed Portal item with a validated local XML', async () => {
    const parsed = {
      accessKey: A,
      originalXml: '<xml />',
      issuer: { taxId: '12345678000195', name: 'Emitente' },
      totals: { invoice: 10 },
      number: '1',
      series: '1',
    } as never;
    const h = harness(
      {
        waitForResult: async (operationId: string) => ({
          operationId,
          state: 'failed' as const,
          message: 'Portal indisponível',
          xml: null,
        }),
      },
      async () => parsed,
    );
    h.input.value = A;
    h.controller.syncDraft();
    await h.controller.start();

    await h.controller.importManual(0);

    expect(h.snapshots.at(-1)?.[0]?.status).toBe('success');
    expect(h.snapshots.at(-1)?.[0]?.source).toBe('XML manual');
    expect(h.snapshots.at(-1)?.[0]?.parsed).not.toBeNull();
  });

  it('resets the unified consultation state', () => {
    const h = harness();
    h.input.value = A;
    h.controller.syncDraft();

    h.controller.reset();

    expect(h.input.value).toBe('');
    expect(h.snapshots.at(-1)).toEqual([]);
  });
});

describe('batch preflight action guards', () => {
  it('locks Portal retry while preflight is pending', () => {
    const source = readFileSync(new URL('../src/batch/controller.ts', import.meta.url), 'utf8');
    expect(source).toContain("item.status !== 'portal_error' || preflighting || running || manualActionBusy");
    expect(source).toContain('row.retry.disabled = disabled');
    expect(source).toContain('row.importManual.disabled = disabled');
    expect(source).toContain('refreshResultActions();');
    expect(source).toContain("importManualButton.textContent = 'Importar XML'");
    expect(source).toContain('const parsed = await deps.importManualXml(item.accessKey)');
    expect(source).toContain("item.source = 'XML manual'");
  });

  it('keeps stable row objects and updates item state incrementally', () => {
    const source = readFileSync(new URL('../src/batch/controller.ts', import.meta.url), 'utf8');
    expect(source).toContain('let renderedRows: RenderedBatchRow[] = [];');
    expect(source).toContain('const canReuseRows =');
    expect(source).toContain('updateRenderedRow(changedItem);');
  });
});
