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

Existe um único campo de chaves.

- uma chave usa o mesmo controller e a mesma máquina de estados do lote;
- várias chaves são processadas sequencialmente;
- não existe seletor visual “uma NF-e / lote”;
- uma única janela do Portal pode ficar ativa;
- hCaptcha continua manual;
- cancelamento interrompe a sequência;
- resultados concluídos liberam DANFE e XML;
- múltiplos resultados concluídos liberam ZIP e impressão conjunta.

Quando existe somente uma chave, a tela usa apresentação compacta. Com múltiplas chaves, a lista exibe colunas para número, NF-e/fornecedor, status e ações.

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
- consulta como ação protagonista;
- menos camadas de compatibilidade no DOM;
- `prefers-reduced-motion` respeitado no drawer;
- interface responsiva sem duplicar controller ou estado.
