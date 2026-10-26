# P1 — Treinamento reprodutível da mini-IA (26/10/2026)

## Contexto
Continuação da P0, restrita à branch `feat/nfe-mini-ia-observability-p0`, PR #108 contra `nfe-agendamento`. A versão principal e a operação de consultas continuam inalteradas. A mini-IA **somente observa**, sem clicar em controles desconhecidos.

## O que foi criado
- `apps/extension/src/intelligence/portal-features.js`: extrai 10 atributos booleanos de controles da página, descartando o texto/HTML/URL original.
- `scripts/train-mini-ai.mjs`: treinamento neural supervisionado reproduzível em JavaScript nativo, com semente fixa, 8 unidades ocultas, 420 épocas e separação de frases por conjunto.
- `apps/extension/src/intelligence/trained-model.js`: pesos versionados, reproduzíveis por `node scripts/train-mini-ai.mjs --write`. O CI executa `--check` para impedir divergência entre código e pesos.
- `apps/extension/src/intelligence/portal-model.js`: usa os pesos treinados na inferência local, mas bloqueia por regra explícita controles desativados, impressão, ajuda, cancelamento e URLs não autorizadas.

## Avaliação sintética (CI inicial de 26/10/2026)
| Conjunto | Total | Verdadeiros positivos | Falsos positivos | Falsos negativos | Precisão | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Treino | 148 | 48 | 0 | 0 | 100% | 100% |
| Validação (frases distintas) | 91 | 30 | 0 | 0 | 100% | 100% |
| Teste (frases distintas) | 97 | 30 | 0 | 0 | 100% | 100% |
| Seletor antigo no mesmo teste | 97 | 5 | 0 | 25 | 100% | 16,67% |

Os exemplos são **sintéticos** e foram construídos segundo as hipóteses do projeto, com variações de botões, links, inputs, títulos e acessibilidade, desativação, ajuda, impressão e links externos. O conjunto de teste não reutiliza as frases de treino, mas as mesmas classes de atributos e padrões semânticos são utilizadas. **Isso não estima a taxa real de acertos no Portal Nacional, nem comprova generalização a mudanças inéditas.** Os bloqueios determinísticos também contribuem para os resultados (não atribuir toda a precisão apenas à rede).

## Critérios e limites
- Medidas no CI: precisão, recall, taxa de falso positivo e comparação com reconhecimento atual. Falha se recall de validação/teste <90%, houver falso positivo, ou o modelo não superar o reconhecimento antigo no cenário sintético.
- Confiança numérica de 0 a 100 **não é probabilidade calibrada**. O classificador opera em modo sombra, sem selecionar elemento para clique.
- Nenhum XML, chave NF-e, CNPJ, CPF, certificado, HTML real ou telemetria no treinamento ou diagnóstico.
- Próximas etapas: expandir corpus com estruturas independentes e testes em Chrome/Edge; somente depois considerar executor restrito com aprovação, mantendo estado determinístico, hCaptcha manual e validação XML.
- Rollback seguro: reverter os commits da P1, preservando o classificador heurístico anterior da P0.

## Comandos
```bash
node scripts/train-mini-ai.mjs --check
node scripts/train-mini-ai.mjs --write # regenera os pesos explicitamente
npm run test:extension
npm run coverage:extension
npm run build:extension
```

Não publicar release ou mesclar `main` antes de CI completo, revisão e aceite físico do piloto 100% extensão.
