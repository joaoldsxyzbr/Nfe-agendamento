// Conta bytes UTF-8 com memória auxiliar limitada, sem alocar um buffer por XML.
// Retorna null se ultrapassar o orçamento; preserva pares substitutos Unicode.
const CHUNK_CODE_UNITS = 4096;
const BYTES_PER_CODE_UNIT = 3;

export function utf8BytesWithinBudget(xml, remainingBytes) {
    if (typeof xml !== 'string' || !Number.isSafeInteger(remainingBytes) || remainingBytes < 0)
        return null;
    // Cada unidade UTF-16 requer pelo menos um byte em UTF-8.
    if (xml.length > remainingBytes)
        return null;
    const encoder = new TextEncoder();
    const buffer = new Uint8Array(CHUNK_CODE_UNITS * BYTES_PER_CODE_UNIT);
    let used = 0;
    for (let offset = 0; offset < xml.length;) {
        let end = Math.min(offset + CHUNK_CODE_UNITS, xml.length);
        // Não fragmentar pares de substitutos entre as fatias.
        const tail = xml.charCodeAt(end - 1);
        if (end < xml.length && tail >= 0xD800 && tail <= 0xDBFF)
            end -= 1;
        const chunk = xml.slice(offset, end);
        const { read, written } = encoder.encodeInto(chunk, buffer);
        if (read !== chunk.length)
            throw new Error('Falha ao medir o tamanho UTF-8 do XML.');
        used += written;
        if (used > remainingBytes)
            return null;
        offset = end;
    }
    return used;
}
