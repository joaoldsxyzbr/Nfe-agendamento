# Site estático sem Vite

Data: 2026-10-15. Complementa javascript-migration.md.

## Arquitetura

- HTML, CSS e JavaScript ES Modules nativos no site. Sem bundler ou transpiler frontend.
- Imports relativos possuem extensão .js; arquivos CSS são ligados em index.html.
- scripts/build-web.mjs copia index.html, extension-test.html, src/ e public/ para apps/web/dist.
- scripts/serve-web.mjs --source serve arquivos em desenvolvimento; --dist serve os artefatos de teste.
- Cloudflare Workers Static Assets continua publicando exclusivamente apps/web/dist.
- XML usa DOMParser nativo do navegador. @xmldom/xmldom é usado apenas como polyfill nos testes Node.

## Extensão e testes

- A extensão continua em JavaScript e HTML. esbuild empacota seus scripts Chromium MV3, sem alterar sua lógica.
- Vitest e suas dependências internas, Playwright e Wrangler são ferramentas de teste/entrega, não runtime do site.
- Preservar lint, audit, testes, cobertura, builds, Playwright e dry-run Cloudflare no CI.
- Fluxo fiscal Portal Nacional, hCaptcha manual, certificado navegador, XML, lote e DANFE inalterados.

## Validação

- Exigir CI verde e teste Playwright na cópia estática publicada.
- Aceite físico Chrome/Edge requer teste real no Portal pelo usuário e não é substituído por CI.
