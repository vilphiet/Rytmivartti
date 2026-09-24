import { describe, expect, it } from 'vitest';
import { seqStepIntervalSeconds, trackStepIndex, voiceDurationSeconds } from './scheduling';

describe('seqStepIntervalSeconds', () => {
  it('computes seconds per 16th note at 120 bpm', () => {
    // 120 bpm -> 0.5s per beat; 4 steps per beat -> 0.125s per step.
    expect(seqStepIntervalSeconds(120, 4)).toBeCloseTo(0.125, 10);
  });

  it('computes seconds per step at a slow tempo', () => {
    // 40 bpm -> 1.5s per beat; 4 steps per beat -> 0.375s per step.
    expect(seqStepIntervalSeconds(40, 4)).toBeCloseTo(0.375, 10);
  });

  it('computes seconds per step at a fast tempo', () => {
    // 240 bpm -> 0.25s per beat; 4 steps per beat -> 0.0625s per step.
    expect(seqStepIntervalSeconds(240, 4)).toBeCloseTo(0.0625, 10);
  });

  it('scales with stepsPerBeat', () => {
    expect(seqStepIntervalSeconds(120, 8)).toBeCloseTo(0.0625, 10);
  });
});

describe('trackStepIndex', () => {
  it('wraps a global index into a track shorter than one full pattern (polymeter)', () => {
    expect(trackStepIndex(0, 5)).toBe(0);
    expect(trackStepIndex(4, 5)).toBe(4);
    expect(trackStepIndex(5, 5)).toBe(0);
    expect(trackStepIndex(11, 5)).toBe(1);
  });

  it('matches identity when lengthSteps exceeds the index', () => {
    expect(trackStepIndex(3, 16)).toBe(3);
  });

  it('never returns a negative index', () => {
    expect(trackStepIndex(0, 7)).toBeGreaterThanOrEqual(0);
    expect(trackStepIndex(100, 7)).toBeGreaterThanOrEqual(0);
  });
});

describe('voiceDurationSeconds', () => {
  it('defaults stepLength to 1 step', () => {
    expect(voiceDurationSeconds(undefined, 0.2)).toBeCloseTo(0.2 * 0.9, 10);
  });

  it('scales with an explicit stepLength', () => {
    expect(voiceDurationSeconds(4, 0.1)).toBeCloseTo(4 * 0.1 * 0.9, 10);
  });
});
