# Resultados de aceitação física

Este diretório registra o gate físico da arquitetura Portal-only por release.

Cada release normal deve ter `vX.Y.Z.md` versionado antes da publicação, inicialmente como `PENDENTE` quando o teste físico ainda não ocorreu. Depois da publicação, o resultado observado em Chrome e Edge reais atualiza o mesmo arquivo para `APROVADO` ou `REPROVADO`. O CI não pode inferir aprovação física.

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

## Regra de publicação e aprovação

Na publicação, o workflow aceita somente estado rastreável `PENDENTE` ou `APROVADO`; um registro conhecido como `REPROVADO` não deve gerar nova release. Após o teste físico, `Status: APROVADO` só pode ser usado quando Chrome, Edge e todos os itens obrigatórios estiverem aprovados. Se qualquer item obrigatório falhar, usar `Status: REPROVADO`.

O campo `Certificate` pode ser `NÃO APLICÁVEL` somente quando o Portal não solicitar certificado durante o gate. Isso não significa que seleção de certificado foi validada.

## Dados proibidos

Nunca registrar chave NF-e completa, XML fiscal, CNPJ/CPF, certificado PFX/P12, senha, thumbprint, chave privada, certificado PEM ou captura de tela contendo esses dados.
