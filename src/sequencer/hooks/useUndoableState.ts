import { useCallback, useState } from 'react';
import { canRedo, canUndo, initHistory, pushHistory, redo as redoHistory, undo as undoHistory } from '../historyStack';
import type { HistoryState } from '../historyStack';

const DEFAULT_HISTORY_LIMIT = 50;

/** Drop-in undo-aware replacement for useState: same setValue signature
 * (value or updater function), plus undo/redo/canUndo/canRedo backed by
 * historyStack's pure functions. Only ever the current value is meant to
 * be persisted by callers (e.g. autosave) — the history itself is
 * in-memory only and resets on reload. */
export function useUndoableState<T>(initial: T | (() => T), limit: number = DEFAULT_HISTORY_LIMIT) {
  const [history, setHistory] = useState<HistoryState<T>>(() =>
    initHistory(typeof initial === 'function' ? (initial as () => T)() : initial),
  );

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setHistory((h) => {
        const next = typeof updater === 'function' ? (updater as (prev: T) => T)(h.present) : updater;
        return pushHistory(h, next, limit);
      });
    },
    [limit],
  );

  const undo = useCallback(() => setHistory((h) => undoHistory(h)), []);
  const redo = useCallback(() => setHistory((h) => redoHistory(h)), []);

  return {
    value: history.present,
    setValue,
    undo,
    redo,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
  };
}
