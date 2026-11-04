// Comparação offline do classificador em shadow mode com a seleção convencional.
// Casos sintéticos rotulados manualmente, fora do treinamento; nenhum dado fiscal real.
// NÃO executa clique, NÃO usa rede e NÃO habilita automação por IA.
import { evaluateNavigationProposal } from '../apps/extension/src/intelligence/navigation-policy.js';
import { selectDownloadControl } from '../apps/extension/src/portal-dom.js';

const CONSULT_URL = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const DOWNLOAD_URL = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx';

function control(label, options = {}) {
    const attrs = options.attrs ?? {};
    return {
        tagName: options.tagName ?? 'BUTTON',
        textContent: label,
        value: label,
        href: options.href ?? '',
        disabled: options.disabled ?? false,
        isConnected: options.isConnected ?? true,
        hidden: options.hidden ?? false,
        inert: options.inert ?? false,
        onclick: null,
        style: { display: 'block', visibility: 'visible', pointerEvents: 'auto' },
        getAttribute: (name) => attrs[name] ?? null,
        closest: () => null,
        getClientRects: () => [{ width: 80, height: 24 }],
        click() { throw new Error('A avaliação jamais pode clicar no Portal.'); },
        ...options,
    };
}

const cases = [
    // Descrições novas: o seletor tradicional não conhece esses botões.
    { id: 'novo-baixar', positive: true, controls: [control('Baixar XML da operação')] },
    { id: 'novo-exportar', positive: true, controls: [control('Exportar arquivo eletrônico de NF-e')] },
    { id: 'novo-transferir', positive: true, controls: [control('Transferir documento fiscal XML')] },
    { id: 'novo-obter', positive: true, controls: [control('Obter segunda via do documento')] },
    { id: 'novo-receber', positive: true, controls: [control('Receber arquivo XML autorizado')] },
    { id: 'novo-salvar', positive: true, controls: [control('Salvar XML da operação')] },
    { id: 'conhecido-botao', positive: true, controls: [control('Download do documento')] },
    { id: 'conhecido-link', positive: true, controls: [control('Baixar arquivo XML', { tagName: 'A', href: DOWNLOAD_URL })] },

    // Negativos e enganosos: não podem gerar propostas de navegação.
    { id: 'ajuda', positive: false, controls: [control('Ajuda para baixar documento XML')] },
    { id: 'tutorial', positive: false, controls: [control('Como obter o XML da nota')] },
    { id: 'cancelar', positive: false, controls: [control('Cancelar download de XML')] },
    { id: 'remover', positive: false, controls: [control('Remover arquivo XML')] },
    { id: 'imprimir', positive: false, controls: [control('Imprimir DANFE em PDF')] },
    { id: 'consultar', positive: false, controls: [control('Consultar NF-e')] },
    { id: 'copiar', positive: false, controls: [control('Copiar chave de acesso')] },
    { id: 'visualizar', positive: false, controls: [control('Visualizar XML')] },
    { id: 'link-externo', positive: false, controls: [control('Baixar XML', { tagName: 'A', href: 'https://example.invalid/portal/downloadNFe.aspx' })] },
    { id: 'link-falso', positive: false, controls: [control('Download do documento', { tagName: 'A', href: 'https://www.nfe.fazenda.gov.br.evil.invalid/portal/downloadNFe.aspx' })] },
    { id: 'botao-desabilitado', positive: false, controls: [control('Baixar XML', { disabled: true })] },
    { id: 'botao-oculto', positive: false, controls: [control('Baixar XML', { hidden: true })] },
    { id: 'destino-externo', positive: false, controls: [control('Baixar XML', { form: { action: 'https://example.invalid' } })] },
    { id: 'override', positive: false, controls: [control('Baixar XML', { attrs: { formaction: 'https://example.invalid' } })] },
    { id: 'duplicados', positive: false, controls: [control('Obter XML da nota'), control('Receber XML da nota')] },
];

const scored = cases.map((entry) => {
    const baseline = selectDownloadControl(entry.controls) !== null;
    const neural = evaluateNavigationProposal({
        url: CONSULT_URL, state: 'submitting', controls: entry.controls,
    });
    return { id: entry.id, positive: entry.positive, baseline, neural: neural.decision === 'propose' };
});
const positive = scored.filter((item) => item.positive);
const negative = scored.filter((item) => !item.positive);
const proposed = (rows, field) => rows.filter((item) => item[field]);
const report = {
    corpus: 'independent-synthetic-utility-2026-11',
    positiveCases: positive.length,
    negativeCases: negative.length,
    baselinePositive: proposed(positive, 'baseline').length,
    neuralPositive: proposed(positive, 'neural').length,
    neuralOnlyPositive: positive.filter((item) => item.neural && !item.baseline).length,
    baselineFalsePositive: proposed(negative, 'baseline').length,
    neuralFalsePositive: proposed(negative, 'neural').length,
};
console.log('MINI_AI_UTILITY_METRICS=' + JSON.stringify(report));

if (report.baselineFalsePositive || report.neuralFalsePositive || report.neuralOnlyPositive === 0) {
    console.error('Gate de utilidade sintética reprovado: verificar propostas enganosas ou ausência de ganho.');
    process.exitCode = 1;
}
