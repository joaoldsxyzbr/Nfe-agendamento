/** Guidance is intentionally generic: browser/certificate failures are not always observable. */
export function portalErrorGuidance(message: string | null): string {
  const normalized = (message ?? '').toLocaleLowerCase('pt-BR');
  if (/cancelad|cancelled|canceled/.test(normalized)) {
    return 'Consulta interrompida. Você pode tentar novamente.';
  }
  if (/xml|nfeproc|chave|doctype|dtd/.test(normalized)) {
    return 'O XML recebido não pôde ser validado. Confira a chave ou importe o XML manualmente.';
  }
  if (/tempo|timeout|expir|demor|não respondeu/.test(normalized)) {
    return 'A consulta demorou além do esperado. Verifique o Portal e tente novamente.';
  }
  if (/extens|conex|comunica|network|fetch|rede/.test(normalized)) {
    return 'Não foi possível comunicar com a extensão ou o Portal. Verifique a conexão e tente novamente.';
  }
  return 'A consulta não foi concluída. Verifique a janela do Portal e tente novamente ou importe o XML manualmente.';
}
