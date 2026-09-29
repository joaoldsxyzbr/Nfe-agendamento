import { vi } from 'vitest';

type Listener = (...args: any[]) => any;

function createEvent() {
  const listeners: Listener[] = [];
  return {
    listeners,
    addListener: vi.fn((listener: Listener) => {
      listeners.push(listener);
    }),
  };
}

export type FakeChromeOptions = {
  sessionState?: Record<string, unknown>;
  windows?: Array<Record<string, any>>;
  tabs?: Array<Record<string, any>>;
};

export type FakeChromeController = {
  chrome: unknown;
  sentSiteEvents: unknown[];
  createdWindows: Array<Record<string, unknown>>;
  removedWindows: number[];
  sessionState: Map<string, unknown>;
  emitRuntimeMessage(message: unknown, sender: unknown): Promise<unknown>;
  emitWindowRemoved(windowId: number): Promise<void>;
  emitTabRemoved(tabId: number): Promise<void>;
  emitBeforeRequest(details: unknown): Promise<void>;
  flush(): Promise<void>;
};

export function createFakeChrome(options: FakeChromeOptions = {}): FakeChromeController {
  const runtimeMessage = createEvent();
  const runtimeInstalled = createEvent();
  const runtimeStartup = createEvent();
  const actionClicked = createEvent();
  const storageChanged = createEvent();
  const windowRemoved = createEvent();
  const tabRemoved = createEvent();
  const beforeRequest = createEvent();

  const sessionState = new Map<string, unknown>(Object.entries(options.sessionState ?? {}));
  const localState = new Map<string, unknown>();
  const windows = new Map<number, Record<string, any>>();
  const tabs = new Map<number, Record<string, any>>();
  const sentSiteEvents: unknown[] = [];
  const createdWindows: Array<Record<string, unknown>> = [];
  const removedWindows: number[] = [];
  let nextWindowId = 100;
  let nextTabId = 1_000;

  for (const window of options.windows ?? []) {
    if (!Number.isInteger(window.id)) continue;
    windows.set(window.id, { ...window });
    nextWindowId = Math.max(nextWindowId, window.id + 1);
  }
  for (const tab of options.tabs ?? []) {
    if (!Number.isInteger(tab.id)) continue;
    tabs.set(tab.id, { ...tab });
    nextTabId = Math.max(nextTabId, tab.id + 1);
  }

  const session = {
    get: vi.fn(async (key: string) => (
      sessionState.has(key) ? { [key]: sessionState.get(key) } : {}
    )),
    set: vi.fn(async (values: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(values)) sessionState.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      sessionState.delete(key);
    }),
  };

  const local = {
    setAccessLevel: vi.fn(async () => undefined),
    get: vi.fn(async (key: string) => (
      localState.has(key) ? { [key]: localState.get(key) } : {}
    )),
    set: vi.fn(async (values: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(values)) localState.set(key, value);
    }),
    remove: vi.fn(async (key: string) => {
      localState.delete(key);
    }),
  };

  const chrome = {
    runtime: {
      onMessage: runtimeMessage,
      onInstalled: runtimeInstalled,
      onStartup: runtimeStartup,
      getManifest: vi.fn(() => ({ version: '0.2.12' })),
      openOptionsPage: vi.fn(async () => undefined),
    },
    action: {
      onClicked: actionClicked,
    },
    storage: {
      local,
      session,
      onChanged: storageChanged,
    },
    windows: {
      onRemoved: windowRemoved,
      create: vi.fn(async (options: Record<string, unknown>) => {
        const id = nextWindowId++;
        const tabId = nextTabId++;
        const record = { id, ...options };
        windows.set(id, record);
        tabs.set(tabId, {
          id: tabId,
          windowId: id,
          url: typeof options.url === 'string' ? options.url : 'about:blank',
        });
        createdWindows.push(record);
        return record;
      }),
      get: vi.fn(async (windowId: number) => {
        const window = windows.get(windowId);
        if (!window) throw new Error('Window not found.');
        return window;
      }),
      remove: vi.fn(async (windowId: number) => {
        if (!windows.has(windowId)) throw new Error('Window not found.');
        windows.delete(windowId);
        for (const [tabId, tab] of tabs) {
          if (tab.windowId === windowId) tabs.delete(tabId);
        }
        removedWindows.push(windowId);
      }),
    },
    tabs: {
      onRemoved: tabRemoved,
      query: vi.fn(async (query: Record<string, unknown>) => {
        if (Number.isInteger(query.windowId)) {
          return [...tabs.values()].filter((tab) => tab.windowId === query.windowId);
        }
        if (typeof query.url === 'string') {
          const prefix = query.url.endsWith('/*') ? query.url.slice(0, -1) : query.url;
          return [...tabs.values()].filter((tab) => typeof tab.url === 'string' && tab.url.startsWith(prefix));
        }
        return [...tabs.values()];
      }),
      get: vi.fn(async (tabId: number) => {
        const tab = tabs.get(tabId);
        if (!tab) throw new Error('Tab not found.');
        return tab;
      }),
      update: vi.fn(async (tabId: number, changes: Record<string, unknown>) => {
        const tab = tabs.get(tabId);
        if (!tab) throw new Error('Tab not found.');
        Object.assign(tab, changes);
        return tab;
      }),
      sendMessage: vi.fn(async (tabId: number, message: unknown) => {
        sentSiteEvents.push({ tabId, message });
        return undefined;
      }),
    },
    webRequest: {
      onBeforeRequest: beforeRequest,
    },
    scripting: {
      executeScript: vi.fn(async () => []),
    },
  };

  async function flush(): Promise<void> {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  }

  async function emitRuntimeMessage(message: unknown, sender: any): Promise<unknown> {
    if (Number.isInteger(sender?.tab?.id)) {
      tabs.set(sender.tab.id, {
        id: sender.tab.id,
        windowId: sender.tab.windowId,
        url: sender.tab.url ?? sender.url ?? '',
      });
    }

    const listener = runtimeMessage.listeners[0];
    if (!listener) throw new Error('Runtime message listener not registered.');

    return await new Promise<unknown>((resolve, reject) => {
      let settled = false;
      const sendResponse = (response: unknown) => {
        settled = true;
        resolve(response);
      };

      try {
        const result = listener(message, sender, sendResponse);
        if (result !== true && !settled) resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  async function emitWindowRemoved(windowId: number): Promise<void> {
    windows.delete(windowId);
    for (const [tabId, tab] of tabs) {
      if (tab.windowId === windowId) tabs.delete(tabId);
    }
    for (const listener of windowRemoved.listeners) listener(windowId);
    await flush();
  }

  async function emitTabRemoved(tabId: number): Promise<void> {
    tabs.delete(tabId);
    for (const listener of tabRemoved.listeners) listener(tabId);
    await flush();
  }

  async function emitBeforeRequest(details: unknown): Promise<void> {
    for (const listener of beforeRequest.listeners) listener(details);
    await flush();
  }

  return {
    chrome,
    sentSiteEvents,
    createdWindows,
    removedWindows,
    sessionState,
    emitRuntimeMessage,
    emitWindowRemoved,
    emitTabRemoved,
    emitBeforeRequest,
    flush,
  };
}
