# Aceite físico: NFe Agendamento somente extensão

Branch: nfe-agendamento | Manifest: 0.3.0 | **Status: NÃO EXECUTADO**.

Realizar no Windows com perfis separados do Chrome e Edge. Nunca registrar dados reais da NF-e, chave completa, XML, CNPJ/CPF ou certificado em evidências.

## Compilação e instalação

- [ ] npm ci, npm audit, lint, formatação, testes web/extensão, build e CI aprovados.
- [ ] ZIP/dir MV3 contém app.html, módulos JS, CSS, marca, opções, service worker, content script.
- [ ] Chrome instala sem erro e abre/foca a aba interna pelo ícone.
- [ ] Edge instala sem erro e abre/foca a aba interna pelo ícone.
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
- [ ] Fechar/reabrir aba ou reiniciar navegador não duplica operação e expõe erros.
- [ ] Fluxo não usa Workers Cloudflare, D1 nem outro backend próprio.

| Navegador | Status | Observações |
| --- | --- | --- |
| Chrome | NÃO EXECUTADO | Pendente |
| Edge | NÃO EXECUTADO | Pendente |

**Decisão:** não publicar release de produção, não mesclar na main e não desligar site existente sem evidência real acima.
