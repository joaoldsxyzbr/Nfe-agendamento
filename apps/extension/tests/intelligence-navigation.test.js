import { describe, expect, it, vi } from 'vitest';
import { evaluateNavigationProposal } from '../src/intelligence/navigation-policy.js';

const URL_OK = 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx';
const approved = (label = 'Baixar XML', overrides = {}) => {
    const attrs = overrides.attrs ?? {};
    const control = {
        tagName: 'BUTTON',
        textContent: label,
        disabled: false,
        isConnected: true,
        hidden: false,
        inert: false,
        onclick: null,
        style: { display: 'block', visibility: 'visible' },
        getClientRects: () => [{ width: 40, height: 20 }],
        getAttribute: (key) => attrs[key] ?? null,
        closest: () => null,
        click: vi.fn(),
    };
    return Object.assign(control, overrides, { getAttribute: (key) => attrs[key] ?? null });
};
const inspect = (controls, options = {}) =>
    evaluateNavigationProposal({
        url: URL_OK, state: 'submitting', controls,
        ...options,
    });

describe('P2: proposta neural é SOMENTE leitura, nunca execução', () => {
    it('gera proposta passiva para botão de download novo e não chama click', () => {
        const control = approved();
        const result = inspect([control]);
        expect(result).toMatchObject({ decision: 'propose', reason: 'review_required' });
        expect(result.score).toBeGreaterThanOrEqual(85);
        expect(control.click).not.toHaveBeenCalled();
        expect(JSON.stringify(result)).not.toMatch(/Baixar XML|consultaRecaptcha|https:|node|element/);
    });
    it('distingue link oficial sem executar', () => {
        const control = approved('Download do documento', {
            tagName: 'A',
            href: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
        });
        const result = inspect([control]);
        expect(result).toMatchObject({ decision: 'propose', reason: 'official_link' });
        expect(control.click).not.toHaveBeenCalled();
    });
    it('não propõe uma ação em contexto errado', () => {
        for (const state of ['waiting_user', 'waiting_result', 'failed', null]) {
            const control = approved();
            expect(inspect([control], { state }).decision).toBe('blocked');
            expect(control.click).not.toHaveBeenCalled();
        }
    });
    it.each([
        'https://www.nfe.fazenda.gov.br.evil.invalid/portal/consultaRecaptcha.aspx',
        'http://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx',
        'https://example.invalid/portal/consultaRecaptcha.aspx',
        'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
        'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx.evil',
        'javascript:alert(1)',
        '',
    ])('rejeita origem/rota não autorizada: %s', (url) => {
        const control = approved();
        expect(inspect([control], { url }).decision).toBe('blocked');
        expect(control.click).not.toHaveBeenCalled();
    });
    it('rejeita duplicação de controles plausíveis (não apenas empate)', () => {
        const first = approved('Baixar XML');
        const second = approved('Download do documento');
        expect(inspect([first, second])).toMatchObject({ decision: 'blocked', reason: 'ambiguous_candidates' });
        expect(first.click).not.toHaveBeenCalled();
        expect(second.click).not.toHaveBeenCalled();
    });
    it('falha com muitos controles para não perder candidatos fora do limite', () => {
        const controls = Array.from({ length: 81 }, () => approved());
        expect(inspect(controls)).toMatchObject({ decision: 'blocked', reason: 'too_many_controls' });
        expect(controls.every((control) => control.click.mock.calls.length === 0)).toBe(true);
    });
    it.each([
        ['hidden', { hidden: true }],
        ['detached', { isConnected: false }],
        ['inert', { inert: true }],
        ['css-display-none', { style: { display: 'none' } }],
        ['css-visibility-hidden', { style: { visibility: 'hidden' } }],
        ['no-rectangles', { getClientRects: () => [] }],
        ['aria-hidden', { attrs: { 'aria-hidden': 'true' } }],
        ['aria-disabled', { attrs: { 'aria-disabled': 'true' } }],
        ['unsafe-parent', { closest: () => ({ tagName: 'FIELDSET' }) }],
        ['inline-onclick', { attrs: { onclick: 'window.location = "bad"' } }],
        ['js-onclick', { onclick: () => {} }],
    ])('não propõe candidato de DOM inseguro: %s', (_name, flags) => {
        const control = approved('Baixar XML', flags);
        expect(inspect([control]).decision).not.toBe('propose');
        expect(control.click).not.toHaveBeenCalled();
    });
    it.each([
        'Ajuda para baixar XML',
        'Cancelar download XML',
        'Imprimir DANFE',
        'Como obter XML',
        'Excluir XML',
        'Visualizar XML',
    ])('não propõe controle semântico enganoso: %s', (label) => {
        const control = approved(label);
        expect(inspect([control]).decision).not.toBe('propose');
        expect(control.click).not.toHaveBeenCalled();
    });
    it('bloqueia links externos mesmo quando usam rótulo de download oficial', () => {
        for (const href of [
            'https://example.invalid/portal/downloadNFe.aspx',
            'javascript:alert(1)',
            'https://www.nfe.fazenda.gov.br@evil.invalid/portal/downloadNFe.aspx',
            'https://www.nfe.fazenda.gov.br/portal/outraRota.aspx',
        ]) {
            const control = approved('Baixar XML', { tagName: 'A', href });
            expect(inspect([control]).decision).not.toBe('propose');
            expect(control.click).not.toHaveBeenCalled();
        }
    });
    it('não serializa material fiscal ou atributos não autorizados mesmo em erros', () => {
        const key = '42260812345678000123550010000012341000012342';
        const control = approved('Baixar XML ' + key, { href: 'https://evil.invalid/?secret=' + key });
        const result = inspect([control]);
        expect(JSON.stringify(result)).not.toContain(key);
        expect(JSON.stringify(result)).not.toContain('evil.invalid');
        expect(Object.keys(result).sort()).toEqual(
            ['candidates', 'decision', 'inspected', 'modelVersion', 'reason', 'score'].sort());
    });
    it('bloqueia elementos ocultos por CSS computado mesmo com retângulo visível', () => {
        const control = approved('Baixar XML', {
            ownerDocument: { defaultView: { getComputedStyle: () => ({
                display: 'block', visibility: 'hidden', pointerEvents: 'auto',
            }) } },
        });
        expect(inspect([control]).decision).not.toBe('propose');
        expect(control.click).not.toHaveBeenCalled();
    });
    it('não propõe nada quando o conteúdo não oferece download plausível', () => {
        expect(inspect([approved('Nova consulta')])).toMatchObject({ decision: 'none', reason: 'no_candidate' });
    });
});
