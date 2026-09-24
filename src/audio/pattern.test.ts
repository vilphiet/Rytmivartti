import { describe, expect, it } from 'vitest';
import { cycleStepVelocity, defaultPattern, resizePattern, STEP_ACCENT, STEP_NORMAL, STEP_OFF } from './pattern';

describe('step velocity levels', () => {
  it('normal is 0.7 and accent is 1.0', () => {
    expect(STEP_NORMAL).toBe(0.7);
    expect(STEP_ACCENT).toBe(1);
    expect(STEP_OFF).toBe(0);
  });

  it('the makeup gain AudioEngine applies (1 / STEP_NORMAL) exactly cancels a normal step back to unity', () => {
    expect(STEP_NORMAL * (1 / STEP_NORMAL)).toBe(1);
  });
});

describe('cycleStepVelocity', () => {
  it('cycles off -> normal -> accent -> off', () => {
    expect(cycleStepVelocity(STEP_OFF)).toBe(STEP_NORMAL);
    expect(cycleStepVelocity(STEP_NORMAL)).toBe(STEP_ACCENT);
    expect(cycleStepVelocity(STEP_ACCENT)).toBe(STEP_OFF);
  });
});

describe('defaultPattern / resizePattern', () => {
  it('builds every step at STEP_NORMAL', () => {
    expect(defaultPattern(3)).toEqual([{ velocity: STEP_NORMAL }, { velocity: STEP_NORMAL }, { velocity: STEP_NORMAL }]);
  });

  it('drops extra steps when shrinking', () => {
    const pattern = [{ velocity: STEP_ACCENT }, { velocity: STEP_OFF }, { velocity: STEP_NORMAL }];
    expect(resizePattern(pattern, 2)).toEqual([{ velocity: STEP_ACCENT }, { velocity: STEP_OFF }]);
  });

  it('appends STEP_NORMAL steps when growing', () => {
    const pattern = [{ velocity: STEP_ACCENT }];
    expect(resizePattern(pattern, 3)).toEqual([{ velocity: STEP_ACCENT }, { velocity: STEP_NORMAL }, { velocity: STEP_NORMAL }]);
  });
});
