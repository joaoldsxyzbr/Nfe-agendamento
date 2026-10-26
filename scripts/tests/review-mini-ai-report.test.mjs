import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeExport, formatReview } from '../review-mini-ai-report.mjs';

const fixed = '2026-10-26T16:00:00.000Z';
function payload(records, additional = {}) {
    return { schemaVersion: 2, exportedAt: fixed,
        source: 'NFe Intelligence - diagnóstico local', records, ...additional };
}
function failure(overrides = {}) {
    return { at: fixed, code: 'portal_operation_failed', state: 'failed',
        failureCode: 'portal_session_lost', ...overrides };
}

test('gera somente diagnóstico agregado e recomendações de catálogo fechado', () => {
    const privateValue = '42260812345678000123550010000012341000012342';
    const input = payload([
        failure({ accessKey: privateValue, xml: '<nfeProc>' + privateValue + '</nfeProc>' }),
        failure({ url: 'https://example.invalid/?secret=' + privateValue }),
        failure({ message: privateValue }),
        { at: fixed, code: 'batch_completed', state: 'batch',
            total: 4, success: 1, failed: 3, cancelled: 0 },
    ], { insights: [{ kind: 'fake', count: 999, secret: privateValue }] });
    const review = analyzeExport(input);
    const printable = formatReview(review);
    assert.equal(review.acceptedRecords, 4);
    assert.equal(review.findings.some((f) => f.kind === 'repeated_portal_failure'), true);
    assert.equal(review.findings.some((f) => f.kind === 'batch_failure_rate'), true);
    assert.equal(printable.includes(privateValue), false);
    assert.equal(printable.includes('nfeProc'), false);
    assert.equal(printable.includes('example.invalid'), false);
    assert.equal(printable.includes('fake'), false);
    assert.equal(printable.includes('portal_session_lost'), true);
    assert.deepEqual(Object.keys(review).sort(),
        ['acceptedRecords','discardedRecords','exportedAt','findings','modelVersions','recommendations','schemaVersion'].sort());
});

test('rejeita relatórios errados, grande volume e tamanhos fora do contrato', () => {
    const base = payload([failure()]);
    for (const invalid of [
        null, [], 'hello',
        { ...base, schemaVersion: 1 },
        { ...base, source: 'origem falsa' },
        { ...base, exportedAt: 'invalid' },
        { ...base, records: 'not-array' },
        { ...base, records: Array.from({ length: 101 }, () => failure()) },
        { ...base, records: [] },
    ]) assert.throws(() => analyzeExport(invalid), /Relatório inválido/);
});

test('eventos injetados ou fora da janela temporal não entram na análise', () => {
    const report = analyzeExport(payload([
        failure(),
        { at: '2025-01-01T00:00:00.000Z', ...failure(), at: '2025-01-01T00:00:00.000Z' },
        { at: fixed, code: '<script>segredo</script>', state: 'batch' },
        { at: fixed, code: 'batch_completed', state: 'batch', total: 4,
            success: 9, failed: 0, cancelled: 0, key: 'secret' },
    ]));
    assert.equal(report.acceptedRecords, 1);
    assert.equal(report.discardedRecords, 3);
    assert.equal(JSON.stringify(report).includes('<script>'), false);
    assert.equal(report.findings.length, 0);
});

test('não aceita campos textuais inseridos em failureCode ou modelVersion', () => {
    const malicious = '<img src=x onerror=alert(1)>';
    const review = analyzeExport(payload([
        failure({ failureCode: malicious, modelVersion: malicious }),
        failure({ failureCode: malicious }),
        failure({ failureCode: malicious }),
    ]));
    assert.deepEqual(review.findings, []);
    assert.equal(JSON.stringify(review).includes(malicious), false);
    assert.deepEqual(review.modelVersions, ['portal-download-trained-0.2']);
});

test('não confia em insights exportados: recomputa a partir de eventos válidos', () => {
    const data = payload([failure()], {
        insights: [{ kind: 'repeated_portal_failure', count: 100, failureCode: 'portal_session_lost' }],
    });
    const review = analyzeExport(data);
    assert.deepEqual(review.findings, []);
    assert.deepEqual(review.recommendations, []);
});

test('formato do relatório é determinístico e sem diagnóstico livre', () => {
    const report = analyzeExport(payload([failure(), failure(), failure()]));
    const first = formatReview(report);
    assert.equal(first, formatReview(report));
    assert.equal(first.includes('3 ocorrências'), true);
    assert.equal(first.includes('Revisar'), true);
});

test('CLI lê somente arquivo local e não revela dados brutos nem caminho sensível', async () => {
    const temp = await mkdtemp(join(tmpdir(), 'nfe-p4-'));
    const privateValue = '42260812345678000123550010000012341000012342';
    const script = fileURLToPath(new URL('../review-mini-ai-report.mjs', import.meta.url));
    try {
        const file = resolve(temp, 'relatorio.json');
        await writeFile(file, JSON.stringify(payload([
            failure({ xml: '<nfeProc>' + privateValue + '</nfeProc>' }),
            failure({ url: 'https://example.invalid/' + privateValue }),
            failure({ textContent: privateValue }),
        ])), 'utf8');
        const success = spawnSync(process.execPath, [script, file], { encoding: 'utf8', timeout: 10000 });
        assert.equal(success.status, 0, success.stderr);
        assert.equal(success.stdout.includes('portal_session_lost'), true);
        for (const secret of [privateValue, 'nfeProc', 'example.invalid', temp]) {
            assert.equal((success.stdout + success.stderr).includes(secret), false);
        }
        const badFile = resolve(temp, 'arquivo-privado-' + privateValue + '.json');
        await writeFile(badFile, '{malformed:' + privateValue, 'utf8');
        const failureRun = spawnSync(process.execPath, [script, badFile], { encoding: 'utf8', timeout: 10000 });
        assert.equal(failureRun.status, 1);
        assert.equal((failureRun.stdout + failureRun.stderr).includes(privateValue), false);
        assert.equal((failureRun.stdout + failureRun.stderr).includes(temp), false);
    } finally {
        await rm(temp, { force: true, recursive: true });
    }
});
