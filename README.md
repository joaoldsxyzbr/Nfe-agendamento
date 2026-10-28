# NFe Agendamento 2.0 — extensão independente

**Branch principal:** `main` · **Manifest V3:** `0.3.1` · **Última release publicada:** [`v0.3.1`](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.1) · **Chrome / Edge desktop** · **Homologação física: não executada, dispensada por decisão do responsável em 28/10/2026**

O NFe Agendamento funciona dentro de uma **janela popup própria**, com aproximadamente metade da largura do navegador. A consulta continua no Portal Nacional da NF-e, com **hCaptcha manual** e certificado digital do navegador quando necessário. Nenhum servidor próprio, Cloudflare Worker, D1 ou site hospedado é necessário para a execução.

## Estrutura atual

- `apps/ui/` — interface em JavaScript puro, HTML e CSS; tratamento de XML, DANFE, lote e testes. É código incorporado à extensão, **não um site implantado**.
- `apps/extension/` — manifesto MV3, service worker, integração com o Portal, opções, testes e build do ZIP.
- `scripts/` — validação, formatação e servidor de preview **exclusivo para testes**.
- `tests/playwright/` — cenários automatizados de consulta simulada e impressão.
- `docs/` — arquitetura atual, aceitação, decisões e histórico.

Fluxo da extensão: popup local `app.html` → mensagens `chrome.runtime` → service worker MV3 → Portal Nacional → XML conferido → visualização/impressão de DANFE e download de XML individual. A versão estável `v0.3.0` já inclui os downloads de XMLs individuais e cópia da chave da NF-e, integrados pela [PR #113](https://github.com/joaoldsxyzbr/Nfe-agendamento/pull/113). O piloto histórico `v0.3.0-pilot.4` ainda oferecia ZIP de XMLs.

## Mini-IA local (P0–P5, integrados em modo de observação)

A Mini-IA P0–P5 entrou na branch `nfe-agendamento` pela PR #108 (26/10/2026) e chegou à `main` com o merge da PR #107 (27/10/2026). A integração de código não representa homologação física. O motor de inteligência da extensão está implementado em modo de observação. Há um pequeno classificador neural feed-forward em JavaScript nativo que **observa** possíveis controles de download sem executar cliques. Na P1, os pesos passaram a ser **treinados de forma reproduzível com exemplos sintéticos**, com checagem automática de regressão. Isso **não equivale a validação em páginas reais**.

Quando a interface convencional não reconhece um controle, o classificador pode registrar uma hipótese local com código, estado, versão e pontuação. Falhas de operação também geram registros categorizados. O usuário encontra **Exportar relatório JSON** e **Apagar diagnósticos** na página de opções. No máximo 100 registros locais dos últimos 14 dias são recuperados, sem telemetria, chave NF-e, XML, URL ou texto da página. O usuário decide se compartilha o arquivo para revisão técnica.

Na P2, uma política independente valida origem e rota oficiais, estado da consulta, ambiguidades, quantidade de candidatos, visibilidade, desativação e links externos antes de emitir uma **proposta de navegação**. A integração somente registra códigos e motivos autorizados; a mini-IA **não clica nem interfere no fluxo de consulta**. Testes adversariais cobrem controles enganosos e condições inseguras. Consulte [P1](docs/plans/2026-10-26-mini-ia-nfe-p1.md) e [P2](docs/plans/2026-10-26-mini-ia-nfe-p2.md).

Na P3, as consultas em lote passaram a registrar **somente contagens agregadas**, resultados de tentativas de recuperação e códigos de falhas de verificação. A página de opções analisa falhas recorrentes por regras locais auditáveis e inclui os padrões identificados no JSON de exportação. Logs jamais contêm chave NF-e, XML ou identificação de fornecedor. Consulte o [plano P3](docs/plans/2026-10-26-mini-ia-nfe-p3.md). A análise de padrões é determinística; não significa treinamento automático do modelo.

Na P4, adicionamos um **corpus adversarial independente do treinamento** para bloquear propostas inseguras na CI e corrigimos a permissão indevida de botões com `formaction`/`formtarget` ou formulário externo. O script `node scripts/review-mini-ai-report.mjs caminho/para/nfe-intelligence-diagnosticos.json` analisa localmente um relatório exportado e imprime só contagens, categorias e ações técnicas pré-definidas — não revela o conteúdo bruto. Nenhum relatório é enviado automaticamente. Consulte o [plano P4](docs/plans/2026-10-26-mini-ia-nfe-p4.md).

Na P5, o GitHub CI passou a **carregar realmente o pacote Manifest V3 no Chromium automatizado**, conferir service worker, permissões, tela de opções e privacidade do JSON exportado. O mesmo job executa os testes Playwright de consulta simulada/DANFE e publica um artefato experimental por 7 dias (não é release): [GitHub Actions P5](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40400199711). O roteiro físico para Chrome e Edge fica em [Homologação P5](docs/testing/mini-ai-p5-manual.md). **O CI não executa consultas reais, hCaptcha, certificado nem testes físicos Windows.**

Nenhuma decisão neural substitui a validação fiscal, o hCaptcha manual, as permissões ou o fluxo operacional aprovado. O código da Mini-IA já está na `main`, mas permanece em observação; não há homologação física completa nem autorização para ações neurais autônomas. A publicação estável de `v0.3.0` não altera o limite de observação da Mini-IA. Veja [plano P0 da mini-IA](docs/plans/2026-10-26-mini-ia-nfe-p0.md).


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

A [release estável **`v0.3.1`**](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.1) foi publicada em 28/10/2026 no commit `308a53b`, após [CI aprovado](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723503436) e [workflow de release bem-sucedido](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723614299). Inclui o tema petróleo suave, Vitest/cobertura 5.0.5 e Playwright 1.64.1; veja [notas v0.3.1](docs/releases/v0.3.1.md). A publicação não constitui homologação física. A [v0.3.0](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0) permanece disponível como versão anterior.

O [piloto 4 — interface simplificada](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.4) reúne as últimas correções e **remove o botão “Relatório CSV”** e seu acionamento, mantendo consulta unitária/em lote, DANFE, XML individual e ZIP de XMLs. O workflow bloqueia a publicação caso o botão ainda apareça no pacote. É um pré-lançamento de avaliação, **não uma release estável nem um aceite físico**.

O [piloto 3 — extensão MV3 com Mini-IA local](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.3) reúne a arquitetura atual e a camada de diagnósticos experimentais. É um **pré-lançamento para testes**, não homologado com o Portal real em Chrome/Edge Windows; não substitui a versão oficial. A publicação depende da aprovação de todas as verificações do workflow específico de release.

O [piloto 2 com popup](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.2) foi publicado antes da reorganização da estrutura. **O ZIP dessa release não inclui automaticamente as alterações mais recentes da branch.** Os builds de teste são gerados pelo CI; a decisão de distribuição estável é separada da homologação física dispensada.

Não instale o piloto sobre a versão antiga durante uma operação fiscal; prefira um perfil separado no navegador. O armazenamento das regras de fornecedores é local (`chrome.storage.local`), sem exposição de dados fiscais ao GitHub.

## Validação e decisão de distribuição

- **Integração à `main`: realizada** na [PR #107](https://github.com/joaoldsxyzbr/Nfe-agendamento/pull/107), commit `a0a586c` (27/10/2026).
- **CI da `main` (`v0.3.1`): aprovado** no [workflow 40723503436](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723503436), jobs `web`, `extension`, `danfe-print` e `security-audit`. O [workflow de release 40723614299](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40723614299) também foi aprovado.
- **Homologação física: dispensada por decisão do responsável em 28/10/2026**. Os cenários reais de Chrome/Edge, Portal, hCaptcha manual, certificado, XML, DANFE, lote, cancelamento e impressão **não foram executados ou comprovados**. A dispensa não equivale a aprovação nem elimina o risco de falhas em uso real.
- Os testes automatizados e as verificações de segurança do CI continuam necessários. Se surgir falha em uso, registrar sintoma e versão, sem compartilhar dados fiscais, e tratá-la em issue específica.
- Preservar [checklist](docs/testing/extension-only-acceptance.md) e [resultado v0.3.0](docs/testing/acceptance-results/v0.3.0-main.md) como histórico fiel dos testes não executados.

A [v0.3.0-pilot.4](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.4) continua um **pré-lançamento histórico**; a `v0.3.0` estável foi publicada em 28/10/2026. A dispensa de homologação física não constitui aceite nem autoriza merges adicionais. A antiga integração GitHub → Cloudflare Builds foi desconectada com autorização, conforme [issue #114](https://github.com/joaoldsxyzbr/Nfe-agendamento/issues/114). Qualquer outra implantação ou alteração de infraestrutura depende de decisão separada.

## Documentação

- [Arquitetura de extensão única](docs/architecture/extension-only.md)
- [Índice de documentos](docs/README.md)
- [Plano inicial de migração](docs/plans/2026-10-22-nfe-agendamento-extensao-autonoma.md)
- [Histórico de releases](docs/releases/)
