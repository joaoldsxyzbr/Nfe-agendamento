# Avaliação da utilidade da mini IA — 04/11/2026

## Pergunta de engenharia

**O modelo de observação encontra candidatos que o seletor determinístico atual não reconhece?**

A resposta precisa distinguir **detecção potencial** de **recuperação real**. O aplicativo continua operando com regras conhecidas; o modelo não clica, não escolhe certificado, não resolve hCaptcha e não muda o resultado das consultas.

## Medição reproduzível

`node scripts/evaluate-mini-ai-utility.mjs` executa casos sintéticos rotulados manualmente, independentes do script de treinamento, sem acessar internet, documento fiscal, chave de acesso ou texto de página real. O relatório imprime apenas contagens:

- `positiveCases` e `negativeCases`: exemplos de comportamento seguro ou enganoso;
- `baselinePositive`: positivos reconhecidos pelo **seletor usado de fato no content script**;
- `neuralPositive`: positivos que o modelo **proporia para revisão** após política de segurança;
- `neuralOnlyPositive`: positivos propostos pelo modelo que o seletor não reconheceria;
- `baselineFalsePositive` e `neuralFalsePositive`: propostas enganosas nas amostras.

O CI bloqueia propostas enganosas **na amostra sintética** e exige pelo menos uma sugestão incremental. Os testes de segurança adversarial da P4 continuam independentes e obrigatórios.

## O que o resultado NÃO prova

Um ganho em exemplos sintéticos **não comprova utilidade em consultas reais**, nem taxa de acerto generalizada. A mini IA só é chamada na execução atual quando o seletor convencional não encontrou nenhum controle; sua proposta é registrada em diagnósticos locais e não vira ação. Não introduzir cliques neurais enquanto não houver casos reais anonimizados, revisão humana e evidência operacional; não usar chaves, XML, CNPJ/CPF, URLs ou texto fiscal na coleta.

## Próxima decisão

Avaliar relatórios sanitizados exportados voluntariamente, medir frequência de candidatos úteis e falsos alarmes com evidência do usuário, e comparar o custo/benefício contra simplesmente acrescentar regras determinísticas. Se não houver benefício mensurável, preferir manter a mini IA desativada para ações e simplificar a implementação em vez de aumentar sua autonomia.
