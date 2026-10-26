# P5 — Testes reais do pacote MV3 em Chromium e preparação da homologação (26/10/2026)

## Escopo
Concluir a próxima etapa sem colocar a mini-IA para executar ações fiscais. Fazer um teste **real do pacote instalado no Chromium automatizado**, além dos atuais testes com fakes e testes Playwright de interface. Preservar a `main` e a PR #108 como experimental contra `nfe-agendamento`.

## Etapas
1. Adicionar teste Playwright que carregue a pasta `apps/extension/dist` como **extensão Manifest V3 descompactada no Chromium empacotado com Playwright**, com perfil temporário isolado e service worker iniciado.
2. Verificar página real de opções, campos de diagnóstico, versão, permissões e origem do pacote, sem acessar Portal Nacional real.
3. Inserir um evento **sintético** no `chrome.storage.local` do perfil de teste, verificar análise de recorrência, exportação manual JSON que omite campos secretos injetados e exclusão local. Confirmar que o armazenamento de outras preferências é mantido.
4. Adicionar um job GitHub Actions separado `chromium-smoke` com instalação oficial do Chromium Playwright e execução de todos os testes de navegador existentes, inclusive DANFE/impressão, além do novo teste MV3.
5. Publicar **artefato privado do workflow** com pacote descompactado para homologação manual, somente se o job terminar com sucesso. Retenção curta, sem arquivos fiscais, credenciais ou relatórios do usuário. Não publicar release.
6. Atualizar o checklist separando `Chromium automatizado + dados simulados` de `Chrome e Edge reais com portal, captcha manual e certificado`; manter os últimos como NÃO EXECUTADO.

## Verificação e critérios
- Comprovante de instalação automatizada real do service worker MV3 e teste de options/storage/export.
- Playwright de consulta simulada/DANFE rodando sob Linux CI em navegador Chromium.
- Gates P4 permanecem intactos: treino reproduzível, corpus adversarial, CLI de revisão, auditoria, cobertura, teste UI/extensão e build.
- Nenhum acesso automatizado ao Portal Nacional, nenhuma resolução de hCaptcha e nenhum XML real.
- Se Playwright não suportar extensão no CI, não declarar teste físico concluído; corrigir a causa ou documentar bloqueio.
- Sem merge, deploy, release ou alteração de `main`.
