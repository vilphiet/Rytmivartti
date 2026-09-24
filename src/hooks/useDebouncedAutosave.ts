import { useEffect, useRef, useState } from 'react';
import { createDebouncedFlusher } from '../state/debouncedFlush';

/** Debounced autosave wired to React: schedules `save(value)` on every
 * change, but flushes immediately (bypassing the debounce) on unmount, tab
 * hide, or page close — so an edit made right before a tab switch is never
 * lost to a pending timer that never got to fire. */
export function useDebouncedAutosave<T>(value: T, save: (value: T) => void, delayMs: number): void {
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const [flusher] = useState(() => createDebouncedFlusher<T>((v: T) => saveRef.current(v), delayMs));

  useEffect(() => {
    flusher.schedule(value);
  }, [flusher, value]);

  useEffect(() => {
    const flushIfHidden = () => {
      if (document.visibilityState === 'hidden') flusher.flush();
    };
    const flushNow = () => flusher.flush();
    document.addEventListener('visibilitychange', flushIfHidden);
    window.addEventListener('pagehide', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', flushIfHidden);
      window.removeEventListener('pagehide', flushNow);
      flusher.flush();
    };
  }, [flusher]);
}
