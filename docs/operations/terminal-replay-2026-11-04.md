# Recuperação de resultados MV3 — 04/11/2026

## Falha tratada

A extensão podia concluir uma operação e descartar o estado ativo antes de a interface se inscrever para receber a mensagem de término. Nesse caso, a checagem única de estado informava "inativa" e a resposta era perdida.

## Contrato de recuperação

1. A extensão conserva um resultado terminal em `chrome.storage.session` **antes** de limpar o estado ativo.
2. Após registrar o listener, a interface faz **uma consulta pontual** de estado. Quando a operação já terminou, a resposta inclui `terminalEvent` somente para a aba interna proprietária e o `operationId` correto.
3. A interface confirma via `ack_result`; a extensão verifica a aba e o ID antes de apagar. Permanece um fluxo **sem polling**.
4. Há expiração de cinco minutos, limpeza por confirmação, substituição no início de nova consulta e descarte ao fechar a aba.
5. XMLs acima de 2 MiB seguem para a interface pela mensagem normal, mas não são retidos para replay; caso essa mensagem se perca, o resultado recuperável traz erro claro e orienta nova consulta.

## Limites

- Somente o último resultado, para a mesma aba e mesma sessão do navegador.
- Reinício completo do navegador não é persistido; lotes interrompidos não são retomados automaticamente.
- Falha de `chrome.storage.session` pode impedir o replay; neste caso, continua o envio normal por evento.
- Não envolve conteúdo de terceiros, servidores próprios, polling, hCaptcha automático nem certificados.
- Validação real Chrome/Edge + Portal permanece não executada.
