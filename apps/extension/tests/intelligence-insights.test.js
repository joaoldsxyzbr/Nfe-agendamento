import { describe, expect, it } from 'vitest';
import { buildDiagnosticInsights } from '../src/intelligence/insights.js';

const time = '2026-10-26T13:00:00.000Z';
const e = (code, additional = {}) => ({ at: time, code, state: 'failed', failureCode: 'portal_session_lost', ...additional });

describe('P3: análise offline de falhas recorrentes e lote', () => {
    it('detecta falhas repetidas por código sem coletar mensagens nem conteúdo fiscal', () => {
        const logs = [e('portal_operation_failed'), e('portal_operation_failed'), e('portal_operation_failed', {
            accessKey: '12345678901234567890123456789012345678901234',
            message: 'CNPJ secreto',
        })];
        const result = buildDiagnosticInsights(logs);
        expect(result).toContainEqual(expect.objectContaining({
            kind: 'repeated_portal_failure', count: 3, failureCode: 'portal_session_lost',
        }));
        expect(JSON.stringify(result)).not.toContain('12345678');
        expect(JSON.stringify(result)).not.toContain('CNPJ');
    });
    it('distingue lote com falhas elevadas e sucesso em tentativa manual', () => {
        const logs = [
            e('batch_completed', { state: 'batch', total: 6, success: 2, failed: 4, cancelled: 0 }),
            e('batch_retry_result', { state: 'batch', outcome: 'recovered' }),
        ];
        expect(buildDiagnosticInsights(logs)).toEqual(expect.arrayContaining([
            expect.objectContaining({ kind: 'batch_failure_rate', count: 1 }),
            expect.objectContaining({ kind: 'recovery_success', count: 1 }),
        ]));
    });
    it('não inventa problemas a partir de poucos eventos, entradas desconhecidas ou dados antigos', () => {
        const logs = [e('portal_operation_failed'), e('portal_operation_failed', { failureCode: 'invalid_xml' }),
            { ...e('portal_operation_failed'), at: '2025-01-01T00:00:00Z' }, { code: 'injetado', state: 'batch', value: '<xml>' }];
        expect(buildDiagnosticInsights(logs)).toEqual([]);
    });
    it('limita processamento e saída mesmo com volume ou formatos arbitrários', () => {
        const many = Array.from({ length: 500 }, () => e('portal_operation_failed'));
        const result = buildDiagnosticInsights(many);
        expect(result.length).toBeLessThanOrEqual(8);
        expect(result.every((x) => Object.keys(x).every((key) => ['kind','count','failureCode'].includes(key)))).toBe(true);
    });
});
