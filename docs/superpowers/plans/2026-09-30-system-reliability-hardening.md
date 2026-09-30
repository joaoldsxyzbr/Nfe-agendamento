# Hardening de confiabilidade — 2026-09-30

**Baseline:** `main` em `050d2da9be620992be66261e7d80bccf815f5cda`  
**Escopo:** processo de release, content script do Portal, cobertura crítica, diagnóstico e governança.

## Objetivo

Fechar as inconsistências restantes sem alterar a arquitetura Portal-only, sem ampliar permissões da extensão, sem Native Messaging, sem consulta direta à SEFAZ e sem polling periódico.

## Decisões

1. **Aceitação física é pós-release e rastreável.**
   - A release normal depende do CI automatizado do mesmo SHA.
   - O arquivo `docs/testing/acceptance-results/vX.Y.Z.md` precisa existir e corresponder à release/extensão, mas pode iniciar como `PENDENTE`.
   - Chrome e Edge só mudam para `APROVADO` após execução física real.
   - A documentação não deve afirmar que aprovação física bloqueia a publicação enquanto o processo vigente exigir o asset publicado para validação.

2. **Content script sem polling.**
   - Remover `setInterval`/fallback periódico.
   - Usar `MutationObserver`, eventos `input`/`change`, `focus`, `pageshow` e `visibilitychange`.
   - Timeouts de resultado/download passam a usar timers únicos armados por mudança de estado, não varredura periódica.

3. **Cobertura por criticidade.**
   - Manter pisos globais atuais.
   - Adicionar thresholds específicos para módulos críticos com cobertura já existente, sem reduzir thresholds para acomodar falhas.
   - Reforçar testes quando necessário.

4. **Diagnóstico de ambiente.**
   - Aproveitar o painel existente.
   - Exibir prontidão do canal site↔extensão com base no handshake e capabilities, sem expor dados fiscais ou configuração privada.

5. **Proteção da `main`.**
   - O Ruleset desejado continua sendo PR obrigatório + checks `web`, `extension`, `danfe-print` e `codeql`, sem aprovação de terceiro, force-push ou exclusão.
   - A integração GitHub disponível nesta execução é somente leitura para Rulesets; portanto a pendência deve permanecer aberta e documentada até aplicação administrativa real.

## Checkpoints

- [x] Estado atual e documentação oficial revisados.
- [x] Alinhar política de release e testes/documentação.
- [x] Remover polling periódico e preservar timeouts.
- [x] Reforçar cobertura dos módulos críticos.
- [x] Reforçar diagnóstico de integração.
- [x] Reabrir/documentar Ruleset da `main`.
- [x] Revisar diff, abrir PR e validar CI disponível.
- [ ] Executar a aceitação física da release vigente em Chrome e Edge reais; não inferir aprovação pelo CI.

## Critérios de aceite

- nenhuma ocorrência de `setInterval` no código da extensão;
- nenhum texto operacional afirma que a aprovação física bloqueia a release normal;
- release continua validando versão/notas/arquivo de aceitação do mesmo `vX.Y.Z`;
- timeouts do Portal continuam explícitos sem depender de polling;
- painel de diagnóstico distingue conexão pronta de conexão parcial;
- thresholds específicos protegem caminhos críticos;
- issue de Ruleset fica aberta enquanto não houver Ruleset ativo;
- issue #51 permanece aberta enquanto a aceitação física não for executada;
- CI do PR não apresenta regressões nos gates existentes.

## Referências oficiais consultadas

- GitHub Rulesets e required status checks: documentação oficial do GitHub.
- GitHub Actions/status checks: documentação oficial do GitHub.
- Chrome Extensions MV3 service workers e messaging: Chrome for Developers.
- Vitest coverage thresholds e thresholds por glob: documentação oficial do Vitest.
