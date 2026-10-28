# Documentação — NFe Agendamento 2.0

## Arquitetura vigente na `main`

O produto é uma **extensão Chromium Manifest V3**, com interface interna, sem site próprio e sem backend Cloudflare. O Portal Nacional da NF-e continua sendo externo e requer conexão com a internet.

Leia nesta ordem:

1. [README do projeto](../README.md)
2. [Arquitetura extensão autônoma](architecture/extension-only.md)
3. [Checklist de aceitação física](testing/extension-only-acceptance.md) e [resultado v0.3.0](testing/acceptance-results/v0.3.0-main.md)
4. [Regras de fornecedores](architecture/supplier-rules.md)
5. [Campos fiscais RTC/IBS/CBS](architecture/rtc-ibs-cbs.md)
6. [Interface da consulta](ui/consultation-screen.md)
7. [Plano da migração](plans/2026-10-22-nfe-agendamento-extensao-autonoma.md)
8. [Mini-IA local e diagnósticos — P0 experimental](plans/2026-10-26-mini-ia-nfe-p0.md)
9. [Treinamento neural reproduzível — P1](plans/2026-10-26-mini-ia-nfe-p1.md)
10. [Decisões supervisionadas e testes adversariais — P2](plans/2026-10-26-mini-ia-nfe-p2.md)
11. [Memória operacional e análise local — P3](plans/2026-10-26-mini-ia-nfe-p3.md)
12. [Corpus adversarial e triagem privada — P4](plans/2026-10-26-mini-ia-nfe-p4.md)
13. [P5 — Testes reais do pacote MV3 em Chromium e preparação da homologação](plans/2026-10-26-mini-ia-nfe-p5.md)
14. [Roteiro manual P5 — Chrome e Edge](testing/mini-ai-p5-manual.md)

## Histórico

Documentos antigos de site, Worker, Windows Bridge, consultador SEFAZ, Vite, projetos e provas de conceito ficam preservados para rastreabilidade, mas **não definem o runtime desta branch**. São históricos: `architecture/frontend-boundaries.md`, `architecture/site-estatico-sem-vite.md`, `architecture/bridge-security.md`, `superpowers/`, relatórios de releases anteriores e documentos em `operations/` anteriores à mudança.

## Escopo e publicação

A PR #107 integrou a extensão MV3 à `main` em 27/10/2026. A arquitetura dispensa hospedagem web e backend próprio para executar; nenhuma implantação Cloudflare foi necessária nesse merge. **O aceite físico não foi executado e foi dispensado pelo responsável em 28/10/2026, sem declarar aprovação. A release estável `v0.3.0` foi publicada em 28/10/2026 com CI aprovado; a `v0.3.1` depende de nova validação e publicação.** Consulte [resultado de homologação v0.3.0](testing/acceptance-results/v0.3.0-main.md).
