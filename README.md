# NFe Agendamento — edição 100% extensão (piloto)

**Branch:** nfe-agendamento | **Estado:** implementação inicial, aceitação física pendente | **Manifest V3:** 0.3.0.

Esta branch incorpora a interface completa do NFe Agendamento numa extensão do Chrome/Edge. Não precisa de site hospedado, Workers Cloudflare, D1 nem aplicativo Windows. **Precisa de internet para consultar o Portal Nacional da NF-e.**

## Arquitetura

Aba local da extensão (app.html) → mensagens internas MV3 → service worker da extensão → janela oficial do Portal NF-e → hCaptcha manual e certificado pelo navegador quando exigido → XML oficial validado → DANFE, impressão/PDF, XML, CSV e ZIP na aba local.

O clique no ícone abre ou foca uma aba interna. As regras privadas de fornecedores continuam em chrome.storage.local. Nenhuma chave privada, PFX ou XML deve ser salvo no GitHub ou enviado ao Cloudflare.

## Compilar e instalar piloto

Requer Node.js/npm compatíveis, Chrome ou Edge desktop:

```bash
npm ci
npm audit --audit-level=high
npm run lint:web
npm run format:check:web
npm run test:web
npm run test:extension
npm run build:extension
```

O bundle gerado em **apps/extension/dist/** contém manifest.json, app.html, src/main.js, CSS, scripts da extensão, opções, favicon e marca.

No Chrome/Edge: Extensões → Modo do desenvolvedor → Carregar sem compactação → escolher a pasta **apps/extension/dist**. Clique no ícone para abrir a interface.

### Download do ZIP de teste (sem compilar no seu PC)

Abra [GitHub Actions — CI da branch nfe-agendamento](https://github.com/joaoldsxyzbr/Nfe-agendamento-2.0/actions/workflows/ci.yml?query=branch%3Anfe-agendamento). Entre na execução mais recente e, no final da página, abra **Artifacts → NFeAgendamento-Piloto-v0.3.0**. O arquivo baixado é um ZIP com o **conteúdo já compilado** da extensão; extraia numa pasta e, em `chrome://extensions` ou `edge://extensions`, escolha **Carregar sem compactação** apontando para a pasta extraída que contém `manifest.json`.

O artifact do GitHub tem validade de sete dias; é apenas um **piloto para testes** e pode estar disponível mesmo se outro job do CI (por exemplo, `security-audit`) falhar. Confira o resultado da execução antes de instalar; não considere uma aprovação de produção. A branch `main` e a release oficial não mudam.


**Usar perfil separado para este piloto.** Não substituir a versão corrente nem instalar no mesmo perfil durante uma consulta ativa. Não há release oficial 0.3.0 nesta etapa.

## Evidências necessárias

Somente testes unitários não comprovam consulta no Portal. Validar em Windows real nos dois navegadores: chave legítima, popup oficial, captcha humano, certificado quando exigido, XML capturado, DANFE/PDF, CSV, ZIP, segunda consulta, lote sequencial, cancelamento, importação manual e recuperação após fechar a UI.

- [Plano original](docs/plans/2026-10-22-nfe-agendamento-extensao-autonoma.md)
- [Arquitetura experimental](docs/architecture/extension-only.md)
- [Checklist de aceitação física](docs/testing/extension-only-acceptance.md)
- [Índice documental](docs/README.md)

O repositório GitHub continua sendo a única fonte da verdade; a main e a hospedagem atual permanecem intactas. **Não declarar pronta para produção até CI verde e aceite físico.**