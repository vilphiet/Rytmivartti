import { useEffect, useRef } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import { currentStepIndex } from '../scheduling';

/** Shared rAF loop computing the current step's offset *within the
 * currently shown page* (latency-compensated, via the engine's
 * getBaseStartTime/getStepDuration/getReferenceTime), written directly
 * into every registered element's left/width (as a percentage of its own
 * parent, so this works whether that parent is a fluid-flexbox row —
 * StepGrid, post-pagination — or a fixed-pixel-width scrolling row —
 * PianoRoll, pre-Commit-4) rather than through React state, matching the
 * polyrhythm grid's DOM-writing approach. When the actual current step
 * falls on a different page than the one being shown, the playhead is
 * hidden (opacity 0) rather than drawn at a wrong position. Both StepGrid
 * (one playhead per row) and PianoRoll (one per row) register into the
 * same returned set, so they can't drift out of sync with each other or
 * duplicate this math. */
export function useStepPlayheadX(engine: SequencerEngine, patternSteps: number, currentPage: number, pageSize: number) {
  const targets = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const stepDuration = engine.getStepDuration();
      const baseStartTime = engine.getBaseStartTime();
      const referenceTime = engine.getReferenceTime();
      const step = currentStepIndex(baseStartTime, stepDuration, referenceTime, patternSteps);
      const localIndex = step - currentPage * pageSize;
      const onThisPage = localIndex >= 0 && localIndex < pageSize;
      const leftPercent = ((localIndex / pageSize) * 100).toFixed(3);
      const widthPercent = (100 / pageSize).toFixed(3);
      for (const el of targets.current) {
        el.style.opacity = onThisPage ? '1' : '0';
        if (onThisPage) {
          el.style.left = `${leftPercent}%`;
          el.style.width = `${widthPercent}%`;
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine, patternSteps, currentPage, pageSize]);

  return targets;
}
