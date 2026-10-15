/**
 * Runs in the Portal tab's MAIN world, matching the browser-verified v0.2.13
 * request and response behavior. Injected functions must be self-contained.
 *
 * Keep the official fetch without AbortController/ReadableStream overrides:
 * these were added in v0.2.14 and coincide with the live regression.
 * The 10 MiB check still runs before the payload leaves the Portal tab.
 */
export async function capturePortalXmlPage(input, maxBytes) {
    try {
        let body;
        if (input.body?.encoding === 'text') {
            body = input.body.value;
        }
        else if (input.body?.encoding === 'base64') {
            const binary = atob(input.body.value);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }
            body = bytes;
        }
        const response = await fetch(input.url, {
            method: input.method,
            headers: input.headers,
            body,
            credentials: 'include',
            redirect: 'follow',
            cache: 'no-store',
        });
        const payload = await response.text();
        if (new TextEncoder().encode(payload).byteLength > maxBytes) {
            return {
                ok: false,
                status: response.status,
                redirected: response.redirected,
                url: response.url,
                payload: '',
                networkError: null,
                errorCode: 'portal_xml_too_large',
            };
        }
        return {
            ok: response.ok,
            status: response.status,
            redirected: response.redirected,
            url: response.url,
            payload,
            networkError: null,
            errorCode: null,
        };
    }
    catch (error) {
        return {
            ok: false,
            status: 0,
            redirected: false,
            url: input.url,
            payload: '',
            networkError: error instanceof Error ? error.message : 'Falha de rede no Portal.',
            errorCode: null,
        };
    }
}
