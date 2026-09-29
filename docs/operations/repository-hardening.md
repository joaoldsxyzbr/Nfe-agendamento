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

### codeql

O job `codeql` faz parte do workflow `CI` em push/PR e analisa JavaScript/TypeScript no mesmo gate usado pelo release.

O workflow `CodeQL` separado permanece somente para a análise semanal agendada.

### Dependabot

Os updates de versão cobrem npm na raiz, npm dos testes Playwright e GitHub Actions. Entradas NuGet legadas foram removidas porque o produto atual não contém projetos .NET.

**Dependabot Alerts** e **Dependabot Security Updates** estão habilitados nas configurações do repositório, confirmados em 27/09/2026. O arquivo `.github/dependabot.yml` continua responsável apenas pelos updates de versão e de GitHub Actions.

## Release

O workflow de release só publica quando, no mesmo SHA da `main`:

1. o workflow `CI` concluiu com `web`, `extension`, `danfe-print` e `codeql` verdes;
2. o commit é exatamente `release: vX.Y.Z`;
3. existe `docs/releases/vX.Y.Z.md`;
4. existe `docs/testing/acceptance-results/vX.Y.Z.md` com a mesma versão da extensão, `Status: APROVADO`, `Chrome: APROVADO` e `Edge: APROVADO`.

A release extension-only publica somente o ZIP da extensão produzido pelo CI desse mesmo SHA. O workflow não fabrica aprovação física; ele apenas valida o registro versionado.

## Cloudflare

O site usa Workers Static Assets diretamente. Não existe Worker script intermediário nem binding `ASSETS`; `wrangler.jsonc` aponta para `apps/web/dist`.
