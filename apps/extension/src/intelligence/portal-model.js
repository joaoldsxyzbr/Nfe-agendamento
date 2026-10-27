// Modelo treinado exclusivamente em exemplos sintéticos; execução local em shadow mode.
// A rede NÃO tem permissão para executar ações. Limites de segurança são determinísticos.
import { TRAINED_MODEL } from './trained-model.js';
import { extractControlFeatures, featureVector, FEATURE_NAMES } from './portal-features.js';

export { extractControlFeatures };
export const MODEL_VERSION = TRAINED_MODEL.version;
const THRESHOLD = Math.round(TRAINED_MODEL.threshold * 100);
const sigmoid = (value) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));

export function neuralDownloadScore(features) {
    // Falha fechada em entradas malformadas ou controles inseguramente acionáveis.
    if (!features || typeof features !== 'object' || Array.isArray(features)) return 0;
    if (TRAINED_MODEL.features.length !== FEATURE_NAMES.length ||
        TRAINED_MODEL.features.some((feature, index) => feature !== FEATURE_NAMES[index])) return 0;
    if (features.printWord || features.disabled || features.unsupportedHref ||
        features.helpWord || features.cancelWord || !features.controlTag) return 0;

    const vector = featureVector(features);
    const hidden = TRAINED_MODEL.weights1.map((row, j) =>
        Math.tanh(row.reduce((sum, weight, i) => sum + weight * vector[i], TRAINED_MODEL.bias1[j])));
    const output = hidden.reduce((sum, value, j) =>
        sum + value * TRAINED_MODEL.weights2[j], TRAINED_MODEL.bias2);
    return Math.round(100 * sigmoid(output));
}

export function inspectDownloadCandidates(controls) {
    let maximum = 0;
    let ties = 0;
    let inspected = 0;
    for (const control of Array.from(controls ?? []).slice(0, 80)) {
        inspected += 1;
        const score = neuralDownloadScore(extractControlFeatures(control));
        if (score > maximum) {
            maximum = score;
            ties = 1;
        } else if (score === maximum) {
            ties += 1;
        }
    }
    return {
        modelVersion: MODEL_VERSION,
        score: maximum,
        inspected,
        ambiguous: maximum >= THRESHOLD && ties > 1,
        candidateDetected: maximum >= THRESHOLD,
    };
}
