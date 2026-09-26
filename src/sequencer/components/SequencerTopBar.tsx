import { useCallback, useRef } from 'react';

const LONG_PRESS_INITIAL_DELAY_MS = 400;
const LONG_PRESS_REPEAT_MS = 100;

/** Fires `onStep` once immediately, then repeatedly while the pointer
 * stays down (after an initial delay) — for the BPM +/- buttons' "pitkä
 * painallus toistaa". */
function useLongPressRepeat(onStep: () => void) {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    onStep();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(onStep, LONG_PRESS_REPEAT_MS);
    }, LONG_PRESS_INITIAL_DELAY_MS);
  }, [onStep]);

  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop };
}

interface Props {
  isPlaying: boolean;
  onToggle: () => void;
  bpm: number;
  bpmRange: { min: number; max: number };
  onBpmChange: (bpm: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
}

export function SequencerTopBar({ isPlaying, onToggle, bpm, bpmRange, onBpmChange, canUndo, canRedo, onUndo, onRedo, menuOpen, onToggleMenu }: Props) {
  const decrement = useLongPressRepeat(() => onBpmChange(Math.max(bpmRange.min, bpm - 1)));
  const increment = useLongPressRepeat(() => onBpmChange(Math.min(bpmRange.max, bpm + 1)));

  return (
    <div className="seq-top-bar">
      <button type="button" className="transport-btn primary seq-top-bar-play" onClick={onToggle}>
        {isPlaying ? 'Pysäytä' : 'Toista'}
      </button>

      <div className="seq-bpm-stepper">
        <button type="button" className="icon-btn seq-bpm-step" aria-label="Hidasta tempoa" disabled={bpm <= bpmRange.min} {...decrement}>
          −
        </button>
        <span className="seq-bpm-value">{bpm} BPM</span>
        <button type="button" className="icon-btn seq-bpm-step" aria-label="Nopeuta tempoa" disabled={bpm >= bpmRange.max} {...increment}>
          +
        </button>
      </div>

      <button type="button" className="icon-btn" onClick={onUndo} disabled={!canUndo} title="Kumoa" aria-label="Kumoa">
        ↶ Kumoa
      </button>
      <button type="button" className="icon-btn" onClick={onRedo} disabled={!canRedo} title="Tee uudelleen" aria-label="Tee uudelleen">
        ↷ Uudelleen
      </button>

      <button
        type="button"
        className={`icon-btn seq-top-bar-menu-btn${menuOpen ? ' active' : ''}`}
        onClick={onToggleMenu}
        title="Lisää"
        aria-label="Lisää"
      >
        ⋯
      </button>
    </div>
  );
}
