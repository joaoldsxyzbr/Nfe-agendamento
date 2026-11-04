import { describe, expect, it } from 'vitest';
import { isSafeDownloadControl } from '../src/portal-dom.js';

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
});
