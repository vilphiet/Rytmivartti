import type { VoiceId } from '../audio/types';
import type { SeqProject, SeqStep, SeqTrack } from './types';
import { defaultSeqSteps, SEQ_STEP_ACCENT, SEQ_STEP_NORMAL } from './pattern';

export const DEFAULT_SEQ_BPM = 100;
export const DEFAULT_STEPS_PER_BEAT = 4;
export const DEFAULT_PATTERN_STEPS = 16;

let idCounter = 0;
export function makeTrackId(): string {
  idCounter += 1;
  // Timestamp component keeps ids unique across page reloads/sessions, not
  // just within one, matching the polyrhythm side's layer id scheme.
  return `track-${Date.now().toString(36)}-${idCounter}`;
}

function stepsWithHits(hits: { index: number; velocity: number }[]): SeqStep[] {
  const steps = defaultSeqSteps();
  for (const { index, velocity } of hits) {
    steps[index] = { velocity };
  }
  return steps;
}

export function buildDrumTrack(name: string, voiceId: VoiceId, steps: SeqStep[], lengthSteps: number): SeqTrack {
  return {
    id: makeTrackId(),
    name,
    kind: 'drum',
    voiceId,
    gain: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    lengthSteps,
    steps,
  };
}

/** 4 drum tracks pre-loaded with a simple basic beat, so Play does
 * something immediately: kick on 1 and 3, snare on 2 and 4, steady
 * eighth-note hihat, rim left empty for the player to fill in. */
export function buildDefaultProject(): SeqProject {
  const patternSteps = DEFAULT_PATTERN_STEPS;
  return {
    bpm: DEFAULT_SEQ_BPM,
    stepsPerBeat: DEFAULT_STEPS_PER_BEAT,
    patternSteps,
    tracks: [
      buildDrumTrack(
        'Kick',
        'kick',
        stepsWithHits([
          { index: 0, velocity: SEQ_STEP_ACCENT },
          { index: 8, velocity: SEQ_STEP_NORMAL },
        ]),
        patternSteps,
      ),
      buildDrumTrack(
        'Snare',
        'snare',
        stepsWithHits([
          { index: 4, velocity: SEQ_STEP_NORMAL },
          { index: 12, velocity: SEQ_STEP_NORMAL },
        ]),
        patternSteps,
      ),
      buildDrumTrack(
        'Hihat',
        'hihat',
        stepsWithHits([0, 2, 4, 6, 8, 10, 12, 14].map((index) => ({ index, velocity: SEQ_STEP_NORMAL }))),
        patternSteps,
      ),
      buildDrumTrack('Rim', 'rim', defaultSeqSteps(), patternSteps),
    ],
  };
}
