import { describe, expect, it } from 'vitest';
import { ACCESS_KEY_PATTERN, NFE_MODEL, NFCE_MODEL, VALID_MODELS, VALID_UFS } from '../src/shared/access-key.js';

describe('extension shared access-key', () => {
  it('exporta padrão de chave', () => {
    expect(ACCESS_KEY_PATTERN).toBeInstanceOf(RegExp);
    expect(ACCESS_KEY_PATTERN.test('35260812345678000195550010000000011000000018')).toBe(true);
    expect(ACCESS_KEY_PATTERN.test('invalid')).toBe(false);
  });

  it('exporta modelos', () => {
    expect(NFE_MODEL).toBe('55');
    expect(NFCE_MODEL).toBe('65');
    expect(VALID_MODELS).toContain('55');
    expect(VALID_MODELS).toContain('65');
  });

  it('lista UFs válidas', () => {
    expect(VALID_UFS).toHaveLength(27);
    expect(VALID_UFS).toContain('35');
    expect(VALID_UFS).toContain('33');
  });
});
