const PATTERN_LENGTH_OPTIONS = [8, 16, 32];

interface Props {
  isPlaying: boolean;
  bpm: number;
  bpmRange: { min: number; max: number };
  patternSteps: number;
  onToggle: () => void;
  onBpmChange: (bpm: number) => void;
  onPatternStepsChange: (steps: number) => void;
}

export function SequencerTransport({ isPlaying, bpm, bpmRange, patternSteps, onToggle, onBpmChange, onPatternStepsChange }: Props) {
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
    </div>
  );
}
