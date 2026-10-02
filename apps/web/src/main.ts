import { createBatchController } from './batch/controller';
import { parseBatchInput } from './batch/input';
import { createStoredZip } from './batch/zip';
import { attachDanfeZoom, renderDanfe } from './danfe/render';
import { createDanfeViewer } from './danfe/viewer';
import { validateManualNfeXml } from './nfe/manual-xml-import';
import { parseNfeXml, type ParsedNfe } from './nfe/xml';
import { BrowserPortalExtensionClient } from './portal/extension-client';
import './styles.css';
import './batch.css';
import './danfe/styles.css';

const BATCH_DRAFT_DEBOUNCE_MS = 120;

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Elemento #app não encontrado.');
}

app.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-heading">
        <div class="brand-lockup">
          <img class="brand-mark" src="/brand-mark.png" alt="" aria-hidden="true" />
          <h1 class="brand-title"><span>NF-e</span><span>Agendamento</span></h1>
        </div>
        <p class="subtitle">Consulta de NF-e pelo Portal Nacional.</p>
      </div>
      <div class="topbar-controls" id="topbar-controls">
        <div class="integration-pill" id="integration-status" data-state="checking" role="status" aria-live="polite">
          <span class="integration-dot" aria-hidden="true"></span>
          <span id="integration-status-text">Verificando extensão…</span>
        </div>
      </div>
    </header>

    <section class="lookup-card" aria-labelledby="lookup-title">
      <div class="section-heading lookup-heading">
        <div>
          <p class="eyebrow">Consulta</p>
          <h2 id="lookup-title">Chaves de acesso</h2>
        </div>
        <span class="key-hint">44 caracteres</span>
      </div>

      <div id="batch-consultation-panel" class="is-compact-single">
        <form id="batch-form" novalidate>
          <label for="batch-keys">Chaves das NF-e</label>
          <textarea
            id="batch-keys"
            rows="6"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            placeholder="Cole uma ou várias chaves, uma por linha"
            aria-describedby="batch-help batch-input-summary"
          ></textarea>
          <div class="batch-form-footer">
            <div>
              <p id="batch-input-summary" class="batch-summary" aria-live="polite">Nenhuma chave informada.</p>
              <p id="batch-help" class="help-text">Todas as consultas usam o Portal Nacional. O lote processa uma NF-e por vez e o hCaptcha continua manual.</p>
            </div>
            <div class="lookup-actions batch-actions" aria-label="Ações da consulta">
              <button id="batch-start" type="submit" disabled>Consultar</button>
              <button id="batch-reset" class="lookup-reset batch-reset" type="button" hidden>Nova consulta</button>
            </div>
          </div>
        </form>

        <div class="batch-run-toolbar" id="batch-run-toolbar">
          <div class="batch-progress-copy" aria-live="polite">
            <strong id="batch-progress">0 de 0</strong>
            <span id="batch-route">Aguardando início</span>
          </div>
          <div class="batch-toolbar-actions">
            <button id="batch-cancel" class="secondary-button" type="button" hidden>Cancelar consulta</button>
            <button id="batch-zip" class="secondary-button" type="button" disabled>Baixar XMLs (.zip)</button>
            <button id="batch-print" class="secondary-button" type="button" disabled>Imprimir DANFEs</button>
          </div>
        </div>

        <div id="batch-list" class="batch-list" aria-live="polite">
          <div class="empty-state batch-empty">
            <strong>Nenhuma NF-e carregada</strong>
            <span>Cole uma ou mais chaves acima para iniciar.</span>
          </div>
        </div>
      </div>
    </section>
  </div>

  <section class="danfe" id="danfe-viewer" role="dialog" aria-modal="true" aria-labelledby="danfe-title" hidden>
    <div class="danfe-modal">
      <div class="danfe-toolbar">
        <strong class="danfe-toolbar-title" id="danfe-title">Visualizar DANFE</strong>
        <span class="danfe-zoom-hint">Ctrl + scroll para zoom</span>
        <div class="danfe-toolbar-actions">
          <button id="danfe-close" type="button">Fechar</button>
          <button id="danfe-print" type="button">Imprimir / PDF</button>
        </div>
      </div>
      <div class="danfe-scroll">
        <div id="danfe-content"></div>
      </div>
    </div>
  </section>
`;

const portalExtension = new BrowserPortalExtensionClient();
const integrationStatus = requireElement<HTMLElement>('#integration-status');
const integrationStatusText = requireElement<HTMLElement>('#integration-status-text');
const batchPanel = requireElement<HTMLElement>('#batch-consultation-panel');
const batchForm = requireElement<HTMLFormElement>('#batch-form');
const batchKeysInput = requireElement<HTMLTextAreaElement>('#batch-keys');
const batchInputSummary = requireElement<HTMLElement>('#batch-input-summary');
const batchStart = requireElement<HTMLButtonElement>('#batch-start');
const batchReset = requireElement<HTMLButtonElement>('#batch-reset');
const batchProgress = requireElement<HTMLElement>('#batch-progress');
const batchRouteText = requireElement<HTMLElement>('#batch-route');
const batchCancel = requireElement<HTMLButtonElement>('#batch-cancel');
const batchZip = requireElement<HTMLButtonElement>('#batch-zip');
const batchPrint = requireElement<HTMLButtonElement>('#batch-print');
const batchList = requireElement<HTMLElement>('#batch-list');
const danfeViewer = requireElement<HTMLElement>('#danfe-viewer');
const danfeTitle = requireElement<HTMLElement>('#danfe-title');
const danfeContent = requireElement<HTMLElement>('#danfe-content');
const danfeClose = requireElement<HTMLButtonElement>('#danfe-close');
const danfePrint = requireElement<HTMLButtonElement>('#danfe-print');
let batchDraftTimer: ReturnType<typeof setTimeout> | null = null;

const danfeViewerController = createDanfeViewer({
  elements: {
    viewer: danfeViewer,
    title: danfeTitle,
    content: danfeContent,
    closeButton: danfeClose,
    printButton: danfePrint,
  },
  render: renderDanfe,
  attachZoom: attachDanfeZoom,
  bodyClassList: document.body.classList,
  addDocumentKeydownListener: (listener) => document.addEventListener('keydown', listener),
  removeDocumentKeydownListener: (listener) => document.removeEventListener('keydown', listener),
  getActiveElement: () => document.activeElement,
  print: () => window.print(),
});

const batchController = createBatchController({
  elements: {
    keysInput: batchKeysInput,
    inputSummary: batchInputSummary,
    startButton: batchStart,
    resetButton: batchReset,
    cancelButton: batchCancel,
    zipButton: batchZip,
    printButton: batchPrint,
    progress: batchProgress,
    routeText: batchRouteText,
    list: batchList,
  },
  portal: portalExtension,
  parseXml: parseNfeXml,
  createZip: createStoredZip,
  downloadBlob,
  openDanfe: (parsed) => danfeViewerController.open(parsed),
  downloadXml,
  openDanfeDocuments: (documents, title) => danfeViewerController.openMany(documents, title),
  printWindow: () => danfeViewerController.print(),
  importManualXml: selectManualXml,
});

batchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void batchController.start();
});

batchKeysInput.addEventListener('input', () => {
  syncCompactMode();
  scheduleBatchDraftSync();
});
batchReset.addEventListener('click', () => batchController.reset());
batchCancel.addEventListener('click', () => {
  void batchController.cancel();
});
batchZip.addEventListener('click', () => batchController.downloadZip());
batchPrint.addEventListener('click', () => batchController.printDanfes());

const stopExtensionReadyHint = portalExtension.onReadyHint(() => {
  void refreshExtensionStatus();
});
window.addEventListener('focus', () => void refreshExtensionStatus());
window.addEventListener('pageshow', () => void refreshExtensionStatus());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refreshExtensionStatus();
});
window.addEventListener('pagehide', () => {
  if (batchDraftTimer !== null) globalThis.clearTimeout(batchDraftTimer);
  stopExtensionReadyHint();
  danfeViewerController.dispose();
  batchController.dispose();
});

void refreshExtensionStatus();
syncCompactMode();
batchController.syncDraft();
batchKeysInput.focus();

function scheduleBatchDraftSync(): void {
  if (batchDraftTimer !== null) globalThis.clearTimeout(batchDraftTimer);
  batchDraftTimer = globalThis.setTimeout(() => {
    batchDraftTimer = null;
    batchController.syncDraft();
  }, BATCH_DRAFT_DEBOUNCE_MS);
}

function syncCompactMode(): void {
  const validKeyCount = parseBatchInput(batchKeysInput.value).validKeys.length;
  batchPanel.classList.toggle('is-compact-single', validKeyCount <= 1);
}

async function refreshExtensionStatus(): Promise<void> {
  const info = await portalExtension.getInfo();
  if (info) {
    integrationStatus.dataset.state = 'connected';
    integrationStatusText.textContent = `Extensão conectada · v${info.version}`;
    return;
  }
  integrationStatus.dataset.state = 'disconnected';
  integrationStatusText.textContent = 'Extensão não conectada';
}

function selectManualXml(accessKey: string): Promise<ParsedNfe | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,application/xml,text/xml';
    input.hidden = true;

    let settled = false;
    const finish = (complete: () => void) => {
      if (settled) return;
      settled = true;
      input.remove();
      complete();
    };

    input.addEventListener('cancel', () => finish(() => resolve(null)), { once: true });
    input.addEventListener('change', () => {
      const file = input.files?.item(0) ?? null;
      if (!file) {
        finish(() => resolve(null));
        return;
      }

      void validateManualNfeXml(file, accessKey)
        .then((parsed) => finish(() => resolve(parsed)))
        .catch((error) => finish(() => reject(error)));
    }, { once: true });

    document.body.append(input);
    input.click();
  });
}

function downloadXml(parsed: ParsedNfe): void {
  const blob = new Blob([parsed.originalXml], { type: 'application/xml;charset=utf-8' });
  downloadBlob(blob, `${parsed.accessKey}.xml`);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento ${selector} não encontrado.`);
  return element;
}
