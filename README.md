# NFe Agendamento 2.0 — extensão independente

**Branch principal:** `main` · **Manifest V3:** `0.3.3` · **Última release publicada:** [`v0.3.3`](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.3), após [CI aprovado](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/41869565760) em 04/11/2026 · **Chrome / Edge desktop** · **Homologação física: não executada, dispensada por decisão do responsável em 28/10/2026**

O NFe Agendamento funciona dentro de uma **janela popup própria**, com aproximadamente metade da largura do navegador. A consulta continua no Portal Nacional da NF-e, com **hCaptcha manual** e certificado digital do navegador quando necessário. Nenhum servidor próprio, Cloudflare Worker, D1 ou site hospedado é necessário para a execução.

## Estrutura atual

- `apps/ui/` — interface em JavaScript puro, HTML e CSS; tratamento de XML, DANFE, lote e testes. É código incorporado à extensão, **não um site implantado**.
- `apps/extension/` — manifesto MV3, service worker, integração com o Portal, opções, testes e build do ZIP.
- `scripts/` — validação, formatação e servidor de preview **exclusivo para testes**.
- `tests/playwright/` — cenários automatizados de consulta simulada e impressão.
- `docs/` — arquitetura atual, aceitação, decisões e histórico.

Fluxo da extensão: popup local `app.html` → mensagens `chrome.runtime` → service worker MV3 → Portal Nacional → XML conferido → visualização/impressão de DANFE e download de XML individual. A versão estável `v0.3.0` já inclui os downloads de XMLs individuais e cópia da chave da NF-e, integrados pela [PR #113](https://github.com/joaoldsxyzbr/Nfe-agendamento/pull/113). O piloto histórico `v0.3.0-pilot.4` ainda oferecia ZIP de XMLs.

## Diagnósticos de operação

A extensão registra localmente diagnósticos de operação: códigos autorizados de falhas (Portal, lote, verificação), estado, data, categorias de erro e contagens agregadas de lotes. No máximo 100 registros dos últimos 14 dias ficam em `chrome.storage.local`, sem telemetria, chave NF-e, XML, URL ou texto da página. Na página de opções, o usuário encontra **Analisar padrões locais**, **Exportar relatório JSON** e **Apagar diagnósticos**; a análise de recorrência usa regras determinísticas auditáveis, sem inferência de qualquer natureza.

A mini-IA experimental (classificador neural local em modo de observação, P0–P5) foi **removida em 09/11/2026** por decisão do responsável: a avaliação sintética de 04/11/2026 não demonstrou retorno em uso real, e o seletor determinístico é o caminho de produção. Os planos P0–P5 e a avaliação permanecem como registro histórico. Veja [a decisão de remoção](docs/operations/mini-ia-removal-decision-2026-11-09.md).


## Recuperação de resultados em interrupções

Se uma resposta terminar antes de a interface registrar o listener, a extensão conserva temporariamente o último resultado para a aba interna que iniciou a operação. O cliente tenta recuperá-lo por uma consulta **única** de estado, confirma o recebimento e não usa polling.

O armazenamento usa `chrome.storage.session`, com expiração de cinco minutos e descarte após confirmação, fechamento da aba ou início de nova consulta. XMLs acima de 2 MiB continuam entregues por evento, mas não são retidos para recuperação; se a mensagem for perdida, o aplicativo informa a necessidade de nova consulta. Não há recuperação de XML após reinício completo do navegador nem retomada automática de lote. Veja [detalhes e limitações](docs/operations/terminal-replay-2026-11-04.md).

## Limite de memória em lotes

O aplicativo aceita até 100 chaves por lote, mas preserva no máximo 24 MiB (bytes UTF-8) de XMLs originais concluídos na memória da janela. Ao atingir esse limite, os XMLs já concluídos continuam disponíveis para download/DANFE; a nota excedente é marcada com erro, as chaves seguintes não são consultadas e o usuário pode iniciar um novo lote menor. Importações manuais também seguem o limite. Essa é uma proteção parcial contra crescimento de memória, **não** um limite de consumo total do navegador. Veja [regras do limite](docs/operations/batch-xml-memory-2026-11-04.md).

## Compilar e verificar

Requer Node.js e npm:

```bash
npm ci
npm audit --audit-level=high
npm run lint:ui
npm run format:check:ui
npm run test:ui
npm run test:extension
npm run build:extension
```

O job de CI `web` mantém a compatibilidade com o ruleset `main-required-ci`, mas executa de fato lint, formatação, testes, cobertura e build da interface local `apps/ui`; não existe hospedagem web nesta arquitetura.

O resultado está em `apps/extension/dist/`. Em `chrome://extensions` ou `edge://extensions`, ative o Modo do desenvolvedor → **Carregar sem compactação** → escolha essa pasta. Clique no ícone para abrir ou focar a janela popup. Nenhum Node.js fica em execução após a instalação.

## Releases

A **v0.3.3** é um hotfix para o erro `Cannot read properties of undefined (reading 'onMessage')` observado na v0.3.2. A limpeza dos listeners de mensagens MV3 não pode mais acessar um `chrome.runtime` já indisponível. Os testes de regressão usam cenários simulados de recarga/encerramento; **o problema no navegador real ainda precisa ser revalidado após instalação**. Veja [notas v0.3.3](docs/releases/v0.3.3.md) e [registro de testes físicos não executados](docs/testing/acceptance-results/v0.3.3.md). **Publicada em 04/11/2026**, após [CI da `main` aprovado](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/41869565760) e [workflow Release concluído](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/41869706337). [Baixar ZIP da v0.3.3](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/download/v0.3.3/NFeAgendamento-Extension-v0.3.3.zip).

A **v0.3.2** consolida correções de segurança do release/Portal, validação dos XMLs e campos RTC, recuperação de respostas MV3 sem polling, limite agregado de XML por lote, otimização de contagem UTF-8 e avaliação **sintética** da mini-IA (sem cliques autônomos). Veja as [notas da v0.3.2](docs/releases/v0.3.2.md) e [registro de aceitação não executada](docs/testing/acceptance-results/v0.3.2.md). A versão foi **publicada em 04/11/2026** após [CI da `main` aprovado](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/41857418527) e [workflow Release concluído](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/41857598471). Contém [ZIP versionado](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/download/v0.3.2/NFeAgendamento-Extension-v0.3.2.zip) e [ZIP estável](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/download/v0.3.2/NFeAgendamento-Extension.zip). A publicação **não é homologação física**.

A [release estável **`v0.3.1`**](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.1) foi publicada em 28/10/2026 no commit `308a53b`, após [CI aprovado](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723503436) e [workflow de release bem-sucedido](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723614299). Inclui o tema petróleo suave, Vitest/cobertura 5.0.5 e Playwright 1.64.1; veja [notas v0.3.1](docs/releases/v0.3.1.md). A publicação não constitui homologação física. A [v0.3.0](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0) permanece disponível como versão anterior.

Os pré-lançamentos [piloto 2](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.2), [piloto 3](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.3) e [piloto 4](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.4) permanecem como **histórico**, não como versões atuais. Os workflows exclusivos da antiga branch de piloto foram retirados; a validação atual está no CI da `main` e a publicação estável no workflow `Release`.

Não instale o piloto sobre a versão antiga durante uma operação fiscal; prefira um perfil separado no navegador. O armazenamento das regras de fornecedores é local (`chrome.storage.local`), sem exposição de dados fiscais ao GitHub.

## Validação e decisão de distribuição

- **Integração à `main`: realizada** na [PR #107](https://github.com/joaoldsxyzbr/Nfe-agendamento/pull/107), commit `a0a586c` (27/10/2026).
- **CI da `main` (`v0.3.1`): aprovado** no [workflow 40723503436](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723503436), jobs `web`, `extension`, `danfe-print` e `security-audit`. O [workflow de release 40723614299](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723614299) também foi aprovado.
- **Homologação física: dispensada por decisão do responsável em 28/10/2026**. Os cenários reais de Chrome/Edge, Portal, hCaptcha manual, certificado, XML, DANFE, lote, cancelamento e impressão **não foram executados ou comprovados**. A dispensa não equivale a aprovação nem elimina o risco de falhas em uso real.
- Os testes automatizados e as verificações de segurança do CI continuam necessários. Se surgir falha em uso, registrar sintoma e versão, sem compartilhar dados fiscais, e tratá-la em issue específica.
- Preservar [checklist](docs/testing/extension-only-acceptance.md) e [resultado v0.3.0](docs/testing/acceptance-results/v0.3.0-main.md) como histórico fiel dos testes não executados.

A dispensa da homologação física permanece registrada como **não executada**, sem equivaler a aprovação. A antiga integração GitHub → Cloudflare Builds foi desconectada com autorização, conforme [issue #114](https://github.com/joaoldsxyzbr/Nfe-agendamento/issues/114). Qualquer nova implantação ou alteração de infraestrutura requer decisão separada.

## Documentação

- [Arquitetura de extensão única](docs/architecture/extension-only.md)
- [Índice de documentos](docs/README.md)
- [Plano inicial de migração](docs/plans/2026-10-22-nfe-agendamento-extensao-autonoma.md)
- [Histórico de releases](docs/releases/)
