// Avaliador P2: propõe navegação, mas NÃO executa ações ou retém nós DOM.
// Mesmo com score alto, o modelo não é autoridade para cliques.
import { MODEL_VERSION, neuralDownloadScore, extractControlFeatures } from './portal-model.js';

const PORTAL_ORIGIN = 'https://www.nfe.fazenda.gov.br';
const CONSULT_PATH = '/portal/consultarecaptcha.aspx';
const DOWNLOAD_PATH = '/portal/downloadnfe.aspx';
const LIMIT = 80;
const MIN_SCORE = 85;
const REASONS = Object.freeze({
    INVALID_ORIGIN: 'invalid_origin',
    INVALID_ROUTE: 'invalid_route',
    INVALID_STATE: 'invalid_state',
    TOO_MANY: 'too_many_controls',
    AMBIGUOUS: 'ambiguous_candidates',
    UNSAFE: 'unsafe_candidate',
    NONE: 'no_candidate',
    REVIEW: 'review_required',
    LINK: 'official_link',
});
function result(decision, reason, score = 0, inspected = 0, candidates = 0) {
    return { decision, reason, score, inspected, candidates, modelVersion: MODEL_VERSION };
}
function officialUrl(value, expectedPath) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.origin === PORTAL_ORIGIN &&
            url.pathname.toLowerCase() === expectedPath &&
            !url.username && !url.password && !url.hash;
    } catch {
        return false;
    }
}
function hasSafeDom(control) {
    if (!control || typeof control !== 'object' || !control.isConnected ||
        control.hidden || control.inert || control.disabled || typeof control.onclick === 'function') return false;
    const getAttr = typeof control.getAttribute === 'function' ? (key) => control.getAttribute(key) : () => null;
    if (getAttr('aria-hidden') === 'true' || getAttr('aria-disabled') === 'true' ||
        getAttr('hidden') !== null || getAttr('inert') !== null ||
        getAttr('onclick') !== null) return false;
    if (typeof control.closest !== 'function' ||
        control.closest('fieldset[disabled], [inert], [aria-hidden="true"], [hidden]')) return false;
    if (control.style?.display === 'none' || control.style?.visibility === 'hidden' ||
        control.style?.pointerEvents === 'none') return false;
    if (typeof control.getClientRects !== 'function') return false;
    const rectangles = control.getClientRects();
    return Boolean(rectangles && Array.from(rectangles).some(
        (rect) => Number(rect?.width) > 0 && Number(rect?.height) > 0));
}
function trustedTarget(control, features) {
    const tag = String(control.tagName ?? '').toLowerCase();
    if (!features.controlTag) return false;
    if (tag === 'a') return features.officialDownload &&
        officialUrl(control.href, DOWNLOAD_PATH);
    // Buttons/inputs só podem receber proposta para revisão, não clique.
    if (tag !== 'button' && tag !== 'input') return false;
    if (typeof control.href === 'string' && control.href) return false;
    return true;
}

/** Resultado somente serializável e sem referências à página. */
export function evaluateNavigationProposal({ url, state, controls } = {}) {
    if (!officialUrl(url, CONSULT_PATH))
        return result('blocked', (() => {
            try { return new URL(url).origin === PORTAL_ORIGIN ? REASONS.INVALID_ROUTE : REASONS.INVALID_ORIGIN; }
            catch { return REASONS.INVALID_ORIGIN; }
        })());
    if (state !== 'submitting') return result('blocked', REASONS.INVALID_STATE);

    const elements = Array.from(controls ?? []);
    if (elements.length > LIMIT) return result('blocked', REASONS.TOO_MANY, 0, LIMIT, 0);

    let best = 0;
    let candidateCount = 0;
    let unsafe = false;
    let candidateReason = REASONS.REVIEW;
    for (const control of elements) {
        const features = extractControlFeatures(control);
        const score = neuralDownloadScore(features);
        if (score < MIN_SCORE) continue;
        candidateCount += 1;
        best = Math.max(best, score);
        if (!hasSafeDom(control) || !trustedTarget(control, features)) {
            unsafe = true;
            continue;
        }
        candidateReason = String(control.tagName ?? '').toLowerCase() === 'a'
            ? REASONS.LINK : REASONS.REVIEW;
    }
    if (!candidateCount) return result('none', REASONS.NONE, 0, elements.length, 0);
    if (unsafe) return result('blocked', REASONS.UNSAFE, best, elements.length, candidateCount);
    if (candidateCount > 1)
        return result('blocked', REASONS.AMBIGUOUS, best, elements.length, candidateCount);
    return result('propose', candidateReason, best, elements.length, candidateCount);
}
