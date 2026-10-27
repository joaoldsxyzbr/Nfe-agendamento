# NFe Agendamento 2.0 — extensão independente (piloto)

**Branch de desenvolvimento:** `nfe-agendamento` · **Manifest V3:** `0.3.0` · **Chrome / Edge desktop**

O NFe Agendamento funciona dentro de uma **janela popup própria**, com aproximadamente metade da largura do navegador. A consulta continua no Portal Nacional da NF-e, com **hCaptcha manual** e certificado digital do navegador quando necessário. Nenhum servidor próprio, Cloudflare Worker, D1 ou site hospedado é necessário para a execução.

## Estrutura atual

- `apps/ui/` — interface em JavaScript puro, HTML e CSS; tratamento de XML, DANFE, lote e testes. É código incorporado à extensão, **não um site implantado**.
- `apps/extension/` — manifesto MV3, service worker, integração com o Portal, opções, testes e build do ZIP.
- `scripts/` — validação, formatação e servidor de preview **exclusivo para testes**.
- `tests/playwright/` — cenários automatizados de consulta simulada e impressão.
- `docs/` — arquitetura atual, aceitação, decisões e histórico.

Fluxo: popup local `app.html` → mensagens `chrome.runtime` → service worker MV3 → Portal Nacional → XML conferido → DANFE / impressão / CSV / ZIP.

## Mini-IA local (P0–P5 experimentais, integrados ao piloto)

A Mini-IA P0–P5 foi integrada à branch experimental `nfe-agendamento` pela PR #108 em 26/10/2026. Ela ainda não faz parte da `main`. O motor de inteligência da extensão está implementado em modo de observação. Há um pequeno classificador neural feed-forward em JavaScript nativo que **observa** possíveis controles de download sem executar cliques. Na P1, os pesos passaram a ser **treinados de forma reproduzível com exemplos sintéticos**, com checagem automática de regressão. Isso **não equivale a validação em páginas reais**.

Quando a interface convencional não reconhece um controle, o classificador pode registrar uma hipótese local com código, estado, versão e pontuação. Falhas de operação também geram registros categorizados. O usuário encontra **Exportar relatório JSON** e **Apagar diagnósticos** na página de opções. No máximo 100 registros locais dos últimos 14 dias são recuperados, sem telemetria, chave NF-e, XML, URL ou texto da página. O usuário decide se compartilha o arquivo para revisão técnica.

Na P2, uma política independente valida origem e rota oficiais, estado da consulta, ambiguidades, quantidade de candidatos, visibilidade, desativação e links externos antes de emitir uma **proposta de navegação**. A integração somente registra códigos e motivos autorizados; a mini-IA **não clica nem interfere no fluxo de consulta**. Testes adversariais cobrem controles enganosos e condições inseguras. Consulte [P1](docs/plans/2026-10-26-mini-ia-nfe-p1.md) e [P2](docs/plans/2026-10-26-mini-ia-nfe-p2.md).

Na P3, as consultas em lote passaram a registrar **somente contagens agregadas**, resultados de tentativas de recuperação e códigos de falhas de verificação. A página de opções analisa falhas recorrentes por regras locais auditáveis e inclui os padrões identificados no JSON de exportação. Logs jamais contêm chave NF-e, XML ou identificação de fornecedor. Consulte o [plano P3](docs/plans/2026-10-26-mini-ia-nfe-p3.md). A análise de padrões é determinística; não significa treinamento automático do modelo.

Na P4, adicionamos um **corpus adversarial independente do treinamento** para bloquear propostas inseguras na CI e corrigimos a permissão indevida de botões com `formaction`/`formtarget` ou formulário externo. O script `node scripts/review-mini-ai-report.mjs caminho/para/nfe-intelligence-diagnosticos.json` analisa localmente um relatório exportado e imprime só contagens, categorias e ações técnicas pré-definidas — não revela o conteúdo bruto. Nenhum relatório é enviado automaticamente. Consulte o [plano P4](docs/plans/2026-10-26-mini-ia-nfe-p4.md).

Na P5, o GitHub CI passou a **carregar realmente o pacote Manifest V3 no Chromium automatizado**, conferir service worker, permissões, tela de opções e privacidade do JSON exportado. O mesmo job executa os testes Playwright de consulta simulada/DANFE e publica um artefato experimental por 7 dias (não é release): [GitHub Actions P5](https://github.com/joaoldsxyzbr/Nfe-agendamento/actions/runs/40400199711). O roteiro físico para Chrome e Edge fica em [Homologação P5](docs/testing/mini-ai-p5-manual.md). **O CI não executa consultas reais, hCaptcha, certificado nem testes físicos Windows.**

Nenhuma decisão neural substitui a validação fiscal, o hCaptcha manual, as permissões ou o fluxo operacional aprovado. Esta fase não altera a `main`, a produção ou a extensão já homologada. Veja [plano P0 da mini-IA](docs/plans/2026-10-26-mini-ia-nfe-p0.md).


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

O [piloto 2 com popup](https://github.com/joaoldsxyzbr/Nfe-agendamento/releases/tag/v0.3.0-pilot.2) foi publicado antes da reorganização da estrutura. **O ZIP dessa release não inclui automaticamente as alterações mais recentes da branch.** Os builds de teste são gerados pelo CI, e a publicação estável só deve ocorrer após homologação.

Não instale o piloto sobre a versão antiga durante uma operação fiscal; prefira um perfil separado no navegador. O armazenamento das regras de fornecedores é local (`chrome.storage.local`), sem exposição de dados fiscais ao GitHub.

## Critérios para integração à main

- Testes de UI e extensão, cobertura, impressão e auditoria de dependências aprovados no CI.
- Testes físicos de Chrome e Edge com Portal oficial, XML, DANFE, lote, cancelamento, reabertura de janela e impressão.
- Evidências registradas no [checklist](docs/testing/extension-only-acceptance.md) e na [PR #107](https://github.com/joaoldsxyzbr/Nfe-agendamento/pull/107).

**A branch `main` e a infraestrutura anterior não foram alteradas.** Não desligar serviços nem mesclar o piloto antes da aceitação física.

## Documentação

- [Arquitetura de extensão única](docs/architecture/extension-only.md)
- [Índice de documentos](docs/README.md)
- [Plano inicial de migração](docs/plans/2026-10-22-nfe-agendamento-extensao-autonoma.md)
- [Histórico de releases](docs/releases/)
