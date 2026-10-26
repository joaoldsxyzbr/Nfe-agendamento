import { accessKeySelector, consultButtonSelector, isCaptchaResponseReady, isDownloadLabel, isOfficialConsultUrl, isOfficialDownloadUrl, } from './portal-dom';
import { PORTAL_ORIGIN } from './protocol';
import { createEventDrivenScheduler } from './portal-scheduler';
import { inspectDownloadCandidates } from './intelligence/portal-model.js';
import { READY_ATTEMPTS, READY_RETRY_DELAY_MS, MESSAGE_ATTEMPTS, MESSAGE_RETRY_DELAY_MS, RESULT_TIMEOUT_MS, DOWNLOAD_TIMEOUT_MS } from './shared/constants.js';
let accessKey = '';
let portalState = '';
let consultTriggered = false;
let downloadTriggered = false;
let submittedAt = null;
let downloadRequestedAt = null;
let resultTimeoutReported = false;
let downloadTimeoutReported = false;
let resultTimeoutHandle = null;
let downloadTimeoutHandle = null;
let neuralFindingReported = false;
const scheduleTick = createEventDrivenScheduler(tick);
void initialize();
async function initialize() {
    try {
        if (location.origin !== PORTAL_ORIGIN || !location.pathname.toLowerCase().startsWith('/portal/')) {
            return;
        }
        const response = await sendReadyWithRetry();
        if (!response || typeof response.accessKey !== 'string')
            return;
        accessKey = response.accessKey;
        portalState = isPortalState(response.state) ? response.state : 'waiting_user';
        const stateChangedAt = validTimestampOrNow(response.stateChangedAt);
        if (portalState === 'submitting') {
            submittedAt = stateChangedAt;
            armResultTimeout(stateChangedAt);
        }
        else if (portalState === 'waiting_result') {
            downloadRequestedAt = stateChangedAt;
            downloadTriggered = true;
            armDownloadTimeout(stateChangedAt);
        }
        fillAccessKey();
        installDomWatchers();
        scheduleTick();
    }
    catch {
        // O Portal continua utilizável manualmente se o background não responder após as tentativas limitadas.
    }
}
function installDomWatchers() {
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
        if (document.visibilityState === 'visible')
            scheduleTick();
    });
}
async function tick() {
    if (!accessKey || location.origin !== PORTAL_ORIGIN)
        return;
    fillAccessKey();
    if (portalState === 'submitting') {
        if (!downloadTriggered) {
            const control = findDownloadControl();
            if (!control && !neuralFindingReported) {
                const candidates = document.querySelectorAll('a[href], button, input[type="button"], input[type="submit"]');
                const result = inspectDownloadCandidates(candidates);
                if (result.candidateDetected) {
                    neuralFindingReported = true;
                    // Observação passiva: NÃO clicar no candidato neural não homologado.
                    void chrome.runtime.sendMessage({
                        source: 'portal',
                        type: 'intelligence_diagnostic',
                        diagnostic: {
                            code: result.ambiguous ? 'neural_candidate_ambiguous' : 'neural_candidate_unverified',
                            state: portalState,
                            score: result.score,
                            inspected: result.inspected,
                            ambiguous: result.ambiguous,
                        },
                    }).catch(() => {});
                }
            }
            if (control) {
                try {
                    const armed = await sendPortalMessageWithRetry({ source: 'portal', type: 'download_ready' });
                    if (!armed?.armed)
                        return;
                    downloadTriggered = true;
                    portalState = 'waiting_result';
                    downloadRequestedAt = Date.now();
                    clearResultTimeout();
                    armDownloadTimeout(downloadRequestedAt);
                    control.click();
                    return;
                }
                catch {
                    return;
                }
            }
        }
        return;
    }
    if (!consultTriggered && portalState === 'waiting_user' && isOfficialConsultUrl(location.href)) {
        const captchaResponse = document.querySelector('[name="h-captcha-response"]');
        const consultButton = document.querySelector(consultButtonSelector);
        if (captchaResponse &&
            isCaptchaResponseReady(captchaResponse.value) &&
            consultButton &&
            !isDisabled(consultButton)) {
            try {
                const submitted = await sendPortalMessageWithRetry({ source: 'portal', type: 'submitting' });
                if (!submitted?.ok)
                    return;
                consultTriggered = true;
                portalState = 'submitting';
                submittedAt = Date.now();
                armResultTimeout(submittedAt);
                consultButton.click();
            }
            catch {
                // O próximo evento observado pode tentar novamente sem duplicar clique.
            }
        }
    }
}
function armResultTimeout(startedAt) {
    clearResultTimeout();
    const elapsed = Math.max(0, Date.now() - startedAt);
    const remaining = Math.max(0, RESULT_TIMEOUT_MS - elapsed);
    resultTimeoutHandle = globalThis.setTimeout(() => {
        resultTimeoutHandle = null;
        void reportResultTimeout();
    }, remaining);
}
function clearResultTimeout() {
    if (resultTimeoutHandle === null)
        return;
    globalThis.clearTimeout(resultTimeoutHandle);
    resultTimeoutHandle = null;
}
async function reportResultTimeout() {
    if (portalState !== 'submitting' || submittedAt === null || resultTimeoutReported)
        return;
    resultTimeoutReported = true;
    try {
        await sendPortalMessageWithRetry({ source: 'portal', type: 'result_timeout' });
    }
    catch {
        resultTimeoutReported = false;
    }
}
function armDownloadTimeout(requestedAt) {
    clearDownloadTimeout();
    const elapsed = Math.max(0, Date.now() - requestedAt);
    const remaining = Math.max(0, DOWNLOAD_TIMEOUT_MS - elapsed);
    downloadTimeoutHandle = globalThis.setTimeout(() => {
        downloadTimeoutHandle = null;
        void reportDownloadTimeout();
    }, remaining);
}
function clearDownloadTimeout() {
    if (downloadTimeoutHandle === null)
        return;
    globalThis.clearTimeout(downloadTimeoutHandle);
    downloadTimeoutHandle = null;
}
async function reportDownloadTimeout() {
    if (portalState !== 'waiting_result' ||
        downloadRequestedAt === null ||
        downloadTimeoutReported)
        return;
    downloadTimeoutReported = true;
    try {
        await sendPortalMessageWithRetry({ source: 'portal', type: 'download_timeout' });
    }
    catch {
        downloadTimeoutReported = false;
    }
}
async function sendReadyWithRetry() {
    let lastError = null;
    for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
        try {
            return await chrome.runtime.sendMessage({ source: 'portal', type: 'ready' });
        }
        catch (error) {
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
async function sendPortalMessageWithRetry(message) {
    let lastError = null;
    for (let attempt = 0; attempt < MESSAGE_ATTEMPTS; attempt += 1) {
        try {
            return await chrome.runtime.sendMessage(message);
        }
        catch (error) {
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
function delay(milliseconds) {
    return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
function validTimestampOrNow(value) {
    const now = Date.now();
    return typeof value === 'number' &&
        Number.isFinite(value) &&
        value > 0 &&
        value <= now + 60_000
        ? value
        : now;
}
function fillAccessKey() {
    const input = document.querySelector(accessKeySelector);
    if (!input || input.value === accessKey)
        return;
    input.value = accessKey;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
}
function findDownloadControl() {
    const controls = Array.from(document.querySelectorAll('a[href], button, input[type="button"], input[type="submit"]'));
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
function isDisabled(element) {
    return element instanceof HTMLButtonElement || element instanceof HTMLInputElement
        ? element.disabled
        : element.getAttribute('aria-disabled') === 'true';
}
function isPortalState(value) {
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
