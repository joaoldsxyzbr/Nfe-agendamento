# Extension Background Behavior Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cobrir o comportamento real do service worker da extensão com testes Vitest que simulem Chrome MV3, sem depender apenas de inspeção textual de `background.ts`.

**Architecture:** Os testes instalam um objeto `chrome` fake antes de importar dinamicamente `background.ts`. O fake registra listeners e implementa somente as APIs usadas pelo background, permitindo disparar mensagens, remoção de abas/janelas, storage e `webRequest` de forma determinística. O código de produção não ganha uma abstração nova enquanto o teste por import real for suficiente.

**Tech Stack:** TypeScript 7, Vitest 5, Chrome Extension Manifest V3 APIs simuladas.

**Spec:** `docs/superpowers/specs/2026-09-22-extension-only-architecture-design.md`

## Global Constraints

- Testar o arquivo `apps/extension/src/background.ts` real.
- Não usar extensão de mocking externa.
- Não alterar permissões do manifesto.
- Não automatizar hCaptcha.
- Não usar timers reais longos.
- Cada teste chama `vi.resetModules()` e instala um novo Chrome fake.
- O fake implementa apenas APIs exigidas pelos cenários testados.
- Manter `background-static.test.ts` somente para invariantes de ausência/presença que não são melhores como comportamento.

## Review Focus

- duas chamadas `start` idênticas após perda de resposta: uma única janela deve existir;
- duas chamadas `start` diferentes concorrentes: a segunda deve falhar sem abrir outra janela;
- service worker recarrega com operação válida em `storage.session`: operação deve sobreviver;
- operação armazenada aponta para aba/janela inexistente: estado deve ser limpo;
- duas notificações do mesmo download: somente a primeira pode capturar/concluir a operação.

---

### Task 1: Criar um Chrome MV3 fake mínimo e reutilizável

**Files:**
- Create: `apps/extension/tests/fake-chrome.ts`
- Create: `apps/extension/tests/background-behavior.test.ts`

**Interfaces:**
- Produces: `createFakeChrome(options?)` e helpers para disparar listeners registrados.
- Consumes: nenhuma mudança de produção.

Definir no helper:

~~~ts
type FakeChromeController = {
  chrome: unknown
  sentSiteEvents: unknown[]
  createdWindows: Array<Record<string, unknown>>
  removedWindows: number[]
  sessionState: Map<string, unknown>
  emitRuntimeMessage(message: unknown, sender: unknown): Promise<unknown>
  emitWindowRemoved(windowId: number): Promise<void>
  emitTabRemoved(tabId: number): Promise<void>
  emitBeforeRequest(details: unknown): Promise<void>
  flush(): Promise<void>
}
~~~

- [ ] **Step 1: Escrever teste RED de bootstrap**

Teste: `registers background listeners against the fake Chrome runtime`.

Fluxo:

1. `vi.resetModules()`;
2. criar fake;
3. `vi.stubGlobal('chrome', fake.chrome)`;
4. `await import('../src/background')`;
5. afirmar que runtime message, window removed, tab removed e before-request receberam exatamente um listener.

- [ ] **Step 2: Rodar RED**

Run:

~~~bash
npm run test:extension -- --run apps/extension/tests/background-behavior.test.ts
~~~

Expected: FAIL porque `fake-chrome.ts` ainda não existe.

- [ ] **Step 3: Implementar o fake mínimo**

Implementar eventos com `addListener(listener)`, arrays de listeners e métodos `emit*`. Implementar inicialmente:

- `runtime.onMessage`;
- `runtime.onInstalled`;
- `runtime.onStartup`;
- `runtime.getManifest`;
- `action.onClicked`;
- `storage.local.setAccessLevel`;
- `storage.local.get/set`;
- `storage.local.onChanged`;
- `storage.session.get/set/remove`;
- `windows.onRemoved/create/get/remove`;
- `tabs.onRemoved/query/get/update/sendMessage`;
- `webRequest.onBeforeRequest`;
- `scripting.executeScript`.

Usar Maps/arrays em memória; nenhuma espera artificial.

- [ ] **Step 4: Rodar GREEN**

Run:

~~~bash
npm run test:extension -- --run apps/extension/tests/background-behavior.test.ts
~~~

Expected: PASS no teste de bootstrap.

- [ ] **Step 5: Commit**

~~~bash
git add apps/extension/tests/fake-chrome.ts apps/extension/tests/background-behavior.test.ts
git commit -m "test: add Chrome MV3 background harness"
~~~

### Task 2: Cobrir origem e idempotência de start

**Files:**
- Modify: `apps/extension/tests/background-behavior.test.ts`

**Interfaces:**
- Consumes: `emitRuntimeMessage`, `createdWindows`, `sessionState`.
- Produces: regressões para fronteira site → background e start idempotente.

- [ ] **Step 1: Escrever teste de origem inválida**

Teste: `rejects site commands from a sender outside SITE_ORIGIN`.

Enviar `ping` com sender URL `https://example.invalid/`.

Expected response:

~~~ts
expect(response).toMatchObject({
  type: 'failed',
  code: 'extension_error',
  message: 'Origem da mensagem não autorizada.',
})
~~~

- [ ] **Step 2: Escrever teste de start idempotente**

Teste: `reuses the active operation when the same site tab retries the same access key`.

Disparar duas mensagens `start` com mesma aba e mesma chave válida.

Assertions:

~~~ts
expect(first.type).toBe('started')
expect(second.type).toBe('started')
expect(second.operationId).toBe(first.operationId)
expect(second.resumed).toBe(true)
expect(fake.createdWindows).toHaveLength(1)
~~~

- [ ] **Step 3: Escrever teste de start concorrente incompatível**

Teste: `rejects another operation while one is active`.

Depois do primeiro start, enviar outra chave válida ou outra aba.

Assertions:

~~~ts
expect(response).toMatchObject({
  type: 'failed',
  code: 'portal_operation_active',
})
expect(fake.createdWindows).toHaveLength(1)
~~~

- [ ] **Step 4: Rodar os testes**

Run:

~~~bash
npm run test:extension -- --run apps/extension/tests/background-behavior.test.ts
~~~

Expected: PASS sem mudar `background.ts`. Se falhar, corrigir o comportamento de produção somente quando o teste provar regressão real.

- [ ] **Step 5: Commit**

~~~bash
git add apps/extension/tests/background-behavior.test.ts apps/extension/src/background.ts
git commit -m "test: cover extension start lifecycle"
~~~

### Task 3: Cobrir cancelamento, fechamento e reconciliação

**Files:**
- Modify: `apps/extension/tests/background-behavior.test.ts`

**Interfaces:**
- Consumes: fake storage, tabs/windows e eventos de remoção.
- Produces: regressões de cleanup e cold-start.

- [ ] **Step 1: Testar cancelamento explícito**

Teste: `cancel clears the current operation and closes its popup`.

Após start, enviar `cancel`.

Assertions:

~~~ts
expect(fake.sessionState.has('activePortalOperation')).toBe(false)
expect(fake.removedWindows).toContain(portalWindowId)
~~~

- [ ] **Step 2: Testar fechamento do popup**

Teste: `closing the Portal window cancels the active operation and notifies the site`.

Emitir `windows.onRemoved` com o id do popup.

Assertions:

- storage da operação vazio;
- `sentSiteEvents` contém evento `cancelled`;
- nenhuma nova janela é criada.

- [ ] **Step 3: Testar reload com estado válido**

Pré-carregar `sessionState` com operação válida e fakes de janela/abas existentes. Importar `background.ts`.

Expected: `activePortalOperation` continua no storage após `flush()`.

- [ ] **Step 4: Testar estado obsoleto**

Pré-carregar operação cujo `portalTabId` não existe.

Expected:

~~~ts
expect(fake.sessionState.has('activePortalOperation')).toBe(false)
~~~

Se a janela ainda existir, ela deve ser removida.

- [ ] **Step 5: Rodar GREEN**

Run:

~~~bash
npm run test:extension -- --run apps/extension/tests/background-behavior.test.ts
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~bash
git add apps/extension/tests/background-behavior.test.ts apps/extension/src/background.ts
git commit -m "test: cover extension recovery and cancellation"
~~~

### Task 4: Cobrir claim único e conclusão do XML

**Files:**
- Modify: `apps/extension/tests/background-behavior.test.ts`
- Modify only if a behavior defect is proven: `apps/extension/src/background.ts`

**Interfaces:**
- Consumes: `emitBeforeRequest`, fake `scripting.executeScript`, storage ativo.
- Produces: regressão que impede captura/replay duplicado.

- [ ] **Step 1: Preparar operação em `waiting_result`**

Usar o fluxo de mensagens do Portal para levar a operação por:

~~~text
start → ready → submitting → download_ready
~~~

Confirmar no storage que `state === 'waiting_result'`.

- [ ] **Step 2: Testar duas notificações iguais de download**

Configurar `scripting.executeScript` do replay para devolver XML válido da fixture mínima correspondente à chave.

Emitir o mesmo `beforeRequest` duas vezes sem aguardar trabalho extra entre elas e depois `flush()`.

Assertions:

- apenas um replay de `fetchPortalXmlInPage` foi executado;
- apenas um evento terminal `completed` foi enviado ao site;
- storage ativo foi limpo;
- popup foi removido uma vez.

- [ ] **Step 3: Testar XML de chave divergente**

Configurar replay com `nfeProc` válido estruturalmente, mas `Id="NFe..."` de outra chave.

Expected evento terminal:

~~~ts
expect(event).toMatchObject({
  type: 'failed',
  code: 'portal_xml_invalid',
})
~~~

- [ ] **Step 4: Rodar GREEN**

Run:

~~~bash
npm run test:extension -- --run apps/extension/tests/background-behavior.test.ts
~~~

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add apps/extension/tests/background-behavior.test.ts apps/extension/src/background.ts
git commit -m "test: cover single Portal XML claim"
~~~

### Task 5: Reduzir o papel do teste estático ao que ele realmente prova

**Files:**
- Modify: `apps/extension/tests/background-static.test.ts`

**Interfaces:**
- Consumes: cobertura comportamental das Tasks 2–4.
- Produces: teste estático menor e sem duplicar contratos comportamentais.

- [ ] **Step 1: Remover assertions substituídas por comportamento**

Remover checks de string para:

- `withOperationMutation`;
- `claimPortalDownload`;
- `operation.state !== 'waiting_result'`;
- `clearActiveOperationIfCurrent`;
- `reconcileActiveOperation`.

Manter checks de invariantes simples de segurança/arquitetura, por exemplo ausência de:

- `direct_lookup`;
- `webRequestBlocking`;
- `hcaptcha.execute`;
- `grecaptcha.execute`.

- [ ] **Step 2: Rodar toda a extensão**

Run:

~~~bash
npm run test:extension
npm run build:extension
~~~

Expected: todos os testes e typecheck/build passam.

- [ ] **Step 3: Commit**

~~~bash
git add apps/extension/tests/background-static.test.ts apps/extension/tests/background-behavior.test.ts apps/extension/tests/fake-chrome.ts
git commit -m "test: favor behavioral extension coverage"
~~~
