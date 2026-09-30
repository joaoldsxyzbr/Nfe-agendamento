# Hardening do repositório

## Estado atual

O produto atual é site + extensão Chromium. O CI não compila nem empacota componentes Windows.

## Proteção da `main`

Em 30/09/2026, a API de Rulesets retorna nenhum Ruleset ativo para o repositório. A proteção administrativa desejada continua pendente:

- pull request obrigatório para a `main`;
- zero aprovações de terceiro obrigatórias;
- checks obrigatórios `web`, `extension`, `danfe-print` e `codeql`;
- branch atualizada antes do merge: desabilitada;
- force-push: bloqueado;
- exclusão da `main`: bloqueada.

A integração GitHub usada pela automação do projeto possui leitura de Rulesets, mas não escrita administrativa. Portanto essa proteção só pode ser marcada como concluída depois de um Ruleset ativo ser observado no GitHub.

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
- cobertura com threshold;
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
4. existe `docs/testing/acceptance-results/vX.Y.Z.md` com a mesma versão da extensão e estado rastreável (`PENDENTE` ou `APROVADO`), sem registrar navegador como aprovado por inferência.

A release extension-only publica somente o ZIP da extensão produzido pelo CI desse mesmo SHA. A aceitação física em Chrome e Edge é **pós-release**: o workflow valida a existência e a coerência do registro, mas não fabrica nem exige aprovação física antes da publicação. Um resultado físico reprovado deve ser registrado e tratado como incidente/correção, nunca convertido em aprovação automática.

A baseline `v0.0.35 / extensão 0.2.12` possui registro em `docs/testing/acceptance-results/v0.0.35.md` com status atual **PENDENTE**.

## Cloudflare

O site usa Workers Static Assets diretamente. Não existe Worker script intermediário nem binding `ASSETS`.

O único arquivo de configuração Wrangler vigente é o `wrangler.jsonc` da raiz, que aponta para `apps/web/dist`.
