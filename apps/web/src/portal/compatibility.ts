/** A version label is not a substitute for a negotiated protocol. */
export type ExtensionCompatibility = 'compatible' | 'outdated' | 'unknown';

/** Known-good XML capture baseline. Later releases require independent validation. */
export const MIN_PORTAL_EXTENSION_VERSION = '0.2.16';

export type ExtensionCapabilities = Readonly<{
  openOptions: boolean;
  portalLookup: boolean;
  supplierResolution: boolean;
}>;

export function hasRequiredExtensionCapabilities(value: ExtensionCapabilities): boolean {
  return value.openOptions && value.portalLookup && value.supplierResolution;
}

/** Informational only. Never use this result to block an otherwise connected extension. */
export function assessExtensionCompatibility(version: string): ExtensionCompatibility {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return 'unknown';
  const actual = match.slice(1).map(Number);
  if (actual.some((part) => !Number.isSafeInteger(part))) return 'unknown';
  const minimum = MIN_PORTAL_EXTENSION_VERSION.split('.').map(Number);
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] < minimum[index]) return 'outdated';
    if (actual[index] > minimum[index]) return 'unknown';
  }
  return 'compatible';
}
