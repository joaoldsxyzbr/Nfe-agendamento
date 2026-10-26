// Classificador neural local em modo de observação. Pesos iniciais NÃO treinados nem calibrados.
export const MODEL_VERSION = 'portal-download-shadow-0.1';

const sigmoid = (value) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
const asBit = (value) => value === true ? 1 : 0;

export function extractControlFeatures(control) {
    const tag = String(control?.tagName ?? '').toLowerCase();
    const label = String(tag === 'input' ? control?.value ?? '' : control?.textContent ?? '').slice(0, 160).toLowerCase();
    const href = typeof control?.href === 'string' ? control.href : '';
    let officialDownload = false;
    try {
        const url = new URL(href);
        officialDownload = url.origin === 'https://www.nfe.fazenda.gov.br' &&
            url.pathname.toLowerCase() === '/portal/downloadnfe.aspx';
    }
    catch { /* A ausência de URL não é erro. */ }
    return {
        downloadWord: /download|baixar|salvar|obter/.test(label),
        documentWord: /xml|documento/.test(label),
        officialDownload,
        printWord: /imprim|danfe/.test(label),
        disabled: control?.disabled === true || control?.getAttribute?.('aria-disabled') === 'true',
    };
}

// Rede feed-forward mínima: cinco entradas binárias, três neurônios ocultos e uma saída.
// A pontuação é apenas um sinal comparativo; NÃO autoriza ações no Portal.
export function neuralDownloadScore(features) {
    const download = asBit(features?.downloadWord);
    const document = asBit(features?.documentWord);
    const official = asBit(features?.officialDownload);
    const print = asBit(features?.printWord);
    const disabled = asBit(features?.disabled);
    const recognition = sigmoid(-3 + 4 * download + 2 * document + official);
    const destination = sigmoid(-4 + 7 * official);
    const unsafe = sigmoid(-2 + 3 * print + 3 * disabled);
    return Math.round(100 * sigmoid(-2 + 5 * recognition + 4 * destination - 3 * unsafe));
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
        }
        else if (score === maximum) {
            ties += 1;
        }
    }
    return {
        modelVersion: MODEL_VERSION,
        score: maximum,
        inspected,
        ambiguous: maximum >= 85 && ties > 1,
        candidateDetected: maximum >= 85,
    };
}
