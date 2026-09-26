import type { ScaleId } from '../types';
import { PITCH_CLASS_NAMES, SCALE_LABELS } from '../scale';

const PATTERN_LENGTH_OPTIONS = [8, 16, 32];
const SCALE_OPTIONS = Object.keys(SCALE_LABELS) as ScaleId[];

interface Props {
  isPlaying: boolean;
  bpm: number;
  bpmRange: { min: number; max: number };
  patternSteps: number;
  rootNote: number;
  scale: ScaleId;
  onToggle: () => void;
  onBpmChange: (bpm: number) => void;
  onPatternStepsChange: (steps: number) => void;
  onRootNoteChange: (rootNote: number) => void;
  onScaleChange: (scale: ScaleId) => void;
}

export function SequencerTransport({
  isPlaying,
  bpm,
  bpmRange,
  patternSteps,
  rootNote,
  scale,
  onToggle,
  onBpmChange,
  onPatternStepsChange,
  onRootNoteChange,
  onScaleChange,
}: Props) {
  return (
    <div className="transport-bar">
      <div className="transport-buttons">
        <button type="button" className="transport-btn primary" onClick={onToggle}>
          {isPlaying ? 'Pysäytä' : 'Toista'}
        </button>
      </div>

      <div className="tempo-control">
        <label htmlFor="seq-bpm-slider">Tempo</label>
        <input
          id="seq-bpm-slider"
          type="range"
          min={bpmRange.min}
          max={bpmRange.max}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
        />
        <span className="tempo-value">{bpm} BPM</span>
      </div>

      <label className="layer-field seq-bpm-number">
        <span>BPM</span>
        <input
          type="number"
          inputMode="numeric"
          min={bpmRange.min}
          max={bpmRange.max}
          value={bpm}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onBpmChange(n);
          }}
        />
      </label>

      <div className="seq-pattern-length">
        <span>Kuvion pituus</span>
        <div className="seq-pattern-length-options">
          {PATTERN_LENGTH_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className={`tab-bar-btn${patternSteps === n ? ' active' : ''}`}
              onClick={() => onPatternStepsChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <label className="layer-field">
        <span>Sävellaji</span>
        <select value={rootNote} onChange={(e) => onRootNoteChange(Number(e.target.value))}>
          {PITCH_CLASS_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="layer-field">
        <span>Asteikko</span>
        <select value={scale} onChange={(e) => onScaleChange(e.target.value as ScaleId)}>
          {SCALE_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {SCALE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
