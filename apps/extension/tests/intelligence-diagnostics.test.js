import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    DIAGNOSTICS_KEY, MAX_DIAGNOSTICS, appendDiagnostic,
    clearDiagnostics, normalizeDiagnostic, readDiagnostics,
} from '../src/intelligence/diagnostics';

let local;
beforeEach(() => {
    local = new Map();
    vi.stubGlobal('chrome', {
        storage: {
            local: {
                get: vi.fn(async (key) => ({ [key]: local.get(key) })),
                set: vi.fn(async (items) => { for (const [key, value] of Object.entries(items)) local.set(key, value); }),
                remove: vi.fn(async (key) => { local.delete(key); }),
            },
        },
    });
});
afterEach(() => vi.unstubAllGlobals());

const event = (extra = {}) => ({
    code: 'portal_operation_failed',
    state: 'failed',
    failureCode: 'portal_xml_invalid',
    ...extra,
});

describe('diagnósticos locais de operação', () => {
    it('descarta campos sensíveis, mesmo quando recebidos de uma página externa', () => {
        const record = normalizeDiagnostic(event({
            accessKey: '12345678901234567890123456789012345678901234',
            xml: '<nfeProc>sigilo</nfeProc>',
            url: 'https://portal/?chave=segredo',
            textContent: 'CNPJ real',
            score: 91,
            modelVersion: 'portal-download-trained-0.2',
        }), Date.UTC(2026, 9, 26));
        expect(JSON.stringify(record)).not.toMatch(/123456|nfeProc|segredo|CNPJ/);
        expect(record).toMatchObject({ code: 'portal_operation_failed', state: 'failed', failureCode: 'portal_xml_invalid' });
        expect(record).not.toHaveProperty('score');
        expect(record).not.toHaveProperty('modelVersion');
    });
    it('rejeita códigos e estados arbitrários, incluindo legado neural', async () => {
        expect(normalizeDiagnostic(event({ code: 'injetado' }))).toBeNull();
        expect(normalizeDiagnostic(event({ state: 'chave-secreta' }))).toBeNull();
        expect(normalizeDiagnostic(event({ code: 'neural_candidate_unverified' }))).toBeNull();
        expect(normalizeDiagnostic(event({ failureCode: 'score:91' })).failureCode).toBeNull();
        expect(await appendDiagnostic(event({ code: 'injetado' }))).toBe(false);
    });
    it('serializa eventos simultâneos e mantém no máximo 100 registros', async () => {
        const now = Date.UTC(2026, 9, 26);
        await Promise.all(Array.from({ length: MAX_DIAGNOSTICS + 5 }, (_, index) =>
            appendDiagnostic(event(), now + index)));
        const result = await readDiagnostics(now + 150);
        expect(result).toHaveLength(MAX_DIAGNOSTICS);
        expect(result[0].at).toBe(new Date(now + 5).toISOString());
    });
    it('valida soma, limites e saneamento de relatórios agregados', async () => {
        const now = Date.UTC(2026, 9, 26);
        const batch = normalizeDiagnostic({
            code: 'batch_completed', state: 'batch', total: 4, success: 2, failed: 1, cancelled: 1,
            keys: ['42260812345678000123550010000012341000012342'],
            xml: '<nfeProc>privado</nfeProc>', url: 'https://example.invalid/?segredo',
        }, now);
        expect(batch).toMatchObject({ total: 4, success: 2, failed: 1, cancelled: 1 });
        expect(JSON.stringify(batch)).not.toMatch(/422608|nfeProc|segredo/);
        expect(normalizeDiagnostic({ code: 'batch_completed', state: 'batch', total: 2,
            success: 2, failed: 2, cancelled: 0 }, now)).toBeNull();
        expect(normalizeDiagnostic({ code: 'batch_completed', state: 'batch', total: 101,
            success: 101, failed: 0, cancelled: 0 }, now)).toBeNull();
        expect(normalizeDiagnostic({ code: 'batch_retry_result', state: 'batch',
            outcome: 'invoice-value:999' }, now)).toBeNull();
        expect(normalizeDiagnostic({ code: 'batch_preflight_failed', state: 'batch',
            reason: 'host/secret' }, now)).toBeNull();
        await appendDiagnostic({
            code: 'batch_retry_result', state: 'batch', outcome: 'recovered',
            accessKey: '12345678901234567890123456789012345678901234',
        }, now);
        const reread = await readDiagnostics(now);
        expect(reread).toHaveLength(1);
        expect(reread[0].outcome).toBe('recovered');
        expect(JSON.stringify(reread)).not.toContain('12345678');
    });
    it('descarta registros vencidos e não apaga outras configurações ao limpar', async () => {
        const now = Date.UTC(2026, 9, 26);
        local.set(DIAGNOSTICS_KEY, [
            normalizeDiagnostic(event(), now - 15 * 24 * 60 * 60 * 1000),
            normalizeDiagnostic(event(), now),
        ]);
        local.set('supplier-config', { suppliers: ['test'] });
        expect(await readDiagnostics(now)).toHaveLength(1);
        await clearDiagnostics();
        expect(local.has(DIAGNOSTICS_KEY)).toBe(false);
        expect(local.has('supplier-config')).toBe(true);
    });
});
