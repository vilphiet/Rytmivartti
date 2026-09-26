import { useEffect, useRef } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import { STEP_SPAN_PX } from './gridConstants';

/** Shared rAF loop computing the current step's pixel offset (latency-
 * compensated, via the engine's getBaseStartTime/getStepDuration/
 * getReferenceTime), written directly into every registered element's
 * transform rather than through React state — matching the polyrhythm
 * grid's approach. Both StepGrid (one playhead per row) and PianoRoll (one
 * playhead) register into the same returned set, so they can't drift out
 * of sync with each other or duplicate this math. */
export function useStepPlayheadX(engine: SequencerEngine, patternSteps: number) {
  const targets = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const stepDuration = engine.getStepDuration();
      const baseStartTime = engine.getBaseStartTime();
      const referenceTime = engine.getReferenceTime();
      const steps = Math.max(1, patternSteps);
      const elapsedSteps = (referenceTime - baseStartTime) / stepDuration;
      const currentStep = ((Math.floor(elapsedSteps) % steps) + steps) % steps;
      const x = (currentStep * STEP_SPAN_PX).toFixed(2);
      for (const el of targets.current) {
        el.style.transform = `translateX(${x}px)`;
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine, patternSteps]);

  return targets;
}
