import type { SeqProject, SeqStep } from './types';
import { MAX_PATTERN_STEPS } from './types';

export const SEQ_STEP_OFF = 0;
export const SEQ_STEP_NORMAL = 0.8;
export const SEQ_STEP_ACCENT = 1;

export function defaultSeqSteps(): SeqStep[] {
  return Array.from({ length: MAX_PATTERN_STEPS }, () => ({ velocity: SEQ_STEP_OFF }));
}

/** off -> normal -> accent -> off. */
export function cycleSeqStepVelocity(velocity: number): number {
  if (velocity <= SEQ_STEP_OFF) return SEQ_STEP_NORMAL;
  if (velocity < SEQ_STEP_ACCENT) return SEQ_STEP_ACCENT;
  return SEQ_STEP_OFF;
}

export function seqStepVisualState(velocity: number): 'off' | 'normal' | 'accent' {
  if (velocity <= SEQ_STEP_OFF) return 'off';
  if (velocity >= SEQ_STEP_ACCENT) return 'accent';
  return 'normal';
}

/** Sets the project's (and every track's) pattern length without ever
 * touching a track's steps array — steps always stay MAX_PATTERN_STEPS
 * long, so shrinking then growing the pattern length restores exactly the
 * steps that were there before (e.g. 16 -> 8 -> 16). */
export function setPatternLength(project: SeqProject, patternSteps: number): SeqProject {
  const clamped = Math.max(1, Math.min(MAX_PATTERN_STEPS, Math.round(patternSteps)));
  return {
    ...project,
    patternSteps: clamped,
    tracks: project.tracks.map((t) => ({ ...t, lengthSteps: clamped })),
  };
}
