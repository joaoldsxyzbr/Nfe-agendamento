# Release and Main Governance Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que nenhuma release extension-only seja publicada sem CI completo, CodeQL do mesmo SHA e aceitação física versionada, e fazer a `main` receber mudanças somente após checks obrigatórios.

**Architecture:** O job CodeQL de `push`/`pull_request` passa a fazer parte do workflow `CI`, portanto o `workflow_run` de release continua simples e passa a esperar o scanner automaticamente. O workflow `CodeQL` separado permanece apenas para o scan semanal. A proteção da `main` usa Ruleset nativo do GitHub com PR obrigatório, zero aprovações obrigatórias e checks de CI, preservando um fluxo viável para repositório individual.

**Tech Stack:** GitHub Actions, CodeQL, GitHub Rulesets, Bash, Vitest.

**Spec:** `docs/operations/repository-hardening.md`

## Global Constraints

- Não adicionar polling entre workflows.
- O release continua partindo do artifact da extensão criado pelo CI do mesmo SHA.
- O release continua restrito a commit `release: vX.Y.Z` na `main`.
- Aceitação física não é fabricada pelo workflow; ele apenas verifica o arquivo versionado.
- Ruleset não exige reviewer adicional nesta etapa.
- Force-push e exclusão da `main` continuam bloqueados.
- Não alterar permissões da extensão nem arquitetura fiscal.

## Review Focus

- CI verde e CodeQL falho: release deve ficar bloqueado;
- arquivo de aceitação ausente: release deve falhar antes de publicar asset/tag;
- arquivo de aceitação de outra versão: release deve falhar;
- Chrome aprovado e Edge reprovado: release deve falhar pela evidência não aprovada;
- PR com um dos quatro checks ausente/falho: merge da `main` deve ficar bloqueado.

---

### Task 1: Colocar CodeQL de push/PR dentro do CI usado pelo release

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/codeql.yml`
- Modify: `apps/web/tests/deploy-config.test.ts`

**Interfaces:**
- Consumes: workflow `CI` já observado pelo `release.yml`.
- Produces: check `codeql` dentro do mesmo workflow que determina a conclusão de release.

- [ ] **Step 1: Escrever a regressão de configuração**

Adicionar em `deploy-config.test.ts` assertions para:

~~~ts
expect(ci).toContain('  codeql:')
expect(ci).toContain('github/codeql-action/init@')
expect(ci).toContain('github/codeql-action/analyze@')
~~~

E ler `.github/workflows/codeql.yml` para provar que o workflow separado mantém `schedule`, mas não contém `pull_request:` nem `push:`.

- [ ] **Step 2: Rodar o teste e confirmar RED**

Run:

~~~bash
npm run test:web -- --run apps/web/tests/deploy-config.test.ts
~~~

Expected: FAIL porque o job `codeql` ainda não pertence ao CI e o workflow separado ainda reage a push/PR.

- [ ] **Step 3: Mover o scan de push/PR para `ci.yml`**

Adicionar job chamado exatamente `codeql` em `CI`:

- `runs-on: ubuntu-24.04`;
- `timeout-minutes: 20`;
- checkout fixado pelo SHA já usado;
- `github/codeql-action/init` fixado pelo SHA vigente;
- linguagem `javascript-typescript`;
- `github/codeql-action/analyze` fixado pelo SHA vigente;
- permissões do workflow CI passam a incluir `security-events: write`.

No `codeql.yml`, manter somente o trigger semanal e o mesmo scan.

- [ ] **Step 4: Rodar GREEN local aplicável**

Run:

~~~bash
npm run test:web -- --run apps/web/tests/deploy-config.test.ts
~~~

Expected: PASS.

A validação real do YAML ocorre no PR, onde os jobs `web`, `extension`, `danfe-print` e `codeql` precisam concluir.

- [ ] **Step 5: Commit**

~~~bash
git add .github/workflows/ci.yml .github/workflows/codeql.yml apps/web/tests/deploy-config.test.ts
git commit -m "ci: include CodeQL in release gate"
~~~

### Task 2: Tornar evidência física requisito técnico do release

**Files:**
- Modify: `.github/workflows/release.yml`
- Create: `apps/web/tests/release-config.test.ts`

**Interfaces:**
- Consumes: `docs/testing/acceptance-results/vX.Y.Z.md` definido no plano de aceitação.
- Produces: release que falha fechado quando a evidência do mesmo `vX.Y.Z` não está aprovada.

- [ ] **Step 1: Escrever o teste estático RED**

O teste deve ler `release.yml` e exigir as strings:

~~~ts
expect(release).toContain('docs/testing/acceptance-results/v${version}.md')
expect(release).toContain('Status: APROVADO')
expect(release).toContain('Chrome: APROVADO')
expect(release).toContain('Edge: APROVADO')
expect(release).toContain('Extension: ${extension_version}')
~~~

Usar as formas literais equivalentes que ficarem no shell final, sem parser YAML adicional.

- [ ] **Step 2: Rodar e confirmar RED**

Run:

~~~bash
npm run test:web -- --run apps/web/tests/release-config.test.ts
~~~

Expected: FAIL porque a evidência física ainda não é validada.

- [ ] **Step 3: Implementar validação no step `Resolve and validate release`**

Depois de obter `version`, `notes` e `extension_version`, definir:

~~~text
acceptance=docs/testing/acceptance-results/v${version}.md
~~~

O step deve falhar se o arquivo não existir ou se não contiver exatamente:

~~~text
Release: v${version}
Extension: ${extension_version}
Status: APROVADO
Chrome: APROVADO
Edge: APROVADO
~~~

Expor `acceptance` em `GITHUB_OUTPUT` para diagnóstico do workflow.

- [ ] **Step 4: Rodar GREEN**

Run:

~~~bash
npm run test:web -- --run apps/web/tests/release-config.test.ts
~~~

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add .github/workflows/release.yml apps/web/tests/release-config.test.ts
git commit -m "ci: require physical acceptance for release"
~~~

### Task 3: Atualizar a documentação operacional do gate

**Files:**
- Modify: `docs/operations/repository-hardening.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Tasks 1 e 2.
- Produces: documentação que descreve exatamente o que o GitHub executa.

- [ ] **Step 1: Atualizar gates**

Documentar que `CI` contém quatro jobs: `web`, `extension`, `danfe-print`, `codeql`.

- [ ] **Step 2: Atualizar release**

Documentar que uma release requer simultaneamente:

1. `CI` verde do mesmo SHA;
2. commit `release: vX.Y.Z`;
3. `docs/releases/vX.Y.Z.md`;
4. `docs/testing/acceptance-results/vX.Y.Z.md` com status e navegadores aprovados.

- [ ] **Step 3: Verificar docs**

Run:

~~~bash
grep -n "codeql" docs/operations/repository-hardening.md README.md
grep -n "acceptance-results" docs/operations/repository-hardening.md README.md
~~~

Expected: referências presentes e sem afirmar aprovação física não registrada.

- [ ] **Step 4: Commit**

~~~bash
git add docs/operations/repository-hardening.md README.md
git commit -m "docs: document release quality gates"
~~~

### Task 4: Criar Ruleset da main no GitHub

**Files:**
- GitHub repository setting: Rules > Rulesets
- Modify after activation: `docs/operations/repository-hardening.md`

**Interfaces:**
- Consumes: nomes finais dos jobs da Task 1.
- Produces: proteção administrativa que impede entrada de código na `main` sem PR/checks.

- [ ] **Step 1: Criar ruleset para `main`**

Configuração:

~~~text
Target: main
Enforcement: Active
Require a pull request before merging: ON
Required approvals: 0
Require status checks before merging: ON
Require branches to be up to date before merging: OFF
Required checks:
- web
- extension
- danfe-print
- codeql
Allow force pushes: OFF
Allow deletions: OFF
~~~

A opção de branch atualizada fica OFF deliberadamente para evitar builds repetidos em um repositório individual; o CI da `main` continua executando depois do merge.

- [ ] **Step 2: Validar com um PR real**

Abrir um PR documental pequeno e confirmar que o botão de merge fica indisponível enquanto algum dos quatro checks não terminou.

Expected: merge liberado somente depois de todos os checks requeridos ficarem verdes.

- [ ] **Step 3: Confirmar que push direto deixou de ser o fluxo operacional**

Não tentar contornar a regra com bypass administrativo. Se a conta proprietária aparecer como bypass por padrão, remover o bypass da rotina normal ou documentar que ele é apenas recuperação emergencial.

- [ ] **Step 4: Atualizar documentação**

Substituir o trecho atual que diz que push direto é permitido por:

~~~text
A main recebe mudanças por pull request.
Nenhuma aprovação de terceiro é obrigatória.
web, extension, danfe-print e codeql são checks obrigatórios.
Force-push e exclusão permanecem bloqueados.
~~~

- [ ] **Step 5: Commit**

~~~bash
git add docs/operations/repository-hardening.md
git commit -m "docs: record main ruleset"
~~~

### Task 5: Verificação completa do pipeline

**Files:**
- No product code changes.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: evidência de que o processo inteiro está coerente.

- [ ] **Step 1: Rodar a suíte local**

~~~bash
npm ci
npm audit --audit-level=high
npm run lint:web
npm run format:check:web
npm run test:web
npm run coverage:web
npm run build:web
npm run test:extension
npm run build:extension
npm test --prefix tests/playwright
./node_modules/.bin/wrangler deploy --dry-run
~~~

Expected: todos passam.

- [ ] **Step 2: Confirmar PR CI**

Expected no GitHub: `web`, `extension`, `danfe-print` e `codeql` verdes.

- [ ] **Step 3: Não criar release de teste**

A validação do `release.yml` não deve fabricar `release: vX.Y.Z`. O primeiro release real depois desta mudança será o teste end-to-end do novo gate.
