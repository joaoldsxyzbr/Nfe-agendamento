# Ciclo de vida dos listeners MV3 — correção de erro na v0.3.2

## Relato

Na versão `0.3.2`, o navegador registrou `Uncaught TypeError: Cannot read properties of undefined (reading 'onMessage')` em `src/portal/extension-client.js:32`, ao executar a função de remoção de listener. O contexto mostrado no painel de erros era `chrome://newtab/`.

## Causa identificada no código

`ExtensionPageTransport.subscribe()` acessava novamente `this.api.runtime.onMessage` para remover o listener, mesmo que a API `chrome.runtime` pudesse ter se tornado indisponível após fechamento/navegação da janela ou recarga da extensão. O erro ocorria na **limpeza** do listener, não em um resultado fiscal ou num modelo de IA.

O rastreamento comprova o acesso inseguro, mas, por si só, não permite afirmar qual ação exata do navegador invalidou o contexto.

## Correção

- Registrar o listener normalmente e reter a referência do objeto de evento usado no registro.
- Remover o listener dessa referência original; não acessar novamente `chrome.runtime` durante o encerramento.
- Tornar a remoção idempotente e tolerar exceções quando o contexto MV3 já foi invalidado.
- Quando `onMessage` não existe na inscrição (contexto inativo), não tentar acessar a API inexistente. Nenhum fallback externo, consulta extra ou polling é introduzido.
- O handshake, autenticação de aba e protocolo de mensagens permanecem inalterados.

## Testes e limites

Os testes simulam a ausência de `chrome.runtime.onMessage` após a inscrição, invalidação do contexto com exceção durante `removeListener`, repetição do encerramento e ausência da API antes da inscrição. O CI executa testes UI/extensão, build e regressões de impressão no Chromium automatizado.

Isso elimina o erro de limpeza neste caminho, **não** comprova o comportamento no equipamento que gerou o relato. Após instalar a versão corrigida, descarte o erro antigo no painel de extensões e reabra a interface: o Chromium pode preservar registros anteriores mesmo quando o problema não se repete.
