// Somente metadados previamente permitidos. Nunca armazenar conteúdo do Portal ou dados fiscais.
export const DIAGNOSTICS_KEY = 'nfeIntelligenceDiagnosticsV1';
export const MAX_DIAGNOSTICS = 100;
export const DIAGNOSTICS_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const ALLOWED_CODES = new Set(['neural_candidate_unverified', 'neural_candidate_ambiguous', 'portal_operation_failed']);
const ALLOWED_FAILURES = new Set(['portal_xml_invalid', 'portal_session_lost', 'portal_download_http_error', 'portal_download_not_found', 'portal_download_request_missing', 'portal_xml_capture_unavailable', 'portal_xml_too_large', 'portal_request_replay_invalid']);
const ALLOWED_STATES = new Set(['submitting', 'waiting_result', 'fetching_xml', 'failed']);

export function normalizeDiagnostic(input, now = Date.now()) {
    if (!input || typeof input !== 'object' || !ALLOWED_CODES.has(input.code))
        return null;
    if (!ALLOWED_STATES.has(input.state))
        return null;
    const score = Number.isInteger(input.score) && input.score >= 0 && input.score <= 100
        ? input.score : null;
    const inspected = Number.isInteger(input.inspected) && input.inspected >= 0 && input.inspected <= 80
        ? input.inspected : null;
    // Campos desconhecidos (incluindo chave, XML, URL e texto da página) são descartados.
    return {
        at: new Date(now).toISOString(),
        code: input.code,
        state: input.state,
        modelVersion: 'portal-download-shadow-0.1',
        score,
        inspected,
        ambiguous: input.ambiguous === true,
        failureCode: ALLOWED_FAILURES.has(input.failureCode) ? input.failureCode : null,
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
    ).slice(-MAX_DIAGNOSTICS);
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
