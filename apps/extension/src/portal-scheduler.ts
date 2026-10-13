/**
 * Coalesces DOM signals without polling. Signals arriving while an async task
 * is running are replayed once it settles instead of being dropped.
 */
export function createEventDrivenScheduler(task: () => Promise<void> | void): () => void {
  let running = false;
  let scheduled = false;
  let pending = false;

  const drain = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      while (pending) {
        pending = false;
        try {
          await task();
        } catch {
          // A later DOM event can still recover the Portal state.
        }
      }
    } finally {
      running = false;
      if (pending) schedule();
    }
  };

  const schedule = (): void => {
    pending = true;
    if (running || scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      void drain();
    });
  };

  return schedule;
}
