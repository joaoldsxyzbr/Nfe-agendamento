import { PAGE_CHANNEL, SITE_ORIGIN, parseSiteCommand } from './protocol';
const bridgeWindow = window;
if (!bridgeWindow.__nfeAgendamentoPortalBridgeLoaded) {
    bridgeWindow.__nfeAgendamentoPortalBridgeLoaded = true;
    window.addEventListener('message', (event) => {
        if (event.source !== window || event.origin !== SITE_ORIGIN)
            return;
        const envelope = event.data;
        if (!envelope || envelope.channel !== PAGE_CHANNEL || envelope.direction !== 'request')
            return;
        void forwardRequest(envelope);
    });
    window.postMessage({
        channel: PAGE_CHANNEL,
        direction: 'event',
        event: {
            type: 'bridge_ready',
            version: String(chrome.runtime.getManifest().version ?? '0.0.0'),
        },
    }, SITE_ORIGIN);
    chrome.runtime.onMessage.addListener((message) => {
        if (!message || typeof message !== 'object')
            return;
        const payload = message;
        if (payload.source !== 'background' || !payload.event)
            return;
        window.postMessage({
            channel: PAGE_CHANNEL,
            direction: 'event',
            event: payload.event,
        }, SITE_ORIGIN);
    });
}
async function forwardRequest(envelope) {
    const requestId = typeof envelope.requestId === 'string' ? envelope.requestId : '';
    try {
        const command = parseSiteCommand(envelope.command);
        const response = await chrome.runtime.sendMessage({ source: 'site', command });
        window.postMessage({ channel: PAGE_CHANNEL, direction: 'response', requestId, response }, SITE_ORIGIN);
    }
    catch (error) {
        window.postMessage({
            channel: PAGE_CHANNEL,
            direction: 'response',
            requestId,
            response: {
                type: 'failed',
                requestId,
                code: 'invalid_message',
                message: error instanceof Error ? error.message : 'Mensagem inválida.',
            },
        }, SITE_ORIGIN);
    }
}
