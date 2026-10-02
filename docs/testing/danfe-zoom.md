# Zoom do DANFE

## Comportamento vigente

O zoom de tela é implementado uma única vez por `attachDanfeZoom`, em `apps/web/src/danfe/render.ts`.

Regras:

- somente `Ctrl + scroll` altera o zoom;
- o listener usa `passive: false` para impedir o zoom da página;
- o ponto sob o cursor é preservado durante a mudança;
- o zoom fica limitado entre 60% e 200%;
- impressão/PDF volta temporariamente para zoom 100% antes da paginação;
- após a impressão, o conteúdo visual é restaurado.

O antigo `apps/web/src/danfe/zoom-direct.ts` foi removido em 02/10/2026 porque duplicava a mesma responsabilidade no viewport. O viewer agora possui uma única fonte de comportamento de zoom.

## Validação

Os testes unitários cobrem os limites de `nextDanfeZoom` e verificam que o viewer usa `attachDanfeZoom`. A regressão visual/A4 continua coberta pela suíte Playwright de DANFE.
