import { analyzeSupplierConfig, clearSupplierConfig, saveSupplierConfig, } from './supplier-store';
const fileInput = requireElement('#supplier-config-file');
const clearButton = requireElement('#supplier-config-clear');
const status = requireElement('#supplier-config-status');
fileInput.addEventListener('change', () => void importSelectedFile());
clearButton.addEventListener('click', () => void clearLocalConfig());
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
function requireElement(selector) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error('Elemento ' + selector + ' ausente na página de opções.');
    return element;
}
