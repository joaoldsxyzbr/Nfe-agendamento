import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturePortalXmlPage } from '../src/portal-fetch';
const request = {
    url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
    method: 'GET',
    headers: {},
    body: null,
};
afterEach(() => {
    vi.unstubAllGlobals();
});
describe('Portal XML capture: compatibility with the working v0.2.13', () => {
    it('reads XML through Response.text() without AbortController/streaming', async () => {
        const xml = '<nfeProc>áéí</nfeProc>';
        const text = vi.fn(async () => xml);
        const fetchMock = vi.fn(async () => ({
            ok: true, status: 200, redirected: false, url: request.url,
            body: null, text,
        }));
        vi.stubGlobal('fetch', fetchMock);
        const result = await capturePortalXmlPage(request, 128);
        expect(result).toMatchObject({ ok: true, payload: xml, errorCode: null, networkError: null });
        expect(text).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(request.url, {
            method: 'GET',
            headers: {},
            body: undefined,
            credentials: 'include',
            redirect: 'follow',
            cache: 'no-store',
        });
    });
    it('rejects more than 10 MiB before returning XML to the background', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('123456789', { status: 200 })));
        const result = await capturePortalXmlPage(request, 8);
        expect(result).toMatchObject({ ok: false, payload: '', errorCode: 'portal_xml_too_large' });
    });
    it('counts UTF-8 bytes rather than JavaScript characters', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('áá', { status: 200 })));
        const result = await capturePortalXmlPage(request, 3);
        expect(result.errorCode).toBe('portal_xml_too_large');
    });
    it('returns the official HTTP response without redirect or session bypass', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('Unauthorized', { status: 403 })));
        const result = await capturePortalXmlPage(request, 128);
        expect(result).toMatchObject({ ok: false, status: 403, payload: 'Unauthorized', errorCode: null });
    });
    it('retains form POST body and cookies in the same Portal tab', async () => {
        const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const post = {
            ...request, method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: { encoding: 'text', value: 'download=1' },
        };
        expect((await capturePortalXmlPage(post, 128)).ok).toBe(true);
        expect(fetchMock.mock.calls[0][1]).toMatchObject({
            method: 'POST', body: 'download=1', credentials: 'include',
        });
    });
    it('recreates raw POST bodies from base64 without depending on module closure', async () => {
        const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const post = {
            ...request, method: 'POST',
            body: { encoding: 'base64', value: btoa('abc') },
        };
        await capturePortalXmlPage(post, 128);
        expect(Array.from(fetchMock.mock.calls[0][1].body)).toEqual([97, 98, 99]);
    });
    it('returns a recoverable error when the Portal request fails', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
        expect(await capturePortalXmlPage(request, 128)).toMatchObject({
            ok: false, status: 0, payload: '', networkError: 'Failed to fetch', errorCode: null,
        });
    });
    it('returns a controlled error for a non-Error thrown by the Portal', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw 'offline'; }));
        expect((await capturePortalXmlPage(request, 128)).networkError).toBe('Falha de rede no Portal.');
    });
});
