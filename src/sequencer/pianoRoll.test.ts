import { describe, expect, it } from 'vitest';
import { defaultBaseOctaveForTrack, DEFAULT_BASE_OCTAVE } from './pianoRoll';
import { defaultSeqSteps } from './pattern';
import type { SeqTrack } from './types';

function buildTrack(notes: (number | undefined)[]): SeqTrack {
  const steps = defaultSeqSteps();
  notes.forEach((note, i) => {
    if (note !== undefined) steps[i] = { velocity: 0.8, note };
  });
  return {
    id: 't',
    name: 't',
    kind: 'melodic',
    voiceId: 'bass',
    gain: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    lengthSteps: 16,
    steps,
  };
}

describe('defaultBaseOctaveForTrack', () => {
  it('falls back to the given default for an empty track', () => {
    expect(defaultBaseOctaveForTrack(buildTrack([]), 4)).toBe(4);
    expect(defaultBaseOctaveForTrack(buildTrack([]))).toBe(DEFAULT_BASE_OCTAVE);
  });

  it('centers the window so a C4 (60) note falls in the window (octaves baseOctave and baseOctave+1)', () => {
    const base = defaultBaseOctaveForTrack(buildTrack([60]));
    const windowStart = (base + 1) * 12;
    const windowEnd = windowStart + 23;
    expect(60).toBeGreaterThanOrEqual(windowStart);
    expect(60).toBeLessThanOrEqual(windowEnd);
  });

  it('centers on the average of multiple notes', () => {
    const base = defaultBaseOctaveForTrack(buildTrack([48, 48, 72])); // average 56
    const windowStart = (base + 1) * 12;
    const windowEnd = windowStart + 23;
    expect(56).toBeGreaterThanOrEqual(windowStart);
    expect(56).toBeLessThanOrEqual(windowEnd);
  });
});
