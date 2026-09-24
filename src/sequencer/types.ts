import type { VoiceId } from '../audio/types';

/** Every track's `steps` array is always exactly this long, regardless of
 * `lengthSteps`/`patternSteps` — those only limit which prefix is played or
 * shown, so shrinking then growing the pattern length never discards step
 * data (e.g. 16 -> 8 -> 16 steps restores exactly what was there before). */
export const MAX_PATTERN_STEPS = 32;

export interface SeqStep {
  velocity: number;
  /** Reserved for melodic tracks (UI lands in a later phase); drum voices
   * ignore it. */
  note?: number;
  /** In steps, reserved for melodic tracks; drum voices ignore it. */
  length?: number;
}

export type SeqTrackKind = 'drum' | 'melodic';

export interface SeqTrack {
  id: string;
  name: string;
  kind: SeqTrackKind;
  voiceId: VoiceId;
  gain: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  /** This track's own pattern length — defaults to the project's
   * patternSteps, but can differ (polymeter) once there's UI for it. A
   * track's playing step is the global step index mod lengthSteps. */
  lengthSteps: number;
  steps: SeqStep[];
}

export interface SeqProject {
  bpm: number;
  stepsPerBeat: number;
  /** The project-wide default/displayed pattern length (8/16/32). */
  patternSteps: number;
  tracks: SeqTrack[];
}
