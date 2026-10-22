# Arquitetura da edição só extensão

Data: 22/10/2026 | Branch: nfe-agendamento | Estado: piloto não validado fisicamente.

## Reutilização do código

O build existente da extensão incorpora os arquivos de apps/web/src e apps/web/public, sem duplicar o código-fonte. O HTML do site é transformado em app.html dentro do ZIP. Os caminhos absolutos de CSS/JS são convertidos para relativos; o script inline de tema é retirado por exigência CSP MV3, e main.js já inicializa o tema.

A interface abre em uma janela independente do tipo popup ao clicar no ícone, com largura aproximada de 50% e altura de 85% da janela normal do navegador, centralizada dentro desses limites. Se a janela popup já existe, recebe foco, preservando o estado da consulta; abas normais de versões anteriores não são reutilizadas. Esse ajuste não adiciona permissões de extensão. O Portal Nacional continua em um popup separado, na sua dimensão original.

O cliente BrowserPortalExtensionClient escolhe ExtensionPageTransport em páginas do protocolo chrome-extension:. A página interna chama chrome.runtime.sendMessage com source:app e appTabId. O service worker exige identidade e URL exata app.html, valida a aba solicitante e mantém uma única operação fiscal em chrome.storage.session. O retorno é enviado por chrome.runtime.sendMessage com siteTabId, e o cliente só aceita eventos destinados à própria aba.

A captura do Portal, hCaptcha manual, certificado gerenciado pelo navegador, limite de XML, rejeição de DTD, geração de DANFE, ZIP e fluxo de lote são reaproveitados. O service worker Manifest V3 é local ao navegador e não é um Cloudflare Worker. Consultar NF-e ainda depende de internet e do Portal Nacional.

## Segurança

- Permissões: scripting, storage e webRequest. Host permission: somente www.nfe.fazenda.gov.br.
- Sem host do antigo site no manifest e sem site-bridge.js empacotado.
- Sem all_urls, nativeMessaging, webRequestBlocking, solução automática de captcha ou acesso direto à SEFAZ.
- Regras de fornecedor permanecem locais em chrome.storage.local.
- Dados fiscais não entram nos logs, histórico de Git ou telemetria.
- O código da ponte antiga permanece na árvore de fontes para comparação e testes legados, mas não integra a distribuição desta branch; deve ser reavaliado antes de eventual merge.
- A transmissão do XML de até 10 MiB e reconciliação após suspensão do MV3 exigem testes em navegador real. Não presumir confiabilidade com base somente em mocks.

## Pipeline

CI testa módulos web reutilizados, extensão e impressão. O build de extensão deve produzir app.html, src/main.js e recursos estáticos. O dry-run Wrangler foi retirado do CI desta branch, pois a extensão dispensa hospedagem. Arquivos históricos de Cloudflare no repositório não são usados no runtime.

## Isolamento

Nenhuma alteração nesta branch desliga Cloudflare, modifica a main ou publica extensão. Em caso de falha, basta remover a extensão experimental do perfil de teste. Ver docs/testing/extension-only-acceptance.md.