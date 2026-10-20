export const SUPPLIER_CONFIG_KEY = 'supplierRulesV1';
let cachedSupplierConfig;
let pendingSupplierConfigLoad = null;
let supplierCacheEpoch = 0;
const supplierIndexes = new WeakMap();
export function normalizeTaxId(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    if ([...raw].some((character) => !(/[A-Z0-9]/.test(character) || /\s/.test(character) || character === '.' || character === '/' || character === '-'))) {
        return null;
    }
    const normalized = [...raw].filter((character) => /[A-Z0-9]/.test(character)).join('');
    if (/^[0-9]{11}$/.test(normalized))
        return normalized;
    if (/^[A-Z0-9]{12}[0-9]{2}$/.test(normalized))
        return normalized;
    return null;
}
export function analyzeSupplierConfig(value) {
    if (!isRecord(value)) {
        throw new Error('Raiz inválida: esperado objeto JSON.');
    }
    const versionField = readKeyCaseInsensitive(value, 'version', '$');
    const suppliersField = readKeyCaseInsensitive(value, 'suppliers', '$');
    if (versionField.value !== 1) {
        throw new Error('$.version inválido: esperado número 1.');
    }
    if (!Array.isArray(suppliersField.value)) {
        throw new Error('$.suppliers inválido: esperado array.');
    }
    let usedLegacyCasing = versionField.usedLegacyCasing || suppliersField.usedLegacyCasing;
    const seen = new Map();
    let taxIdCount = 0;
    const suppliers = suppliersField.value.map((rawSupplier, supplierIndex) => {
        const supplierPath = `$.suppliers[${supplierIndex}]`;
        if (!isRecord(rawSupplier)) {
            throw new Error(`${supplierPath} inválido: esperado objeto.`);
        }
        const idField = readKeyCaseInsensitive(rawSupplier, 'id', supplierPath);
        const taxIdsField = readKeyCaseInsensitive(rawSupplier, 'taxIds', supplierPath);
        usedLegacyCasing ||= idField.usedLegacyCasing || taxIdsField.usedLegacyCasing;
        const id = typeof idField.value === 'string' ? idField.value.trim() : '';
        if (!id) {
            throw new Error(`${supplierPath}.id inválido: esperado texto não vazio.`);
        }
        if (!Array.isArray(taxIdsField.value) || taxIdsField.value.length === 0) {
            throw new Error(`${supplierPath}.taxIds inválido: esperado array com ao menos um identificador.`);
        }
        const taxIds = taxIdsField.value.map((rawTaxId, taxIdIndex) => {
            const taxIdPath = `${supplierPath}.taxIds[${taxIdIndex}]`;
            if (typeof rawTaxId !== 'string') {
                throw new Error(`${taxIdPath} inválido: esperado texto.`);
            }
            const normalized = normalizeTaxId(rawTaxId);
            if (!normalized) {
                throw new Error(`${taxIdPath} inválido: CPF/CNPJ fora do formato aceito.`);
            }
            const existing = seen.get(normalized);
            if (existing && existing !== id) {
                throw new Error('Identificador fiscal configurado para fornecedores diferentes.');
            }
            seen.set(normalized, id);
            taxIdCount += 1;
            return normalized;
        });
        return Object.freeze({ id, taxIds: Object.freeze(taxIds) });
    });
    const config = Object.freeze({
        version: 1,
        suppliers: Object.freeze(suppliers),
    });
    return Object.freeze({
        config,
        usedLegacyCasing,
        supplierCount: suppliers.length,
        taxIdCount,
    });
}
export function validateSupplierConfig(value) {
    return analyzeSupplierConfig(value).config;
}
export function resolveSupplierFromConfig(config, taxId) {
    if (!config)
        return null;
    const normalized = normalizeTaxId(taxId);
    if (!normalized)
        return null;
    let index = supplierIndexes.get(config);
    if (!index) {
        const created = new Map();
        for (const supplier of config.suppliers) {
            for (const supplierTaxId of supplier.taxIds)
                created.set(supplierTaxId, supplier.id);
        }
        index = created;
        supplierIndexes.set(config, index);
    }
    return index.get(normalized) ?? null;
}
export async function loadSupplierConfig() {
    if (cachedSupplierConfig !== undefined)
        return cachedSupplierConfig;
    if (pendingSupplierConfigLoad)
        return pendingSupplierConfigLoad;
    const epoch = supplierCacheEpoch;
    const load = (async () => {
        try {
            const stored = await chrome.storage.local.get(SUPPLIER_CONFIG_KEY);
            const value = stored?.[SUPPLIER_CONFIG_KEY];
            const config = value === undefined ? null : validateSupplierConfig(value);
            if (epoch === supplierCacheEpoch)
                cachedSupplierConfig = config;
            return config;
        }
        catch {
            if (epoch === supplierCacheEpoch)
                cachedSupplierConfig = null;
            return null;
        }
    })();
    pendingSupplierConfigLoad = load;
    try {
        return await load;
    }
    finally {
        if (pendingSupplierConfigLoad === load)
            pendingSupplierConfigLoad = null;
    }
}
export function invalidateSupplierConfigCache() {
    supplierCacheEpoch += 1;
    cachedSupplierConfig = undefined;
    pendingSupplierConfigLoad = null;
}
export async function saveSupplierConfig(config) {
    const validated = validateSupplierConfig(config);
    await chrome.storage.local.set({ [SUPPLIER_CONFIG_KEY]: validated });
    supplierCacheEpoch += 1;
    cachedSupplierConfig = validated;
    pendingSupplierConfigLoad = null;
}
export async function clearSupplierConfig() {
    await chrome.storage.local.remove(SUPPLIER_CONFIG_KEY);
    supplierCacheEpoch += 1;
    cachedSupplierConfig = null;
    pendingSupplierConfigLoad = null;
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function readKeyCaseInsensitive(object, expected, path) {
    const matches = Object.keys(object).filter((key) => key.toLowerCase() === expected.toLowerCase());
    if (matches.length > 1) {
        throw new Error(`${path} contém campos ambíguos para "${expected}".`);
    }
    if (matches.length === 0) {
        return { value: undefined, usedLegacyCasing: false };
    }
    const actual = matches[0];
    return {
        value: object[actual],
        usedLegacyCasing: actual !== expected,
    };
}
