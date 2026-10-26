// Somente metadados previamente permitidos. Nunca armazenar conteúdo do Portal ou dados fiscais.
import { MODEL_VERSION } from './portal-model.js';
export const DIAGNOSTICS_KEY = 'nfeIntelligenceDiagnosticsV1';
export const MAX_DIAGNOSTICS = 100;
export const DIAGNOSTICS_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ALLOWED_CODES = new Set(['neural_candidate_unverified', 'neural_candidate_ambiguous', 'neural_candidate_rejected', 'portal_operation_failed', 'batch_completed', 'batch_retry_result', 'batch_preflight_failed', 'portal_state_reconciled']);
const ALLOWED_FAILURES = new Set(['portal_xml_invalid', 'portal_session_lost', 'portal_download_http_error', 'portal_download_not_found', 'portal_download_request_missing', 'portal_xml_capture_unavailable', 'portal_xml_too_large', 'portal_request_replay_invalid']);
const ALLOWED_REASONS = new Set(['review_required', 'official_link', 'unsafe_candidate', 'ambiguous_candidates', 'extension_unavailable', 'unsupported_extension', 'handshake_failed', 'stale_operation']);
const ALLOWED_STATES = new Set(['submitting', 'waiting_result', 'fetching_xml', 'failed', 'batch']);

export function normalizeDiagnostic(input, now = Date.now()) {
    if (!input || typeof input !== 'object' || !ALLOWED_CODES.has(input.code))
        return null;
    if (!ALLOWED_STATES.has(input.state))
        return null;
    const score = Number.isInteger(input.score) && input.score >= 0 && input.score <= 100
        ? input.score : null;
    const inspected = Number.isInteger(input.inspected) && input.inspected >= 0 && input.inspected <= 80
        ? input.inspected : null;
    const batch = input.code === 'batch_completed';
    const retry = input.code === 'batch_retry_result';
    const total = input.total;
    const success = input.success;
    const failed = input.failed;
    const cancelled = input.cancelled;
    if (batch && (!['total','success','failed','cancelled'].every((key) =>
        Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= 100) ||
        total === 0 || success + failed + cancelled !== total || input.state !== 'batch')) return null;
    if ((retry || input.code === 'batch_preflight_failed') && input.state !== 'batch') return null;
    if (retry && !['recovered','failed','cancelled'].includes(input.outcome)) return null;
    if (input.code === 'batch_preflight_failed' && !['extension_unavailable','unsupported_extension','handshake_failed'].includes(input.reason)) return null;
    if (input.code === 'portal_state_reconciled' &&
        (input.state !== 'failed' || input.reason !== 'stale_operation')) return null;
    // Campos desconhecidos (incluindo chave, XML, URL e texto da página) são descartados.
    return {
        at: new Date(now).toISOString(),
        code: input.code,
        state: input.state,
        modelVersion: input.modelVersion === 'portal-download-shadow-0.1' ? input.modelVersion : MODEL_VERSION,
        score,
        inspected,
        ambiguous: input.ambiguous === true,
        reason: ALLOWED_REASONS.has(input.reason) ? input.reason : null,
        failureCode: ALLOWED_FAILURES.has(input.failureCode) ? input.failureCode : null,
        total: batch ? total : null,
        success: batch ? success : null,
        failed: batch ? failed : null,
        cancelled: batch ? cancelled : null,
        outcome: retry ? input.outcome : null,
    };
}

export async function readDiagnostics(now = Date.now()) {
    const stored = await chrome.storage.local.get(DIAGNOSTICS_KEY);
    const values = stored?.[DIAGNOSTICS_KEY];
    if (!Array.isArray(values))
        return [];
    return values.filter((entry) =>
        entry && typeof entry === 'object' &&
        typeof entry.at === 'string' &&
        Number.isFinite(Date.parse(entry.at)) &&
        Date.parse(entry.at) <= now &&
        Date.parse(entry.at) >= now - DIAGNOSTICS_RETENTION_MS &&
        ALLOWED_CODES.has(entry.code) &&
        ALLOWED_STATES.has(entry.state)
    ).slice(-MAX_DIAGNOSTICS).map((entry) =>
        normalizeDiagnostic(entry, Date.parse(entry.at))).filter(Boolean);
}

let writeQueue = Promise.resolve();
export function appendDiagnostic(input, now = Date.now()) {
    const record = normalizeDiagnostic(input, now);
    if (!record)
        return Promise.resolve(false);
    const write = writeQueue.catch(() => {}).then(async () => {
        const existing = await readDiagnostics(now);
        await chrome.storage.local.set({ [DIAGNOSTICS_KEY]: [...existing, record].slice(-MAX_DIAGNOSTICS) });
        return true;
    });
    writeQueue = write.catch(() => {});
    return write;
}

export async function clearDiagnostics() {
    // Remoção somente da chave de diagnóstico; nunca afeta fornecedores nem operação ativa.
    await chrome.storage.local.remove(DIAGNOSTICS_KEY);
}
