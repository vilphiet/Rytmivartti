import { useEffect, useRef } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import { currentStepIndex } from '../scheduling';

/** When `enabled`, watches the engine's current step via a small rAF loop
 * and calls `onPageChange` only when the step actually crosses into a
 * different page — not on every frame — so "Seuraa soittoa" doesn't cause
 * a React re-render 60 times a second, just once every `pageSize` steps. */
export function useFollowPlaybackPage(
  engine: SequencerEngine,
  patternSteps: number,
  pageSize: number,
  enabled: boolean,
  onPageChange: (page: number) => void,
) {
  const lastPageRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastPageRef.current = null;
      return;
    }

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const stepDuration = engine.getStepDuration();
      const baseStartTime = engine.getBaseStartTime();
      const referenceTime = engine.getReferenceTime();
      const step = currentStepIndex(baseStartTime, stepDuration, referenceTime, patternSteps);
      const page = Math.floor(step / pageSize);
      if (page !== lastPageRef.current) {
        lastPageRef.current = page;
        onPageChange(page);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, patternSteps, pageSize, enabled, onPageChange]);
}
