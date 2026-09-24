import { describe, expect, it } from 'vitest';
import {
  ACCENT_EPSILON_SECONDS,
  applyAccentBoost,
  detectAccents,
  stepIndexForBeat,
  stepIntervalSeconds,
  type PendingBeat,
} from './scheduling';

describe('stepIntervalSeconds', () => {
  it('matches the historical n-based formula when cycleBeats is 1 for every layer', () => {
    // This is today's only case: interval = beatDuration / steps.
    expect(stepIntervalSeconds(1, 1, 4)).toBeCloseTo(0.25);
    expect(stepIntervalSeconds(0.5, 1, 3)).toBeCloseTo(0.5 / 3);
  });

  it('scales with cycleBeats (L) for polymeter, independent of the timer loop', () => {
    // Same step count, twice the cycle length -> steps are twice as slow.
    expect(stepIntervalSeconds(1, 2, 4)).toBeCloseTo(0.5);
    // Same cycleBeats, more steps -> steps are faster.
    expect(stepIntervalSeconds(1, 2, 8)).toBeCloseTo(0.25);
  });

  it('produces correct absolute hit times for two layers with different L sharing one baseStartTime', () => {
    const baseStartTime = 10;
    const beatDuration = 1;

    // Layer A: cycleBeats=1, steps=4 -> hits every 0.25s.
    const intervalA = stepIntervalSeconds(beatDuration, 1, 4);
    const timesA = [0, 1, 2, 3].map((idx) => baseStartTime + idx * intervalA);
    expect(timesA).toEqual([10, 10.25, 10.5, 10.75]);

    // Layer B: cycleBeats=2, steps=4 -> hits every 0.5s (a 2-beat-long cycle).
    const intervalB = stepIntervalSeconds(beatDuration, 2, 4);
    const timesB = [0, 1, 2, 3].map((idx) => baseStartTime + idx * intervalB);
    expect(timesB).toEqual([10, 10.5, 11, 11.5]);
  });
});

describe('stepIndexForBeat', () => {
  it('wraps the running index into the pattern length', () => {
    expect(stepIndexForBeat(0, 4)).toBe(0);
    expect(stepIndexForBeat(3, 4)).toBe(3);
    expect(stepIndexForBeat(4, 4)).toBe(0);
    expect(stepIndexForBeat(5, 4)).toBe(1);
  });

  it('handles negative input defensively (never produced by the engine, but stays well-defined)', () => {
    expect(stepIndexForBeat(-1, 4)).toBe(3);
  });
});

describe('applyAccentBoost', () => {
  it('leaves velocity untouched when not a coincidence accent', () => {
    expect(applyAccentBoost(0.7, false)).toBe(0.7);
  });

  it('boosts by 1.3x on a coincidence accent', () => {
    // 0.7 is STEP_NORMAL's value: the default, un-accented pattern velocity.
    expect(applyAccentBoost(0.7, true)).toBeCloseTo(0.91);
  });

  it('caps the boosted velocity at 1.0', () => {
    expect(applyAccentBoost(0.9, true)).toBe(1);
    expect(applyAccentBoost(1, true)).toBe(1);
  });
});

describe('detectAccents', () => {
  it('flags entries from different layers landing within epsilon', () => {
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true },
      { layerId: 'b', time: 1.001, audible: true },
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([true, true]);
  });

  it('does not flag entries further apart than epsilon', () => {
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true },
      { layerId: 'b', time: 1.1, audible: true },
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([false, false]);
  });

  it('does not flag two close hits from the same layer', () => {
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true },
      { layerId: 'a', time: 1.001, audible: true },
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([false, false]);
  });

  it('only considers steps that were actually scheduled, because callers filter off-steps (velocity=0) before building `pending`', () => {
    // Layer "b" has a step at the same instant as layer "a", but it is OFF
    // (velocity 0) so the engine never pushes it into `pending` in the
    // first place — it must never influence layer "a"'s accent detection.
    const allScheduledIncludingOff = [
      { layerId: 'a', time: 1.0, velocity: 0.7 },
      { layerId: 'b', time: 1.0, velocity: 0 }, // off step, would-be coincidence
      { layerId: 'c', time: 5.0, velocity: 0.7 },
    ];
    const pending: PendingBeat[] = allScheduledIncludingOff
      .filter((e) => e.velocity > 0)
      .map((e) => ({ layerId: e.layerId, time: e.time, audible: true }));

    expect(pending).toHaveLength(2);
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([false, false]);
  });

  it('never flags a muted layer as an accent, even coinciding with an audible layer', () => {
    // "b" is muted (audible: false) at the same instant as audible "a".
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true },
      { layerId: 'b', time: 1.0, audible: false },
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([false, false]);
  });

  it('does not let a muted layer cause an accent for an otherwise-lone audible layer', () => {
    // Without "b" in the picture at all, "a" would have no coincidence.
    // "b" being muted must not change that outcome for "a".
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true },
      { layerId: 'b', time: 1.0, audible: false },
      { layerId: 'c', time: 5.0, audible: true },
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([false, false, false]);
  });

  it('still flags a genuine coincidence between two other audible layers regardless of a muted layer nearby', () => {
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true },
      { layerId: 'b', time: 1.0, audible: true },
      { layerId: 'muted', time: 1.0, audible: false },
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([true, true, false]);
  });

  it('treats non-soloed layers as inaudible once any layer is soloed', () => {
    // Caller is expected to compute `audible` as !muted && (!anySolo || solo);
    // here "a" is soloed, "b" is not muted but also not soloed, so it's
    // treated as inaudible for accent purposes while something else solos.
    const pending: PendingBeat[] = [
      { layerId: 'a', time: 1.0, audible: true }, // soloed
      { layerId: 'b', time: 1.0, audible: false }, // not soloed, so inaudible
    ];
    expect(detectAccents(pending, ACCENT_EPSILON_SECONDS)).toEqual([false, false]);
  });
});
