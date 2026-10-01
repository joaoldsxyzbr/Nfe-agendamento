# Tela de consulta

## Cabeçalho

À esquerda: logo, nome e descrição em composição compacta. À direita: status da extensão, download e configurações agrupados como controles discretos.

Download, configurações e fechamento usam ícones SVG do mesmo padrão visual. A descrição vigente informa que a consulta é feita pelo Portal Nacional.

## Diagnóstico

As configurações abrem em um drawer modal lateral nativo do navegador, com fundo atenuado, foco movido para o painel e retorno ao acionador ao fechar.

O painel mostra:

- extensão;
- versão;
- **Portal Nacional**: disponível / indisponível;
- **Regras de fornecedor**: disponíveis / indisponíveis.

Não existe diagnóstico de consulta direta nem configuração de CNPJ do A1.

## Consulta

A tela aceita uma ou várias chaves.

Fluxo visível:

1. o usuário inicia a consulta;
2. o Portal Nacional abre em popup;
3. hCaptcha é resolvido manualmente;
4. o XML retorna automaticamente ao site;
5. ações DANFE/XML ficam disponíveis.

Depois da consulta, o resumo prioriza emitente, série, data de emissão, valor e quantidade de itens. A chave de acesso permanece disponível em segundo nível visual.

Em lote, os itens são processados sequencialmente e a origem concluída é `Portal`. Para múltiplas NF-e, a lista usa colunas visuais para número, NF-e/fornecedor, status e ações; em consulta unitária esse cabeçalho fica oculto para manter a tela compacta.

## Segurança

Nenhuma UI pede PFX/P12, senha ou chave privada. O navegador trata o certificado quando o Portal exigir. Regras privadas de fornecedor permanecem somente no storage local da extensão.


## Direção visual

- tema escuro existente preservado;
- raios de canto e foco visual padronizados por tokens;
- menos divisores e bordas entre blocos;
- consulta permanece como ação protagonista;
- controles mantêm foco visível e alvos de interação confortáveis;
- animação do drawer é desativada quando `prefers-reduced-motion` estiver ativo.
