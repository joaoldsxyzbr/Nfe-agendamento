# Decisão — congelamento da mini-IA na P5

**Data:** 09/11/2026 · **Responsável:** João · **Estado:** decidido e registrado como decisão de governança do projeto.

## Decisão

A mini-IA local permanece integrada na `main` exatamente como está (P0–P5, modo de observação) e **não receberá novas fases**. Concretamente:

- **Sem P6.** Nenhum desenvolvimento adicional do motor neural: novos treinos, novas capacidades de detecção ou novas etapas de autonomia ficam fora de escopo.
- **Sem aumento de autonomia.** Mantém-se a proibição vigente desde a P0 de clique neural, ação autônoma e treinamento automático a partir de uso real.
- **Sem remoção.** O código existente, os testes e os gates de segurança da CI (corpus adversarial da P4, treino reproduzível da P1) continuam válidos e obrigatórios. Remover a mini-IA é decisão separada, futura, se houver evidência de que seu custo supera seu valor.
- **Reabertura condicionada a evidência.** A única porta de reabertura são relatórios sanitizados exportados voluntariamente que demonstrem benefício mensurável sobre o seletor determinístico (candidatos úteis com baixa taxa de falso alarme), conforme o critério de "Próxima decisão" da [avaliação de utilidade](mini-ai-utility-evaluation-2026-11-04.md).

## Motivo

1. A avaliação de utilidade de 04/11/2026 mede apenas **detecção potencial em exemplos sintéticos**; não comprova recuperação real nem taxa de acerto generalizada nas páginas do Portal.
2. A homologação física foi dispensada em 28/10/2026: sem uso real validado, não existe base factual para expandir a aposta neural.
3. O seletor determinístico continua responsável por todas as ações; a mini-IA só é acionada quando ele falha. O custo de manutenção (treino reproduzível, corpus adversarial, CI dedicada) não tem retorno demonstrado em operação real.
4. A prioridade de melhoria do projeto está em outro lugar: a revalidação física da [v0.3.3](../releases/v0.3.3.md), cujo bug de origem (ciclo de vida de listeners MV3) só se manifestou em uso real.

## Impacto

- **Nenhuma alteração de código**, permissões, manifesto ou comportamento da extensão. Esta decisão é de documentação e governança.
- Os planos P0–P5 permanecem como registro histórico válido; esta decisão não os invalida, apenas encerra a linha de evolução.
- Qualquer proposta futura que aumente a autonomia da mini-IA deve citar esta decisão e apresentar a evidência exigida para reabertura.
