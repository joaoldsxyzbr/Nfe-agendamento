import { describe, expect, it } from 'vitest';
import { assessExtensionCompatibility, MIN_PORTAL_EXTENSION_VERSION } from '../src/portal/compatibility';

describe('advisory extension compatibility', () => {
  it('accepts the validated extension version and later patch versions', () => {
    expect(MIN_PORTAL_EXTENSION_VERSION).toBe('0.2.16');
    expect(assessExtensionCompatibility('0.2.16')).toBe('compatible');
    expect(assessExtensionCompatibility('0.2.17')).toBe('compatible');
    expect(assessExtensionCompatibility('0.3.0')).toBe('compatible');
  });
  it('warns for older extensions without claiming they are disconnected', () => {
    expect(assessExtensionCompatibility('0.2.15')).toBe('outdated');
    expect(assessExtensionCompatibility('0.1.99')).toBe('outdated');
  });
  it('does not guess compatibility for malformed versions', () => {
    expect(assessExtensionCompatibility('')).toBe('unknown');
    expect(assessExtensionCompatibility('0.2.16-beta')).toBe('unknown');
    expect(assessExtensionCompatibility('unavailable')).toBe('unknown');
  });
});
