# Physical Acceptance Traceability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o gate físico Chrome/Edge da arquitetura Portal-only em evidência versionada, reproduzível e sem dados fiscais sensíveis.

**Architecture:** O checklist humano continua em `docs/testing/acceptance.md`, mas cada release passa a ter um registro separado em `docs/testing/acceptance-results/vX.Y.Z.md`. O registro usa campos fixos e não contém chave NF-e, XML, CNPJ/CPF, certificado, thumbprint ou captura de tela com dado fiscal.

**Tech Stack:** Markdown, GitHub, Windows 10/11, Chrome, Edge, extensão Chromium MV3.

**Spec:** `docs/testing/acceptance.md`

## Global Constraints

- hCaptcha permanece 100% manual.
- Não registrar chave NF-e completa, XML, CNPJ/CPF, PFX/P12, senha, thumbprint ou chave privada.
- O teste usa NF-e real legítima e certificado válido somente quando o Portal exigir.
- Chrome e Edge precisam ser executados separadamente.
- Resultado físico não pode ser inferido a partir do CI.
- Se qualquer item obrigatório falhar, o status final é `REPROVADO`, não `APROVADO COM RESSALVAS`.

## Review Focus

- extensão conecta, mas o popup real não abre: registrar reprovação de integração;
- Chrome funciona e Edge falha: status final continua reprovado;
- primeira consulta funciona e segunda deixa estado residual: registrar reprovação de lifecycle;
- cancelamento fecha a operação mas a próxima consulta não recupera: registrar reprovação;
- XML retorna mas não valida contra a chave no site: registrar reprovação.

---

### Task 1: Definir o formato de evidência por release

**Files:**
- Create: `docs/testing/acceptance-results/README.md`
- Create: `docs/testing/acceptance-results/template.md`

**Interfaces:**
- Consumes: checklist vigente em `docs/testing/acceptance.md`.
- Produces: contrato textual que o workflow de release poderá validar no plano de governança.

- [ ] **Step 1: Escrever o contrato do registro**

O `README.md` deve definir exatamente estes campos obrigatórios:

~~~text
Release: vX.Y.Z
Extension: X.Y.Z
Date: YYYY-MM-DD
Status: PENDENTE|APROVADO|REPROVADO
Windows: <versão sem identificador da máquina>
Chrome: APROVADO|REPROVADO|NÃO EXECUTADO
Edge: APROVADO|REPROVADO|NÃO EXECUTADO
Popup: APROVADO|REPROVADO|NÃO EXECUTADO
Access key fill: APROVADO|REPROVADO|NÃO EXECUTADO
hCaptcha manual: APROVADO|REPROVADO|NÃO EXECUTADO
Certificate: APROVADO|REPROVADO|NÃO APLICÁVEL|NÃO EXECUTADO
XML handoff: APROVADO|REPROVADO|NÃO EXECUTADO
DANFE/XML download: APROVADO|REPROVADO|NÃO EXECUTADO
Second consultation: APROVADO|REPROVADO|NÃO EXECUTADO
Batch sequential: APROVADO|REPROVADO|NÃO EXECUTADO
Cancellation recovery: APROVADO|REPROVADO|NÃO EXECUTADO
~~~

- [ ] **Step 2: Criar o template com estado inicial seguro**

`template.md` deve usar `Status: PENDENTE` e `NÃO EXECUTADO` em todos os resultados. Incluir uma seção `Observações técnicas` que proíba explicitamente dados fiscais sensíveis.

- [ ] **Step 3: Validar que nenhum identificador real entrou no template**

Run:

~~~bash
grep -En '[0-9]{44}|BEGIN (RSA )?PRIVATE KEY|BEGIN CERTIFICATE' docs/testing/acceptance-results/*.md
~~~

Expected: nenhuma ocorrência.

- [ ] **Step 4: Commit**

~~~bash
git add docs/testing/acceptance-results
git commit -m "docs: define physical acceptance evidence"
~~~

### Task 2: Amarrar o checklist vigente ao registro versionado

**Files:**
- Modify: `docs/testing/acceptance.md`

**Interfaces:**
- Consumes: formato criado na Task 1.
- Produces: regra operacional única para executar e registrar o gate.

- [ ] **Step 1: Adicionar seção de registro obrigatório**

A seção deve dizer que cada release candidata copia o template para `docs/testing/acceptance-results/vX.Y.Z.md` e só pode marcar `Status: APROVADO` quando todos os itens obrigatórios estiverem aprovados.

- [ ] **Step 2: Tornar explícito o tratamento do certificado**

Se o Portal não solicitar certificado em nenhuma consulta legítima do gate, o campo pode ser `NÃO APLICÁVEL`; isso não autoriza afirmar que seleção de certificado foi validada.

- [ ] **Step 3: Verificar coerência documental**

Run:

~~~bash
grep -n "acceptance-results" docs/testing/acceptance.md
grep -n "Status: APROVADO" docs/testing/acceptance-results/README.md
~~~

Expected: ambos retornam ao menos uma linha.

- [ ] **Step 4: Commit**

~~~bash
git add docs/testing/acceptance.md
git commit -m "docs: require versioned physical acceptance"
~~~

### Task 3: Executar o gate físico da baseline v0.0.35

**Files:**
- Create after real execution: `docs/testing/acceptance-results/v0.0.35.md`

**Interfaces:**
- Consumes: release `v0.0.35`, extensão `0.2.12` e checklist vigente.
- Produces: primeira evidência auditável do estado extension-only atual.

- [ ] **Step 1: Preparar o registro antes do teste**

Copiar `template.md` para `v0.0.35.md` e preencher:

~~~text
Release: v0.0.35
Extension: 0.2.12
Status: PENDENTE
~~~

- [ ] **Step 2: Executar Chrome**

Validar consulta unitária completa, popup, chave preenchida, hCaptcha manual, XML, DANFE/download, segunda consulta, lote e cancelamento/recuperação.

Expected: preencher cada campo do Chrome com evidência técnica observada, sem copiar dados fiscais.

- [ ] **Step 3: Executar Edge**

Repetir o mesmo roteiro em Edge, sem reutilizar “Chrome aprovado” como evidência.

- [ ] **Step 4: Fechar o status**

Marcar `Status: APROVADO` somente se Chrome, Edge e todos os itens obrigatórios estiverem aprovados. Caso contrário usar `REPROVADO` e descrever apenas o sintoma técnico.

- [ ] **Step 5: Revisar vazamento de dados antes do commit**

Run:

~~~bash
grep -En '[0-9]{44}|BEGIN (RSA )?PRIVATE KEY|BEGIN CERTIFICATE' docs/testing/acceptance-results/v0.0.35.md
~~~

Expected: nenhuma ocorrência.

- [ ] **Step 6: Commit**

~~~bash
git add docs/testing/acceptance-results/v0.0.35.md
git commit -m "docs: record v0.0.35 physical acceptance"
~~~

### Task 4: Atualizar o estado corrente do projeto

**Files:**
- Modify only after Task 3: `README.md`
- Modify only after Task 3: `docs/operations/repository-hardening.md`

**Interfaces:**
- Consumes: resultado real da Task 3.
- Produces: documentação vigente sem inferir sucesso inexistente.

- [ ] **Step 1: Se aprovado, referenciar a evidência sem duplicá-la**

Registrar somente que a baseline física vigente está em `docs/testing/acceptance-results/v0.0.35.md`.

- [ ] **Step 2: Se reprovado, manter o gate como pendente**

Não alterar texto para “validado”; registrar a reprovação e o arquivo correspondente.

- [ ] **Step 3: Verificar documentação**

Run:

~~~bash
grep -n "acceptance-results/v0.0.35.md" README.md docs/operations/repository-hardening.md
~~~

Expected: referência coerente ao resultado efetivamente registrado.

- [ ] **Step 4: Commit**

~~~bash
git add README.md docs/operations/repository-hardening.md
git commit -m "docs: link current physical acceptance status"
~~~
