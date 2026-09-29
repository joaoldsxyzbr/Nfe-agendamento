# Roadmap pós-auditoria — hardening da arquitetura extension-only

**Data:** 2026-09-29  
**Baseline:** `main` em `6963bcb3fb29433b7ec1f6d59ea8b9562135b0d3`  
**Release pública atual:** `v0.0.35` / extensão `0.2.12`

## Objetivo

Fechar os riscos encontrados na auditoria sem alterar a rota fiscal Portal-only, sem ampliar permissões da extensão e sem introduzir infraestrutura nova desnecessária.

## Ordem de execução

1. **Evidência de aceitação física**
   - Plano: `2026-09-29-physical-acceptance-traceability.md`
   - Primeiro registrar de forma auditável Chrome + Edge + Windows + Portal + hCaptcha + XML.

2. **Release e governança da main**
   - Plano: `2026-09-29-release-and-main-governance.md`
   - Fazer o release depender de CI que inclua CodeQL e de evidência física aprovada.
   - Depois proteger a `main` com PR + checks obrigatórios, sem exigir aprovação de outra pessoa.

3. **Testes comportamentais do background da extensão**
   - Plano: `2026-09-29-extension-background-behavior-tests.md`
   - Exercitar lifecycle, concorrência, cancelamento, reconciliação e captura de XML com um Chrome fake em Vitest.

4. **Cobertura e configuração**
   - Plano: `2026-09-29-coverage-and-config-cleanup.md`
   - Travar regressão de cobertura e manter um único `wrangler.jsonc` como fonte de verdade.

## Dependências

- O plano 2 consome o formato de evidência definido pelo plano 1.
- O plano 4 deve ser executado depois do plano 3, para que a cobertura da extensão reflita testes comportamentais reais.
- Os planos 1 e 3 podem ser preparados em paralelo, mas a mudança de release da etapa 2 só deve entrar depois do formato de evidência estar fechado.

## Fora de escopo

- mudar o Portal Nacional ou adicionar outra rota fiscal;
- automatizar ou contornar hCaptcha;
- ampliar `host_permissions`;
- adicionar Native Messaging;
- atualizar dependências sem necessidade do trabalho;
- refatorar DANFE ou lote sem um teste que prove necessidade;
- remover o fallback periódico de 1 segundo do content script nesta rodada.

O fallback periódico permanece por compatibilidade até existir evidência de que eventos/MutationObserver detectam de forma confiável a mudança do token hCaptcha em Chrome e Edge reais. A rodada atual deve primeiro ampliar testes e observabilidade, não trocar um mecanismo funcional por uma hipótese.

## Critério final

A rodada fica concluída quando:

- existe registro físico da baseline atual ou uma reprovação documentada;
- releases futuras exigem evidência física do mesmo `vX.Y.Z`;
- CodeQL faz parte do gate de CI usado pelo release;
- a `main` recebe mudanças via PR e checks obrigatórios, sem force-push/exclusão;
- o background da extensão possui regressões comportamentais para os fluxos críticos;
- cobertura mínima é aplicada no CI;
- existe somente um `wrangler.jsonc` vigente;
- README e `docs/operations/repository-hardening.md` refletem o processo final.

## Referências oficiais

- GitHub Rulesets: required pull request e required status checks.
- GitHub Actions/Checks: checks de `push`/`pull_request` podem satisfazer rulesets.
- Vitest: `coverage.thresholds` é o mecanismo nativo para falhar o CI abaixo de um piso.
- Cloudflare: `wrangler.jsonc` deve ser tratado como fonte de verdade da configuração de deploy.
