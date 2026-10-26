// Extração local e efêmera: nunca retorna texto, HTML, URL, chave ou dados fiscais.
// A ordem das entradas faz parte do contrato do modelo treinado.
export const FEATURE_NAMES = Object.freeze([
    'downloadWord', 'documentWord', 'officialDownload', 'printWord', 'disabled',
    'unsupportedHref', 'helpWord', 'cancelWord', 'controlTag', 'accessibleHint',
]);

export function extractControlFeatures(control) {
    const tag = String(control?.tagName ?? '').toLowerCase();
    const aria = String(control?.getAttribute?.('aria-label') ?? '').slice(0, 120);
    const title = String(control?.getAttribute?.('title') ?? '').slice(0, 120);
    const visible = String(tag === 'input' ? control?.value ?? '' : control?.textContent ?? '').slice(0, 160);
    const label = [visible, aria, title].join(' ').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const href = typeof control?.href === 'string' ? control.href.slice(0, 512) : '';
    let officialDownload = false;
    if (href) {
        try {
            const parsed = new URL(href);
            officialDownload = parsed.protocol === 'https:' &&
                parsed.origin === 'https://www.nfe.fazenda.gov.br' &&
                parsed.pathname.toLowerCase() === '/portal/downloadnfe.aspx';
        }
        catch { /* Não confiar em endereço inválido. */ }
    }
    return {
        downloadWord: /download|baixar|baixe|obter|salvar|exportar|receber|transferir/.test(label),
        documentWord: /xml|documento|nota fiscal|nfe|nf-e|arquivo/.test(label),
        officialDownload,
        printWord: /imprim|danfe|impressao|pdf/.test(label),
        disabled: control?.disabled === true || control?.getAttribute?.('aria-disabled') === 'true',
        unsupportedHref: Boolean(href) && !officialDownload,
        helpWord: /ajuda|como\s|tutorial|instruc|duvida|saiba mais|orientac/.test(label),
        cancelWord: /cancel|exclu|remov|apagar/.test(label),
        controlTag: tag === 'a' || tag === 'button' || tag === 'input',
        accessibleHint: /download|baixar|xml|documento/.test((aria + ' ' + title).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
    };
}

export function featureVector(features) {
    return FEATURE_NAMES.map((name) => features?.[name] === true ? 1 : 0);
}
