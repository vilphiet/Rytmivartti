import { PITCH_CLASS_NAMES } from './scale';

/** Scientific pitch notation: MIDI 60 (middle C) is "C4". */
export function noteName(note: number): string {
  const pitchClass = ((note % 12) + 12) % 12;
  const octave = Math.floor(note / 12) - 1;
  return `${PITCH_CLASS_NAMES[pitchClass]}${octave}`;
}
