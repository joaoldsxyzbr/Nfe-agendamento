import { describe, expect, it, vi } from 'vitest';
import { createEventDrivenScheduler } from '../src/portal-scheduler';

describe('coalesced event-driven Portal scheduler', () => {
  it('coalesces simultaneous signals and replays signals received while running', async () => {
    let releaseFirst!: () => void;
    const task = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValue(undefined);
    const schedule = createEventDrivenScheduler(task);
    schedule();
    schedule();
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(1));
    schedule();
    schedule();
    releaseFirst();
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(2));
  });

  it('recovers after a rejected task without polling', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(new Error('transient Portal DOM failure'))
      .mockResolvedValue(undefined);
    const schedule = createEventDrivenScheduler(task);
    schedule();
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(1));
    schedule();
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(2));
  });
});
