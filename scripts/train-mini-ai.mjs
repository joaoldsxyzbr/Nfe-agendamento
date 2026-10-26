// Treinamento reprodutível da mini-IA, executado só no CI/desenvolvimento.
// Zero dependências extras, zero requisições e exclusivamente dados sintéticos.
import { writeFile, readFile } from 'node:fs/promises';
import { extractControlFeatures, featureVector, FEATURE_NAMES } from '../apps/extension/src/intelligence/portal-features.js';

const outputUrl = new URL('../apps/extension/src/intelligence/trained-model.js', import.meta.url);
const SEED = 20261026;
const HIDDEN = 8;
const EPOCHS = 420;
const RATE = 0.12;
let randomState = SEED;
function random() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return ((randomState >>> 0) + 0.5) / 4294967296;
}
const trainPhrases = {
    positive: ['Baixar XML', 'Download do documento', 'Obter XML', 'Salvar documento', 'Exportar XML', 'Receber XML', 'Transferir documento', 'Download XML'],
    negative: ['Consultar NF-e', 'Imprimir DANFE', 'Voltar', 'Ajuda para baixar XML', 'Como obter XML', 'Cancelar download', 'Remover documento', 'Visualizar XML', 'Copiar chave', 'Gerar PDF'],
};
const validationPhrases = {
    positive: ['Baixar arquivo XML', 'Download da nota fiscal', 'Salvar XML oficial', 'Obter documento XML', 'Exportar NF-e'],
    negative: ['Como baixar documento', 'Ajuda para download do documento', 'Impressão DANFE', 'Cancelar consulta', 'Excluir XML', 'Visualizar documento'],
};
const testPhrases = {
    positive: ['Download do XML da NF-e', 'Baixar XML autorizado', 'Salvar arquivo fiscal XML', 'Receber documento fiscal', 'Exportar nota fiscal'],
    negative: ['Como salvar XML', 'Ajuda para baixar nota fiscal', 'Cancelar download XML', 'Excluir documento fiscal', 'Imprimir nota fiscal', 'PDF', 'Nova consulta'],
};

function fakeControl(text, kind, props = {}) {
    const tags = { button: 'BUTTON', link: 'A', input: 'INPUT' };
    return {
        tagName: tags[kind] ?? 'BUTTON',
        textContent: kind === 'input' ? '' : (props.aria || props.title ? '' : text),
        value: kind === 'input' ? text : '',
        href: props.href ?? '',
        disabled: props.disabled === true,
        getAttribute(name) {
            if (name === 'aria-label') return props.aria ? text : null;
            if (name === 'title') return props.title ? text : null;
            if (name === 'aria-disabled') return props.disabled ? 'true' : null;
            return null;
        },
    };
}
const official = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx';
const outside = 'https://example.invalid/portal/downloadNFe.aspx';

function buildExamples(phrases) {
    const examples = [];
    const add = (text, positive, kind, props) => {
        const control = fakeControl(text, kind, props);
        examples.push({
            x: featureVector(extractControlFeatures(control)),
            y: positive ? 1 : 0,
            // comparação com o seletor já existente, sem treinar com esse valor
            legacy: Boolean(extractControlFeatures(control).officialDownload) ||
                text.trim().toLowerCase().startsWith('download do documento'),
        });
    };
    for (const text of phrases.positive) {
        add(text, true, 'button');
        add(text, true, 'input');
        add(text, true, 'link');
        add(text, true, 'button', { aria: true });
        add(text, true, 'button', { title: true });
        add(text, true, 'link', { href: official });
        add(text, false, 'button', { disabled: true });
        add(text, false, 'link', { href: outside });
        add(text, false, 'link', { href: 'https://www.nfe.fazenda.gov.br/portal/ajuda.aspx' });
        add('Como ' + text.toLowerCase(), false, 'button');
        add('Cancelar ' + text.toLowerCase(), false, 'button');
    }
    for (const text of phrases.negative) {
        add(text, false, 'button');
        add(text, false, 'input');
        add(text, false, 'link');
        add(text, false, 'button', { aria: true });
        add(text, false, 'button', { title: true });
        add(text, false, 'link', { href: outside });
    }
    // Critérios de avaliação sintéticos: templates separados entre treinos, validação e teste.
    for (let i = examples.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [examples[i], examples[j]] = [examples[j], examples[i]];
    }
    return examples;
}
function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x)))); }
function initModel() {
    return {
        weights1: Array.from({ length: HIDDEN }, () => Array.from({ length: FEATURE_NAMES.length }, () => (random() * 2 - 1) * 0.35)),
        bias1: Array(HIDDEN).fill(0),
        weights2: Array.from({ length: HIDDEN }, () => (random() * 2 - 1) * 0.35),
        bias2: 0,
    };
}
function forward(m, x) {
    const hidden = m.weights1.map((row, j) => Math.tanh(row.reduce((a, w, i) => a + w * x[i], m.bias1[j])));
    const probability = sigmoid(hidden.reduce((a, h, i) => a + h * m.weights2[i], m.bias2));
    return { hidden, probability };
}
function train(m, samples) {
    for (let epoch = 0; epoch < EPOCHS; epoch++) {
        for (const { x, y } of samples) {
            const { hidden, probability } = forward(m, x);
            const error = probability - y;
            const dh = hidden.map((h, j) => error * m.weights2[j] * (1 - h * h));
            for (let j = 0; j < HIDDEN; j++) {
                m.weights2[j] -= RATE * error * hidden[j];
                for (let i = 0; i < x.length; i++)
                    m.weights1[j][i] -= RATE * dh[j] * x[i];
                m.bias1[j] -= RATE * dh[j];
            }
            m.bias2 -= RATE * error;
        }
    }
}
function safePrediction(m, x) {
    // Bloqueios determinísticos também são aplicados no runtime, independentemente da saída neural.
    if (x[4] || x[5] || x[3] || x[6] || x[7] || !x[8]) return 0;
    return forward(m, x).probability;
}
function measure(rows, score) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (const row of rows) {
        const found = score(row);
        if (found && row.y) tp++;
        else if (found && !row.y) fp++;
        else if (!found && row.y) fn++;
        else tn++;
    }
    return {
        total: rows.length, tp, fp, tn, fn,
        precision: tp + fp ? +(tp / (tp + fp)).toFixed(4) : 0,
        recall: tp + fn ? +(tp / (tp + fn)).toFixed(4) : 0,
        falsePositiveRate: tn + fp ? +(fp / (fp + tn)).toFixed(4) : 0,
    };
}
const training = buildExamples(trainPhrases);
const validation = buildExamples(validationPhrases);
const test = buildExamples(testPhrases);
const model = initModel();
train(model, training);
const threshold = 0.85;
const scored = (row) => safePrediction(model, row.x) >= threshold;
const report = {
    seed: SEED,
    epochs: EPOCHS,
    threshold,
    train: measure(training, scored),
    validation: measure(validation, scored),
    test: measure(test, scored),
    baselineTest: measure(test, (row) => row.legacy),
};
console.log('MINI_AI_METRICS=' + JSON.stringify(report));
if (report.validation.falsePositiveRate > 0 || report.test.falsePositiveRate > 0 ||
    report.validation.recall < 0.9 || report.test.recall < 0.9 ||
    report.test.recall <= report.baselineTest.recall) {
    console.error('Falha no gate sintético: o classificador precisa ser revisado.');
    process.exitCode = 1;
}
const round = (value) => +value.toFixed(8);
const weights = {
    version: 'portal-download-trained-0.2',
    seed: SEED,
    features: [...FEATURE_NAMES],
    threshold,
    weights1: model.weights1.map((row) => row.map(round)),
    bias1: model.bias1.map(round),
    weights2: model.weights2.map(round),
    bias2: round(model.bias2),
};
const file = '// Gerado deterministicamente por scripts/train-mini-ai.mjs. NUNCA editar manualmente.\n' +
    'export const TRAINED_MODEL = ' + JSON.stringify(weights, null, 2) + ';\n';
if (process.argv.includes('--write')) {
    await writeFile(outputUrl, file);
    console.log('MODEL_WRITTEN=true');
} else if (process.argv.includes('--check')) {
    const actual = await readFile(outputUrl, 'utf8').catch(() => '');
    if (actual !== file) {
        console.error('Artefato do modelo desatualizado: executar node scripts/train-mini-ai.mjs --write');
        process.exitCode = 1;
    } else {
        console.log('MODEL_UP_TO_DATE=true');
    }
} else if (process.argv.includes('--print-model')) {
    console.log('MINI_AI_WEIGHTS=' + JSON.stringify(weights));
}
