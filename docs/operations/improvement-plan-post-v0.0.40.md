# Plano de evolução pós-v0.0.40

Data: 2026-10-14. Base de referência: site v0.0.40 e extensão 0.2.16.

## Restrições preservadas
Site estático + extensão Chromium MV3, Portal Nacional com hCaptcha manual, certificado controlado pelo navegador, lote sequencial, exportação XML/ZIP/DANFE. Nenhuma mudança no mecanismo de captura XML ou nas permissões da extensão.

## Entregas integradas na main
- **PR #81 / ad018f8 — regressão Portal:** testes adicionais de limites UTF-8, HTTP e redirecionamento. CI web, extension, danfe-print e Workers Builds aprovado.
- **PR #82 / 2f34a7e — compatibilidade:** aviso consultivo para versão da extensão anterior à 0.2.16 no painel de configurações, sem bloquear o handshake. Testes unitários. Quatro checks aprovados.
- **PR #83 / 9d94a5f — lote:** resumo compacto de concluídas e com erro ao finalizar; preservada a reconsulta individual de falhas já existente. Quatro checks aprovados.
- **PR #84 / e3f2942 — diagnósticos e interface:** orientações genéricas de recuperação para erros do Portal, sem ecoar chaves fiscais; espaçamentos compactos e foco visível no painel. Quatro checks aprovados.

## Cobertura e limites de validação
- **Confirmado:** alterações de código e testes integrados, CI de cada PR aprovado.
- **Não confirmado:** aceitação física dessas alterações no Portal com hCaptcha/certificado em Chrome e Edge; validação visual humana em dispositivos reais; publicação de nova release da extensão. CI não substitui esses testes.
- **Não realizado:** teste de mutação formal, cobertura integral de todos os cenários inicialmente propostos e protocolo de compatibilidade independente de número de versão. O aviso de compatibilidade é consultivo.
- **Reaproveitado:** retry individual, serialização, exportação e fluxo de cancelamento existentes. Nenhuma duplicação de funcionalidades.

## Aceite físico recomendado
1. Extensão 0.2.16: verificar conexão e indicador de compatibilidade.
2. Consultar uma NF-e no Portal com hCaptcha manual; confirmar XML e DANFE.
3. Repetir consulta e testar lote com uma falha; conferir resumo e retry individual.
4. Testar cancelamento e exportações ZIP/DANFE.
5. Verificar mensagens de erro e painel compacto em desktop e mobile.

## Status
**IMPLEMENTAÇÃO INCREMENTAL INTEGRADA À MAIN.** Aceitação física das mudanças e eventual release seguem pendentes; não declarar versão de produção atualizada sem confirmação.
