# Saneamento do projeto — 02/10/2026

## Objetivo

Lapidar a arquitetura Portal-only existente sem adicionar infraestrutura desnecessária. O trabalho foi motivado pela revisão da `main` após o repositório passar a ser privado.

## Escopo implementado

### Consulta

- uma ou várias chaves usam o mesmo controller;
- removido o modo unitário paralelo e a camada que escondia/alterava a UI depois do carregamento;
- mantidos processamento sequencial, operação Portal única, cancelamento, ZIP e impressão;
- erro do Portal oferece reconsulta ou importação manual de XML;
- XML manual continua validado localmente contra a chave antes de liberar resultado.

### Frontend

Foram removidas camadas de compatibilidade que duplicavam comportamento:

- `src/access-key-ui.ts`;
- `src/batch/ui.ts`;
- `src/consultation-actions.ts`;
- `src/consultation-actions.css`;
- `src/nfe/consultation-controller.ts`;
- `src/danfe/zoom-direct.ts`.

O zoom do DANFE passa a ter uma única implementação em `attachDanfeZoom`.

### Extensão

- fronteiras de mensagens e `webRequest` receberam tipos locais explícitos;
- novo teste protege os invariantes do content script: orientação a eventos, ausência de polling periódico, hCaptcha humano e deadlines finitos.

### Repositório privado

- o atalho da extensão abre a release privada no GitHub;
- nenhuma infraestrutura pública adicional de download foi criada;
- CodeQL/code scanning foi retirado do CI porque o recurso não está disponível para este repositório privado no plano GitHub atual;
- permanecem `npm audit`, TypeScript, testes, cobertura, build, Playwright e Wrangler dry-run.

### Documentação

- criado `docs/README.md` como índice da documentação vigente;
- documentação antiga de Bridge/Windows/SEFAZ direta permanece apenas como histórico;
- arquitetura, UI, testes e hardening foram alinhados ao estado Portal-only atual.

## Critérios de validação

Antes de integrar:

1. revisar o diff completo;
2. executar o CI em PR;
3. exigir sucesso de `web`, `extension` e `danfe-print`;
4. validar o novo cenário E2E de recuperação por XML;
5. confirmar que a `main` final contém somente a arquitetura documentada.

## Pendência externa

A aceitação física da v0.0.37 em Chrome e Edge continua na issue #60 e não pode ser inferida de CI.
