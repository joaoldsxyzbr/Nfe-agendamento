# P3 — Memória operacional e análise local de recorrências (26/10/2026)

## Objetivo
Manter a mini-IA do NF-e Agendamento 2.0 como observadora e coordenadora de diagnósticos, capaz de produzir evidências úteis para revisão técnica sem executar ações fiscais neurais e sem transmitir ou armazenar chaves NF-e, XML, CNPJ/CPF, textos do Portal ou certificados.

## Implementação
- `apps/ui/src/batch/controller.js`: a cada lote concluído registra somente `total`, `success`, `failed`, `cancelled` (soma exata e limite 100). Em tentativas manuais de reconsulta/importação registra somente `recovered`, `failed` ou `cancelled`; na verificação inicial, código fechado para falha de conectividade/compatibilidade. **Nenhuma nota individual, conteúdo XML ou identificador é transmitido ao registro.** A falha do logger não cancela consulta nem muda resultado.
- `apps/ui/src/portal/extension-client.js` + `apps/extension/src/protocol.js` + `apps/extension/src/background.js`: comando restrito `record_batch_diagnostic` permitido exclusivamente a `app.html` autenticada; validação pelo protocolo e whitelist de campos na persistência. Comandos do Portal não podem usar este canal.
- `apps/extension/src/background.js`: detecta reconciliação que descarta operação inconsistente; registra apenas `portal_state_reconciled` e `stale_operation`, sem bloquear limpeza da janela.
- `apps/extension/src/intelligence/diagnostics.js`: amplia categorias explícitas de diagnóstico, valida totais e resultados de recuperação, sempre re-sanitizando antes da leitura/exportação, 100 eventos e retenção por 14 dias.
- `apps/extension/src/intelligence/insights.js`: heurísticas auditáveis e locais para destacar **repetição de falhas por categoria**, lotes com 50% ou mais de erros, recuperações concluídas, operações inconsistentes e falhas de verificação da extensão. Agrupamento limitado e sem novos identificadores. **Essa análise é determinística, não uma nova capacidade treinada da rede neural.**
- `apps/extension/src/options.js` + `options.html`: botão `Analisar padrões locais`, exportação JSON versão 2 incluindo `insights` e `records`, exclusão local explícita. Nenhum upload ou telemetria.
- `.github/workflows/mini-ai-ci.yml`: lint, formatação e testes de UI, testes e cobertura da extensão, auditoria de dependências, verificação de pesos do modelo e build MV3.

## Segurança, continuidade e limitações
- Os insights não são recomendações autônomas validadas; são evidências categorizadas para o ChatGPT revisar quando o usuário exportar o JSON.
- Sem treinamento automático com dados reais, alteração de código, comando fiscal neural, hCaptcha automático ou servidor remoto.
- Não gravar campos de notas individualizadas no futuro. Toda categoria ou métrica nova deve ser adicionada explicitamente à whitelist com teste de privacidade e origem.
- A política P2 continua em modo de observação; o fluxo fiscal permanece determinístico.
- A branch experimental `feat/nfe-mini-ia-observability-p0` e a PR #108 continuam isoladas de `main`; piloto `nfe-agendamento` ainda exige aceitação física Chrome/Edge.
- Não validar o produto em produção com base apenas no CI sintético. Execução real do Portal, certificado, hCaptcha, XML, DANFE e consultas em lote depende do checklist físico.

## Critérios de verificação
`npm ci && npm audit --audit-level=high && node scripts/train-mini-ai.mjs --check && npm run lint:ui && npm run format:check:ui && npm run test:ui && npm run test:extension && npm run coverage:extension && npm run build:extension`.

Verificações objetivas: comandos autenticados; totais inconsistentes rejeitados; nenhuma chave NF-e/XML no relatório; falha da persistência não impede lote ou reconciliação; relatórios expiram e podem ser apagados sem excluir regras de fornecedores.

## Etapa seguinte (P4)
Aprimorar confiabilidade da avaliação com casos externos sintéticos independentes, ampliar diagnóstico de estados e falhas reais somente por exportação voluntária sanitizada; propor mudanças como PRs revisadas. Não permitir autoedição ou autopublicação.
