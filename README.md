# NFe Agendamento 2.0

Aplicação interna para consultar NF-e pelo Portal Nacional, obter o XML oficial e gerar/visualizar DANFE.

## Arquitetura atual

O fluxo vigente é **site + extensão Chromium**, sem Bridge/EXE e sem consulta direta à SEFAZ:

```text
Site NFe Agendamento
        ↓
Extensão Chromium MV3
        ↓
Portal Nacional da NF-e
        ↓
hCaptcha manual
        ↓
Download oficial do XML
        ↓
Site → validação XML → DANFE/XML
```

Toda consulta abre o Portal Nacional. A extensão preenche a chave, acompanha a sessão do navegador e devolve o XML oficial ao site.

## Portal Nacional

Fluxo nominal:

1. o site valida a chave;
2. a extensão abre um popup oficial do Portal;
3. a chave é preenchida;
4. o usuário resolve o **hCaptcha manualmente**;
5. a extensão acompanha a continuação oficial;
6. o navegador usa o certificado digital quando o Portal exigir;
7. a extensão captura o download oficial dentro da mesma sessão;
8. o XML é limitado, validado contra a chave e devolvido ao site;
9. o site gera DANFE e libera o download do XML.

Não existe solver/bypass de captcha. O acompanhamento da página do Portal é orientado a eventos (`MutationObserver`, eventos de formulário/navegação e mensagens da página), sem `setInterval` periódico.

## Consulta unificada

A tela usa um único fluxo para uma ou várias chaves:

- uma chave usa a mesma máquina de estados do lote;
- várias chaves são processadas estritamente em sequência;
- no máximo uma janela do Portal fica ativa;
- cancelamento impede abrir os próximos itens;
- falha de um item não inicia rota escondida;
- quando o Portal falha, o item pode ser reconsultado ou recuperado com um XML local validado contra a mesma chave;
- resultados concluídos podem ser baixados em ZIP ou impressos em conjunto.

Não existem limite/cooldown de consulta direta, porque o projeto não chama `NFeDistribuicaoDFe`.

## Certificado digital

A extensão não lê, importa, exporta nem armazena PFX/P12, senha ou chave privada.

Quando o Portal Nacional exigir certificado digital para o download, a autenticação continua sob responsabilidade do Chrome/Edge e do Windows. O projeto não mantém mais CNPJ fiscal de A1 nem configuração de certificado para consulta direta.

## Regras privadas de fornecedor

CNPJ/CPF real de fornecedor não faz parte do bundle público. A configuração privada é importada pela página de opções da extensão e fica em `chrome.storage.local`. O site recebe somente o `supplierId` lógico.

Clicar no ícone da extensão abre essa configuração.

## Extensão

Versão na `main`: **0.2.13**.

Permissões:

- `scripting`;
- `storage`;
- `webRequest`.

Hosts:

- `https://nfeagendamento.joaolds.xyz.br/*`;
- `https://www.nfe.fazenda.gov.br/*`.

A política de conteúdo da extensão é declarada explicitamente como `script-src 'self'; object-src 'self';`.

Sem `<all_urls>`, Native Messaging, `downloads`, `webRequestBlocking`, acesso genérico ao sistema de arquivos ou host direto `www1.nfe.fazenda.gov.br`.

## Cloudflare

O site é publicado como **Workers Static Assets**, sem Worker script intermediário. O `wrangler.jsonc` aponta diretamente para `apps/web/dist`.

XML, certificado e regras privadas não são enviados à Cloudflare pelo fluxo de consulta.

## Desenvolvimento e validação

```bash
npm ci
npm audit --audit-level=high
npm run lint:web
npm run format:check:web
npm run test:web
npm run coverage:web
npm run build:web
npm run test:extension
npm run coverage:extension
npm run build:extension
npm test --prefix tests/playwright
./node_modules/.bin/wrangler deploy --dry-run
```

CI: `web`, `extension` e `danfe-print`. Os gates incluem `npm audit --audit-level=high`, typecheck/lint, formatação, testes, cobertura, builds, Playwright e dry-run do Wrangler. O CI não envia mais artefatos temporários ao Actions: a release recompila e empacota a extensão a partir do commit validado pelo CI. Consulte `docs/operations/repository-hardening.md`.

O repositório é privado. No plano GitHub atual, CodeQL/code scanning para repositórios privados não está disponível; por isso o workflow CodeQL não faz parte do gate vigente.

## Repositório privado

O código e as releases ficam no repositório privado `joaoldsxyzbr/Nfe-agendamento-2.0`. O site continua público via Cloudflare Static Assets, mas não depende do GitHub para consultar NF-e. O GitHub é usado como fonte de verdade, histórico e distribuição manual da extensão para o próprio proprietário.

## Releases

A **v0.0.37 / extensão 0.2.13** remove o fallback periódico do content script, preserva os timeouts com timers únicos, reforça cobertura crítica e melhora o diagnóstico da integração.

A **v0.0.36 / extensão 0.2.12** consolida o hardening pós-auditoria: CI com CodeQL, testes comportamentais adicionais da extensão, cobertura mínima, configuração Wrangler consolidada e rastreabilidade da aceitação física.

A **v0.0.35 / extensão 0.2.12** permanece como base funcional anterior deste hardening.

A v0.0.34/extensão 0.2.11 consolidou a arquitetura Portal-only e permanece como base funcional anterior a esta otimização.

O atalho do site abre a release mais recente no GitHub. Como o repositório é privado e de uso pessoal, o download da extensão exige a sessão GitHub autorizada do proprietário.

## Aceitação física

O gate físico vigente é o Portal Nacional: popup, chave preenchida, hCaptcha manual, certificado quando exigido, captura do XML, segunda consulta, lote e cancelamento.

Checklist: `docs/testing/acceptance.md`.

Cada release registra o resultado físico em `docs/testing/acceptance-results/vX.Y.Z.md`. A publicação depende do CI automatizado; Chrome e Edge são validados separadamente e o registro permanece `PENDENTE` até o teste real.

A `v0.0.37 / extensão 0.2.13` está registrada em `docs/testing/acceptance-results/v0.0.37.md` como **PENDENTE** até execução física real. A `v0.0.36 / extensão 0.2.12` também permanece com evidência física pendente em seu registro histórico.
