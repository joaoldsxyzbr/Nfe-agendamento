import { PORTAL_ORIGIN } from './shared/constants.js';
export const accessKeySelector = '#ctl00_ContentPlaceHolder1_txtChaveAcessoResumo, input[id$="txtChaveAcessoResumo"]';
export const consultButtonSelector = '#ctl00_ContentPlaceHolder1_btnConsultarHCaptcha, #ctl00_ContentPlaceHolder1_btnConsultar';
export function isOfficialConsultUrl(value) {
    try {
        const url = new URL(value);
        return url.origin === PORTAL_ORIGIN &&
            url.pathname.toLowerCase() === '/portal/consultarecaptcha.aspx';
    }
    catch {
        return false;
    }
}
export function isOfficialDownloadUrl(value) {
    try {
        const url = new URL(value);
        return url.origin === PORTAL_ORIGIN &&
            url.pathname.toLowerCase() === '/portal/downloadnfe.aspx';
    }
    catch {
        return false;
    }
}
export function isDownloadLabel(value) {
    return normalize(value).startsWith('download do documento');
}

/**
 * Só autoriza cliques no download conhecido do Portal, com um alvo único e
 * visível. Botões ASP.NET sem href continuam aceitos pelo rótulo legado,
 * mas overrides de formulário e destinos externos são recusados.
 */
export function isSafeDownloadControl(control) {
    const tag = String(control?.tagName ?? '').toUpperCase();
    if (!['A', 'BUTTON', 'INPUT'].includes(tag) || control.isConnected !== true ||
        control.hidden || control.inert || control.disabled ||
        control.getAttribute?.('aria-hidden') === 'true' ||
        control.getAttribute?.('aria-disabled') === 'true' ||
        control.closest?.('[hidden], [inert], [aria-hidden="true"], fieldset[disabled]')) return false;
    const rectangles = control.getClientRects?.();
    if (!rectangles || !Array.from(rectangles).some((rect) => rect.width > 0 && rect.height > 0)) return false;
    const styles = control.ownerDocument?.defaultView?.getComputedStyle?.(control);
    if (styles && (styles.display === 'none' || styles.visibility !== 'visible' ||
        styles.pointerEvents === 'none')) return false;
    for (const attribute of ['formaction', 'formtarget', 'formmethod']) {
        if (control.getAttribute?.(attribute) != null) return false;
    }
    const formAction = control.form?.action;
    if (typeof formAction === 'string' && formAction) {
        try {
            const action = new URL(formAction);
            if (action.origin !== PORTAL_ORIGIN || !action.pathname.toLowerCase().startsWith('/portal/')) return false;
        }
        catch { return false; }
    }
    if (tag === 'A') return typeof control.href === 'string' && isOfficialDownloadUrl(control.href);
    if (typeof control.href === 'string' && control.href) return false;
    const label = tag === 'INPUT' ? control.value : control.textContent;
    return isDownloadLabel(label);
}

/**
 * Retorna um único alvo seguro conhecido; não interpreta propostas neurais.
 * Extrai a seleção utilizada pelo content script para permitir comparação
 * independente e fiel com o modelo em modo de observação.
 */
export function selectDownloadControl(controls) {
    const candidates = Array.from(controls ?? []).filter(isSafeDownloadControl);
    const officialLinks = candidates.filter((control) =>
        String(control.tagName ?? '').toUpperCase() === 'A');
    if (officialLinks.length > 0)
        return officialLinks.length === 1 ? officialLinks[0] : null;
    return candidates.length === 1 ? candidates[0] : null;
}

export function isCaptchaResponseReady(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
export function isLikelyHtmlDocument(value) {
    if (typeof value !== 'string')
        return false;
    const prefix = value.trimStart().slice(0, 512).toLocaleLowerCase('pt-BR');
    return prefix.startsWith('<!doctype html') ||
        prefix.startsWith('<html') ||
        /^<\?xml[^>]*\?>\s*<html(?:\s|>)/i.test(prefix);
}
function normalize(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}
