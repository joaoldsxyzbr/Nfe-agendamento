import { afterEach, describe, expect, it, vi } from 'vitest';
import { capturePortalXmlPage } from '../src/portal-fetch';
import type { PageReplayRequest } from '../src/portal-request';

const request: PageReplayRequest = {
  url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
  method: 'GET',
  headers: {},
  body: null,
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Portal download limits inside the page', () => {
  it('preserves bytes from a bounded HTTP response', async () => {
    const xml = '<nfeProc>áéí</nfeProc>';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(xml, { status: 200 })));

    const result = await capturePortalXmlPage(request, 128, 1000);
    expect(result.ok).toBe(true);
    expect(result.payload).toBe(xml);
    expect(result.errorCode).toBeNull();
  });

  it('rejects an oversized streamed response before returning its content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('123456789', { status: 200 })));

    const result = await capturePortalXmlPage(request, 8, 1000);
    expect(result).toMatchObject({
      ok: false,
      payload: '',
      errorCode: 'portal_xml_too_large',
    });
  });

  it('aborts a network request that never responds', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = capturePortalXmlPage(request, 128, 45);
    await vi.advanceTimersByTimeAsync(45);

    await expect(pending).resolves.toMatchObject({
      ok: false,
      errorCode: 'portal_xml_timeout',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not read a non-success HTTP response as XML', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Unauthorized', { status: 403 })));
    const result = await capturePortalXmlPage(request, 128, 1000);
    expect(result).toMatchObject({ status: 403, ok: false, payload: '', errorCode: null });
  });

  it('rejects missing readable response bodies rather than buffering without limits', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      redirected: false,
      url: request.url,
      body: null,
    })));
    const result = await capturePortalXmlPage(request, 128, 1000);
    expect(result).toMatchObject({ ok: false, errorCode: 'portal_xml_capture_unavailable' });
  });
});
