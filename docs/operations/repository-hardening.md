# Hardening do repositório

## Estado atual

O produto atual é site + extensão Chromium. O CI não compila nem empacota componentes Windows.

## Proteção da `main`

A branch principal permite o fluxo operacional de push direto, mas bloqueia:

- exclusão da `main`;
- force-push na `main`.

Não há exigência de pull request ou status check antes do push, preservando o fluxo de trabalho atual.

## Gates

### web

- `npm ci`;
- `npm audit --audit-level=high`;
- lint/typecheck;
- format check;
- testes e cobertura;
- build;
- `wrangler deploy --dry-run`.

### extension

- `npm ci`;
- audit;
- testes;
- typecheck/build;
- empacotamento do ZIP MV3.

A CSP das páginas da extensão é declarada explicitamente no manifesto e restringe scripts/objetos aos recursos empacotados.

### danfe-print

Executa os testes Playwright do fluxo web e regressão DANFE/PDF.

### CodeQL

Analisa JavaScript/TypeScript.

### Dependabot

Os updates de versão cobrem npm na raiz, npm dos testes Playwright e GitHub Actions. Entradas NuGet legadas foram removidas porque o produto atual não contém projetos .NET.

Os Dependabot Alerts/Security Updates dependem da configuração de segurança do repositório no GitHub e não são controlados pelo arquivo `.github/dependabot.yml`.

## Release

O workflow de release só roda após CI verde da `main` e commit exato `release: vX.Y.Z`. A release extension-only publica somente o ZIP da extensão validado pelo mesmo SHA.

## Cloudflare

O site usa Workers Static Assets diretamente. Não existe Worker script intermediário nem binding `ASSETS`; `wrangler.jsonc` aponta para `apps/web/dist`.
