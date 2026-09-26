import { describe, expect, it } from 'vitest';
import { defaultSeqSteps } from '../pattern';
import { MAX_PATTERN_STEPS } from '../types';
import type { SeqProject, SeqTrack } from '../types';
import { migrateProjectV1ToV2, normalizeSeqProject, parseSeqState, serializeSeqState } from './serialize';
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

function buildProject(tracks: SeqTrack[], overrides: Partial<SeqProject> = {}): SeqProject {
  return { bpm: 128, stepsPerBeat: 4, patternSteps: 16, rootNote: 0, scale: 'major', tracks, ...overrides };
}

describe('serializeSeqState / parseSeqState', () => {
  it('round-trips a project exactly', () => {
    const track = buildTrack('kick', { name: 'Kick' });
    track.steps[0] = { velocity: 1 };
    track.steps[4] = { velocity: 0.8, note: 60, length: 2 };
    const project: SeqProject = buildProject([track]);

    const persisted = serializeSeqState(project);
    const roundTripped = parseSeqState(JSON.stringify(persisted));

    expect(roundTripped).not.toBeNull();
    expect(roundTripped!.project).toEqual(project);
  });

  it('returns null for invalid JSON', () => {
    expect(parseSeqState('not json')).toBeNull();
  });

  it('returns null for an unknown schema version', () => {
    const persisted = serializeSeqState(buildProject([buildTrack('a')]));
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

describe('migrateProjectV1ToV2', () => {
  it('adds C major defaults to a v1 project shape without touching anything else', () => {
    const v1Project = { bpm: 90, stepsPerBeat: 4, patternSteps: 16, tracks: [{ id: 'a' }] };
    const migrated = migrateProjectV1ToV2(v1Project) as typeof v1Project & { rootNote: number; scale: string };
    expect(migrated.rootNote).toBe(0);
    expect(migrated.scale).toBe('major');
    expect(migrated.bpm).toBe(90);
    expect(migrated.tracks).toEqual(v1Project.tracks);
  });

  it('leaves an already-present rootNote/scale untouched (safe to call on v2 data too)', () => {
    const project = { rootNote: 7, scale: 'dorian' };
    const migrated = migrateProjectV1ToV2(project) as { rootNote: number; scale: string };
    expect(migrated.rootNote).toBe(7);
    expect(migrated.scale).toBe('dorian');
  });
});

describe('schema migration via parseSeqState', () => {
  it('an old v1 save (no rootNote/scale) loads with C major defaults, tracks/steps intact', () => {
    const track = buildTrack('kick', { name: 'Kick' });
    track.steps[0] = { velocity: 1 };
    track.steps[4] = { velocity: 0.8 };
    const v1Payload = {
      schemaVersion: 1,
      project: { bpm: 90, stepsPerBeat: 4, patternSteps: 16, tracks: [track] },
    };

    const result = parseSeqState(JSON.stringify(v1Payload));

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(SEQ_SCHEMA_VERSION);
    expect(result!.project.rootNote).toBe(0);
    expect(result!.project.scale).toBe('major');
    expect(result!.project.bpm).toBe(90);
    expect(result!.project.tracks[0].steps).toEqual(track.steps);
  });

  it('rejects a schema version newer than the one this build knows about', () => {
    const payload = { schemaVersion: SEQ_SCHEMA_VERSION + 1, project: buildProject([buildTrack('a')]) };
    expect(parseSeqState(JSON.stringify(payload))).toBeNull();
  });

  it('rejects a missing, non-numeric, zero, or negative schema version', () => {
    const project = buildProject([buildTrack('a')]);
    expect(parseSeqState(JSON.stringify({ project }))).toBeNull();
    expect(parseSeqState(JSON.stringify({ schemaVersion: 'two', project }))).toBeNull();
    expect(parseSeqState(JSON.stringify({ schemaVersion: 0, project }))).toBeNull();
    expect(parseSeqState(JSON.stringify({ schemaVersion: -1, project }))).toBeNull();
  });

  it('a v2 project round-trips rootNote/scale exactly', () => {
    const project = buildProject([buildTrack('a')], { rootNote: 9, scale: 'minorPentatonic' });
    const result = parseSeqState(JSON.stringify(serializeSeqState(project)));
    expect(result!.project.rootNote).toBe(9);
    expect(result!.project.scale).toBe('minorPentatonic');
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

  it('defaults rootNote to 0 and scale to major when absent or invalid', () => {
    expect(normalizeSeqProject({}).rootNote).toBe(0);
    expect(normalizeSeqProject({}).scale).toBe('major');
    expect(normalizeSeqProject({ scale: 'not-a-scale' }).scale).toBe('major');
  });

  it('wraps an out-of-range rootNote into 0-11', () => {
    expect(normalizeSeqProject({ rootNote: 14 }).rootNote).toBe(2);
    expect(normalizeSeqProject({ rootNote: -1 }).rootNote).toBe(11);
  });

  it('preserves a valid rootNote/scale', () => {
    const project = normalizeSeqProject({ rootNote: 7, scale: 'dorian' });
    expect(project.rootNote).toBe(7);
    expect(project.scale).toBe('dorian');
  });
});
