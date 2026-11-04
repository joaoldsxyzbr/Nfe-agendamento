# Endurecimento P0 — 04/11/2026

## Escopo implementado

- Workflow `workflow_run` só pode publicar se o CI aprovado veio de **push** na `main` do **próprio repositório**. Verificações de branch e mensagem de release são preservadas. Um CI disparado por PR não pode usar esse caminho privilegiado.
- Controle de download no Portal deve ser visível, conectado e não desativado; links exigem o endpoint oficial. Botões legados são permitidos apenas com rótulo conhecido, sem overrides ou form externo. Múltiplos candidatos da mesma classe não são clicados automaticamente.
- Na interpretação fiscal que libera DANFE/XML, a chave do `infNFe` e a chave do protocolo precisam corresponder à consulta, o `cStat` deve ser 100 ou 150, e o número do protocolo deve estar presente. `vNF`, `vProd` do total e valores básicos por produto não podem estar ausentes ou inválidos.
- Arquivos XML originais são preservados sem edição; o hCaptcha permanece manual.

## Limites e próximos passos

Essas verificações **não fazem validação criptográfica de XMLDSig, consulta ativa da situação atual na SEFAZ ou homologação física**. XML com protocolo autorizado pode ter sido cancelado posteriormente. A validação adicional é de estrutura e consistência do protocolo declarado.

O fluxo legado do Portal pode mudar; regressões de página real (Chrome/Edge, certificado, download, alertas e impressão) continuam não executadas. Sem essas evidências, não se deve afirmar que a consulta real foi homologada. O trabalho de recuperação de operações e controle do uso de memória permanece pendente.
