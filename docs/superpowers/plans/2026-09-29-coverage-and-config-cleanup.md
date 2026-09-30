# Coverage and Configuration Cleanup Implementation Plan

> **Atualização em 30/09/2026:** a decisão de manter o fallback periódico foi substituída por `2026-09-30-system-reliability-hardening.md`. O content script agora é orientado a eventos e usa timers únicos apenas para deadlines. Este arquivo permanece como histórico da rodada anterior.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir regressões silenciosas de cobertura e remover a configuração Wrangler duplicada, mantendo um único deploy source-of-truth.

**Architecture:** O web passa a falhar abaixo de thresholds globais ligeiramente inferiores à baseline auditada; a extensão ganha cobertura depois dos testes comportamentais do plano anterior. O `wrangler.jsonc` da raiz permanece como única configuração vigente, porque já é o arquivo usado pelo CI e aponta para `apps/web/dist`.

**Tech Stack:** Vitest 5, V8 coverage, Wrangler 4.134.0, Cloudflare Workers Static Assets.

**Spec:** `docs/operations/repository-hardening.md`

## Global Constraints

- Executar este plano depois de `2026-09-29-extension-background-behavior-tests.md`.
- Não reduzir thresholds para fazer CI passar; adicionar testes quando necessário.
- Não alterar `compatibility_date` nesta rodada.
- Não migrar para Cloudflare Vite plugin.
- Não adicionar Worker script ou binding `ASSETS`.
- O `wrangler.jsonc` da raiz continua sendo a fonte de verdade.
- O fallback periódico de 1 segundo da extensão não é removido nesta rodada.

## Review Focus

- arquivo crítico deixa de ser testado e cobertura global cai: CI deve falhar;
- cobertura da extensão é gerada sem incluir `background.ts`: configuração deve impedir;
- `apps/web/wrangler.jsonc` reaparece: teste deve falhar;
- root Wrangler deixa de apontar para `./apps/web/dist`: teste deve falhar;
- dry-run Cloudflare diverge após remoção do arquivo duplicado: mudança deve ser interrompida.

---

### Task 1: Travar a baseline de cobertura web

**Files:**
- Modify: `apps/web/vitest.config.ts`
- Modify only if tests need strengthening: `apps/web/tests/*.test.ts`

**Interfaces:**
- Consumes: baseline auditada no SHA `6963bcb`: statements 49.44%, branches 49.01%, functions 51.56%, lines 51.38%.
- Produces: piso de cobertura executado por `npm run coverage:web`.

- [ ] **Step 1: Adicionar thresholds nativos do Vitest**

Configurar exatamente:

~~~ts
thresholds: {
  statements: 48,
  branches: 48,
  functions: 50,
  lines: 50,
}
~~~

Não habilitar `perFile` nesta rodada, porque módulos de composição/UI ainda têm cobertura unitária 0 e a mudança seria ampla demais.

- [ ] **Step 2: Rodar coverage**

Run:

~~~bash
npm run coverage:web
~~~

Expected: PASS e métricas iguais ou superiores aos quatro thresholds.

- [ ] **Step 3: Se qualquer threshold falhar, adicionar teste em vez de baixar o piso**

Prioridade de teste:

1. `portal/extension-client.ts`;
2. `batch/controller.ts`;
3. `danfe/pagination.ts`;
4. `main.ts` somente através de comportamento que não replique Playwright.

- [ ] **Step 4: Commit**

~~~bash
git add apps/web/vitest.config.ts apps/web/tests
git commit -m "test: enforce web coverage baseline"
~~~

### Task 2: Adicionar cobertura à extensão

**Files:**
- Modify: `apps/extension/package.json`
- Create: `apps/extension/vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: testes comportamentais de `background.ts`.
- Produces: comando raiz `npm run coverage:extension`.

- [ ] **Step 1: Adicionar script do workspace**

Em `apps/extension/package.json`:

~~~json
"coverage": "vitest run --coverage"
~~~

Na raiz:

~~~json
"coverage:extension": "npm --workspace @nfe-agendamento/extension run coverage"
~~~

Adicionar `@vitest/coverage-v8` em `devDependencies` da extensão usando exatamente a mesma faixa já usada pelo web (`^5.0.0`), sem introduzir versão divergente.

- [ ] **Step 2: Criar config de cobertura da extensão**

`apps/extension/vitest.config.ts`:

~~~ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: '../../coverage/extension',
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
})
~~~

- [ ] **Step 3: Rodar cobertura da extensão**

Run:

~~~bash
npm run coverage:extension
~~~

Expected: PASS com `src/background.ts` presente no relatório.

- [ ] **Step 4: Se a baseline ficar abaixo do piso, ampliar testes comportamentais**

Não reduzir os valores acima. Adicionar cenários ao `background-behavior.test.ts` e/ou testes dos módulos puros até atingir o piso.

- [ ] **Step 5: Commit**

~~~bash
git add package.json apps/extension/package.json apps/extension/vitest.config.ts apps/extension/tests package-lock.json
git commit -m "test: enforce extension coverage baseline"
~~~

### Task 3: Colocar cobertura da extensão no CI

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `apps/web/tests/deploy-config.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run coverage:extension`.
- Produces: gate de CI que impede regressão de cobertura na extensão.

- [ ] **Step 1: Escrever RED estático**

Adicionar ao teste de deploy:

~~~ts
expect(ci).toContain('- run: npm run coverage:extension')
~~~

- [ ] **Step 2: Rodar RED**

Run:

~~~bash
cd apps/web && ../../node_modules/.bin/vitest run tests/deploy-config.test.ts
~~~

Expected: FAIL.

- [ ] **Step 3: Adicionar coverage ao job `extension`**

Ordem do job:

~~~text
npm ci
npm audit --audit-level=high
npm run test:extension
npm run coverage:extension
npm run build:extension
~~~

- [ ] **Step 4: Atualizar README**

Adicionar `npm run coverage:extension` ao bloco de desenvolvimento/validação.

- [ ] **Step 5: Rodar GREEN**

~~~bash
cd apps/web && ../../node_modules/.bin/vitest run tests/deploy-config.test.ts
npm run coverage:extension
npm run build:extension
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add .github/workflows/ci.yml apps/web/tests/deploy-config.test.ts README.md
git commit -m "ci: gate extension coverage"
~~~

### Task 4: Remover o Wrangler duplicado do workspace web

**Files:**
- Delete: `apps/web/wrangler.jsonc`
- Modify: `apps/web/tests/deploy-config.test.ts`
- Modify: `docs/operations/repository-hardening.md`

**Interfaces:**
- Consumes: root `wrangler.jsonc`.
- Produces: exatamente uma configuração Wrangler vigente.

- [ ] **Step 1: Escrever RED para configuração única**

Adicionar URL para `../wrangler.jsonc` relativa ao teste e afirmar que o arquivo não existe:

~~~ts
const nestedWranglerUrl = new URL('../wrangler.jsonc', import.meta.url)
await expect(access(nestedWranglerUrl)).rejects.toBeDefined()
~~~

Manter as assertions existentes do root:

~~~ts
expect(config.build?.command).toBe('npm run build:web')
expect(config.assets?.directory).toBe('./apps/web/dist')
~~~

- [ ] **Step 2: Rodar RED**

Run:

~~~bash
cd apps/web && ../../node_modules/.bin/vitest run tests/deploy-config.test.ts
~~~

Expected: FAIL porque `apps/web/wrangler.jsonc` ainda existe.

- [ ] **Step 3: Excluir somente o config duplicado**

Remover `apps/web/wrangler.jsonc`. Não alterar o root `wrangler.jsonc`.

- [ ] **Step 4: Rodar GREEN e dry-run oficial**

~~~bash
cd apps/web && ../../node_modules/.bin/vitest run tests/deploy-config.test.ts
npm run build:web
./node_modules/.bin/wrangler deploy --dry-run
~~~

Expected:

- teste PASS;
- build PASS;
- dry-run usa `./apps/web/dist`;
- nenhum Worker script/binding novo aparece.

- [ ] **Step 5: Atualizar documentação**

Em `docs/operations/repository-hardening.md`, registrar explicitamente que apenas o `wrangler.jsonc` da raiz é vigente.

- [ ] **Step 6: Commit**

~~~bash
git add -A apps/web/wrangler.jsonc apps/web/tests/deploy-config.test.ts docs/operations/repository-hardening.md
git commit -m "chore: keep one Wrangler config"
~~~

### Task 5: Verificação final de cobertura/configuração

**Files:**
- No new product code.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: baseline estável para o CI endurecido.

- [ ] **Step 1: Rodar gates Node**

~~~bash
npm ci
npm audit --audit-level=high
npm run lint:web
npm run format:check:web
npm run test:web
npm run coverage:web
npm run build:web
npm run test:extension
npm run coverage:extension
npm run build:extension
npm test --prefix tests/playwright
./node_modules/.bin/wrangler deploy --dry-run
~~~

Expected: tudo PASS e audit com 0 vulnerabilidades high/critical.

- [ ] **Step 2: Confirmar arquivos Wrangler**

Run:

~~~bash
find . -name wrangler.jsonc -not -path './node_modules/*'
~~~

Expected:

~~~text
./wrangler.jsonc
~~~

- [ ] **Step 3: Confirmar relatórios**

Expected:

~~~text
coverage/web/coverage-summary.json
coverage/extension/coverage-summary.json
~~~

- [ ] **Step 4: Não mexer no fallback de 1 segundo**

Registrar como decisão desta rodada: manter `FALLBACK_TICK_MS = 1_000` até teste físico específico provar que Chrome e Edge detectam o token do hCaptcha sem fallback periódico.
