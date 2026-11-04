# Limite agregado de XMLs por lote — 04/11/2026

## Objetivo

Conter o crescimento de memória da interface local. O limite de **100 chaves por lote** continua existindo; agora os XMLs originais de notas já concluídas compartilham um limite aproximado de **24 MiB de bytes UTF-8** em memória.

## Comportamento

- O lote permanece **sequencial** e não usa polling.
- Antes de reter um XML adicional, o controller mede seu tamanho em UTF-8. Se ultrapassaria o orçamento, a NF-e atual recebe erro `batch_memory_limit`, as demais chaves ainda na fila ficam marcadas como não consultadas e o lote é encerrado.
- **XMLs de notas anteriores bem-sucedidas são preservados**, assim como ações de baixar individualmente, baixar todos e imprimir DANFE.
- Um novo lote após limpar a interface começa com orçamento zerado. Uma importação manual também respeita o limite.
- O erro orienta baixar os documentos já concluídos e iniciar um lote menor. Repetir ou importar a NF-e que excedeu a memória na mesma janela não resolve o orçamento e fica bloqueado para evitar operações inúteis.

## Limitações e validação

O orçamento limita **apenas o conteúdo bruto dos XMLs retidos**, não a memória total ocupada por objetos, DOM ou navegador. Ele não aumenta o limite de XML por arquivo definido na extensão nem substitui testes de carga em Chrome/Edge. Não há persistência de documentos, backend, mudanças no Portal nem validação física de notas reais.
