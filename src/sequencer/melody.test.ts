import { describe, expect, it } from 'vitest';
import { clearMelodicNote, drawMelodicStep, isNoteHead, melodicCellVisual, setMelodicAccent, setMelodicNote, setMelodicNoteLength } from './melody';
import { defaultSeqSteps, SEQ_STEP_ACCENT, SEQ_STEP_NORMAL } from './pattern';
import type { SeqStep } from './types';

const LENGTH_STEPS = 16;

describe('setMelodicNote (monophony)', () => {
  it('places a new note at length 1', () => {
    const steps = setMelodicNote(defaultSeqSteps(), 4, 60);
    expect(steps[4]).toMatchObject({ velocity: SEQ_STEP_NORMAL, note: 60, length: 1 });
  });

  it('truncates a previous note whose sustain would otherwise overlap the new one', () => {
    let steps = defaultSeqSteps();
    steps = setMelodicNote(steps, 2, 60);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 2, 8); // sustain 2..8
    steps = setMelodicNote(steps, 5, 64); // new note in the middle of that sustain

    expect(steps[2]).toMatchObject({ note: 60, length: 3 }); // truncated to 2..4
    expect(steps[5]).toMatchObject({ note: 64, length: 1 });
    expect(isNoteHead(steps[3])).toBe(false);
    expect(isNoteHead(steps[4])).toBe(false);
  });

  it('overwrites a note placed exactly at an existing head', () => {
    let steps = defaultSeqSteps();
    steps = setMelodicNote(steps, 4, 60);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 4, 7);
    steps = setMelodicNote(steps, 4, 67);
    expect(steps[4]).toMatchObject({ note: 67, length: 1 });
  });

  it('placing a note on a step that was merely covered (not a head) also truncates the covering note', () => {
    let steps = defaultSeqSteps();
    steps = setMelodicNote(steps, 0, 60);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 0, 5); // covers 0..5
    steps = setMelodicNote(steps, 3, 62); // step 3 was covered, not a head

    expect(steps[0]).toMatchObject({ note: 60, length: 3 }); // truncated to 0..2
    expect(steps[3]).toMatchObject({ note: 62, length: 1 });
  });

  it('does not touch an earlier note that does not actually reach the new index', () => {
    let steps = defaultSeqSteps();
    steps = setMelodicNote(steps, 0, 60); // length 1, covers only step 0
    steps = setMelodicNote(steps, 3, 62);
    expect(steps[0]).toMatchObject({ note: 60, length: 1 });
  });
});

describe('drawMelodicStep', () => {
  it('places a note on an empty/covered cell', () => {
    const steps = drawMelodicStep(defaultSeqSteps(), 4, 60);
    expect(steps[4]).toMatchObject({ note: 60, velocity: SEQ_STEP_NORMAL });
  });

  it('deletes an existing note head when tapped at its own pitch', () => {
    let steps = defaultSeqSteps();
    steps = drawMelodicStep(steps, 4, 60);
    steps = drawMelodicStep(steps, 4, 60);
    expect(isNoteHead(steps[4])).toBe(false);
    expect(steps[4].velocity).toBe(0);
  });

  it('relocates rather than deletes when tapped at a different pitch (a different piano-roll row, same column)', () => {
    let steps = defaultSeqSteps();
    steps = drawMelodicStep(steps, 4, 60);
    steps = drawMelodicStep(steps, 4, 64); // different row, same step
    expect(steps[4]).toMatchObject({ note: 64, length: 1 });
  });
});

describe('clearMelodicNote', () => {
  it('is a no-op on a step that is not a note head', () => {
    const steps = defaultSeqSteps();
    expect(clearMelodicNote(steps, 4)).toEqual(steps);
  });
});

describe('setMelodicNoteLength', () => {
  function withNoteAt(index: number, note = 60): SeqStep[] {
    return setMelodicNote(defaultSeqSteps(), index, note);
  }

  it('extends a note and marks the newly-covered steps as off', () => {
    const steps = setMelodicNoteLength(withNoteAt(2), LENGTH_STEPS, 2, 5);
    expect(steps[2]).toMatchObject({ note: 60, length: 4 });
    for (const i of [3, 4, 5]) expect(isNoteHead(steps[i])).toBe(false);
  });

  it('is clamped so it can never reach the next note head', () => {
    let steps = withNoteAt(2);
    steps = setMelodicNote(steps, 6, 64);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 2, 10); // tries to reach past step 6
    expect(steps[2].length).toBe(4); // 2..5, stops right before the next head at 6
    expect(steps[6]).toMatchObject({ note: 64, length: 1 }); // untouched
  });

  it('is clamped so it can never reach past the pattern end (lengthSteps)', () => {
    const steps = setMelodicNoteLength(withNoteAt(14), 16, 14, 30);
    expect(steps[14].length).toBe(2); // 14..15, pattern ends at index 15
  });

  it('can shorten an existing longer note', () => {
    let steps = withNoteAt(2);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 2, 8);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 2, 3);
    expect(steps[2].length).toBe(2);
  });

  it('is a no-op when headIndex is not a note head', () => {
    const steps = defaultSeqSteps();
    expect(setMelodicNoteLength(steps, LENGTH_STEPS, 2, 5)).toEqual(steps);
  });

  it('length is never less than 1 even if targetIndex is before headIndex', () => {
    const steps = setMelodicNoteLength(withNoteAt(5), LENGTH_STEPS, 5, 2);
    expect(steps[5].length).toBe(1);
  });
});

describe('setMelodicAccent', () => {
  it('toggles a note head to accent and back to normal', () => {
    let steps = setMelodicNote(defaultSeqSteps(), 4, 60);
    steps = setMelodicAccent(steps, 4, true);
    expect(steps[4].velocity).toBe(SEQ_STEP_ACCENT);
    steps = setMelodicAccent(steps, 4, false);
    expect(steps[4].velocity).toBe(SEQ_STEP_NORMAL);
  });

  it('is a no-op on a non-head step', () => {
    const steps = defaultSeqSteps();
    expect(setMelodicAccent(steps, 4, true)).toEqual(steps);
  });
});

describe('melodicCellVisual', () => {
  it('reports a note head with its note/length/accent', () => {
    let steps = setMelodicNote(defaultSeqSteps(), 2, 60);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 2, 4);
    expect(melodicCellVisual(steps, 2)).toEqual({ kind: 'head', note: 60, length: 3, isAccent: false });
  });

  it('reports accent correctly', () => {
    let steps = setMelodicNote(defaultSeqSteps(), 2, 60);
    steps = setMelodicAccent(steps, 2, true);
    expect(melodicCellVisual(steps, 2)).toMatchObject({ isAccent: true });
  });

  it('reports a step covered by an earlier note, naming the covering note\'s own pitch', () => {
    let steps = setMelodicNote(defaultSeqSteps(), 2, 60);
    steps = setMelodicNoteLength(steps, LENGTH_STEPS, 2, 5);
    expect(melodicCellVisual(steps, 4)).toEqual({ kind: 'covered', note: 60 });
  });

  it('reports a truly empty step as off', () => {
    const steps = defaultSeqSteps();
    expect(melodicCellVisual(steps, 4)).toEqual({ kind: 'off' });
  });
});
