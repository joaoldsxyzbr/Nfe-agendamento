const PAGE_CHANNEL = 'nfe-agendamento:portal-extension';
const DEFAULT_HANDSHAKE_TIMEOUT_MS = 1_200;
const INFO_CACHE_TTL_MS = 2_000;
const HANDSHAKE_ATTEMPTS = 3;
const HANDSHAKE_RETRY_DELAY_MS = 200;
const START_ATTEMPTS = 2;
const OPERATION_STATUS_ATTEMPTS = 2;
const COMMAND_RETRY_DELAY_MS = 150;
export class WindowPortalExtensionTransport {
    windowRef;
    timeoutMs;
    origin;
    constructor(windowRef = window, timeoutMs = DEFAULT_HANDSHAKE_TIMEOUT_MS) {
        this.windowRef = windowRef;
        this.timeoutMs = timeoutMs;
        this.origin = windowRef.location.origin;
    }
    request(command, signal, timeoutMs = this.timeoutMs) {
        signal?.throwIfAborted();
        return new Promise((resolve, reject) => {
            const timeout = globalThis.setTimeout(() => finish(() => reject(new Error('Extensão do NFe Agendamento não respondeu.'))), timeoutMs);
            const onAbort = () => finish(() => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError')));
            const onMessage = (event) => {
                if (event.source !== this.windowRef || event.origin !== this.origin)
                    return;
                const envelope = event.data;
                if (!envelope ||
                    envelope.channel !== PAGE_CHANNEL ||
                    envelope.direction !== 'response' ||
                    envelope.requestId !== command.requestId) {
                    return;
                }
                finish(() => resolve(envelope.response));
            };
            const finish = (complete) => {
                globalThis.clearTimeout(timeout);
                signal?.removeEventListener('abort', onAbort);
                this.windowRef.removeEventListener('message', onMessage);
                complete();
            };
            signal?.addEventListener('abort', onAbort, { once: true });
            this.windowRef.addEventListener('message', onMessage);
            this.windowRef.postMessage({
                channel: PAGE_CHANNEL,
                direction: 'request',
                requestId: command.requestId,
                command,
            }, this.origin);
        });
    }
    subscribe(listener) {
        const onMessage = (event) => {
            if (event.source !== this.windowRef || event.origin !== this.origin)
                return;
            const envelope = event.data;
            if (!envelope || envelope.channel !== PAGE_CHANNEL || envelope.direction !== 'event')
                return;
            listener(envelope.event);
        };
        this.windowRef.addEventListener('message', onMessage);
        return () => this.windowRef.removeEventListener('message', onMessage);
    }
}
// Transporte de página interna MV3; não depende de host, content bridge ou window.postMessage.
export class ExtensionPageTransport {
    api;
    tabId;
    constructor(api = globalThis.chrome) {
        this.api = api;
        this.tabId = api.tabs.getCurrent().then((tab) => tab?.id ?? null);
    }
    async request(command, signal) {
        signal?.throwIfAborted();
        const appTabId = await this.tabId;
        if (!Number.isInteger(appTabId)) throw new Error('A página da extensão precisa estar aberta em uma aba.');
        const response = await this.api.runtime.sendMessage({ source: 'app', appTabId, command });
        signal?.throwIfAborted();
        return response;
    }
    subscribe(listener) {
        const receive = (message) => {
            if (message?.source !== 'background' || !message.event)
                return;
            void this.tabId.then((tabId) => {
                if (tabId !== null && message.siteTabId === tabId)
                    listener(message.event);
            });
        };
        this.api.runtime.onMessage.addListener(receive);
        return () => this.api.runtime.onMessage.removeListener(receive);
    }
}

export class BrowserPortalExtensionClient {
    transport;
    cachedInfo = null;
    pendingInfoRequest = null;
    constructor(transport = globalThis.location?.protocol === 'chrome-extension:' && globalThis.chrome?.runtime?.id
        ? new ExtensionPageTransport()
        : new WindowPortalExtensionTransport()) {
        this.transport = transport;
    }
    async getInfo(signal) {
        if (signal?.aborted)
            return null;
        const cached = this.cachedInfo;
        if (cached && cached.expiresAt > Date.now())
            return cached.info;
        if (!signal && this.pendingInfoRequest)
            return this.pendingInfoRequest;
        const request = this.fetchInfo(signal);
        if (!signal)
            this.pendingInfoRequest = request;
        try {
            const info = await request;
            this.cachedInfo = info
                ? Object.freeze({ info, expiresAt: Date.now() + INFO_CACHE_TTL_MS })
                : null;
            return info;
        }
        finally {
            if (this.pendingInfoRequest === request)
                this.pendingInfoRequest = null;
        }
    }
    async fetchInfo(signal) {
        for (let attempt = 0; attempt < HANDSHAKE_ATTEMPTS; attempt += 1) {
            if (signal?.aborted)
                return null;
            const requestId = globalThis.crypto.randomUUID();
            try {
                const response = await this.transport.request({ type: 'ping', requestId }, signal);
                const info = parseReadyResponse(response);
                if (info)
                    return info;
            }
            catch {
                if (signal?.aborted)
                    return null;
            }
            if (attempt < HANDSHAKE_ATTEMPTS - 1)
                await waitForHandshakeRetry(signal);
        }
        return null;
    }
    async refreshInfo(signal) {
        this.cachedInfo = null;
        return this.getInfo(signal);
    }
    async isAvailable(signal) {
        return (await this.getInfo(signal)) !== null;
    }
    onReadyHint(listener) {
        return this.transport.subscribe((value) => {
            if (!isRecord(value) || value.type !== 'bridge_ready' || typeof value.version !== 'string')
                return;
            this.cachedInfo = null;
            listener(value.version);
        });
    }
    async openOptions(signal) {
        const requestId = globalThis.crypto.randomUUID();
        const response = await this.transport.request({ type: 'open_options', requestId }, signal);
        if (!isRecord(response) || response.type !== 'options_opened') {
            throw new Error(messageFromFailure(response) ?? 'A extensão não abriu a tela de configuração.');
        }
    }
    async start(accessKey, signal) {
        const normalizedAccessKey = accessKey.trim().toUpperCase();
        let lastTransportError = null;
        for (let attempt = 0; attempt < START_ATTEMPTS; attempt += 1) {
            signal?.throwIfAborted();
            const requestId = globalThis.crypto.randomUUID();
            let response;
            try {
                response = await this.transport.request({ type: 'start', requestId, accessKey: normalizedAccessKey }, signal);
            }
            catch (error) {
                if (signal?.aborted)
                    throw error;
                lastTransportError = error;
                if (attempt < START_ATTEMPTS - 1) {
                    await waitForRetry(COMMAND_RETRY_DELAY_MS, signal);
                    continue;
                }
                break;
            }
            if (!isStartedResponse(response)) {
                throw new Error(messageFromFailure(response) ?? 'A extensão não iniciou o Portal.');
            }
            return response.operationId;
        }
        throw lastTransportError instanceof Error
            ? lastTransportError
            : new Error('A extensão não iniciou o Portal.');
    }
    waitForResult(operationId, signal) {
        signal?.throwIfAborted();
        return new Promise((resolve, reject) => {
            let unsubscribe = () => { };
            let settled = false;
            const onAbort = () => finish(() => reject(signal?.reason ?? new DOMException('Aborted', 'AbortError')));
            const finish = (complete) => {
                if (settled)
                    return;
                settled = true;
                signal?.removeEventListener('abort', onAbort);
                unsubscribe();
                complete();
            };
            unsubscribe = this.transport.subscribe((value) => {
                const event = parseTerminalEvent(value, operationId);
                if (!event)
                    return;
                finish(() => resolve(event));
            });
            signal?.addEventListener('abort', onAbort, { once: true });
            void this.isOperationActive(operationId, signal)
                .then((active) => {
                if (!active) {
                    finish(() => reject(new Error('A operação do Portal não está mais ativa. Feche qualquer popup antigo e tente novamente.')));
                }
            })
                .catch((error) => {
                finish(() => reject(error instanceof Error
                    ? error
                    : new Error('Não foi possível reconciliar a operação do Portal.')));
            });
        });
    }
    async isOperationActive(operationId, signal) {
        let lastTransportError = null;
        for (let attempt = 0; attempt < OPERATION_STATUS_ATTEMPTS; attempt += 1) {
            signal?.throwIfAborted();
            const requestId = globalThis.crypto.randomUUID();
            let response;
            try {
                response = await this.transport.request({ type: 'status', requestId, operationId }, signal);
            }
            catch (error) {
                if (signal?.aborted)
                    throw error;
                lastTransportError = error;
                if (attempt < OPERATION_STATUS_ATTEMPTS - 1) {
                    await waitForRetry(COMMAND_RETRY_DELAY_MS, signal);
                    continue;
                }
                break;
            }
            const active = parseOperationStatus(response, operationId);
            if (active !== null)
                return active;
            throw new Error(messageFromFailure(response) ?? 'Resposta de estado da extensão inválida.');
        }
        throw lastTransportError instanceof Error
            ? lastTransportError
            : new Error('Não foi possível reconciliar a operação do Portal.');
    }
    async cancel(operationId) {
        const requestId = globalThis.crypto.randomUUID();
        await this.transport.request({ type: 'cancel', requestId, operationId });
    }
    async resolveSupplier(taxId) {
        const requestId = globalThis.crypto.randomUUID();
        const response = await this.transport.request({ type: 'resolve_supplier', requestId, taxId });
        if (!isRecord(response) ||
            response.type !== 'supplier_resolved' ||
            (response.supplierId !== null && typeof response.supplierId !== 'string')) {
            throw new Error(messageFromFailure(response) ?? 'A extensão não resolveu o fornecedor.');
        }
        return { supplierId: response.supplierId };
    }
}
async function waitForHandshakeRetry(signal) {
    await waitForRetry(HANDSHAKE_RETRY_DELAY_MS, signal);
}
async function waitForRetry(delayMs, signal) {
    if (signal?.aborted)
        return;
    await new Promise((resolve) => {
        const timeout = globalThis.setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, delayMs);
        const onAbort = () => {
            globalThis.clearTimeout(timeout);
            signal?.removeEventListener('abort', onAbort);
            resolve();
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
function parseReadyResponse(value) {
    if (!isRecord(value) || value.type !== 'ready' || typeof value.version !== 'string')
        return null;
    if (!isRecord(value.capabilities))
        return null;
    return {
        version: value.version,
        capabilities: {
            openOptions: value.capabilities.openOptions === true || versionAtLeast(value.version, 0, 2, 8),
            portalLookup: value.capabilities.portalLookup === true,
            supplierResolution: value.capabilities.supplierResolution === true,
        },
    };
}
function versionAtLeast(version, major, minor, patch) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
    if (!match)
        return false;
    const current = [Number(match[1]), Number(match[2]), Number(match[3])];
    const expected = [major, minor, patch];
    for (let index = 0; index < expected.length; index += 1) {
        if (current[index] > expected[index])
            return true;
        if (current[index] < expected[index])
            return false;
    }
    return true;
}
function parseOperationStatus(value, operationId) {
    if (!isRecord(value) ||
        value.type !== 'operation_status' ||
        value.operationId !== operationId ||
        typeof value.active !== 'boolean') {
        return null;
    }
    return value.active;
}
function isStartedResponse(value) {
    return isRecord(value) &&
        value.type === 'started' &&
        typeof value.operationId === 'string' &&
        value.operationId.length > 0;
}
function parseTerminalEvent(value, operationId) {
    if (!isRecord(value) || value.operationId !== operationId)
        return null;
    if (value.type === 'completed' && typeof value.xml === 'string' && value.xml.length > 0) {
        return { operationId, state: 'completed', message: null, xml: value.xml };
    }
    if (value.type === 'failed') {
        return {
            operationId,
            state: 'failed',
            message: typeof value.message === 'string' ? value.message : 'A extensão não concluiu a consulta.',
            xml: null,
            code: typeof value.code === 'string' ? value.code : null,
        };
    }
    if (value.type === 'cancelled') {
        return {
            operationId,
            state: 'cancelled',
            message: typeof value.message === 'string' ? value.message : 'Consulta pelo Portal cancelada.',
            xml: null,
        };
    }
    return null;
}
function messageFromFailure(value) {
    return isRecord(value) && typeof value.message === 'string' ? value.message : null;
}
function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}