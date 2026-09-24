import { describe, expect, it } from 'vitest';
import { defaultSeqSteps } from '../pattern';
import { MAX_PATTERN_STEPS } from '../types';
import type { SeqProject, SeqTrack } from '../types';
import { normalizeSeqProject, parseSeqState, serializeSeqState } from './serialize';
import { SEQ_SCHEMA_VERSION } from './schema';

function buildTrack(id: string, overrides: Partial<SeqTrack> = {}): SeqTrack {
  return {
    id,
    name: id,
    kind: 'drum',
    voiceId: 'kick',
    gain: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    lengthSteps: 16,
    steps: defaultSeqSteps(),
    ...overrides,
  };
}

describe('serializeSeqState / parseSeqState', () => {
  it('round-trips a project exactly', () => {
    const track = buildTrack('kick', { name: 'Kick' });
    track.steps[0] = { velocity: 1 };
    track.steps[4] = { velocity: 0.8, note: 60, length: 2 };
    const project: SeqProject = { bpm: 128, stepsPerBeat: 4, patternSteps: 16, tracks: [track] };

    const persisted = serializeSeqState(project);
    const roundTripped = parseSeqState(JSON.stringify(persisted));

    expect(roundTripped).not.toBeNull();
    expect(roundTripped!.project).toEqual(project);
  });

  it('returns null for invalid JSON', () => {
    expect(parseSeqState('not json')).toBeNull();
  });

  it('returns null for an unknown schema version', () => {
    const persisted = serializeSeqState({ bpm: 100, stepsPerBeat: 4, patternSteps: 16, tracks: [buildTrack('a')] });
    const tampered = { ...persisted, schemaVersion: 999 };
    expect(parseSeqState(JSON.stringify(tampered))).toBeNull();
  });

  it('returns null when there are no usable tracks', () => {
    const persisted = { schemaVersion: SEQ_SCHEMA_VERSION, project: { bpm: 100, stepsPerBeat: 4, patternSteps: 16, tracks: [] } };
    expect(parseSeqState(JSON.stringify(persisted))).toBeNull();
  });

  it('never throws on garbage input, falling back to defaults per-field', () => {
    const garbage = JSON.stringify({
      schemaVersion: SEQ_SCHEMA_VERSION,
      project: { bpm: 'fast', stepsPerBeat: null, patternSteps: -5, tracks: [{ voiceId: 'not-a-voice', steps: 'nope' }] },
    });
    const result = parseSeqState(garbage);
    expect(result).not.toBeNull();
    expect(result!.project.bpm).toBeGreaterThan(0);
    expect(result!.project.tracks[0].voiceId).toBe('kick');
    expect(result!.project.tracks[0].steps).toHaveLength(MAX_PATTERN_STEPS);
  });
});

describe('normalizeSeqProject', () => {
  it('always produces MAX_PATTERN_STEPS-length steps arrays regardless of saved length', () => {
    const project = normalizeSeqProject({
      bpm: 100,
      stepsPerBeat: 4,
      patternSteps: 16,
      tracks: [{ id: 'a', steps: [{ velocity: 1 }, { velocity: 1 }] }],
    });
    expect(project.tracks[0].steps).toHaveLength(MAX_PATTERN_STEPS);
  });

  it('truncates an oversized saved steps array to MAX_PATTERN_STEPS', () => {
    const oversized = Array.from({ length: 50 }, () => ({ velocity: 1 }));
    const project = normalizeSeqProject({ tracks: [{ id: 'a', steps: oversized }] });
    expect(project.tracks[0].steps).toHaveLength(MAX_PATTERN_STEPS);
  });
});
