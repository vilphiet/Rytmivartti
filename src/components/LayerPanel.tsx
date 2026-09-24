import { useState } from 'react';
import type { RhythmLayer, VoiceId, Waveform } from '../audio/types';

const WAVEFORM_OPTIONS: Waveform[] = ['sine', 'triangle', 'square', 'sawtooth'];
const VOICE_OPTIONS: { id: VoiceId; label: string }[] = [
  { id: 'tone', label: 'Ääni' },
  { id: 'kick', label: 'Kick' },
  { id: 'snare', label: 'Snare' },
  { id: 'hihat', label: 'Hi-hat' },
  { id: 'rim', label: 'Rim' },
];

interface ClampedNumberFieldProps {
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
}

// Lets the field go through empty/invalid intermediate states while typing
// (e.g. clearing "1" to type "12") and only clamps once editing finishes,
// instead of snapping back to min on every keystroke.
function ClampedNumberField({ value, min, max, onCommit }: ClampedNumberFieldProps) {
  const [text, setText] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(String(value));
  }

  const commit = () => {
    const parsed = Math.round(Number(text));
    const clamped = Number.isFinite(parsed) && text.trim() !== '' ? Math.max(min, Math.min(max, parsed)) : value;
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

interface Props {
  layers: RhythmLayer[];
  onUpdate: (id: string, patch: Partial<RhythmLayer>) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export function LayerPanel({ layers, onUpdate, onRemove, onAdd }: Props) {
  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <h2>Kerrokset</h2>
        <button type="button" className="add-layer-btn" onClick={onAdd}>
          + Lisää kerros
        </button>
      </div>
      <div className="layer-list">
        {layers.map((layer) => (
          <div className="layer-row" key={layer.id} style={{ borderColor: layer.color }}>
            <input
              type="color"
              className="layer-color"
              value={layer.color}
              onChange={(e) => onUpdate(layer.id, { color: e.target.value })}
              title="Väri"
            />

            <label className="layer-field layer-n">
              <span>N</span>
              <ClampedNumberField
                value={layer.n}
                min={1}
                max={64}
                onCommit={(n) => onUpdate(layer.id, { n })}
              />
            </label>

            <label className="layer-field">
              <span>Ääni</span>
              <select
                value={layer.voiceId}
                onChange={(e) => onUpdate(layer.id, { voiceId: e.target.value as VoiceId })}
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            {layer.voiceId === 'tone' && (
              <label className="layer-field">
                <span>Aaltomuoto</span>
                <select
                  value={layer.waveform}
                  onChange={(e) => onUpdate(layer.id, { waveform: e.target.value as Waveform })}
                >
                  {WAVEFORM_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {layer.voiceId === 'tone' && (
              <label className="layer-field layer-freq">
                <span>Hz</span>
                <ClampedNumberField
                  value={Math.round(layer.frequency)}
                  min={20}
                  max={2000}
                  onCommit={(frequency) => onUpdate(layer.id, { frequency })}
                />
              </label>
            )}

            <label className="layer-field layer-volume">
              <span>Vol</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={layer.volume}
                onChange={(e) => onUpdate(layer.id, { volume: Number(e.target.value) })}
              />
            </label>

            <label className="layer-field layer-pan">
              <span>Pan</span>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={layer.pan}
                onChange={(e) => onUpdate(layer.id, { pan: Number(e.target.value) })}
              />
            </label>

            <button
              type="button"
              className={`icon-btn${layer.muted ? ' active' : ''}`}
              title={layer.muted ? 'Poista mykistys' : 'Mykistä'}
              onClick={() => onUpdate(layer.id, { muted: !layer.muted })}
            >
              {layer.muted ? 'Mykistetty' : 'Mykistä'}
            </button>

            <button
              type="button"
              className={`icon-btn${layer.solo ? ' active' : ''}`}
              title={layer.solo ? 'Poista solo' : 'Solo'}
              onClick={() => onUpdate(layer.id, { solo: !layer.solo })}
            >
              Solo
            </button>

            <button
              type="button"
              className={`icon-btn${layer.hidden ? ' active' : ''}`}
              title={layer.hidden ? 'Näytä' : 'Piilota'}
              onClick={() => onUpdate(layer.id, { hidden: !layer.hidden })}
            >
              {layer.hidden ? 'Piilotettu' : 'Piilota'}
            </button>

            <button
              type="button"
              className="icon-btn remove"
              title="Poista kerros"
              onClick={() => onRemove(layer.id)}
              disabled={layers.length <= 1}
            >
              Poista
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
