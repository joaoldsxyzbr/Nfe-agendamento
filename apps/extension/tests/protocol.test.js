import { describe, expect, it } from 'vitest';
const KEY = '42260912345678000195550010000000011123456786';
describe('portal extension protocol', () => {
    it('re-exports shared constants and access key pattern', async () => {
        const protocol = await import('../src/protocol');
        const sharedConstants = await import('../src/shared/constants.js');
        const sharedAccessKey = await import('../src/shared/access-key.js');
        expect(protocol.MAX_XML_BYTES).toBe(sharedConstants.MAX_XML_BYTES);
        expect(protocol.ACCESS_KEY_PATTERN).toBe(sharedAccessKey.ACCESS_KEY_PATTERN);
        expect(protocol.SITE_ORIGIN).toBe('https://nfeagendamento.joaolds.xyz.br');
        expect(protocol.PORTAL_ORIGIN).toBe('https://www.nfe.fazenda.gov.br');
        expect(protocol.PAGE_CHANNEL).toBe('nfe-agendamento:portal-extension');
    });

    it('accepts only Portal/site commands with validated fields', async () => {
        const { parseSiteCommand } = await import('../src/protocol');
        expect(parseSiteCommand({ type: 'ping', requestId: 'req-1' })).toEqual({
            type: 'ping',
            requestId: 'req-1',
        });
        expect(parseSiteCommand({ type: 'open_options', requestId: 'req-options' })).toEqual({
            type: 'open_options',
            requestId: 'req-options',
        });
        expect(parseSiteCommand({ type: 'start', requestId: 'req-2', accessKey: KEY })).toEqual({
            type: 'start',
            requestId: 'req-2',
            accessKey: KEY,
        });
        expect(parseSiteCommand({ type: 'status', requestId: 'req-status', operationId: 'op-1' })).toEqual({
            type: 'status',
            requestId: 'req-status',
            operationId: 'op-1',
        });
        expect(parseSiteCommand({
            type: 'resolve_supplier',
            requestId: 'req-3',
            taxId: '12.345.678/0001-95',
        })).toEqual({
            type: 'resolve_supplier',
            requestId: 'req-3',
            taxId: '12345678000195',
        });
        expect(() => parseSiteCommand({ type: 'direct_lookup', requestId: 'req-direct', accessKey: KEY })).toThrow();
        expect(() => parseSiteCommand({ type: 'start', requestId: '', accessKey: KEY })).toThrow();
        expect(() => parseSiteCommand({ type: 'start', requestId: 'req', accessKey: '123' })).toThrow();
        expect(() => parseSiteCommand({ type: 'fetch-any-url', requestId: 'req', url: 'https://example.com' })).toThrow();
    });
    it('validates terminal states and caps XML at 10 MiB', async () => {
        const { MAX_XML_BYTES, isTerminalPortalState, validateXmlPayload } = await import('../src/protocol');
        expect(isTerminalPortalState('completed')).toBe(true);
        expect(isTerminalPortalState('failed')).toBe(true);
        expect(isTerminalPortalState('cancelled')).toBe(true);
        expect(isTerminalPortalState('waiting_user')).toBe(false);
        const xml = `<?xml version="1.0"?><nfeProc><NFe><infNFe Id="NFe${KEY}"/></NFe></nfeProc>`;
        expect(validateXmlPayload(xml, KEY)).toBe(xml);
        expect(() => validateXmlPayload('<!DOCTYPE x><nfeProc/>', KEY)).toThrow();
        expect(() => validateXmlPayload('x'.repeat(MAX_XML_BYTES + 1), KEY)).toThrow();
    });
    it('rejects invalid inputs to parseSiteCommand and validateXmlPayload', async () => {
        const { validateXmlPayload, parseSiteCommand } = await import('../src/protocol');
        expect(() => parseSiteCommand(null)).toThrow('Comando inválido.');
        expect(() => parseSiteCommand([])).toThrow('Comando inválido.');
        expect(() => parseSiteCommand({ type: 'resolve_supplier', requestId: 'r', taxId: 'invalid!' })).toThrow();
        expect(() => validateXmlPayload('', KEY)).toThrow('XML vazio.');
        expect(() => validateXmlPayload('<html></html>', KEY)).toThrow('XML não contém nfeProc.');
        expect(() => validateXmlPayload('<nfeProc><infNFe Id="NFe00000000000000000000000000000000000000000000"/></nfeProc>', KEY)).toThrow();
    });
});
