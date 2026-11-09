# Decisão — remoção da mini-IA (motor neural)

**Data:** 09/11/2026 · **Responsável:** João · **Estado:** decidido e implementado nesta PR.

## Histórico da decisão

No mesmo dia 09/11/2026, a mini-IA foi primeiro considerada para congelamento na P5 (sem P6, sem aumento de autonomia), por ausência de retorno demonstrado. O responsável decidiu em seguida pela **remoção completa do motor neural**, mantendo o restante do sistema. Esta decisão substitui e consolida o congelamento avaliado.

## O que foi removido

- Classificador neural feed-forward: `intelligence/portal-model.js`, `intelligence/portal-features.js`, `intelligence/trained-model.js`.
- Política de navegação: `intelligence/navigation-policy.js`.
- Bloco de observação neural no content script do Portal (`portal-content.js`): não existe mais varredura de candidatos neurais nem mensagem `intelligence_diagnostic`.
- Manipulador `intelligence_diagnostic` no service worker (`background.js`).
- Scripts de treino e avaliação: `scripts/train-mini-ai.mjs`, `scripts/evaluate-mini-ai-adversarial.mjs`, `scripts/evaluate-mini-ai-utility.mjs`, `scripts/review-mini-ai-report.mjs` e seu teste.
- Step "Validar modelo e casos adversariais da mini-IA" do workflow de CI.
- Códigos `neural_candidate_*` e campos `score`/`inspected`/`ambiguous`/`modelVersion` dos diagnósticos.

## O que permanece (não é neural)

- **Diagnósticos de operação**: códigos autorizados (`portal_operation_failed`, `batch_completed`, `batch_retry_result`, `batch_preflight_failed`, `portal_state_reconciled`), retenção de 100 eventos por 14 dias, exportação JSON e análise de recorrência por regras determinísticas auditáveis.
- A chave de armazenamento `nfeIntelligenceDiagnosticsV1` e a pasta `src/intelligence/` são mantidas por compatibilidade com registros e imports existentes; os nomes são históricos e não indicam rede neural.
- O seletor determinístico do Portal (`portal-dom.js`) continua sendo o único caminho de detecção de controles.

## Motivo

1. A avaliação de utilidade de 04/11/2026 mediu apenas detecção potencial em exemplos sintéticos, sem comprovação em páginas reais.
2. Sem homologação física e sem coleta de dados reais (proibida por privacidade, corretamente), não havia caminho para o motor provar valor.
3. O custo de manutenção (treino reproduzível, corpus adversarial, CI dedicada) superava o retorno; o seletor determinístico cobre a operação de produção.
4. Remover simplifica a extensão sem alterar qualquer fluxo fiscal, permissão ou comportamento aprovado.

## Impacto

- Nenhuma alteração em permissões, manifesto, captura de XML, DANFE, lote ou fluxo de consulta.
- A página de opções passa a apresentar "Diagnósticos de operação"; o arquivo exportado passa a se chamar `nfe-diagnosticos.json`.
- Diagnósticos neurais registrados em versões anteriores permanecem no armazenamento local até expirarem (14 dias) ou serem apagados pelo usuário; códigos neurais não são mais aceitos na leitura.

## Verificação

- Testes da UI e da extensão, lint, formatação e build executados nesta branch; CI completo na PR como gate final.
