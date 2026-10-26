# P4 — Avaliação independente, triagem privada e ciclo de melhoria (26/10/2026)

## Objetivo
Validar em casos sintéticos adversariais criados **fora do gerador de treinamento** a política de navegação e tornar os relatórios P3 úteis para o próximo ciclo de revisão técnica. **Nenhuma ação neural será habilitada, nem haverá treinamento a partir de dados reais ou mudanças automáticas de código.**

## Entregas
1. Criar `scripts/evaluate-mini-ai-adversarial.mjs` com casos separados do script de treino, mutações de rota/origem, elementos invisíveis, estado inválido, links externos, controles duplicados, ações enganosas e falhas fechadas. Publicar métricas de propostas corretas, abstenções e propostas inseguras; gate exige **zero propostas inseguras** e explicita recall sintético.
2. Criar `scripts/review-mini-ai-report.mjs` para processar **offline** um JSON exportado pela extensão (`schemaVersion:2`). Aceitar apenas formato, origem e limites previstos; **re-sanitizar** eventos, ignorar `insights` preexistentes do arquivo e gerar recomendações técnicas por catálogo fechado. Nunca ecoar campo livre, chave, XML, URL ou conteúdo original.
3. Usar Node nativo e `node --test` para cenários de privacidade, JSON malformado, arquivo excessivo, relatório com insights falsificados e ausência de envio externo.
4. Atualizar o CI P4 para executar validação adversarial e os testes da triagem junto dos gates P3.
5. Documentar métricas obtidas sem chamar casos sintéticos de homologação real; manter PR #108 em rascunho, sem publicar nem mesclar.

## Critérios de segurança
- Somente extensão Chromium MV3 e scripts de desenvolvimento, sem Worker/D1/backend, telemetria, dependência nova ou polling.
- A triagem opera apenas sobre arquivo fornecido **voluntariamente** ao assistente/desenvolvedor, processado localmente; nenhuma ação de envio no CI.
- Incidentes reais e fotos/snapshots do Portal exigem tratamento separado e consentimento; não alimentar a rede diretamente com XML fiscal ou dados pessoais.
- O motor neural continua em observação. `propose` não autoriza clique.
- Qualquer falso positivo na avaliação adversarial bloqueia o gate. Não reduzir limites só para passar.
- Ensaios reais Chrome/Edge, certificado, hCaptcha manual, XML/DANFE e lote continuam pendentes.

## Verificações
`node scripts/evaluate-mini-ai-adversarial.mjs`
`node --test scripts/tests/review-mini-ai-report.test.mjs`
`node scripts/train-mini-ai.mjs --check`
`npm run lint:ui && npm run format:check:ui && npm run test:ui && npm run test:extension && npm run coverage:extension && npm run build:extension`
`npm audit --audit-level=high`

## Evidência inicial da avaliação sintética
No GitHub Actions [execução #40399159845](https://github.com/joaoldsxyzbr/Nfe-agendamento-2.0/actions/runs/40399159845), a avaliação P4 obteve **9 propostas em 9 controles sintéticos seguros** e **0 propostas em 48 cenários sintéticos inseguros**, após corrigir a brecha de `formaction`. Na primeira execução, antes do reparo, houve 1 proposta insegura de 45 casos, e o CI reprovou, conforme esperado. O resultado também inclui 187 testes de UI e 122 da extensão aprovados. Esses números são de **fixtures programáticas, não de páginas reais**, e não estimam uma taxa real de acerto.

O relatório de revisão `scripts/review-mini-ai-report.mjs` aceita somente o arquivo exportado no esquema 2, revalida registros e recalcula padrões ignorando insights injetados. Saída é limitada a códigos, totais e recomendações pré-definidas. Nenhuma rede neural é treinada com esses relatórios.

## Condições de parada
- Se o avaliador revelar propostas inseguras ou perda de cobertura, preservar o bloqueio no runtime, criar regressões e corrigir a causa antes de prosseguir.
- O relatório é uma **triagem determinística**, não um modelo de linguagem nem uma instrução para autoeditar o repositório.
- Sem alterar `main`, piloto `nfe-agendamento` ou release nesta etapa.
