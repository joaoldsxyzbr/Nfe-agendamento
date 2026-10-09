# Consulta compacta – 09/10/2026

## Objetivo
Aproximar a simplicidade visual do formulário de consulta da referência do Portal, preservando o lote e sem modos/telas separados.

## Mudanças
- Uma entrada compacta e expansível para uma ou até 100 chaves.
- Contador de caracteres para entrada unitária e de chaves para múltiplos candidatos.
- Botão de consulta destacado em verde; Nova consulta ocupa o mesmo lugar.
- Progresso e resultados ocultos antes da consulta.
- Visualizar DANFE, imprimir e baixar XML por nota com XML validado.
- Reconsulta e XML local preservados; ZIP/impressão conjunta disponíveis no lote.
- Site escuro e responsivo.

## Arquitetura
Sem alteração da extensão, Portal Nacional, hCaptcha manual, certificado ou processamento serial.

## Validação
Cobertura unitária, Playwright, gates CI web/extension/danfe-print. Aceitação física no Portal permanece para o usuário.
