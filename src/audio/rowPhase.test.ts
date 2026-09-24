import { describe, expect, it } from 'vitest';
import { compensateForOutputLatency, rowPhase } from './rowPhase';

describe('rowPhase', () => {
  it('matches the shared-cycle phase formula when cycleBeats is 1 (today\'s only case)', () => {
    // Equivalent to AudioEngine.getPhase()'s own formula: ((now-base)/cycleDuration) mod 1.
    expect(rowPhase(10.25, 10, 1, 1)).toBeCloseTo(0.25);
    expect(rowPhase(11, 10, 1, 1)).toBeCloseTo(0);
    expect(rowPhase(10.9, 10, 1, 1)).toBeCloseTo(0.9);
  });

  it('uses the row\'s own cycle length (beatDuration * cycleBeats) for longer cycles', () => {
    // beatDuration=1, cycleBeats=2 -> row cycle is 2s long.
    expect(rowPhase(11, 10, 1, 2)).toBeCloseTo(0.5);
    expect(rowPhase(12, 10, 1, 2)).toBeCloseTo(0);
    expect(rowPhase(10.5, 10, 1, 2)).toBeCloseTo(0.25);
  });

  it('wraps correctly past multiple full cycles', () => {
    expect(rowPhase(17.25, 10, 1, 2)).toBeCloseTo(0.625); // 7.25s elapsed / 2s cycle = 3.625 cycles
  });

  it('handles a reference time before baseStartTime (not-yet-started) without going negative', () => {
    const phase = rowPhase(9, 10, 1, 1);
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });

  it('returns 0 for a non-positive duration instead of dividing by zero', () => {
    expect(rowPhase(10, 10, 0, 1)).toBe(0);
    expect(rowPhase(10, 10, 1, 0)).toBe(0);
    expect(rowPhase(10, 10, -1, 1)).toBe(0);
  });
});

describe('compensateForOutputLatency', () => {
  it('subtracts a known finite latency', () => {
    expect(compensateForOutputLatency(10, 0.08)).toBeCloseTo(9.92);
  });

  it('applies no compensation when latency is unavailable', () => {
    expect(compensateForOutputLatency(10, undefined)).toBe(10);
  });

  it('applies no compensation for a non-finite latency value', () => {
    expect(compensateForOutputLatency(10, NaN)).toBe(10);
    expect(compensateForOutputLatency(10, Infinity)).toBe(10);
  });

  it('ignores a non-number latency value', () => {
    expect(compensateForOutputLatency(10, 'not a number')).toBe(10);
  });
});
