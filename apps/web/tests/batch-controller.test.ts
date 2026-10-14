import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createBatchController, type BatchItemView } from '../src/batch/controller';

const A = '42260912345678000195550010000000011123456786';
const B = '35260812345678000195550010000000011000000018';
const C = '42260812345678000123550010000012341000012342';
const el = <T extends object>(value: T): T => value;

function harness(
  overrides: Record<string, unknown> = {},
  importManualXml: () => Promise<any> = async () => null,
) {
  const snapshots: BatchItemView[][] = [];
  const portalStarts: string[] = [];
  const input = el({ value: '', disabled: false, focus: () => {} } as unknown as HTMLTextAreaElement);
  const route = el({ textContent: '' } as HTMLElement);
  const toolbar = el({ hidden: true } as HTMLElement);
  const list = el({ hidden: true } as HTMLElement);
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
      toolbar,
      list,
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

  return { controller, input, route, toolbar, list, zipButton, printButton, portalStarts, snapshots };
}

describe('batch controller Portal-only', () => {
  it('reveals progress and results after starting, retaining one input for batches', async () => {
    const h = harness();
    h.input.value = `${A}\n${B}`;
    h.controller.syncDraft();
    expect(h.toolbar.hidden).toBe(true);
    expect(h.list.hidden).toBe(true);

    await h.controller.start();
    expect(h.toolbar.hidden).toBe(false);
    expect(h.list.hidden).toBe(false);
    expect(h.portalStarts).toEqual([A, B]);

    h.controller.reset();
    expect(h.toolbar.hidden).toBe(true);
    expect(h.list.hidden).toBe(true);
  });

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


  it('recomputes actual batch outcomes after failed and successful explicit retries', async () => {
    const h = harness({
      waitForResult: async (operationId: string) => ({
        operationId,
        state: operationId === 'op-3' || operationId === 'op-4' ? 'failed' as const : 'completed' as const,
        message: operationId === 'op-3' || operationId === 'op-4' ? 'Portal indisponível' : null,
        code: operationId === 'op-3' || operationId === 'op-4' ? 'portal_session_lost' : null,
        xml: operationId === 'op-3' || operationId === 'op-4' ? null : '<xml />',
      }),
    });
    h.input.value = `${A}\n${B}\n${C}`;
    h.controller.syncDraft();
    await h.controller.start();
    expect(h.portalStarts).toEqual([A, B, C]);
    expect(h.route.textContent).toContain('2 concluída(s) · 1 com erro');
    expect(h.snapshots.at(-1)?.map((item) => item.status)).toEqual(['success', 'success', 'portal_error']);

    await h.controller.retryPortal(2);
    expect(h.route.textContent).toContain('2 concluída(s) · 1 com erro');
    expect(h.snapshots.at(-1)?.[2]?.status).toBe('portal_error');
    expect(h.route.textContent).not.toContain('Reconsulta pelo Portal concluída');

    await h.controller.retryPortal(2);
    expect(h.route.textContent).toContain('3 concluída(s) · 0 com erro');
    expect(h.snapshots.at(-1)?.map((item) => item.status)).toEqual(['success', 'success', 'success']);
    expect(h.portalStarts).toEqual([A, B, C, C, C]);
    expect(h.zipButton.disabled).toBe(false);
    expect(h.printButton.disabled).toBe(false);
  });

  it('updates the outcome after recovering an error from a local validated XML', async () => {
    const parsed = {
      accessKey: A,
      originalXml: '<xml />',
      issuer: { taxId: '12345678000195', name: 'Emitente' },
      totals: { invoice: 10 },
      number: '1',
      series: '1',
    } as never;
    const h = harness({
      waitForResult: async (operationId: string) => ({
        operationId, state: 'failed' as const, message: 'Portal indisponível', xml: null,
      }),
    }, async () => parsed);
    h.input.value = A;
    h.controller.syncDraft();
    await h.controller.start();
    expect(h.route.textContent).toBe('Consulta com erro');
    await h.controller.importManual(0);
    expect(h.route.textContent).toBe('Consulta concluída');
    expect(h.snapshots.at(-1)?.[0]?.source).toBe('XML manual');
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

describe('cancel and preflight resilience', () => {
  it('closes a popup whose creation finishes after cancelling a batch', async () => {
    let finishStart!: (operationId: string) => void;
    const cancelled: string[] = [];
    const h = harness({
      start: () => new Promise<string>((resolve) => { finishStart = resolve; }),
      cancel: async (operationId: string) => { cancelled.push(operationId); },
    });

    h.input.value = A;
    h.controller.syncDraft();
    const running = h.controller.start();
    await vi.waitFor(() => expect(finishStart).toBeTypeOf('function'));
    await h.controller.cancel();
    finishStart('operation-opened-after-cancel');
    await running;

    expect(cancelled).toEqual(['operation-opened-after-cancel']);
    expect(h.snapshots.at(-1)?.[0]?.status).toBe('cancelled');
  });

  it('shows an actionable error when extension preflight throws', async () => {
    const h = harness({ getInfo: async () => { throw new Error('handshake failure'); } });
    h.input.value = A;
    h.controller.syncDraft();
    await expect(h.controller.start()).resolves.toBeUndefined();
    expect(h.route.textContent).toContain('Falha ao verificar a extensão');
    expect(h.controller.isBusy()).toBe(false);
  });
});
