# Aceite físico: NFe Agendamento somente extensão

Branch: nfe-agendamento | Manifest: 0.3.0 | **Status: NÃO EXECUTADO**.

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
- [ ] Downloads XML, ZIP, CSV funcionam.
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

## Atualização automática P5 — 26/10/2026

O [GitHub Actions #40400199711](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40400199711) validou **a instalação automatizada da extensão MV3 no Chromium headless com dados sintéticos**, além de 7 testes Playwright de interface/consulta simulada/DANFE, e publicou artefato de teste de 7 dias. Os gates de auditoria e testes da mini-IA também passaram naquele commit experimental. **Isso NÃO marca nenhuma caixa física Chrome/Edge nem comprova operação no Portal oficial**, com hCaptcha ou certificado real. Roteiro: [Homologação P5](mini-ai-p5-manual.md).

**Decisão:** não publicar release de produção, não mesclar na main e não desligar site existente sem evidência real acima.
## CI atualizado da branch — 27/10/2026

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