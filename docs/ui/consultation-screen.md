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
- múltiplos resultados concluídos liberam downloads individuais de todos os XMLs e impressão conjunta;
- estados sem XML não mostram ações desabilitadas de DANFE/XML;
- os botões **Nova consulta** e **Consultar nota** permanecem lado a lado desde o início, com tamanho uniforme e ícones;
- uma NF-e concluída apresenta quatro botões compactos **somente com ícones**: visualizar DANFE, imprimir DANFE, baixar XML e copiar chave completa de acesso; cada botão mantém `title`, `aria-label` e foco visível;
- o botão **Copiar chave da NF-e** também aparece para a chave válida em linhas com falha no Portal, permitindo reutilizar a chave sem reconsulta; a cópia oferece aviso discreto de sucesso ou falha, sem expor a chave no aviso;
- o lote exibe as mesmas ações compactas por linha, e as ações coletivas continuam disponíveis conforme os itens concluídos;
- a nota individual não abre mais uma faixa extra de botões abaixo da linha; o cabeçalho da lista é omitido quando só há uma NF-e;
- em erro do Portal, **Copiar chave** continua somente com ícone; **Tentar novamente** e **Importar XML** preservam texto visível para distinguir as ações de recuperação;
- o padrão de botões toma apenas **layout/ícones/tipografia** como inspiração do FSist: mantém as cores próprias do sistema (verde já existente na ação principal, azul nos focos e superfícies escuras nas ações secundárias).

A tela mantém a mesma estrutura visual com uma ou várias chaves. Não existe troca automática entre apresentação compacta e apresentação em lote; quantidade de chaves altera somente os dados e o progresso exibidos.

## Paleta visual — petróleo suave (28/10/2026)

A extensão utiliza superfícies foscas e baixo brilho, sem preto absoluto nem branco puro na interface. O tema escuro padrão parte do fundo `#151C1D`, cards `#1C2627`/`#222D2E`, verde-petróleo de referência `#398C87`, detalhes areia `#C4AE91`, texto principal `#DFE5E1` e texto secundário `#97A7A4`. Os botões com texto adotam verde-petróleo mais fechado (`#286D68`) para preservar legibilidade e contraste. Foco, ações por ícone, estados de consulta e painel de configurações compartilham os tokens do tema.

O tema claro permanece disponível, mas é suavizado: fundo `#E4E9E4` e superfícies esverdeadas, sem branco intenso. A página independente de opções da extensão segue o tema escuro suave. O papel do DANFE e sua impressão permanecem deliberadamente brancos, com texto preto, por se tratarem de documento fiscal. Esta mudança é estritamente visual: não altera consulta, XML, lote, certificado, hCaptcha ou Mini-IA.

## Tema

O tema padrão é escuro. `Ctrl+Shift+T` percorre escuro → claro → sistema; a escolha persiste em `localStorage` e o tema do sistema segue `prefers-color-scheme`. Um aviso rápido confirma a troca. A definição inicial ocorre antes da renderização, sem flash de tema incorreto.

## Atalhos de teclado

- `Ctrl+Enter`: consultar;
- `Ctrl+N`: nova consulta;
- `Ctrl+P`: imprimir DANFE(s);
- `Ctrl+D`: solicitar download de cada XML concluído separadamente (o navegador pode pedir permissão para vários arquivos);
- `Ctrl+Shift+T`: alternar tema;
- `Escape`: cancelar consulta ou fechar o visualizador de DANFE.

Dentro do campo de entrada, os atalhos se limitam a consultar e nova consulta, para não interceptar digitação.

## Download de XMLs

O botão coletivo **Baixar todos os XMLs** solicita um arquivo `.xml` individual por nota concluída e com XML validado, sem criar ZIP e sem reconsultar o Portal. Notas com erro/sem XML não geram arquivo. A interface informa **quantos downloads foram solicitados**, não presume que o navegador os salvou: o Chrome ou Edge pode solicitar autorização para downloads múltiplos. O botão antigo **Relatório CSV** não faz parte da interface atual.

## Depuração

O parâmetro `?nfe-debug` na URL da interface local da extensão ativa registro detalhado no console da extensão. Mensagens não incluem chave fiscal completa, XML, CNPJ/CPF ou certificado.

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
- botões de cantos discretos e ícones locais em SVG; comandos principais exibem texto, enquanto visualizar/imprimir/XML/copiar em cada NF-e concluída exibem apenas ícones com nomes acessíveis;
- cabeçalho reduzido, campo de uma linha que cresce com lote, barra de progresso compacta, informações prioritárias acima da chave abreviada;
- tooltip nativo com informação completa em detalhes truncados, botões acessíveis por nome completo;
- botões mantêm altura mínima confortável e layout responsivo; ações concluídas usam quatro ícones alinhados, inclusive em até 420 px, sem criar rolagem horizontal;
- consulta como ação protagonista, destacada em verde;
- geometria estável entre os estados da consulta, sem recentralização do card ou mudança de largura por scrollbar;
- menos camadas de compatibilidade no DOM;
- `prefers-reduced-motion` respeitado no drawer;
- interface responsiva sem duplicar controller ou estado.
