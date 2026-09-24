import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedFlusher } from './debouncedFlush';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createDebouncedFlusher', () => {
  it('saves after the delay elapses', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.schedule('a');
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledExactlyOnceWith('a');
  });

  it('only saves the latest value when scheduled repeatedly within the delay window', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.schedule('a');
    vi.advanceTimersByTime(200);
    flusher.schedule('b');
    vi.advanceTimersByTime(200);
    flusher.schedule('c');
    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledExactlyOnceWith('c');
  });

  it('flush() saves immediately without waiting for the delay — the exact mechanism behind "edit + immediate tab switch preserves the change"', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.schedule('edited value');
    // No time advanced at all — simulates an unmount happening the instant
    // after an edit, before the debounce timer could ever fire.
    flusher.flush();
    expect(save).toHaveBeenCalledExactlyOnceWith('edited value');
  });

  it('flush() after a save already fired does not save again', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.schedule('a');
    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledTimes(1);
    flusher.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush() with nothing ever scheduled is a no-op', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it('a flushed save is not repeated when the original timer would have fired', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.schedule('a');
    flusher.flush();
    vi.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('cancel() discards a pending save without ever calling save', () => {
    const save = vi.fn();
    const flusher = createDebouncedFlusher(save, 500);
    flusher.schedule('a');
    flusher.cancel();
    vi.advanceTimersByTime(1000);
    expect(save).not.toHaveBeenCalled();
  });
});
