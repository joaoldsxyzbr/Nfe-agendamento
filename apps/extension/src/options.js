import { analyzeSupplierConfig, clearSupplierConfig, saveSupplierConfig, } from './supplier-store';
import { clearDiagnostics, readDiagnostics } from './intelligence/diagnostics.js';
import { buildDiagnosticInsights } from './intelligence/insights.js';
const fileInput = requireElement('#supplier-config-file');
const clearButton = requireElement('#supplier-config-clear');
const status = requireElement('#supplier-config-status');
fileInput.addEventListener('change', () => void importSelectedFile());
clearButton.addEventListener('click', () => void clearLocalConfig());
const diagnosticStatus = document.querySelector('#diagnostics-status');
document.querySelector('#diagnostics-export')?.addEventListener('click', () => void exportDiagnostics());
document.querySelector('#diagnostics-clear')?.addEventListener('click', () => void removeDiagnostics());
const diagnosticInsights = document.querySelector('#diagnostics-insights');
document.querySelector('#diagnostics-analyze')?.addEventListener('click', () => void reviewDiagnostics());

const INSIGHT_DESCRIPTIONS = {
    repeated_portal_failure: 'Falhas recorrentes no Portal',
    batch_failure_rate: 'Lotes com metade ou mais de erros',
    recovery_success: 'Recuperações manuais concluídas',
    stale_operations: 'Operações inconsistentes recuperadas',
    preflight_repeated: 'Falhas recorrentes na verificação da extensão',
};
async function reviewDiagnostics() {
    try {
        const records = await readDiagnostics();
        const insights = buildDiagnosticInsights(records);
        if (diagnosticInsights) {
            diagnosticInsights.textContent = insights.length
                ? insights.map((item) => INSIGHT_DESCRIPTIONS[item.kind] + ': ' + item.count +
                    (item.failureCode ? ' (' + item.failureCode + ')' : '')).join(' · ')
                : records.length ? 'Nenhum padrão recorrente identificado nos eventos disponíveis.'
                    : 'Ainda não há diagnósticos.';
        }
    }
    catch {
        if (diagnosticInsights) diagnosticInsights.textContent = 'Não foi possível analisar os registros locais.';
    }
}
async function importSelectedFile() {
    const file = fileInput.files?.item(0) ?? null;
    if (!file)
        return;
    try {
        const parsed = JSON.parse(await file.text());
        const analysis = analyzeSupplierConfig(parsed);
        await saveSupplierConfig(analysis.config);
        const legacy = analysis.usedLegacyCasing
            ? ' Formato legado de maiúsculas/minúsculas detectado e normalizado.'
            : '';
        status.textContent = [
            'Configuração salva neste navegador.',
            'Fornecedores: ' + analysis.supplierCount + '.',
            'Identificadores: ' + analysis.taxIdCount + '.',
            legacy,
        ].join(' ').replace(/\s+/g, ' ').trim();
    }
    catch (error) {
        status.textContent = error instanceof Error
            ? 'Configuração não salva: ' + error.message + ' Nenhuma configuração anterior foi alterada.'
            : 'Configuração não salva: arquivo inválido. Nenhuma configuração anterior foi alterada.';
    }
    finally {
        fileInput.value = '';
    }
}
async function clearLocalConfig() {
    try {
        await clearSupplierConfig();
        status.textContent = 'Configuração local removida.';
    }
    catch {
        status.textContent = 'Não foi possível limpar a configuração local.';
    }
}
async function exportDiagnostics() {
    try {
        const records = await readDiagnostics();
        if (records.length === 0) {
            if (diagnosticStatus) diagnosticStatus.textContent = 'Nenhum diagnóstico registrado.';
            return;
        }
        const payload = JSON.stringify({
            schemaVersion: 2,
            insights: buildDiagnosticInsights(records),
            exportedAt: new Date().toISOString(),
            source: 'NFe Intelligence - diagnóstico local',
            records,
        }, null, 2);
        const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'nfe-intelligence-diagnosticos.json';
        link.click();
        globalThis.setTimeout(() => URL.revokeObjectURL(url), 15000);
        if (diagnosticStatus) diagnosticStatus.textContent = records.length + ' registros exportados localmente.';
    }
    catch {
        if (diagnosticStatus) diagnosticStatus.textContent = 'Não foi possível exportar os diagnósticos.';
    }
}

async function removeDiagnostics() {
    try {
        await clearDiagnostics();
        if (diagnosticStatus) diagnosticStatus.textContent = 'Diagnósticos apagados deste navegador.';
        if (diagnosticInsights) diagnosticInsights.textContent = 'Os padrões locais foram apagados.';
    }
    catch {
        if (diagnosticStatus) diagnosticStatus.textContent = 'Não foi possível apagar os diagnósticos.';
    }
}

function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error('Elemento ' + selector + ' ausente na página de opções.');
    return element;
}
