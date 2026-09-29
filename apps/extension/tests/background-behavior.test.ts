import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeChrome } from './fake-chrome';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('extension background behavior', () => {
  it('registers background listeners against the fake Chrome runtime', async () => {
    vi.resetModules();
    const fake = createFakeChrome();
    vi.stubGlobal('chrome', fake.chrome);

    await import('../src/background');

    const chromeApi = fake.chrome as any;
    expect(chromeApi.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    expect(chromeApi.windows.onRemoved.addListener).toHaveBeenCalledTimes(1);
    expect(chromeApi.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1);
    expect(chromeApi.webRequest.onBeforeRequest.addListener).toHaveBeenCalledTimes(1);
  });
});
