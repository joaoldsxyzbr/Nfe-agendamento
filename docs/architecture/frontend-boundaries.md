# Fronteiras do frontend

**Estado atual: site + extensão Chromium, Portal-only, sem Bridge e sem consulta direta à SEFAZ.**

## Fluxo

```text
Site
 ↓
Extensão
 ↓
Portal Nacional
 ↓
hCaptcha manual
 ↓
XML oficial
 ↓
Site / DANFE
```

## Site

Responsável por:

- validar chave;
- orquestrar um fluxo unificado para uma ou várias chaves;
- iniciar/cancelar operações do Portal pela extensão;
- parsear e validar novamente o XML recebido;
- gerar DANFE, impressão/PDF, XML e ZIP;
- resolver apresentação a partir do `supplierId`.

O site não acessa localhost, certificado ou endpoint fiscal da SEFAZ diretamente.

### Fluidez

- o handshake com a extensão é coalescido quando chamadas simultâneas acontecem e o estado conectado possui cache curto de 2 segundos;
- eventos `bridge_ready` invalidam o cache para forçar reconciliação;
- a entrada unificada usa debounce curto de 120 ms;
- uma chave e múltiplas chaves usam o mesmo controller;
- linhas da lista são preservadas no DOM quando as chaves não mudam; durante a execução somente o item alterado e os controles necessários são atualizados;
- o lote continua estritamente sequencial e nenhuma dessas otimizações altera Portal, hCaptcha, XML ou DANFE.

## Extensão

Responsável por:

- handshake com o site;
- abrir e acompanhar o popup oficial do Portal;
- preencher a chave;
- manter o hCaptcha humano;
- acompanhar a continuação/download oficial;
- capturar e validar o XML antes do handoff;
- guardar regras privadas de fornecedor localmente.

A extensão não implementa `NFeDistribuicaoDFe`, não mantém CNPJ fiscal para consulta direta e não possui rota `direct_lookup`.

## Navegador/Windows

Responsável pelo certificado digital quando o Portal exigir autenticação. O projeto não recebe PFX/P12, senha ou chave privada.

## Cloudflare

Responsável por servir o site. Não é intermediário da consulta fiscal atual.

## Invariantes

- não existe `BridgeClient` nem `127.0.0.1:17345`;
- não existe consulta direta à SEFAZ;
- toda chave é processada pelo Portal Nacional;
- lote é sequencial;
- no máximo uma operação Portal fica ativa;
- hCaptcha é manual;
- XML deve corresponder à chave consultada;
- falhas não disparam outra rota escondida.

## Limites e recuperação de estados (v0.0.42)

- A requisição XML no contexto da página oficial usa a captura textual `response.text()` no `MAIN` world (extensão 0.2.16, compatível com a 0.2.13 confirmada funcional), sem stream e sem AbortController no caminho padrão. O limite de 10 MiB é validado após a leitura, antes do handoff; os timeouts de espera de resultado e de download seguem ativos (90 s e 30 s); a validação final de chave e estrutura permanece obrigatória antes do handoff. O stream e o deadline de 45 s da v0.0.38 foram introduzidos na 0.2.14, coincidiram com a regressão de captura e não foram reintroduzidos.
- Eventos DOM recebidos durante uma verificação assíncrona são reconciliados após essa verificação, sem polling periódico.
- Se o usuário cancelar enquanto a janela ainda está sendo criada, o controller solicita o encerramento assim que o ID da operação estiver disponível; o lote não prossegue.
- Falha ou timeout explícito não devem ativar uma rota fiscal alternativa. O usuário pode reconsultar ou importar XML validado localmente.
