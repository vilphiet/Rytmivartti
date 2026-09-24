/** A debounced "save the latest value" scheduler, decoupled from React so
 * its exact-flush-semantics are unit-testable without a DOM/render
 * environment. schedule() replaces any pending save; flush() immediately
 * saves whatever is pending (used when a component unmounts, the tab is
 * hidden, or the page is closing, so a save waiting on the debounce timer
 * is never lost). */
export interface DebouncedFlusher<T> {
  schedule(value: T): void;
  /** Saves immediately if something is pending; no-op otherwise. */
  flush(): void;
  /** Discards any pending save without calling `save`. */
  cancel(): void;
}

export function createDebouncedFlusher<T>(
  save: (value: T) => void,
  delayMs: number,
  setTimer: typeof setTimeout = setTimeout,
  clearTimer: typeof clearTimeout = clearTimeout,
): DebouncedFlusher<T> {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T | undefined;
  let hasPending = false;

  function clearPendingTimer() {
    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }
  }

  function schedule(value: T) {
    pendingValue = value;
    hasPending = true;
    clearPendingTimer();
    timerId = setTimer(() => {
      timerId = null;
      if (hasPending) {
        hasPending = false;
        save(pendingValue as T);
      }
    }, delayMs);
  }

  function flush() {
    clearPendingTimer();
    if (hasPending) {
      hasPending = false;
      save(pendingValue as T);
    }
  }

  function cancel() {
    clearPendingTimer();
    hasPending = false;
  }

  return { schedule, flush, cancel };
}
