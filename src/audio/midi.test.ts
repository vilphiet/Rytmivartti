import { describe, expect, it } from 'vitest';
import { midiNoteToFrequency } from './midi';

describe('midiNoteToFrequency', () => {
  it('A4 (69) is exactly 440 Hz', () => {
    expect(midiNoteToFrequency(69)).toBeCloseTo(440, 6);
  });

  it('one octave up doubles frequency', () => {
    expect(midiNoteToFrequency(81)).toBeCloseTo(880, 6);
  });

  it('one octave down halves frequency', () => {
    expect(midiNoteToFrequency(57)).toBeCloseTo(220, 6);
  });

  it('C4 (60, middle C) is ~261.63 Hz', () => {
    expect(midiNoteToFrequency(60)).toBeCloseTo(261.6255653, 4);
  });

  it('a semitone up multiplies by 2^(1/12)', () => {
    expect(midiNoteToFrequency(70) / midiNoteToFrequency(69)).toBeCloseTo(Math.pow(2, 1 / 12), 10);
  });
});
