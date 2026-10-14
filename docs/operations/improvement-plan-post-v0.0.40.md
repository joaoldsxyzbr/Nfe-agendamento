# Plano de evolução pós-v0.0.40

Data: 2026-10-14. Base de referência: site v0.0.40 e extensão 0.2.16.

## Restrições preservadas
Site estático + extensão Chromium MV3, Portal Nacional com hCaptcha manual, certificado controlado pelo navegador, lote sequencial, exportação XML/ZIP/DANFE. Nenhuma mudança no mecanismo de captura XML ou nas permissões da extensão.

## Entregas integradas na main
- **PR #81 / ad018f8 — regressão Portal:** testes adicionais de limites UTF-8, HTTP e redirecionamento. CI web, extension, danfe-print e Workers Builds aprovado.
- **PR #82 / 2f34a7e — compatibilidade:** aviso consultivo para versão da extensão anterior à 0.2.16 no painel de configurações, sem bloquear o handshake. Testes unitários. Quatro checks aprovados.
- **PR #83 / 9d94a5f — lote:** resumo compacto de concluídas e com erro ao finalizar; preservada a reconsulta individual de falhas já existente. Quatro checks aprovados.
- **PR #84 / e3f2942 — diagnósticos e interface:** orientações genéricas de recuperação para erros do Portal, sem ecoar chaves fiscais; espaçamentos compactos e foco visível no painel. Quatro checks aprovados.

## Cobertura e limites de validação
- **Confirmado:** alterações de código e testes integrados, CI de cada PR aprovado.
- **Não confirmado:** aceitação física dessas alterações no Portal com hCaptcha/certificado em Chrome e Edge; validação visual humana em dispositivos reais; publicação de nova release da extensão. CI não substitui esses testes.
- **Não realizado:** teste de mutação formal, cobertura integral de todos os cenários inicialmente propostos e protocolo de compatibilidade independente de número de versão. O aviso de compatibilidade é consultivo.
- **Reaproveitado:** retry individual, serialização, exportação e fluxo de cancelamento existentes. Nenhuma duplicação de funcionalidades.

## Aceite físico recomendado
1. Extensão 0.2.16: verificar conexão e indicador de compatibilidade.
2. Consultar uma NF-e no Portal com hCaptcha manual; confirmar XML e DANFE.
3. Repetir consulta e testar lote com uma falha; conferir resumo e retry individual.
4. Testar cancelamento e exportações ZIP/DANFE.
5. Verificar mensagens de erro e painel compacto em desktop e mobile.

## Status
**IMPLEMENTAÇÃO INCREMENTAL INTEGRADA À MAIN.** Aceitação física das mudanças e eventual release seguem pendentes; não declarar versão de produção atualizada sem confirmação.

## Auditoria e correções pós-implementação — issue #86

A revisão em maior profundidade identificou falhas de critérios e testes nas PRs #81–#85. A correção subsequente preserva o método de captura XML da extensão 0.2.16 e tem este escopo:

- **Compatibilidade:** versão reconhecida exclusivamente quando validada (0.2.16). Versões futuras ficam **não verificadas**, sem serem presumidas compatíveis; versões anteriores geram aviso consultivo. Conexão/prontidão deriva apenas das capacidades anunciadas e não é reduzida por aviso de versão.
- **Erros:** códigos estáveis da extensão, quando presentes, chegam ao lote. As orientações são por código/etapa reconhecida; mensagens brutas com chaves, XML ou cookies não são reproduzidas. Erros HTTP mostram no máximo o status numérico seguro.
- **Lote:** teste comportamental cobre conclusão parcial, falha repetida, sucesso após retry e atualização da contagem; retry individual e importação manual atualizam o resumo com resultado efetivo. Nunca consultar concluídas novamente automaticamente.
- **Visual/teste:** o Playwright simulado verifica código de erro apresentado; segue existindo validação de tela compacta desktop/mobile, mas **não** cobre visualmente todos os estados. Nenhum redesenho foi feito.

### Matriz de critérios originais e comprovação

| Critério original | Evidência | Status |
| --- | --- | --- |
| Proteção de captura textual autenticada, limite UTF-8 e resposta HTTP | PR #81 + testes existentes | Parcial: sem aceite físico completo |
| Comunicação, segundo uso, popup e cancelamento | Testes existentes em extension/web + fluxo simulado | Parcial: não foi criada suíte end-to-end real do Portal |
| Lote sequencial, preservação de concluídas, ZIP/DANFE | Testes existentes e comportamento novo na correção #86 | Coberto automaticamente; físico pendente |
| Reconsulta de falhas e contagem após retry | Teste comportamental novo #86 | Coberto automaticamente; físico pendente |
| Handshake de versões/capabilities | Testes unitários #86 | Coberto para versões explicitamente conhecidas; protocolo versionado futuro pendente |
| Mensagens de erro por causa conhecida sem dados fiscais | Testes unitários e code propagation #86 | Coberto para códigos conhecidos; erros não mapeados são genéricos |
| Visual estável antes/depois, desktop e mobile | Playwright existente + casos novos de erro | Parcial: aceitações visuais humanas pendentes |
| Chrome e Edge, hCaptcha e certificado | `docs/testing/acceptance-results/v0.0.40.md` | PENDENTE, sem inferir aprovação pelo CI |

### Política de publicação

Correção na `main`, CI aprovado, release publicada e aceitação física são marcos distintos. Não aumentar `manifest.json` nem declarar sucesso do Portal real sem teste legítimo; manter o registro de v0.0.40 e a issue #60 com contexto histórico.

## Empacotamento e disponibilização — v0.0.41 (14/10/2026)

A atualização de site pós-v0.0.40 e a correção da auditoria #86 foram agrupadas para a release **v0.0.41**. A extensão **permanece 0.2.16** porque a captura XML, permissões e manifest não tiveram alteração de produção. O workflow publica o ZIP compilado a partir do commit validado apenas quando o CI da main está verde e o assunto do commit é `release: v0.0.41`. As notas e o registro físico estão em `docs/releases/v0.0.41.md` e `docs/testing/acceptance-results/v0.0.41.md`. Verificar a execução de release e o pacote publicado antes de considerar disponível; merge e CI isoladamente não comprovam publicação. A validação física real continua pendente e independente da release.
