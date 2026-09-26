/** A linear undo/redo history, as pure functions over a plain data
 * structure — no React, no storage, fully testable on its own. Used by
 * useUndoableState to give the sequencer undo/redo without persisting
 * the history itself (only ever the current `present` value is saved). */
export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function initHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

/** Records `next` as the new present, pushing the current present onto
 * `past` (trimmed to the most recent `limit` entries) and discarding
 * `future` — a fresh edit after an undo abandons the redo branch, same as
 * every other undo/redo implementation. A no-op (same object back) when
 * `next` is reference-equal to the current present. */
export function pushHistory<T>(history: HistoryState<T>, next: T, limit: number): HistoryState<T> {
  if (next === history.present) return history;
  const past = [...history.past, history.present];
  const trimmedPast = past.length > limit ? past.slice(past.length - limit) : past;
  return { past: trimmedPast, present: next, future: [] };
}

/** Steps back one entry; a no-op at the start of history. */
export function undo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

/** Steps forward one entry; a no-op with nothing to redo. */
export function redo<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}

export function canUndo<T>(history: HistoryState<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: HistoryState<T>): boolean {
  return history.future.length > 0;
}
