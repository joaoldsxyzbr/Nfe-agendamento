# Plano de evolução pós-v0.0.40

Data: 2026-10-14. Base: aplicação v0.0.40, extensão 0.2.16.

## Objetivo e restrições
Evoluir confiabilidade, lote, compatibilidade, diagnósticos e interface sem alterar a captura XML do Portal validada pelo usuário. Preservar arquitetura site estático + extensão Chromium MV3, hCaptcha manual, certificado sob controle do navegador, processamento sequencial (um popup), privacidade de dados fiscais e downloads ZIP/DANFE/XML. Não introduzir SEFAZ direta, bypass de captcha, permissões extras ou polling.

## Ordem de execução e critérios de aceite

### 1. Testes de regressão Portal → extensão → site (P0)
- Mapear contratos e testes existentes antes de adicionar casos; reutilizar fixtures sem dados fiscais reais.
- Cobrir captura textual autenticada compatível com 0.2.16, XML válido/inválido, chave divergente, erro HTTP, timeout, cancelamento e segunda consulta.
- Cobrir comunicação entre contextos, limpeza de popup e resultado enviado uma única vez.
- Aceite: testes novos falham em simulação controlada de regressão e passam na implementação atual; CI web/extension/danfe-print verde. Não mudar a lógica de captura nesta etapa.

### 2. Lote e retomada manual (P1)
- Auditar estados existentes e fluxo de reconsulta; evitar duplicação de funcionalidade.
- Exibir estados e progresso compactos, permitir reconsultar apenas falhas explicitamente, preservar concluídos e origem Portal.
- Manter estrita serialização, cancelamento sem iniciar próximo item e ZIP/impressão apenas de concluídos.
- Aceite: testes de lote misto, reconsulta, cancelamento e exportação; layout não salta após resultado.

### 3. Compatibilidade site/extensão (P1)
- Inventariar handshake atual e versões expostas, sem divulgar dados privados.
- Definir versão mínima de protocolo compatível (não depender apenas do número de release); distinguir extensão ausente, desatualizada e compatível.
- Exibir aviso discreto e link para releases privadas do GitHub, sem atualização automática nem novas permissões.
- Aceite: testes para pares compatíveis/incompatíveis e falha de handshake.

### 4. Diagnóstico de erros (P2)
- Inventariar códigos existentes; mapear causas conhecidas (Portal, timeout, cancelamento, certificado quando detectável, XML inválido, comunicação).
- Mensagens curtas e acionáveis; não afirmar causa que não pode ser observada, especialmente certificado.
- Logs locais minimizados sem XML, chaves completas, CPF/CNPJ ou credenciais.
- Aceite: testes de mapeamento de erro e ausência de dados sensíveis.

### 5. Refinamento visual (P2)
- Revisar componentes e CSS existentes; mudanças pequenas, sem redesenho.
- Compactar espaçamentos, padronizar ações e estados, evitar mudanças de layout entre consulta unitária e lote.
- Aceite: Playwright com estados inicial/carregando/concluído/erro, responsividade, navegação por teclado e ausência de regressão em ZIP/DANFE.

## Estratégia de entrega
1. Criar branch de trabalho por etapa, mudanças pequenas e PR com diff revisado.
2. Rodar testes focados e CI existente; só integrar após aprovação.
3. Não alterar diretamente produção nem publicar release automaticamente durante o planejamento.
4. Atualizar README e documentos de teste quando comportamento mudar; registrar riscos e decisões.
5. Teste físico em Chrome e Edge, com hCaptcha manual, XML/DANFE, segunda consulta, lote e cancelamento, permanece responsabilidade de execução real; registrar como PENDENTE até observação, conforme docs/testing/acceptance.md.
6. Interromper avanço se houver regressão no fluxo Portal validado na v0.0.40.

## Fora do escopo
Troca de stack, backend fiscal, automação de captcha, armazenamento de certificado, acesso amplo a hosts, consulta direta à SEFAZ e redesenho integral.

## Status
PLANEJADO. Nenhuma alteração funcional executada.
