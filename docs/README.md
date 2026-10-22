# Documentação do NFe Agendamento 2.0

## Fonte vigente

Para entender o sistema atual, leia nesta ordem:

1. `README.md`;
2. `docs/architecture/frontend-boundaries.md`;
3. `docs/architecture/supplier-rules.md`;
4. `docs/architecture/rtc-ibs-cbs.md`;
5. `docs/ui/consultation-screen.md`;
6. `docs/testing/browser-extension-portal.md`;
7. `docs/testing/acceptance.md`;
8. `docs/operations/repository-hardening.md`.

Decisão de stack: docs/architecture/javascript-migration.md e docs/architecture/site-estatico-sem-vite.md.

A arquitetura vigente é **site + extensão Chromium MV3 + Portal Nacional**, sem Bridge/EXE e sem consulta direta à SEFAZ.

## Experimento isolado nesta branch

Na branch `nfe-agendamento`, o planejamento para executar toda a aplicação dentro de **uma extensão Chromium, sem Workers e sem hospedagem própria**, está em [docs/plans/2026-10-22-nfe-agendamento-extensao-autonoma.md](plans/2026-10-22-nfe-agendamento-extensao-autonoma.md).

**Status da branch: implementação inicial, com aceite físico ainda pendente.** A arquitetura vigente da `main` não mudou; não houve deploy. Veja [arquitetura experimental](architecture/extension-only.md) e [aceitação da extensão](testing/extension-only-acceptance.md).

## Histórico

Arquivos marcados no topo como **Documento histórico / superseded** registram decisões e arquiteturas antigas. Eles não devem ser usados para decidir comportamento de produção.

Isso inclui, entre outros:

- Bridge/Windows/WebView2;
- consulta direta `NFeDistribuicaoDFe`;
- coordenação fiscal antiga;
- POCs .NET/Unimake;
- planos e specs antigos em `docs/superpowers/`.

O histórico é preservado para rastreabilidade, mas o código e a documentação da seção **Fonte vigente** prevalecem.