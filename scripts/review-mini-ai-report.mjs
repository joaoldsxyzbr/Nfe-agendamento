// Revisão local de um JSON exportado voluntariamente da extensão (schemaVersion 2).
// Não envia dados para rede e não imprime campos livres do arquivo.
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIAGNOSTICS_RETENTION_MS, normalizeDiagnostic } from '../apps/extension/src/intelligence/diagnostics.js';
import { buildDiagnosticInsights } from '../apps/extension/src/intelligence/insights.js';

const SOURCE = 'NFe Intelligence - diagnóstico local';
const MAX_BYTES = 65536;
const ALLOWED_MODELS = new Set(['portal-download-shadow-0.1', 'portal-download-trained-0.2']);
const RECOMMENDATIONS = Object.freeze({
    repeated_portal_failure: 'Revisar a categoria de falha no background, criar caso de regressão e comparar com o estado do Portal.',
    batch_failure_rate: 'Inspecionar os estados do lote e reproduzir cenário de múltiplas falhas com XML sintético.',
    recovery_success: 'Verificar se a recuperação manual permanece idempotente e não afeta notas já concluídas.',
    stale_operations: 'Revisar restauração da sessão MV3 e fechamento da janela quando o Portal for interrompido.',
    preflight_repeated: 'Verificar handshake da extensão, compatibilidade e tratamento de erros sem retentativas ilimitadas.',
});
const FAILURE_CODES = new Set(['portal_xml_invalid', 'portal_session_lost',
    'portal_download_http_error', 'portal_download_not_found',
    'portal_download_request_missing', 'portal_xml_capture_unavailable',
    'portal_xml_too_large', 'portal_request_replay_invalid']);

function invalid() { throw new Error('Relatório inválido: formato, tamanho ou origem não reconhecidos.'); }
const own = (v, key) => Object.prototype.hasOwnProperty.call(v, key);

/** Recebe JSON já parseado, descarta todo campo extra e NUNCA retorna registros originais. */
export function analyzeExport(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        data.schemaVersion !== 2 || data.source !== SOURCE ||
        !Array.isArray(data.records) || data.records.length < 1 || data.records.length > 100 ||
        typeof data.exportedAt !== 'string') invalid();
    const asOf = Date.parse(data.exportedAt);
    if (!Number.isFinite(asOf)) invalid();
    const records = [];
    let discardedRecords = 0;
    for (const raw of data.records) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
            typeof raw.at !== 'string') { discardedRecords++; continue; }
        const at = Date.parse(raw.at);
        if (!Number.isFinite(at) || at > asOf || at < asOf - DIAGNOSTICS_RETENTION_MS) {
            discardedRecords++;
            continue;
        }
        const normalized = normalizeDiagnostic(raw, at);
        if (!normalized || (normalized.code === 'portal_operation_failed' && normalized.state !== 'failed') ||
            (normalized.code === 'batch_completed' && normalized.state !== 'batch')) {
            discardedRecords++;
            continue;
        }
        // Nunca passar raw nem campos livres ao analisador.
        records.push(normalized);
    }
    const findings = buildDiagnosticInsights(records, asOf).map((finding) => {
        // insights e failureCode não podem ser fornecidos diretamente pelo relatório.
        const kind = own(RECOMMENDATIONS, finding.kind) ? finding.kind : null;
        if (!kind) return null;
        const safe = { kind, count: Math.min(100, Math.max(0, finding.count)) };
        if (kind === 'repeated_portal_failure' &&
            FAILURE_CODES.has(finding.failureCode)) safe.failureCode = finding.failureCode;
        return safe;
    }).filter(Boolean);
    const recommendations = findings.map((item) => ({
        kind: item.kind,
        recommendation: RECOMMENDATIONS[item.kind],
    }));
    const modelVersions = [...new Set(records.map((item) => item.modelVersion)
        .filter((v) => ALLOWED_MODELS.has(v)))].sort();
    return {
        schemaVersion: 2,
        exportedAt: new Date(asOf).toISOString(),
        acceptedRecords: records.length,
        discardedRecords,
        modelVersions,
        findings,
        recommendations,
    };
}

export function formatReview(review) {
    const lines = [
        'NFe Intelligence — triagem local (sem dados fiscais)',
        'Eventos aceitos: ' + review.acceptedRecords + ' | descartados: ' + review.discardedRecords,
    ];
    for (const item of review.findings) {
        const safeCode = FAILURE_CODES.has(item.failureCode) ? ' [' + item.failureCode + ']' : '';
        lines.push(item.kind + safeCode + ': ' + item.count + ' ocorrências');
    }
    for (const item of review.recommendations) {
        if (own(RECOMMENDATIONS, item.kind)) lines.push('Revisar: ' + RECOMMENDATIONS[item.kind]);
    }
    if (!review.findings.length) lines.push('Nenhum padrão recorrente identificado nos registros válidos.');
    return lines.join('\n');
}

async function main() {
    if (process.argv.length !== 3) invalid();
    const filename = resolve(process.argv[2]);
    const details = await stat(filename);
    if (!details.isFile() || details.size > MAX_BYTES || details.size < 2) invalid();
    const contents = await readFile(filename, 'utf8');
    if (Buffer.byteLength(contents, 'utf8') > MAX_BYTES) invalid();
    let parsed;
    try { parsed = JSON.parse(contents); } catch { invalid(); }
    const reviewed = analyzeExport(parsed);
    process.stdout.write(formatReview(reviewed) + '\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(() => {
        // Não revelar caminho local ou conteúdo de arquivo na mensagem de erro.
        process.stderr.write('Não foi possível revisar o JSON local; verifique o esquema exportado pela extensão.\n');
        process.exitCode = 1;
    });
}
