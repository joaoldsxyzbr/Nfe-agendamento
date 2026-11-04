import { describe, expect, it } from 'vitest';
import { isSafeDownloadControl, selectDownloadControl } from '../src/portal-dom.js';

const OFFICIAL = 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx';
function control(overrides = {}) {
    return {
        tagName: 'A', href: OFFICIAL, textContent: 'Download do documento',
        isConnected: true, hidden: false, inert: false, disabled: false,
        getClientRects: () => [{ width: 30, height: 12 }],
        getAttribute: () => null, closest: () => null,
        ...overrides,
    };
}

describe('seleção determinística de controles do Portal', () => {
    it('aceita link exato do endpoint oficial, visível e conectado', () => {
        expect(isSafeDownloadControl(control())).toBe(true);
    });
    it('não segue destinos externos ou semelhantes ao Portal', () => {
        for (const href of ['https://evil.invalid/downloadNFe.aspx',
            'https://www.nfe.fazenda.gov.br.evil.invalid/portal/downloadNFe.aspx',
            'javascript:alert(1)', 'https://www.nfe.fazenda.gov.br/portal/another.aspx']) {
            expect(isSafeDownloadControl(control({ href }))).toBe(false);
        }
    });
    it('rejeita controle invisível, desativado ou desconectado', () => {
        expect(isSafeDownloadControl(control({ hidden: true }))).toBe(false);
        expect(isSafeDownloadControl(control({ disabled: true }))).toBe(false);
        expect(isSafeDownloadControl(control({ isConnected: false }))).toBe(false);
        expect(isSafeDownloadControl(control({ getClientRects: () => [] }))).toBe(false);
        expect(isSafeDownloadControl(control({ closest: () => ({}) }))).toBe(false);
    });
    it('mantém botão ASP.NET legado, mas bloqueia formulário externo ou override de destino', () => {
        const button = control({ tagName: 'BUTTON', href: undefined, form: { action: OFFICIAL } });
        expect(isSafeDownloadControl(button)).toBe(true);
        expect(isSafeDownloadControl({ ...button, form: { action: 'https://evil.invalid/post' } })).toBe(false);
        expect(isSafeDownloadControl({ ...button, getAttribute: (name) => name === 'formaction' ? OFFICIAL : null })).toBe(false);
        expect(isSafeDownloadControl({ ...button, textContent: 'Cancelar' })).toBe(false);
    });
    it('seleciona somente um link oficial e prefere link oficial a botões legados', () => {
        const official = control();
        const legacy = control({ tagName: 'BUTTON', href: undefined });
        expect(selectDownloadControl([legacy])).toBe(legacy);
        expect(selectDownloadControl([legacy, official])).toBe(official);
        expect(selectDownloadControl([])).toBeNull();
    });
    it('falha fechado quando dois links ou dois botões igualmente plausíveis coexistem', () => {
        const official = control();
        const another = control();
        const legacy = control({ tagName: 'BUTTON', href: undefined });
        expect(selectDownloadControl([official, another])).toBeNull();
        expect(selectDownloadControl([legacy, { ...legacy }])).toBeNull();
        expect(selectDownloadControl([legacy, control({ href: 'https://evil.invalid/' })])).toBe(legacy);
    });

});
