import type { VoiceId } from '../../audio/types';
import type { SeqTrack } from '../types';

const VOICE_OPTIONS: { id: VoiceId; label: string }[] = [
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hihat', label: 'Hi-hat' },
  { id: 'rim', label: 'Rim' },
];

interface Props {
  track: SeqTrack;
  canRemove: boolean;
  onUpdate: (patch: Partial<SeqTrack>) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function TrackSettingsPanel({ track, canRemove, onUpdate, onRemove, onClose }: Props) {
  return (
    <div className="seq-track-settings">
      <div className="seq-track-settings-header">
        <h3>{track.name}</h3>
        <button type="button" className="icon-btn" onClick={onClose}>
          Sulje
        </button>
      </div>

      <label className="layer-field">
        <span>Ääni</span>
        <select value={track.voiceId} onChange={(e) => onUpdate({ voiceId: e.target.value as VoiceId })}>
          {VOICE_OPTIONS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </label>

      <label className="layer-field layer-volume">
        <span>Vol</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.gain}
          onChange={(e) => onUpdate({ gain: Number(e.target.value) })}
        />
      </label>

      <label className="layer-field layer-pan">
        <span>Pan</span>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={track.pan}
          onChange={(e) => onUpdate({ pan: Number(e.target.value) })}
        />
      </label>

      <button type="button" className="icon-btn remove" onClick={onRemove} disabled={!canRemove}>
        Poista raita
      </button>
    </div>
  );
}
