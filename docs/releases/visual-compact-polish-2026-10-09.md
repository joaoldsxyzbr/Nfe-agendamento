# Refinamento visual compacto da consulta — 09/10/2026

## Contexto
Os screenshots de uma e várias NF-e mostram excesso de espaços verticais: cabeçalho/cartão de entrada amplo, ações por nota com 75 px de altura e, na consulta individual, segunda faixa de ações ocupando a largura toda. A decisão foi compactar a composição existente sem trocar a tela, a paleta ou o fluxo de consulta.

## Mudanças implementadas
- Cabeçalho e cartão com menores paddings e espaçamento; tipografia preserva contraste e tamanho legível.
- Área de chaves de 42 px em uma linha, expansão por conteúdo até 148 px e barra de rolagem fina para lotes.
- Rodapé reduzido a uma linha responsiva com contadores e orientação curta.
- Botões principais de 42 px (mesma cor existente), ícones menores e cantos discretos.
- Status/progresso, barra de lote e linhas de resultados com densidade maior.
- Mesmo grid de resultados para uma ou várias notas; ações **Visualizar**, **Imprimir** e **XML** em botões horizontais de 34 px, com nomes acessíveis completos.
- Dados da nota acima da chave abreviada, chave completa ao passar o mouse e dica para informação truncada.
- Ações de erro/ZIP/impressão geral, hCaptcha manual, cancelamento, reconsulta e recuperação por XML mantidos.
- Em telas estreitas, detalhes/status/ações se reorganizam na mesma linha/cartão sem rolagem horizontal.

## Preservação
A arquitetura site + extensão Chromium + Portal Nacional não muda. A máquina de estados e o processamento sequencial do lote não foram alterados. Sem consulta fiscal direta, mudança de cor, lib extra ou polling.

## Testes
Testes do tema e estrutura verificam grid e tamanho reduzidos; Playwright verifica botões acessíveis, linha individual compacta e viewport de 390 px. CI web, extensão, DANFE/impressão e Workers Build devem ser aprovados antes do merge.

## Aceitação
A confirmação visual do site publicado e o fluxo físico com Portal/certificado/hCaptcha permanecem a cargo do usuário; o CI automatizado não substitui teste real do navegador.
