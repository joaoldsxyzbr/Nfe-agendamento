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

export function createFakeChrome(): FakeChromeController {
  throw new Error('Chrome fake not implemented.');
}
