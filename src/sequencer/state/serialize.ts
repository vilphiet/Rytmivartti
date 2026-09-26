import type { VoiceId } from '../../audio/types';
import type { SeqProject, SeqStep, SeqTrack, SeqTrackKind } from '../types';
import { MAX_PATTERN_STEPS } from '../types';
import type { SeqPersistedState } from './schema';
import { SEQ_SCHEMA_VERSION } from './schema';

const VALID_VOICE_IDS: readonly VoiceId[] = ['tone', 'kick', 'snare', 'hihat', 'rim', 'sample', 'bass', 'lead', 'pad', 'pluck', 'keys'];
const VALID_KINDS: readonly SeqTrackKind[] = ['drum', 'melodic'];
const DEFAULT_BPM = 100;
const DEFAULT_STEPS_PER_BEAT = 4;
const DEFAULT_PATTERN_STEPS = 16;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
}

function normalizeSeqStep(raw: unknown): SeqStep {
  const r = asRecord(raw);
  const velocity = isFiniteNumber(r.velocity) ? Math.max(0, Math.min(1, r.velocity)) : 0;
  const step: SeqStep = { velocity };
  if (isFiniteNumber(r.note)) step.note = r.note;
  if (isFiniteNumber(r.length) && r.length > 0) step.length = r.length;
  return step;
}

/** Always returns exactly MAX_PATTERN_STEPS steps (padding with off-steps
 * or truncating), regardless of how many were saved — this is what lets a
 * track's steps array stay a fixed-size "window" that lengthSteps/
 * patternSteps merely index into. */
function normalizeSeqSteps(raw: unknown): SeqStep[] {
  const parsed = Array.isArray(raw) ? raw.map(normalizeSeqStep) : [];
  const steps = parsed.slice(0, MAX_PATTERN_STEPS);
  while (steps.length < MAX_PATTERN_STEPS) steps.push({ velocity: 0 });
  return steps;
}

function normalizeSeqTrack(raw: unknown, index: number, patternSteps: number): SeqTrack {
  const r = asRecord(raw);
  const kind = VALID_KINDS.includes(r.kind as SeqTrackKind) ? (r.kind as SeqTrackKind) : 'drum';
  const voiceId = VALID_VOICE_IDS.includes(r.voiceId as VoiceId) ? (r.voiceId as VoiceId) : 'kick';
  const gain = isFiniteNumber(r.gain) ? Math.max(0, Math.min(1, r.gain)) : 0.8;
  const pan = isFiniteNumber(r.pan) ? Math.max(-1, Math.min(1, r.pan)) : 0;
  const lengthSteps =
    isFiniteNumber(r.lengthSteps) && r.lengthSteps >= 1 ? Math.min(MAX_PATTERN_STEPS, Math.round(r.lengthSteps)) : patternSteps;
  const name = typeof r.name === 'string' && r.name.length > 0 ? r.name : `Raita ${index + 1}`;
  const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : `track-restored-${index}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    name,
    kind,
    voiceId,
    gain,
    pan,
    mute: r.mute === true,
    solo: r.solo === true,
    lengthSteps,
    steps: normalizeSeqSteps(r.steps),
  };
}

export function normalizeSeqProject(raw: unknown): SeqProject {
  const r = asRecord(raw);
  const bpm = isFiniteNumber(r.bpm) && r.bpm > 0 ? r.bpm : DEFAULT_BPM;
  const stepsPerBeat = isFiniteNumber(r.stepsPerBeat) && r.stepsPerBeat >= 1 ? Math.round(r.stepsPerBeat) : DEFAULT_STEPS_PER_BEAT;
  const patternSteps =
    isFiniteNumber(r.patternSteps) && r.patternSteps >= 1 ? Math.min(MAX_PATTERN_STEPS, Math.round(r.patternSteps)) : DEFAULT_PATTERN_STEPS;
  const tracks = Array.isArray(r.tracks) ? r.tracks.map((t, i) => normalizeSeqTrack(t, i, patternSteps)) : [];
  return { bpm, stepsPerBeat, patternSteps, tracks };
}

export function serializeSeqState(project: SeqProject): SeqPersistedState {
  return { schemaVersion: SEQ_SCHEMA_VERSION, project };
}

/** Parses and validates a persisted sequencer-state JSON string. Returns
 * null for anything invalid (bad JSON, unknown schema version, no usable
 * tracks) so callers can fall back to built-in defaults without crashing. */
export function parseSeqState(raw: string | null): SeqPersistedState | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    const d = asRecord(data);
    if (d.schemaVersion !== SEQ_SCHEMA_VERSION) return null;

    const project = normalizeSeqProject(d.project);
    if (project.tracks.length === 0) return null;

    return { schemaVersion: SEQ_SCHEMA_VERSION, project };
  } catch {
    return null;
  }
}
