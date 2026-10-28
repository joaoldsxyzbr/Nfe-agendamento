# Aceite físico: NFe Agendamento somente extensão

Branch de referência: `main` (merge PR #107, `a0a586c`) | Manifest: `0.3.0` | **Aceite físico: NÃO EXECUTADO**.

Registro específico para a versão integrada: [resultado v0.3.0](acceptance-results/v0.3.0-main.md). O ZIP [v0.3.0-pilot.4](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.4) é um **pré-lançamento**, não uma versão estável.

Realizar no Windows com perfis separados do Chrome e Edge. Nunca registrar dados reais da NF-e, chave completa, XML, CNPJ/CPF ou certificado em evidências.

## Compilação e instalação

- [ ] npm ci, npm audit, lint, formatação, testes web/extensão, build e CI aprovados.
- [ ] ZIP/dir MV3 contém app.html, módulos JS, CSS, marca, opções, service worker, content script.
- [ ] Chrome instala sem erro e abre/foca janela popup centralizada (metade da largura de referência), sem criar uma nova aba.
- [ ] Edge instala sem erro e abre/foca janela popup centralizada (metade da largura de referência), sem criar uma nova aba.
- [ ] O segundo clique no ícone apenas foca o popup existente e mantém os dados preenchidos.
- [ ] Em tela menor ou janela do navegador não maximizada, o popup permanece utilizável e redimensionável.
- [ ] A interface funciona sem acesso ao domínio Cloudflare do site antigo.
- [ ] Configurações e regras privadas do fornecedor funcionam.
- [ ] Tema, acessibilidade, CSS, marca, navegação e diagnósticos corretos.

## Portal, documentos e confiabilidade

- [ ] Consulta unitária abre popup oficial e preenche chave.
- [ ] hCaptcha resolvido manualmente.
- [ ] Certificado digital permanece sob gestão do Chrome/Edge quando solicitado.
- [ ] XML oficial é recebido na aba da extensão e corresponde à chave.
- [ ] DANFE e impressão/PDF funcionam com notas curtas e longas.
- [ ] Download individual de XML e ZIP de XMLs funcionam.
- [ ] Segunda consulta funciona no mesmo navegador.
- [ ] Duas chaves em lote seguem em ordem, sem duas consultas simultâneas.
- [ ] Cancelar/fechar janela impede avançar no lote.
- [ ] Falha do Portal permite recuperação manual por XML validado.
- [ ] Fechar/reabrir popup ou reiniciar navegador não duplica operação e expõe erros.
- [ ] Fluxo não usa Workers Cloudflare, D1 nem outro backend próprio.

| Navegador | Status | Observações |
| --- | --- | --- |
| Chrome | NÃO EXECUTADO | Pendente |
| Edge | NÃO EXECUTADO | Pendente |

## Integração à `main` e CI — 27/10/2026

- [PR #107](https://github.com/joaoldsxyzbr/Nfe-agendamento/pull/107) foi integrada à `main` no commit `a0a586cb78ea55784a19ebfcbaa2a30c2029c90c`, antes da homologação física.
- [CI da `main` #40573677508](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40573677508) concluiu com quatro jobs aprovados (`web`, `extension`, `danfe-print`, `security-audit`). Testes sintéticos não comprovam operação no Portal real.

## Atualização da interface e CI — 27/10/2026

- [CI #40567853304](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40567853304) — quatro jobs aprovados no commit `2200a7c17773060bb55b7b83ce8b2c53005b8643` após a remoção do botão Relatório CSV; testes de regressão preservam ZIP, XML e DANFE.
- O piloto 4 inclui essa alteração no ZIP da extensão; o workflow de pré-lançamento verifica que não existem mais a ação `batch-csv` na interface nem métodos de relatório CSV no controller.
- **Homologação física permanece NÃO EXECUTADA** para o conjunto completo de cenários de Chrome/Edge, certificado, Portal e lote. Não confundir teste automatizado com aceite fiscal.

## Atualização automática P5 — 26/10/2026

O [GitHub Actions #40400199711](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40400199711) validou **a instalação automatizada da extensão MV3 no Chromium headless com dados sintéticos**, além de 7 testes Playwright de interface/consulta simulada/DANFE, e publicou artefato de teste de 7 dias. Os gates de auditoria e testes da mini-IA também passaram naquele commit experimental. **Isso NÃO marca nenhuma caixa física Chrome/Edge nem comprova operação no Portal oficial**, com hCaptcha ou certificado real. Roteiro: [Homologação P5](mini-ai-p5-manual.md).

**Decisão atualizada após merge #107:** não publicar release estável nem desativar infraestrutura remanescente por causa de CI verde; a `main` já contém o piloto, mas o aceite físico permanece pendente.

## CI histórico da branch de piloto — 27/10/2026

- [GitHub Actions #40506594582](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40506594582) passou no SHA `490a63b5f951b0d317e60babb1967ff78b19f328`: jobs `web` (validação real da UI local), `extension`, `danfe-print` e `security-audit` aprovados.
- O job `extension` passa a incorporar a verificação reproduzível do modelo neural, a avaliação adversarial sintética e os testes do revisor offline de relatórios. O resultado final desse novo gate precisa ser conferido no CI do commit que o introduziu.
- A reprovação histórica de `security-audit` em 22/10 não representa o estado mais recente, porém foi preservada abaixo por rastreabilidade.
- Aceite físico em Chrome/Edge Windows, Portal real, hCaptcha, certificado e documentos fiscais permanece **NÃO EXECUTADO**. Não marcar nenhuma caixa de aceite apenas com CI verde.

## Evidência CI do piloto — 22/10/2026

Execução de referência: [GitHub Actions #1246](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/39831571824), commit `ba2c1fd993489b5ed950990425054041df1de0f6`.

- **extension: SUCESSO** — testes da extensão e empacotamento MV3 passaram.
- **danfe-print: SUCESSO** — testes automatizados de impressão passaram.
- **security-audit: FALHA** — `npm audit --audit-level=high` retornou erro; a causa exata precisa ser conferida no log do job, sem ignorar a falha.
- **web: situação não confirmada** — o status individual reportado ainda constava em execução na última consulta, embora o workflow geral estivesse concluído com falha.
- **teste físico: NÃO EXECUTADO** — nenhuma NF-e real, certificado ou captcha foi testado neste piloto.

A checagem automática **Workers Builds** apareceu porque a integração Cloudflare existente ainda acompanha o repositório. Ela **não é dependência de execução do novo aplicativo**; esta alteração não autoriza desativar a produção atual. Não afirmar que sua existência comprova que o piloto foi publicado.

Próxima pendência vigente: concluir o gate físico nos dois navegadores e registrar resultados reais; os resultados anteriores de auditoria estão preservados acima somente como histórico.