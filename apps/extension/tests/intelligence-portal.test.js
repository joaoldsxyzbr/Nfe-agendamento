import { describe, expect, it } from 'vitest';
import { extractControlFeatures, inspectDownloadCandidates, neuralDownloadScore } from '../src/intelligence/portal-model';

const button = (label, disabled = false) => ({
    tagName: 'BUTTON',
    textContent: label,
    disabled,
    getAttribute: () => null,
});

describe('mini-IA do Portal em modo de observação', () => {
    it('reconhece um possível download com rótulo novo sem autorizar cliques', () => {
        const result = inspectDownloadCandidates([button('Baixar XML')]);
        expect(result.candidateDetected).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(85);
        expect(result.modelVersion).toBe('portal-download-shadow-0.1');
        expect(result).not.toHaveProperty('action');
    });
    it('não confunde DANFE, consulta nem botões desativados com download confiável', () => {
        expect(neuralDownloadScore(extractControlFeatures(button('Imprimir DANFE')))).toBeLessThan(85);
        expect(neuralDownloadScore(extractControlFeatures(button('Consultar NF-e')))).toBeLessThan(85);
        expect(neuralDownloadScore(extractControlFeatures(button('Baixar XML', true)))).toBeLessThan(85);
    });
    it('só reconhece endereço oficial e não exporta texto, href ou campos da página', () => {
        const control = {
            ...button('Baixar XML - chave 12345678901234567890123456789012345678901234'),
            tagName: 'A',
            href: 'https://exemplo.invalid/portal/downloadNFe.aspx?chave=segredo',
        };
        const features = extractControlFeatures(control);
        expect(features.officialDownload).toBe(false);
        expect(JSON.stringify(features)).not.toContain('123456');
        expect(JSON.stringify(inspectDownloadCandidates([control]))).not.toContain('segredo');
    });
    it('limita a varredura e sinaliza candidatos ambíguos', () => {
        const result = inspectDownloadCandidates(Array.from({ length: 150 }, () => button('Baixar XML')));
        expect(result.inspected).toBe(80);
        expect(result.ambiguous).toBe(true);
    });
});
