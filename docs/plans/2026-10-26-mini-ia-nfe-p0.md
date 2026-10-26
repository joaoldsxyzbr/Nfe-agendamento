# P0 — Mini-IA operacional e diagnóstico local (26/10/2026)

## Objetivo
Iniciar uma IA especializada do próprio NFe Agendamento 2.0, dentro da extensão MV3, sem API externa nem envio de dados fiscais. O motor neural assume progressivamente interpretação da interface e diagnósticos, enquanto o código validado continua responsável por regras fiscais, autenticação, hCaptcha manual, estado da operação e segurança.

## Escopo deste primeiro incremento
1. Criar um classificador neural local e pequeno para reconhecer **possíveis** controles de download por atributos observáveis, sem novos pacotes.
2. Executá-lo em modo de observação (shadow mode): nunca clicar, iniciar consulta, alterar XML ou contornar o fluxo oficial por decisão neural ainda não validada.
3. Quando o seletor convencional não reconhecer um possível controle, registrar somente um código diagnóstico, versão do modelo e confiança agregada; não armazenar HTML, texto do Portal, URL com parâmetros, chave NF-e, XML, CNPJ/CPF ou certificado.
4. Limitar os eventos locais a 100 e excluir eventos mais antigos que 14 dias na leitura/escrita; oferecer exportação JSON sob ação explícita e exclusão no painel de opções.
5. Cobrir inferência, bloqueio de falsos positivos e limites de privacidade com testes automatizados. Validar o build MV3 pelo CI.

## Próximas etapas, dependentes de evidência
- P1: construir e versionar treinamento com cenários sintéticos, métricas de precisão, recall, falso positivo e abstinência, comparando com seletores atuais.
- P2: liberar decisões neurais de navegação **somente** quando um executor determinístico verificar origem, estado, controle permitido, confiança e inexistência de ambiguidade. Manter ação manual ou falha explícita quando inseguro.
- P3: ampliar interpretação e diagnóstico para recuperação, lote e interface, sem substituir verificações fiscais.
- P4: comparar regressões e problemas observados (relatórios exportados pelo usuário e sanitizados) com testes e propor mudanças em PR revisado. Nunca autoalterar a main ou publicar extensão.

## Aceite/segurança
- Nenhum tráfego novo externo ou telemetria; nenhum dado fiscal bruto em diagnósticos.
- Captcha e certificado continuam controlados pelo usuário/navegador.
- Modo observação não altera resultado das consultas.
- `npm run test:extension`, `npm run build:extension` e gates do CI são verificações propostas (não marcar como aprovados sem execução).
- Aceitação física Chrome/Edge do piloto continua pendente e é obrigatória antes de produção.
- Rollback: reverter o commit desta branch, sem migração de dados fiscais.

**Nota:** os pesos iniciais do classificador são heurísticos; a arquitetura é neural, mas ainda **não houve treinamento empírico do modelo nem homologação em páginas reais**. Não interpretar scores como probabilidades calibradas nem prometer adaptação automática nesta fase.
