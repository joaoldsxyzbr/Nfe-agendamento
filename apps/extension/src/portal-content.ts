import {
  accessKeySelector,
  consultButtonSelector,
  isCaptchaResponseReady,
  isDownloadLabel,
  isOfficialConsultUrl,
  isOfficialDownloadUrl,
} from './portal-dom';
import { PORTAL_ORIGIN, type PortalExtensionState } from './protocol';
import { createEventDrivenScheduler } from './portal-scheduler';

declare const chrome: any;

const READY_ATTEMPTS = 4;
const READY_RETRY_DELAY_MS = 250;
const MESSAGE_ATTEMPTS = 2;
const MESSAGE_RETRY_DELAY_MS = 200;
const RESULT_TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

let accessKey = '';
let portalState: PortalExtensionState | '' = '';
let consultTriggered = false;
let downloadTriggered = false;
let submittedAt: number | null = null;
let downloadRequestedAt: number | null = null;
let resultTimeoutReported = false;
let downloadTimeoutReported = false;
let resultTimeoutHandle: ReturnType<typeof setTimeout> | null = null;
let downloadTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

const scheduleTick = createEventDrivenScheduler(tick);

void initialize();

async function initialize(): Promise<void> {
  try {
    if (location.origin !== PORTAL_ORIGIN || !location.pathname.toLowerCase().startsWith('/portal/')) {
      return;
    }

    const response = await sendReadyWithRetry();
    if (!response || typeof response.accessKey !== 'string') return;
    accessKey = response.accessKey;
    portalState = isPortalState(response.state) ? response.state : 'waiting_user';
    const stateChangedAt = validTimestampOrNow(response.stateChangedAt);

    if (portalState === 'submitting') {
      submittedAt = stateChangedAt;
      armResultTimeout(stateChangedAt);
    } else if (portalState === 'waiting_result') {
      downloadRequestedAt = stateChangedAt;
      downloadTriggered = true;
      armDownloadTimeout(stateChangedAt);
    }

    fillAccessKey();
    installDomWatchers();
    scheduleTick();
  } catch {
    // O Portal continua utilizável manualmente se o background não responder após as tentativas limitadas.
  }
}

function installDomWatchers(): void {
  const root = document.documentElement;
  if (root) {
    const observer = new MutationObserver(() => scheduleTick());
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  }

  document.addEventListener('input', scheduleTick, true);
  document.addEventListener('change', scheduleTick, true);
  window.addEventListener('message', scheduleTick);
  window.addEventListener('focus', scheduleTick);
  window.addEventListener('pageshow', scheduleTick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleTick();
  });
}

async function tick(): Promise<void> {
  if (!accessKey || location.origin !== PORTAL_ORIGIN) return;

  fillAccessKey();

  if (portalState === 'submitting') {
    if (!downloadTriggered) {
      const control = findDownloadControl();
      if (control) {
        try {
          const armed = await sendPortalMessageWithRetry({ source: 'portal', type: 'download_ready' });
          if (!armed?.armed) return;

          downloadTriggered = true;
          portalState = 'waiting_result';
          downloadRequestedAt = Date.now();
          clearResultTimeout();
          armDownloadTimeout(downloadRequestedAt);
          control.click();
          return;
        } catch {
          return;
        }
      }
    }

    return;
  }

  if (!consultTriggered && portalState === 'waiting_user' && isOfficialConsultUrl(location.href)) {
    const captchaResponse = document.querySelector<HTMLTextAreaElement>('[name="h-captcha-response"]');
    const consultButton = document.querySelector<HTMLElement>(consultButtonSelector);
    if (
      captchaResponse &&
      isCaptchaResponseReady(captchaResponse.value) &&
      consultButton &&
      !isDisabled(consultButton)
    ) {
      try {
        const submitted = await sendPortalMessageWithRetry({ source: 'portal', type: 'submitting' });
        if (!submitted?.ok) return;

        consultTriggered = true;
        portalState = 'submitting';
        submittedAt = Date.now();
        armResultTimeout(submittedAt);
        consultButton.click();
      } catch {
        // O próximo evento observado pode tentar novamente sem duplicar clique.
      }
    }
  }
}

function armResultTimeout(startedAt: number): void {
  clearResultTimeout();
  const elapsed = Math.max(0, Date.now() - startedAt);
  const remaining = Math.max(0, RESULT_TIMEOUT_MS - elapsed);
  resultTimeoutHandle = globalThis.setTimeout(() => {
    resultTimeoutHandle = null;
    void reportResultTimeout();
  }, remaining);
}

function clearResultTimeout(): void {
  if (resultTimeoutHandle === null) return;
  globalThis.clearTimeout(resultTimeoutHandle);
  resultTimeoutHandle = null;
}

async function reportResultTimeout(): Promise<void> {
  if (portalState !== 'submitting' || submittedAt === null || resultTimeoutReported) return;
  resultTimeoutReported = true;
  try {
    await sendPortalMessageWithRetry({ source: 'portal', type: 'result_timeout' });
  } catch {
    resultTimeoutReported = false;
  }
}

function armDownloadTimeout(requestedAt: number): void {
  clearDownloadTimeout();
  const elapsed = Math.max(0, Date.now() - requestedAt);
  const remaining = Math.max(0, DOWNLOAD_TIMEOUT_MS - elapsed);
  downloadTimeoutHandle = globalThis.setTimeout(() => {
    downloadTimeoutHandle = null;
    void reportDownloadTimeout();
  }, remaining);
}

function clearDownloadTimeout(): void {
  if (downloadTimeoutHandle === null) return;
  globalThis.clearTimeout(downloadTimeoutHandle);
  downloadTimeoutHandle = null;
}

async function reportDownloadTimeout(): Promise<void> {
  if (
    portalState !== 'waiting_result' ||
    downloadRequestedAt === null ||
    downloadTimeoutReported
  ) return;

  downloadTimeoutReported = true;
  try {
    await sendPortalMessageWithRetry({ source: 'portal', type: 'download_timeout' });
  } catch {
    downloadTimeoutReported = false;
  }
}

async function sendReadyWithRetry(): Promise<any> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    try {
      return await chrome.runtime.sendMessage({ source: 'portal', type: 'ready' });
    } catch (error) {
      lastError = error;
      if (attempt < READY_ATTEMPTS - 1) {
        await delay(READY_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('A extensão não conseguiu reconectar ao Portal.');
}

async function sendPortalMessageWithRetry(message: Record<string, unknown>): Promise<any> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MESSAGE_ATTEMPTS; attempt += 1) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      lastError = error;
      if (attempt < MESSAGE_ATTEMPTS - 1) {
        await delay(MESSAGE_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('A extensão não respondeu ao Portal.');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function validTimestampOrNow(value: unknown): number {
  const now = Date.now();
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= now + 60_000
    ? value
    : now;
}

function fillAccessKey(): void {
  const input = document.querySelector<HTMLInputElement>(accessKeySelector);
  if (!input || input.value === accessKey) return;
  input.value = accessKey;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();
}

function findDownloadControl(): HTMLElement | null {
  const controls = Array.from(
    document.querySelectorAll<HTMLElement>('a[href], button, input[type="button"], input[type="submit"]'),
  );

  for (const control of controls) {
    if (control instanceof HTMLAnchorElement && control.href && isOfficialDownloadUrl(control.href)) {
      return control;
    }
  }

  return controls.find((control) => {
    const candidate = control instanceof HTMLInputElement ? control.value : control.textContent;
    return isDownloadLabel(candidate);
  }) ?? null;
}

function isDisabled(element: HTMLElement): boolean {
  return element instanceof HTMLButtonElement || element instanceof HTMLInputElement
    ? element.disabled
    : element.getAttribute('aria-disabled') === 'true';
}

function isPortalState(value: unknown): value is PortalExtensionState {
  return typeof value === 'string' && [
    'opening',
    'loading_portal',
    'waiting_user',
    'submitting',
    'waiting_result',
    'fetching_xml',
    'completed',
    'cancelled',
    'failed',
  ].includes(value);
}
