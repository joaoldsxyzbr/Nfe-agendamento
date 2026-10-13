# Hardening do repositório

## Estado atual

O produto vigente é **site + extensão Chromium MV3**, Portal-only. O repositório `joaoldsxyzbr/Nfe-agendamento-2.0` é privado e de uso pessoal.

## Proteção da `main`

A conta atual não disponibiliza Rulesets para este repositório privado. A API do GitHub responde `403` orientando upgrade do plano ou repositório público.

Como o projeto possui um único proprietário, Ruleset/branch protection não é tratado como dependência operacional do produto. Se o plano GitHub mudar no futuro, a configuração recomendada continua sendo:

- pull request para mudanças relevantes;
- checks `web`, `extension` e `danfe-print`;
- force-push e exclusão da `main` bloqueados.

Enquanto esse recurso não estiver disponível, a disciplina do projeto é: mudanças relevantes em branch, PR, CI verde e merge somente depois da revisão do diff.

## Gates automatizados

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
- `npm audit --audit-level=high`;
- testes;
- cobertura com threshold;
- typecheck/build;
- build da extensão Manifest V3, sem upload de artefato temporário no CI.

A CSP das páginas da extensão restringe scripts e objetos aos recursos empacotados.

### danfe-print

Executa Playwright para o fluxo web e regressão DANFE/PDF. O resultado dos testes fica nos logs do CI; não envia artefatos temporários ao armazenamento de Actions.

### CodeQL

O repositório privado não é elegível para CodeQL/code scanning no plano GitHub atual. GitHub documenta que repositórios privados precisam de GitHub Code Security em plano compatível.

Por isso:

- não existe job CodeQL no CI vigente;
- o antigo workflow semanal foi removido;
- `npm audit`, TypeScript, testes, cobertura, Playwright, revisão de código e permissões mínimas da extensão continuam sendo os controles automatizados disponíveis no projeto;
- CodeQL pode ser reativado se o repositório voltar a ser público ou se um plano compatível com GitHub Code Security for adotado.

Referência oficial: https://docs.github.com/en/code-security/reference/code-scanning/troubleshoot-analysis-errors/private-repository-enablement

### Dependabot

Os updates de versão cobrem:

- npm da raiz;
- npm dos testes Playwright;
- GitHub Actions.

O arquivo `.github/dependabot.yml` é a configuração versionada de manutenção das dependências.

## Release

O workflow de release só publica quando, no mesmo SHA da `main`:

1. o workflow `CI` concluiu com `web`, `extension` e `danfe-print` verdes;
2. o commit é exatamente `release: vX.Y.Z`;
3. existe `docs/releases/vX.Y.Z.md`;
4. existe `docs/testing/acceptance-results/vX.Y.Z.md` com a mesma versão da extensão e estado rastreável.

A extensão é recompilada com `npm ci` e empacotada no próprio workflow de release, a partir do SHA exato aprovado pelo CI (lockfile versionado), e o ZIP Manifest V3 é verificado antes de publicar. Não se usam `upload-artifact` ou `download-artifact`: assim a cota de armazenamento do Actions não bloqueia validações e releases. Os ZIPs finais continuam disponíveis nos assets da release privada.

### Dependências e armazenamento (08/10/2026)

- Correção das vulnerabilidades altas reportadas pelo `npm audit` em `sharp` (GHSA-wq5f-xc86-pv6w) e `source-map-js` (GHSA-68fv-2mgg-jv7q), com overrides atualizados e lockfile reproduzível.
- O CI continua com audit de segurança, testes, cobertura, build e dry-run, mesmo sem upload de artefatos intermediários.
- O armazenamento de artefatos antigos do Actions pode continuar ocupado até expirar ou ser limpo no GitHub. Isso não bloqueia mais o novo fluxo de CI/release.

A aceitação física em Chrome e Edge permanece separada do CI. Ela nunca é inferida automaticamente.

A release vigente é **v0.0.38 / extensão 0.2.14**. O registro físico correspondente permanece **PENDENTE** em `docs/testing/acceptance-results/v0.0.38.md`. O histórico da v0.0.37 não deve ser marcado como aprovado automaticamente.

## Distribuição da extensão

Como o repositório é privado e só o proprietário usa o sistema, não existe infraestrutura pública adicional para distribuir a extensão.

O atalho do site abre a release mais recente no GitHub. O proprietário autenticado baixa o ZIP diretamente da release privada.

## Cloudflare

O site usa Workers Static Assets diretamente. Não existe Worker script intermediário nem binding `ASSETS`.

O único arquivo de configuração Wrangler vigente é o `wrangler.jsonc` da raiz, apontando para `apps/web/dist`. O nome do Worker no Wrangler é `nfe-agendamento-2-0`, correspondente ao Worker existente na Cloudflare. Essa igualdade evita o aviso de override automático de nome durante Builds; não cria nem renomeia um Worker em produção.

## Dependabot — 08/10/2026

O lote de atualização mantém a compatibilidade das ferramentas sem alterar o comportamento fiscal do produto:

- PR #67: Vitest 5.0.3, integrada com CI verde.
- PR #70: tipos Node 26.6.4, integrada com CI verde.
- PR #69: `@vitest/coverage-v8` 5.0.3, integrada **depois** da atualização do Vitest para manter as peer dependencies compatíveis (a PR isolada falhava com `ERESOLVE`).
- PRs #66 (Vite 8.3.2) e #68 (Wrangler 4.147.0): atualização consolidada numa única branch a partir da `main`, para resolver conflitos cruzados no `package-lock.json`. As dependências resolvidas dessas PRs do Dependabot foram aplicadas ao lockfile vigente, preservando as versões de Vitest/cobertura e tipos Node já integradas.

Critérios de entrega: `npm ci`, auditoria npm, gates `web`, `extension`, `danfe-print` e build de prévia Cloudflare aprovados no mesmo SHA antes do merge. A publicação e o CI da `main` serão verificados depois. Não atualizar releases/versões de extensão nem marcar a aceitação física Chrome/Edge como executada nesta manutenção.
