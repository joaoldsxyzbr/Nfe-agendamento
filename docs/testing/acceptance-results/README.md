# Resultados de aceitação física

Este diretório registra o gate físico da arquitetura Portal-only por release.

Cada release candidata deve copiar `template.md` para `vX.Y.Z.md` e preencher o resultado observado em Chrome e Edge reais.

## Campos obrigatórios

```text
Release: vX.Y.Z
Extension: X.Y.Z
Date: YYYY-MM-DD
Status: PENDENTE|APROVADO|REPROVADO
Windows: <versão sem identificador da máquina>
Chrome: APROVADO|REPROVADO|NÃO EXECUTADO
Edge: APROVADO|REPROVADO|NÃO EXECUTADO
Popup: APROVADO|REPROVADO|NÃO EXECUTADO
Access key fill: APROVADO|REPROVADO|NÃO EXECUTADO
hCaptcha manual: APROVADO|REPROVADO|NÃO EXECUTADO
Certificate: APROVADO|REPROVADO|NÃO APLICÁVEL|NÃO EXECUTADO
XML handoff: APROVADO|REPROVADO|NÃO EXECUTADO
DANFE/XML download: APROVADO|REPROVADO|NÃO EXECUTADO
Second consultation: APROVADO|REPROVADO|NÃO EXECUTADO
Batch sequential: APROVADO|REPROVADO|NÃO EXECUTADO
Cancellation recovery: APROVADO|REPROVADO|NÃO EXECUTADO
```

## Regra de aprovação

`Status: APROVADO` só pode ser usado quando Chrome, Edge e todos os itens obrigatórios estiverem aprovados. Se qualquer item obrigatório falhar, usar `Status: REPROVADO`.

O campo `Certificate` pode ser `NÃO APLICÁVEL` somente quando o Portal não solicitar certificado durante o gate. Isso não significa que seleção de certificado foi validada.

## Dados proibidos

Nunca registrar chave NF-e completa, XML fiscal, CNPJ/CPF, certificado PFX/P12, senha, thumbprint, chave privada, certificado PEM ou captura de tela contendo esses dados.
