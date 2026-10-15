# Migração de TypeScript para JavaScript

Data: 2026-10-15. Base: v0.0.41 / extensão v0.2.16.

## Decisão

- JavaScript ES Modules no site, extensão, testes e ferramentas de configuração.
- HTML e CSS continuam responsáveis pela apresentação.
- Preservados Vite, Vitest, Playwright, esbuild e Wrangler como ferramentas de build/testes.
- Removidos TypeScript, seus tsconfig e dependências diretas.
- Lint passa a validar sintaxe JS nativa também para a extensão; testes, cobertura e build continuam obrigatórios.

## Funcionalidades e fronteiras preservadas

Site → extensão Chromium MV3 → Portal Nacional → hCaptcha humano → XML oficial → DANFE/ZIP.
Permanecem consulta em lote sequencial, verificação da chave do XML e timeouts da extensão.
Nenhum backend, D1, Bridge, consulta SEFAZ direta, acesso a certificado privado ou nova permissão.

## Critérios de aceite

- Aprovação dos jobs web, extension e danfe-print do CI, incluindo cobertura e dry-run Wrangler.
- Teste manual no Chrome e no Edge continua necessário para aprovar o fluxo real do Portal.
- A main deve continuar intacta até aprovação da branch de migração.

O histórico Git preserva integralmente o código anterior para reversão.
