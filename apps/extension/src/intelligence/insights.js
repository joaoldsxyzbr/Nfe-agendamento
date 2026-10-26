// P3: heurísticas offline para priorizar diagnósticos. NÃO é inferência neural,
// não identifica notas, não correlaciona pessoas e não executa recuperação.
import { DIAGNOSTICS_RETENTION_MS, MAX_DIAGNOSTICS, normalizeDiagnostic } from './diagnostics.js';

export function buildDiagnosticInsights(records, now = Date.now()) {
    if (!Array.isArray(records)) return [];
    const recent = records.slice(-MAX_DIAGNOSTICS).map((raw) => {
        if (!raw || typeof raw.at !== 'string') return null;
        const at = Date.parse(raw.at);
        if (!Number.isFinite(at) || at < now - DIAGNOSTICS_RETENTION_MS || at > now) return null;
        return normalizeDiagnostic(raw, at);
    }).filter(Boolean);
    const failureCounts = new Map();
    let highFailureBatches = 0;
    let successfulRecoveries = 0;
    let reconciledOperations = 0;
    let preflightFailures = 0;
    for (const entry of recent) {
        if (entry.code === 'portal_operation_failed' && entry.failureCode) {
            failureCounts.set(entry.failureCode, (failureCounts.get(entry.failureCode) ?? 0) + 1);
        }
        if (entry.code === 'batch_completed' && entry.total > 0 &&
            entry.failed * 2 >= entry.total) highFailureBatches++;
        if (entry.code === 'batch_retry_result' && entry.outcome === 'recovered') successfulRecoveries++;
        if (entry.code === 'portal_state_reconciled') reconciledOperations++;
        if (entry.code === 'batch_preflight_failed') preflightFailures++;
    }
    const insights = [];
    for (const [failureCode, count] of failureCounts) {
        if (count >= 3) insights.push({ kind: 'repeated_portal_failure', count, failureCode });
    }
    if (highFailureBatches) insights.push({ kind: 'batch_failure_rate', count: highFailureBatches });
    if (successfulRecoveries) insights.push({ kind: 'recovery_success', count: successfulRecoveries });
    if (reconciledOperations) insights.push({ kind: 'stale_operations', count: reconciledOperations });
    if (preflightFailures >= 2) insights.push({ kind: 'preflight_repeated', count: preflightFailures });
    return insights.sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)).slice(0, 8);
}
