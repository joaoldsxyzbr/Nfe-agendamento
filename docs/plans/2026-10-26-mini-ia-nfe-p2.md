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


## Resultado da implementação (26/10/2026)

- `navigation-policy.js` implementado: `propose` significa **somente proposta para análise** e nunca autorização de clique. O runtime continua usando unicamente o fluxo de clique legado; nenhuma nova ação fiscal foi introduzida.
- `intelligence-navigation.test.js` exerce cenários sintéticos adversariais com origem falsa, rota alterada, estado incorreto, controle duplicado, limite excedido, CSS invisível, elemento desanexado, `onclick` desconhecido, atributos ARIA, botão inerte e URLs não oficiais.
- Integração em `portal-content.js` só em modo observação, gerando motivos de diagnóstico por whitelist (`review_required`, `official_link`, `unsafe_candidate`, `ambiguous_candidates`) sem dados fiscais ou conteúdo DOM no relatório.
- [GitHub Actions #40392386601](https://github.com/joaoldsxyzbr/Nfe-agendamento-2.0/actions/runs/40392386601) no commit `6383d9fdb5326f309c1bfdffd0cb5992cb71bb50`: **sucesso**, 115 testes da extensão aprovados, além de auditoria, verificação de pesos, cobertura e build MV3. Esta verificação não equivale ao CI geral de UI/Playwright/DANFE nem à homologação física.
- Nenhuma alteração na `main`, publicação de release ou deploy. Pull request #108 permanece em rascunho.

## Próxima etapa
P3: ampliar diagnósticos para falhas recorrentes, lote e recuperação com relatórios que possam ser compartilhados sob ação explícita. Somente considerar cliques neurais em PR próprio depois de testes físicos e revisão de autorização por ação.
