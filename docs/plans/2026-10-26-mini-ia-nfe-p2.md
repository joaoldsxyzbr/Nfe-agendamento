# P2 — Decisões de navegação supervisionadas e testes adversariais (26/10/2026)

## Meta
Expandir a mini-IA da P1 para avaliar **qual ação ela proporia** diante do DOM do Portal. A execução permanece **desativada no runtime**. A versão atual não autoriza cliques neurais, tampouco novas permissões ou alterações de consulta.

## Implementação em passos
1. `apps/extension/src/intelligence/navigation-policy.js`: combinar classificador treinado com bloqueios independentes de segurança (origem do Portal, rota, estado `submitting`, quantidade de candidatos, ambiguidades, links externos, invisibilidade, desativação e atributos inseguros). Produzir somente decisões estruturadas `propose`, `blocked` ou `none`, com motivo enum, pontuação e contagem, sem retornar DOM, chaves ou URLs.
2. `apps/extension/tests/intelligence-navigation.test.js`: criar casos adversariais sintéticos distintos do treino (phishing visual, rota semelhante, elementos ocultos, duplicados, controles proibidos, estado incorreto, excesso de candidatos, conteúdo enganoso). Critério: **zero propostas** para cenários marcados como inseguros; provar ausência de `click()`.
3. `apps/extension/src/portal-content.js` + `.../diagnostics.js`: substituir a observação neural crua pela avaliação supervisionada e registrar apenas diagnósticos seguros e motivos previamente permitidos, sem modificar os cliques legados.
4. `.github/workflows/mini-ai-ci.yml`: manter `node scripts/train-mini-ai.mjs --check`, testes/cobertura da extensão, audit e build; testes adversariais são executados no job da extensão.
5. Documentar resultados **devidamente obtidos** e preservar a PR #108 em rascunho, direcionada a `nfe-agendamento`.

## Critério de não promoção
- Um score alto não é autorização: mudança para ação real somente após aceitação física Chrome/Edge e revisão separada dos endpoints/candidatos específicos.
- Sem hCaptcha automático, sem consulta a endpoint diferente do oficial, sem modificação do XML e sem captura de dados fiscais para treino.
- Nenhuma ação remota de deploy, release ou merge nesta fase.
- Backout: reverter exclusivamente commits P2 na branch experimental.

## Comandos para verificar
`node scripts/train-mini-ai.mjs --check`
`npm run test:extension`
`npm run coverage:extension`
`npm run build:extension`
`npm audit --audit-level=high`

## Riscos conhecidos
Snapshots sintéticos não validam a página real. `MutationObserver` e scripts MV3 podem lidar com nós removidos/reinseridos; novas decisões devem ser reavaliadas antes de qualquer clique futuro. Não usar a saída `propose` como autorização automática.
