import { describe, expect, it, vi } from 'vitest';
import { utf8BytesWithinBudget } from '../src/shared/utf8-budget.js';

describe('medição de XML UTF-8 com memória auxiliar limitada', () => {
    it('conta bytes exatos em ASCII, acentos e pares Unicode nas bordas dos blocos', () => {
        const unicode = 'a'.repeat(4095) + '🧾' + 'é' + 'x'.repeat(5000);
        const bytes = new TextEncoder().encode(unicode).byteLength;
        expect(utf8BytesWithinBudget(unicode, bytes)).toBe(bytes);
        expect(utf8BytesWithinBudget(unicode, bytes - 1)).toBeNull();
        expect(utf8BytesWithinBudget('ABC', 3)).toBe(3);
        expect(utf8BytesWithinBudget('', 0)).toBe(0);
        expect(utf8BytesWithinBudget('é', 1)).toBeNull();
    });
    it('rejeita entradas inválidas e evita alocar buffers para excesso óbvio', () => {
        expect(utf8BytesWithinBudget(null, 30)).toBeNull();
        expect(utf8BytesWithinBudget('<xml/>', -1)).toBeNull();
        expect(utf8BytesWithinBudget('<xml/>', 2.5)).toBeNull();
        const chunkSpy = vi.spyOn(TextEncoder.prototype, 'encodeInto');
        try {
            expect(utf8BytesWithinBudget('X'.repeat(2 * 1024 * 1024), 1024)).toBeNull();
            expect(chunkSpy).not.toHaveBeenCalled();
        }
        finally {
            chunkSpy.mockRestore();
        }
    });
    it('não utiliza encode() com buffers proporcionais ao documento inteiro', () => {
        const big = 'x'.repeat(256 * 1024);
        const allocated = vi.spyOn(TextEncoder.prototype, 'encode').mockImplementation(() => {
            throw new Error('Não alocar buffer integral.');
        });
        const into = vi.spyOn(TextEncoder.prototype, 'encodeInto');
        try {
            expect(utf8BytesWithinBudget(big, big.length)).toBe(big.length);
            expect(into.mock.calls.length).toBeGreaterThan(1);
            expect(into.mock.calls.every(([chunk, buffer]) =>
                chunk.length <= 4096 && buffer.byteLength <= 4096 * 3)).toBe(true);
        }
        finally {
            allocated.mockRestore();
            into.mockRestore();
        }
    });
});
