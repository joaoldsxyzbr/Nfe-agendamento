import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturePortalXmlPage } from '../src/portal-fetch';
import type { PageReplayRequest } from '../src/portal-request';

const request: PageReplayRequest = {
  url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
  method: 'GET',
  headers: {},
  body: null,
};

afterEach(() => vi.unstubAllGlobals());

describe('v0.0.40 Portal capture regression boundaries', () => {
  it('accepts an XML response at the exact UTF-8 byte limit', async () => {
    const xml = '<nfe>á</nfe>';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(xml, { status: 200 })));
    const maxBytes = new TextEncoder().encode(xml).byteLength;
    const result = await capturePortalXmlPage(request, maxBytes);
    expect(result).toMatchObject({
      ok: true,
      payload: xml,
      errorCode: null,
      networkError: null,
    });
  });

  it('rejects the next byte without returning partial fiscal data', async () => {
    const xml = '<nfe>á</nfe>';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(xml, { status: 200 })));
    const maxBytes = new TextEncoder().encode(xml).byteLength - 1;
    const result = await capturePortalXmlPage(request, maxBytes);
    expect(result).toMatchObject({
      ok: false,
      payload: '',
      errorCode: 'portal_xml_too_large',
      networkError: null,
    });
  });

  it('preserves redirect metadata and performs a single authenticated fetch', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      redirected: true,
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx?result=1',
      text: async () => '<nfe/>',
    }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await capturePortalXmlPage(request, 128);
    expect(result).toMatchObject({
      ok: true,
      redirected: true,
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx?result=1',
      payload: '<nfe/>',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      redirect: 'follow',
      cache: 'no-store',
    });
  });

  it('does not retry an HTTP failure or hide the response status', async () => {
    const fetchMock = vi.fn(async () => new Response('Unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await capturePortalXmlPage(request, 128)).toMatchObject({
      ok: false,
      status: 503,
      payload: 'Unavailable',
      errorCode: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
