import type { RhythmLayer, Step, VoiceId, Waveform } from '../audio/types';
import { colorForIndex, frequencyForIndex, VALID_WAVEFORMS, waveformForIndex } from '../audio/layerDefaults';
import { defaultPattern, resizePattern, STEP_ACCENT, STEP_NORMAL, STEP_OFF } from '../audio/pattern';
import type { PersistedState } from './schema';
import { CURRENT_SCHEMA_VERSION } from './schema';

const VALID_VOICE_IDS: readonly VoiceId[] = ['tone', 'kick', 'snare', 'hihat', 'rim', 'sample'];
const DEFAULT_BPM = 60;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function normalizeStep(raw: unknown): Step {
  const velocity = asRecord(raw).velocity;
  if (isFiniteNumber(velocity)) {
    return { velocity: Math.max(STEP_OFF, Math.min(STEP_ACCENT, velocity)) };
  }
  return { velocity: STEP_NORMAL };
}

function normalizePattern(raw: unknown, steps: number): Step[] {
  const parsed = Array.isArray(raw) ? raw.map(normalizeStep) : defaultPattern(steps);
  return resizePattern(parsed, steps);
}

/** Fills in any missing or invalid field with a sensible default instead of
 * throwing, so malformed/partial saved data still produces a valid,
 * playable layer. `index` seeds the same per-index defaults buildLayer()
 * uses (color/waveform/frequency), so a missing field looks like a fresh
 * layer at that position rather than an arbitrary fallback. */
function normalizeLayer(raw: unknown, index: number): RhythmLayer {
  const r = asRecord(raw);

  const steps = isFiniteNumber(r.steps) && r.steps >= 1 ? Math.round(r.steps) : 4;
  const cycleBeats = isFiniteNumber(r.cycleBeats) && r.cycleBeats > 0 ? r.cycleBeats : 1;
  const voiceId = VALID_VOICE_IDS.includes(r.voiceId as VoiceId) ? (r.voiceId as VoiceId) : 'tone';
  const waveform = VALID_WAVEFORMS.includes(r.waveform as Waveform) ? (r.waveform as Waveform) : waveformForIndex(index);
  const frequency = isFiniteNumber(r.frequency) && r.frequency > 0 ? r.frequency : frequencyForIndex(index);
  const volume = isFiniteNumber(r.volume) ? Math.max(0, Math.min(1, r.volume)) : 0.8;
  const pan = isFiniteNumber(r.pan) ? Math.max(-1, Math.min(1, r.pan)) : 0;
  const color = typeof r.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : colorForIndex(index);
  const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : `layer-restored-${index}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    steps,
    cycleBeats,
    pattern: normalizePattern(r.pattern, steps),
    color,
    voiceId,
    waveform,
    frequency,
    ...(typeof r.sampleUrl === 'string' ? { sampleUrl: r.sampleUrl } : {}),
    volume,
    pan,
    muted: r.muted === true,
    solo: r.solo === true,
    hidden: r.hidden === true,
  };
}

export function normalizeLayers(raw: unknown): RhythmLayer[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((l, i) => normalizeLayer(l, i));
}

export function serializeState(layers: RhythmLayer[], bpm: number): PersistedState {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, layers, bpm };
}

/** Parses and validates a persisted-state JSON string. Returns null for
 * anything invalid (bad JSON, unknown schema version, no usable layers) so
 * callers can fall back to the built-in defaults without crashing. */
export function parseAppState(raw: string | null): PersistedState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    const d = asRecord(data);
    if (d.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;

    const layers = normalizeLayers(d.layers);
    if (layers.length === 0) return null;

    const bpm = isFiniteNumber(d.bpm) ? d.bpm : DEFAULT_BPM;
    return { schemaVersion: CURRENT_SCHEMA_VERSION, layers, bpm };
  } catch {
    return null;
  }
}
