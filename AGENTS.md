# AGENTS.md

## Fonte de verdade

- O GitHub é a única fonte de verdade e área de trabalho do projeto.
- Trabalhe exclusivamente no repositório `joaoldsxyzbr/Nfe-agendamento-2.0`.
- Antes de alterar código, arquitetura, configuração ou documentação, consulte o estado atual da `main`, o `README.md` e os documentos relacionados em `docs/`.
- Se houver divergência entre conversa anterior e repositório, valide o estado atual no GitHub e trate o repositório como referência.

## Assistente e skills

- Use o **@Assistente Geral** como hub principal para todas as tarefas.
- Conhecimento operacional e skills reutilizáveis devem ser centralizados no Assistente Geral.
- Quando surgir uma skill externa ou de outro plugin claramente melhor, avalie segurança, compatibilidade, licença, manutenção e sobreposição antes de incorporar.
- Prefira melhorar uma skill existente do Assistente Geral a criar outra equivalente.
- Não copie skills inteiras por conveniência: incorpore apenas os ganhos úteis, seguros e compatíveis.
- Mantenha separado somente o que exigir isolamento real por credenciais, fonte de dados exclusiva, segurança, runtime ou integração. Mesmo nesses casos, centralize no Assistente Geral o roteamento e as regras comuns.

## Arquitetura e implementação

- Preserve a arquitetura vigente documentada no `README.md` e em `docs/architecture/`.
- Não introduza rotas alternativas escondidas, fallbacks não documentados ou comportamento que contradiga a arquitetura atual.
- **Não implemente polling.** Prefira eventos, sinais nativos da plataforma, listeners, callbacks, mensagens ou outros fluxos orientados a eventos.
- Faça mudanças pequenas, coerentes e completas. Evite código morto, duplicação desnecessária e soluções temporárias sem registro.

## Validação

- Não declare uma tarefa concluída sem evidência.
- Execute os testes, lint, build e demais verificações aplicáveis à área alterada.
- Para mudanças de comportamento, adicione ou atualize testes significativos quando tecnicamente aplicável.
- Após alterações relevantes, valide que documentação, código e testes continuam descrevendo o mesmo sistema.

## Documentação e histórico

- Toda mudança relevante deve deixar contexto suficiente no GitHub para outro agente ou desenvolvedor continuar o trabalho sem depender da conversa.
- Atualize `README.md`, `docs/`, issues, PRs ou notas de release quando a mudança afetar arquitetura, operação, segurança, fluxo do usuário, testes ou processo de entrega.
- Decisões arquiteturais e exceções importantes devem ser registradas com motivo e impacto.
