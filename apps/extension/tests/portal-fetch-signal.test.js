import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { capturePortalXmlPage } from '../src/portal-fetch.js';

describe('capturePortalXmlPage with AbortSignal', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passa signal para fetch quando fornecido', async () => {
    const controller = new AbortController();
    const mockResponse = {
      ok: true,
      status: 200,
      redirected: false,
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
      text: async () => '<nfeProc><infNFe Id="NFe35260812345678000195550010000000011000000018"/></nfeProc>',
    };
    globalThis.fetch.mockResolvedValue(mockResponse);

    const input = {
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
      method: 'POST',
      headers: {},
      body: { encoding: 'text', value: 'test' },
    };

    await capturePortalXmlPage(input, 10 * 1024 * 1024, controller.signal);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      input.url,
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it('não passa signal quando não fornecido (comportamento v0.2.13)', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      redirected: false,
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
      text: async () => '<nfeProc/>',
    };
    globalThis.fetch.mockResolvedValue(mockResponse);

    const input = {
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
      method: 'POST',
      headers: {},
      body: { encoding: 'text', value: 'test' },
    };

    await capturePortalXmlPage(input, 10 * 1024 * 1024);

    const callOptions = globalThis.fetch.mock.calls[0][1];
    expect(callOptions.signal).toBeUndefined();
  });

  it('trata AbortError como falha de rede', async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const input = {
      url: 'https://www.nfe.fazenda.gov.br/portal/downloadNFe.aspx',
      method: 'POST',
      headers: {},
      body: { encoding: 'text', value: 'test' },
    };

    const result = await capturePortalXmlPage(input, 10 * 1024 * 1024, controller.signal);
    expect(result.ok).toBe(false);
    expect(result.networkError).toBeDefined();
  });
});
