import { describe, expect, it } from 'vitest';
import { portalErrorGuidance } from '../src/portal/error-guidance';

describe('privacy-safe Portal error guidance', () => {
  it('offers actionable next steps without repeating fiscal identifiers', () => {
    const key = '1'.repeat(44);
    const message = `Falha no XML para chave ${key}`;
    const result = portalErrorGuidance(message);
    expect(result).toContain('XML');
    expect(result).not.toContain(key);
    expect(result).toContain('manualmente');
  });
  it('distinguishes timeouts, cancellation and communication failures', () => {
    expect(portalErrorGuidance('Timeout')).toContain('demorou');
    expect(portalErrorGuidance('Cancelada')).toContain('interrompida');
    expect(portalErrorGuidance('Falha de conexão')).toContain('comunicar');
  });
  it('does not claim to know a certificate failure from an unknown message', () => {
    expect(portalErrorGuidance('Erro desconhecido')).toContain('Verifique a janela do Portal');
    expect(portalErrorGuidance('Erro desconhecido')).not.toContain('certificado');
  });
});
