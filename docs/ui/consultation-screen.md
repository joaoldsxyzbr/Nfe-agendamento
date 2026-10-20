# Tela de consulta

## Cabeçalho

À esquerda: logo, nome e descrição compacta. À direita: status da extensão, atalho para Releases e configurações.

Como o repositório é público, o atalho da extensão abre a release mais recente no GitHub, sem exigir sessão autenticada.

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

O visual é compacto: título curto, campo de entrada, contador de caracteres ou quantidade de chaves, botão de consulta destacado e resultados abaixo. Mantém o tema vigente (escuro, claro ou do sistema) e o mesmo cabeçalho antes, durante e depois da consulta. O refinamento de outubro mantém a **mesma composição** em consulta individual ou lote, alterando apenas as linhas de resultados (não há tela nem modo separado).

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
- os botões **Nova consulta** e **Consultar nota** permanecem lado a lado desde o início, com tamanho uniforme e ícones;
- uma NF-e concluída mostra **Visualizar**, **Imprimir** e **XML** em três botões baixos, com ícone ao lado do texto; os nomes acessíveis completos continuam **Visualizar DANFE** e **Baixar XML**;
- o lote exibe as mesmas ações compactas por linha, e as ações coletivas continuam disponíveis conforme os itens concluídos;
- a nota individual não abre mais uma faixa extra de botões abaixo da linha; o cabeçalho da lista é omitido quando só há uma NF-e;
- botões de recuperação de erro seguem o mesmo padrão de ícones;
- o padrão de botões toma apenas **layout/ícones/tipografia** como inspiração do FSist: mantém as cores próprias do sistema (verde já existente na ação principal, azul nos focos e superfícies escuras nas ações secundárias).

A tela mantém a mesma estrutura visual com uma ou várias chaves. Não existe troca automática entre apresentação compacta e apresentação em lote; quantidade de chaves altera somente os dados e o progresso exibidos.

## Tema

O tema padrão é escuro. `Ctrl+Shift+T` percorre escuro → claro → sistema; a escolha persiste em `localStorage` e o tema do sistema segue `prefers-color-scheme`. Um aviso rápido confirma a troca. A definição inicial ocorre antes da renderização, sem flash de tema incorreto.

## Atalhos de teclado

- `Ctrl+Enter`: consultar;
- `Ctrl+N`: nova consulta;
- `Ctrl+P`: imprimir DANFE(s);
- `Ctrl+D`: baixar ZIP;
- `Ctrl+Shift+T`: alternar tema;
- `Escape`: cancelar consulta ou fechar o visualizador de DANFE.

Dentro do campo de entrada, os atalhos se limitam a consultar e nova consulta, para não interceptar digitação.

## Relatório CSV

Com itens na lista, o botão **Relatório CSV** exporta chave, número, série, modelo, emitente, destinatário, data de emissão, valor total, status, origem e mensagem em CSV com BOM UTF-8 e formatação BRL. O relatório reflete o estado atual de cada item, sem reconsultar o Portal. Valores de texto são escapados conforme RFC 4180.

## Depuração

O parâmetro `?nfe-debug` na URL ativa registro detalhado no console do site. Mensagens não incluem chave fiscal completa, XML, CNPJ/CPF ou certificado.

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

- tema escuro padrão, com tema claro e do sistema disponíveis;
- controles e foco padronizados;
- botões de cantos discretos e ícones locais em SVG; rótulos centrais nos comandos de consulta e rótulos curtos nas ações de cada NF-e;
- cabeçalho reduzido, campo de uma linha que cresce com lote, barra de progresso compacta, informações prioritárias acima da chave abreviada;
- tooltip nativo com informação completa em detalhes truncados, botões acessíveis por nome completo;
- botões mantêm altura mínima confortável e layout responsivo (ícone acima do rótulo apenas até 420 px), sem criar rolagem horizontal;
- consulta como ação protagonista, destacada em verde;
- geometria estável entre os estados da consulta, sem recentralização do card ou mudança de largura por scrollbar;
- menos camadas de compatibilidade no DOM;
- `prefers-reduced-motion` respeitado no drawer;
- interface responsiva sem duplicar controller ou estado.
