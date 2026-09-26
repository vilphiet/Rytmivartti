/** Pure MIDI note math, kept separate from any Voice so it's unit-testable
 * without an AudioContext. */

/** Standard MIDI-to-frequency formula: A4 (note 69) = 440 Hz, 12-TET. */
export function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}
