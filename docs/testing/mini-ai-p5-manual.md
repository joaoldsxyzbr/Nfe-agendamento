# Homologação manual — mini-IA P5 (Chromium MV3 experimental)

**Situação inicial: NÃO EXECUTADA.** A instalação automatizada no **Chromium empacotado do Playwright** (Linux CI) é separada dos testes físicos com **Chrome/Edge em Windows**, Portal oficial, hCaptcha, certificado e documentos fiscais.

## Preparação
1. Abrir a [PR experimental #108](https://github.com/joaoldsxyzbr/Nfe-agendamento-2.0/pull/108), conferir o SHA do último commit e o link do workflow `Mini-IA P5 - Chromium MV3 e avaliação` **aprovado** naquele SHA.
2. Na execução do GitHub Actions, obter o artefato `NFe-MiniIA-P5-Experimental-<run_id>` (disponibilidade por 7 dias). **Não confundir artefato de testes com release de produção.**
3. Extrair o ZIP em pasta local e confirmar que a raiz da pasta contém `manifest.json`, `background.js`, `portal-content.js`, `app.html`, `options.html` e `options.js`.
4. Usar perfis **isolados e temporários** do Chrome e do Edge (não instalar sobre o ambiente que já processa notas). Nunca compartilhar documentos fiscais, URLs com parâmetros, chaves NF-e, XML ou dados de certificado como evidência.

## Teste P5 — interface e diagnóstico, sem documentos fiscais
- [ ] Chrome, em `chrome://extensions` → **Modo do desenvolvedor** → **Carregar sem compactação** → selecionar a pasta com `manifest.json`, instala sem erros de MV3.
- [ ] Edge, em `edge://extensions` → **Modo do desenvolvedor** → **Carregar sem compactação**, instala sem erros de MV3.
- [ ] O clique no ícone abre a UI interna e o segundo clique foca a mesma janela (sem perder dados).
- [ ] A página **Opções** contém `Analisar padrões locais`, `Exportar relatório JSON` e `Apagar diagnósticos`.
- [ ] Sem operações, a análise informa ausência de registros. Não exige conexão com servidor da aplicação.
- [ ] Após uma sessão **de teste autorizada e sem dados pessoais expostos**, a análise mostra códigos e contagens, sem textos de Portal, dados de notas ou identificação de fornecedores.
- [ ] Exportar o JSON somente por ação explícita. **Conferir localmente** ausência de dados fiscais antes de compartilhar; é possível usar `node scripts/review-mini-ai-report.mjs <arquivo.json>` para gerar triagem sanitizada.
- [ ] Apagar diagnósticos remove os registros e preserva as regras locais de fornecedores.
- [ ] Não há tentativas da mini-IA de clicar em botões inesperados; sem alteração da consulta se a IA encontrar candidato incerto.

## Aceite do piloto fiscal completo — depende de usuário autorizado
- [ ] Portal Nacional abre apenas na origem oficial; chave é preenchida e hCaptcha permanece **manual**.
- [ ] Certificado digital, quando necessário, é selecionado apenas pelo navegador/usuário.
- [ ] XML oficial recebido pertence à chave consultada, e XML inválido não é aceito.
- [ ] DANFE/CSV/ZIP funcionam, inclusive impressão de notas curtas/longas.
- [ ] Lote de duas chaves avança sequencialmente; falha/cancelamento/reentrada são tratados sem duplicação.
- [ ] Reabrir navegador, fechar Portal durante consulta e repetir operação não criam dupla execução.

## Evidências aceitas
Registrar **apenas** navegador + versão, SHA exato do commit e link do job CI, resultado PASS/FAIL para cada item e códigos de erro sanitizados. Não enviar prints que contenham XML, chave NF-e, CPF/CNPJ ou dados de certificado.

| Plataforma | Teste da extensão P5 | Teste fiscal no Portal real |
| --- | --- | --- |
| Chromium headless Playwright (Linux CI) | APROVADO — [run #40400199711](https://github.com/joaoldsxyzbr/Nfe-agendamento-2.0/actions/runs/40400199711), somente smoke MV3 e opções | NÃO EXECUTADO |
| Chrome desktop (Windows) | NÃO EXECUTADO | NÃO EXECUTADO |
| Edge desktop (Windows) | NÃO EXECUTADO | NÃO EXECUTADO |

## Regra de promoção
Não concluir homologação, mesclar a PR #108, publicar release ou desativar a aplicação em produção sem os testes físicos necessários. A mini-IA continua somente em **shadow mode**, sem executar ações nem resolver hCaptcha.
