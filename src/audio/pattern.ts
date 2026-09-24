import type { Step } from './types';

export const STEP_OFF = 0;
export const STEP_NORMAL = 0.7;
export const STEP_ACCENT = 1;

/** Builds a pattern of the given length with every step at the default
 * ("normal") velocity — matches today's "every position always plays".
 * AudioEngine applies a 1/STEP_NORMAL makeup gain downstream so a normal
 * step's output level exactly matches the pre-pattern default. */
export function defaultPattern(length: number): Step[] {
  return Array.from({ length }, () => ({ velocity: STEP_NORMAL }));
}

/** Resizes a pattern to a new step count: extra steps are dropped, new
 * ones default to STEP_NORMAL. */
export function resizePattern(pattern: Step[], newLength: number): Step[] {
  if (newLength === pattern.length) return pattern;
  if (newLength < pattern.length) return pattern.slice(0, newLength);
  return [...pattern, ...defaultPattern(newLength - pattern.length)];
}

/** off -> normal -> accent -> off */
export function cycleStepVelocity(velocity: number): number {
  if (velocity === STEP_OFF) return STEP_NORMAL;
  if (velocity === STEP_NORMAL) return STEP_ACCENT;
  return STEP_OFF;
}

export type StepVisualState = 'off' | 'normal' | 'accent';

/** Classifies a step's velocity into the 3 visual states shared by both
 * the circle and grid views. Uses thresholds (not exact equality) so any
 * 0..1 velocity a preset or saved pattern might carry still classifies
 * sensibly, not just the 3 values the edit cycle itself produces. */
export function stepVisualState(velocity: number): StepVisualState {
  if (velocity <= STEP_OFF) return 'off';
  if (velocity >= STEP_ACCENT - 0.001) return 'accent';
  return 'normal';
}
