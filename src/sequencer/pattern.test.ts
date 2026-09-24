import { describe, expect, it } from 'vitest';
import { cycleSeqStepVelocity, defaultSeqSteps, seqStepVisualState, setPatternLength, SEQ_STEP_ACCENT, SEQ_STEP_NORMAL, SEQ_STEP_OFF } from './pattern';
import { MAX_PATTERN_STEPS } from './types';
import type { SeqProject, SeqTrack } from './types';

function buildTrack(id: string): SeqTrack {
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
  };
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
    const project: SeqProject = { bpm: 100, stepsPerBeat: 4, patternSteps: 16, tracks: [buildTrack('a'), buildTrack('b')] };
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

    let project: SeqProject = { bpm: 100, stepsPerBeat: 4, patternSteps: 16, tracks: [track] };
    project = setPatternLength(project, 8);
    project = setPatternLength(project, 16);

    expect(project.tracks[0].lengthSteps).toBe(16);
    expect(project.tracks[0].steps).toEqual(original);
  });

  it('clamps to [1, MAX_PATTERN_STEPS]', () => {
    const project: SeqProject = { bpm: 100, stepsPerBeat: 4, patternSteps: 16, tracks: [buildTrack('a')] };
    expect(setPatternLength(project, 0).patternSteps).toBe(1);
    expect(setPatternLength(project, 999).patternSteps).toBe(MAX_PATTERN_STEPS);
  });
});
