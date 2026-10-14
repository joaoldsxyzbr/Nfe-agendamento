/** Advisory only: never changes the Portal fetch or extension handshake. */
export type ExtensionCompatibility = 'compatible' | 'outdated' | 'unknown';

/** First browser-validated release of the current Portal XML flow. */
export const MIN_PORTAL_EXTENSION_VERSION = '0.2.16';

export function assessExtensionCompatibility(version: string): ExtensionCompatibility {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return 'unknown';
  const actual = match.slice(1).map(Number);
  const minimum = MIN_PORTAL_EXTENSION_VERSION.split('.').map(Number);
  if (actual.some((part) => !Number.isSafeInteger(part))) return 'unknown';
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > minimum[index]) return 'compatible';
    if (actual[index] < minimum[index]) return 'outdated';
  }
  return 'compatible';
}
