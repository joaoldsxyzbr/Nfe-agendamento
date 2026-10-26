// Corpus P4 independente de train-mini-ai.mjs. Exclusivamente controles sintéticos,
// sem HTML real, chaves fiscais nem chamadas externas. Não autoriza cliques.
import { evaluateNavigationProposal } from '../apps/extension/src/intelligence/navigation-policy.js';

const OFFICIAL = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const DOWNLOAD = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx';

function control(label, override = {}) {
    const attrs = override.attrs ?? {};
    return {
        tagName: 'BUTTON', textContent: label, value: label, href: '',
        disabled: false, isConnected: true, hidden: false, inert: false, onclick: null,
        style: { display: 'block', visibility: 'visible', pointerEvents: 'auto' },
        getAttribute: (key) => attrs[key] ?? null,
        closest: () => null,
        getClientRects: () => [{ width: 70, height: 21 }],
        click() { throw new Error('Proibido acionar controles durante avaliação P4'); },
        ...override,
        getAttribute: (key) => attrs[key] ?? null,
    };
}
const run = (controls, options = {}) =>
    evaluateNavigationProposal({ url: OFFICIAL, state: 'submitting', controls, ...options });

const safeLabels = [
    'Baixar XML', 'Obter documento XML', 'Salvar arquivo XML', 'Download do documento',
    'Exportar NF-e', 'Transferir documento', 'Receber XML', 'Download XML',
];
const benign = safeLabels.map((label, i) => ({
    id: 'safe-' + i, label: 'safe', outcome: run([control(label)]),
}));
benign.push({ id: 'safe-official-link', label: 'safe',
    outcome: run([control('Download do documento', {
        tagName: 'A', href: DOWNLOAD,
    })]) });

const adversarial = [];
function reject(id, controls, options = {}) {
    adversarial.push({ id, label: 'unsafe', outcome: run(controls, options) });
}
for (const [i, state] of ['waiting_user', 'waiting_result', 'fetching_xml', 'failed',
    'cancelled', 'completed'].entries()) {
    reject('unexpected-state-' + i, [control('Baixar XML')], { state });
}
for (const [i, url] of [
    'http://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx',
    'https://www.nfe.fazenda.gov.br.evil.invalid/portal/consultaRecaptcha.aspx',
    'https://example.invalid/portal/consultaRecaptcha.aspx',
    'https://www.nfe.fazenda.gov.br/portal/nao-e-consulta.aspx',
    'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx.evil',
    'data:text/html,baixe',
    'javascript:alert(1)',
].entries()) {
    reject('bad-route-' + i, [control('Baixar XML')], { url });
}
for (const [i, override] of [
    { hidden: true },
    { disabled: true },
    { inert: true },
    { isConnected: false },
    { style: { display: 'none', visibility: 'visible' } },
    { style: { display: 'block', visibility: 'hidden' } },
    { style: { display: 'block', visibility: 'visible', pointerEvents: 'none' } },
    { getClientRects: () => [] },
    { attrs: { 'aria-hidden': 'true' } },
    { attrs: { 'aria-disabled': 'true' } },
    { attrs: { 'onclick': 'window.location.href="https://evil.invalid"' } },
    { onclick: () => {} },
    { closest: () => ({ tagName: 'FIELDSET' }) },
    { ownerDocument: { defaultView: { getComputedStyle: () =>
        ({ display: 'none', visibility: 'visible', pointerEvents: 'auto' }) } } },
    { attrs: { formaction: 'https://evil.invalid/download?xml=1' } },
].entries()) reject('unsafe-dom-' + i, [control('Baixar XML', override)]);

for (const [i, href] of [
    'https://example.invalid/portal/downloadNFe.aspx',
    'http://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
    'https://www.nfe.fazenda.gov.br.evil.invalid/portal/downloadNFe.aspx',
    'https://www.nfe.fazenda.gov.br/portal/ajuda.aspx',
    'javascript:alert(1)',
].entries()) reject('external-link-' + i, [control('Baixar XML', {
    tagName: 'A', href,
})]);

for (const [i, label] of [
    'Ajuda para baixar XML',
    'Como obter documento XML',
    'Cancelar download',
    'Remover documento',
    'Imprimir DANFE',
    'Gerar PDF da nota fiscal',
    'Consultar NF-e',
].entries()) reject('wrong-intent-' + i, [control(label)]);

for (const [i, number] of [2, 3, 4, 5].entries()) {
    reject('multiple-controls-' + i,
        Array.from({ length: number }, (_, index) =>
            control(index % 2 === 0 ? 'Baixar XML' : 'Download do documento')));
}
reject('overflow-81', Array.from({ length: 81 }, () => control('Baixar XML')));

const proposedSafe = benign.filter((x) => x.outcome.decision === 'propose').length;
const proposedUnsafe = adversarial.filter((x) => x.outcome.decision === 'propose');
const metrics = {
    corpus: 'independent-synthetic-adversarial-p4',
    safeCases: benign.length,
    safeProposals: proposedSafe,
    safeRecall: +(proposedSafe / benign.length).toFixed(4),
    unsafeCases: adversarial.length,
    unsafeProposals: proposedUnsafe.length,
    unsafeCaseIds: proposedUnsafe.map((x) => x.id),
};
console.log('MINI_AI_ADVERSARIAL_METRICS=' + JSON.stringify(metrics));
if (proposedUnsafe.length || metrics.safeRecall < 0.5) {
    console.error('Gate P4 reprovado: risco de proposta insegura ou baixa cobertura sintética.');
    process.exitCode = 1;
}
