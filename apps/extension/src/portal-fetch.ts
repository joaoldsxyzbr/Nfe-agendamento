import type { PageReplayRequest } from './portal-request';

export type PortalPageFetchResult = Readonly<{
  ok: boolean;
  status: number;
  redirected: boolean;
  url: string;
  payload: string;
  networkError: string | null;
  errorCode: 'portal_xml_timeout' | 'portal_xml_too_large' | 'portal_xml_capture_unavailable' | null;
}>;

/**
 * Runs in the Portal tab's MAIN world using chrome.scripting.executeScript.
 * Keep all runtime dependencies inside this function: injected functions do not
 * retain module closures or imported values.
 */
export async function capturePortalXmlPage(
  input: PageReplayRequest,
  maxBytes: number,
  timeoutMs: number,
): Promise<PortalPageFetchResult> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  const failed = (
    errorCode: 'portal_xml_timeout' | 'portal_xml_too_large' | 'portal_xml_capture_unavailable',
  ): PortalPageFetchResult => ({
    ok: false,
    status: 0,
    redirected: false,
    url: input.url,
    payload: '',
    networkError: 'Falha na captura do XML pelo Portal.',
    errorCode,
  });

  try {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body === null
        ? undefined
        : input.body.encoding === 'text'
          ? input.body.value
          : Uint8Array.from(atob(input.body.value), (character) => character.charCodeAt(0)),
      credentials: 'include',
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        redirected: response.redirected,
        url: response.url,
        payload: '',
        networkError: null,
        errorCode: null,
      };
    }

    if (!response.body) return failed('portal_xml_capture_unavailable');

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          controller.abort();
          return failed('portal_xml_too_large');
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      ok: true,
      status: response.status,
      redirected: response.redirected,
      url: response.url,
      payload: new TextDecoder().decode(bytes),
      networkError: null,
      errorCode: null,
    };
  } catch {
    return failed(controller.signal.aborted ? 'portal_xml_timeout' : 'portal_xml_capture_unavailable');
  } finally {
    clearTimeout(timeoutHandle);
  }
}
