# Tela de consulta

## Cabeçalho

À esquerda: logo, nome e descrição compacta. À direita: status da extensão, atalho para Releases e configurações.

Como o repositório é privado, o atalho da extensão abre a release mais recente no GitHub em vez de depender de um download público anônimo.

## Diagnóstico

As configurações abrem em um drawer modal lateral nativo do navegador.

O painel mostra:

- integração;
- extensão;
- versão;
- Portal Nacional;
- regras locais de fornecedor.

Não existe diagnóstico de consulta direta, Bridge ou configuração de CNPJ do A1.

## Consulta unificada

O visual é compacto: título curto, campo de entrada, contador de caracteres ou quantidade de chaves, botão de consulta destacado e resultados abaixo. Mantém tema escuro e o mesmo cabeçalho antes, durante e depois da consulta.

Existe um único campo de chaves.

- a entrada é uma área de texto de uma linha que cresce com o conteúdo (até a altura máxima), sem alternar de tela;
- uma chave usa o mesmo controller e a mesma máquina de estados do lote;
- várias chaves são processadas sequencialmente;
- não existe seletor visual “uma NF-e / lote”;
- uma única janela do Portal pode ficar ativa;
- hCaptcha continua manual;
- cancelamento interrompe a sequência;
- a lista de resultados e o progresso só aparecem após iniciar a consulta;
- resultados concluídos liberam visualizar DANFE, imprimir DANFE e baixar XML por nota;
- múltiplos resultados concluídos liberam ZIP e impressão conjunta;
- estados sem XML não mostram ações desabilitadas de DANFE/XML;
- o botão **Nova consulta** ocupa a mesma posição do botão principal ao concluir.

A tela mantém a mesma estrutura visual com uma ou várias chaves. Não existe troca automática entre apresentação compacta e apresentação em lote; quantidade de chaves altera somente os dados e o progresso exibidos.

## Recuperação por XML

Se um item terminar em erro do Portal, ficam disponíveis duas ações explícitas:

- **Tentar novamente** pelo Portal;
- **Importar XML** localmente.

O XML manual passa pelo mesmo limite, bloqueio de DTD e validação de correspondência da chave. O arquivo não é enviado para Cloudflare.

## DANFE

O viewer possui uma única implementação de zoom, ligada por `attachDanfeZoom`. `Ctrl + scroll` mantém o ponto sob o cursor e a impressão sempre volta temporariamente para zoom 100%.

## Segurança

Nenhuma UI pede PFX/P12, senha ou chave privada. Chrome/Edge e Windows tratam o certificado quando o Portal exigir. Regras privadas de fornecedor permanecem somente em `chrome.storage.local`.

## Direção visual

- tema escuro;
- controles e foco padronizados;
- consulta como ação protagonista, destacada em verde;
- geometria estável entre os estados da consulta, sem recentralização do card ou mudança de largura por scrollbar;
- menos camadas de compatibilidade no DOM;
- `prefers-reduced-motion` respeitado no drawer;
- interface responsiva sem duplicar controller ou estado.
