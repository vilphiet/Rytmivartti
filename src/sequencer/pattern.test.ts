import { describe, expect, it } from 'vitest';
import { clearAllSteps, clearTrackSteps, cycleSeqStepVelocity, defaultSeqSteps, seqStepVisualState, setPatternLength, SEQ_STEP_ACCENT, SEQ_STEP_NORMAL, SEQ_STEP_OFF } from './pattern';
import { MAX_PATTERN_STEPS } from './types';
import type { SeqProject, SeqTrack } from './types';

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

function buildProject(tracks: SeqTrack[]): SeqProject {
  return { bpm: 100, stepsPerBeat: 4, patternSteps: 16, rootNote: 0, scale: 'major', tracks };
}

describe('cycleSeqStepVelocity', () => {
  it('cycles off -> normal -> accent -> off', () => {
    expect(cycleSeqStepVelocity(SEQ_STEP_OFF)).toBe(SEQ_STEP_NORMAL);
    expect(cycleSeqStepVelocity(SEQ_STEP_NORMAL)).toBe(SEQ_STEP_ACCENT);
    expect(cycleSeqStepVelocity(SEQ_STEP_ACCENT)).toBe(SEQ_STEP_OFF);
  });
});

describe('seqStepVisualState', () => {
  it('maps velocity to a visual state', () => {
    expect(seqStepVisualState(0)).toBe('off');
    expect(seqStepVisualState(0.8)).toBe('normal');
    expect(seqStepVisualState(1)).toBe('accent');
  });
});

describe('setPatternLength', () => {
  it('changes patternSteps and every track lengthSteps without touching steps arrays', () => {
    const project: SeqProject = buildProject([buildTrack('a'), buildTrack('b')]);
    const shrunk = setPatternLength(project, 8);
    expect(shrunk.patternSteps).toBe(8);
    expect(shrunk.tracks.every((t) => t.lengthSteps === 8)).toBe(true);
    expect(shrunk.tracks.every((t) => t.steps.length === MAX_PATTERN_STEPS)).toBe(true);
  });

  it('16 -> 8 -> 16 restores exactly the original steps (refinement 3)', () => {
    const track = buildTrack('a');
    track.steps[10] = { velocity: SEQ_STEP_ACCENT };
    track.steps[12] = { velocity: SEQ_STEP_NORMAL };
    const original = [...track.steps];

    let project: SeqProject = buildProject([track]);
    project = setPatternLength(project, 8);
    project = setPatternLength(project, 16);

    expect(project.tracks[0].lengthSteps).toBe(16);
    expect(project.tracks[0].steps).toEqual(original);
  });

  it('clamps to [1, MAX_PATTERN_STEPS]', () => {
    const project: SeqProject = buildProject([buildTrack('a')]);
    expect(setPatternLength(project, 0).patternSteps).toBe(1);
    expect(setPatternLength(project, 999).patternSteps).toBe(MAX_PATTERN_STEPS);
  });
});

describe('clearAllSteps', () => {
  it('clears every track\'s steps to all-off, keeping tracks/voices/names/settings untouched', () => {
    const trackA = buildTrack('a');
    trackA.steps[2] = { velocity: SEQ_STEP_ACCENT };
    trackA.name = 'Kick';
    trackA.voiceId = 'snare';
    const trackB = buildTrack('b');
    trackB.steps[5] = { velocity: SEQ_STEP_NORMAL };
    const project = buildProject([trackA, trackB]);

    const cleared = clearAllSteps(project);

    expect(cleared.tracks[0].steps.every((s) => s.velocity === SEQ_STEP_OFF)).toBe(true);
    expect(cleared.tracks[1].steps.every((s) => s.velocity === SEQ_STEP_OFF)).toBe(true);
    expect(cleared.tracks[0].name).toBe('Kick');
    expect(cleared.tracks[0].voiceId).toBe('snare');
    expect(cleared.tracks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(cleared.bpm).toBe(project.bpm);
    expect(cleared.patternSteps).toBe(project.patternSteps);
  });

  it('works for a melodic track too (an all-off array is a valid empty pattern)', () => {
    const melodic: SeqTrack = { ...buildTrack('m'), kind: 'melodic', voiceId: 'bass' };
    melodic.steps[3] = { velocity: SEQ_STEP_NORMAL, note: 60, length: 2 };
    const cleared = clearAllSteps(buildProject([melodic]));
    expect(cleared.tracks[0].steps.every((s) => s.velocity === SEQ_STEP_OFF && s.note === undefined)).toBe(true);
  });
});

describe('clearTrackSteps', () => {
  it('clears only the given track, leaving others untouched', () => {
    const a = buildTrack('a');
    a.steps[0] = { velocity: SEQ_STEP_ACCENT };
    const b = buildTrack('b');
    b.steps[1] = { velocity: SEQ_STEP_NORMAL };
    const project = buildProject([a, b]);

    const result = clearTrackSteps(project, 'a');

    expect(result.tracks[0].steps.every((s) => s.velocity === SEQ_STEP_OFF)).toBe(true);
    expect(result.tracks[1].steps[1].velocity).toBe(SEQ_STEP_NORMAL);
  });

  it('preserves the track\'s name/voice/other settings', () => {
    const a = buildTrack('a', { name: 'Kick', voiceId: 'snare' });
    const result = clearTrackSteps(buildProject([a]), 'a');
    expect(result.tracks[0].name).toBe('Kick');
    expect(result.tracks[0].voiceId).toBe('snare');
  });
});
