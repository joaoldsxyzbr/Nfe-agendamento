# Botões compactos inspirados no FSist — 09/10/2026

## Escopo
Padronizar a composição dos botões sem alterar as cores da aplicação e sem modificar a consulta por extensão/Portal.

## Visual e comportamento
- Primeira linha: **Nova consulta** e **Consultar nota** permanentemente lado a lado; limpar a entrada é possível desde o rascunho, exceto enquanto a consulta estiver ocupada.
- XML disponível: três blocos **Visualizar DANFE**, **Imprimir** e **Baixar XML**, com ícone decorativo SVG acima do nome.
- Itens de erro: **Tentar novamente** e **Importar XML** seguem a mesma geometria.
- Lote mantém ações por nota, cancelar, ZIP e impressão conjunta.
- SVGs são locais, estáticos, aria-hidden, sem ícones obtidos na rede.
- Paleta anterior preservada: verde da ação Consultar nota, superfície escura de Nova consulta e ações secundárias, foco azul.
- CSS responsivo conserva duas ações de consulta na mesma linha e três ações de resultado com quebra de rótulo se necessário.

## Segurança e arquitetura
Não há alteração no protocolo da extensão, no Portal Nacional, hCaptcha, certificado, XML ou processamento em lote.

## Evidências esperadas
Vitest do tema/ícones/controller, testes Playwright da consulta e recuperação por XML, além do CI completo web/extension/danfe-print.