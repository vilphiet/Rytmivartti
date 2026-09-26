import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, initHistory, pushHistory, redo, undo } from './historyStack';

describe('initHistory', () => {
  it('starts with empty past/future and the given present', () => {
    const h = initHistory('a');
    expect(h).toEqual({ past: [], present: 'a', future: [] });
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });
});

describe('pushHistory', () => {
  it('records the previous present into past and clears future', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b', 50);
    expect(h).toEqual({ past: ['a'], present: 'b', future: [] });
  });

  it('is a no-op (same reference) when next is reference-equal to present', () => {
    const h = initHistory('a');
    expect(pushHistory(h, 'a', 50)).toBe(h);
  });

  it('discards any redo branch on a fresh push after an undo', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b', 50);
    h = pushHistory(h, 'c', 50);
    h = undo(h);
    expect(h.future).toEqual(['c']);
    h = pushHistory(h, 'd', 50);
    expect(h).toEqual({ past: ['a', 'b'], present: 'd', future: [] });
  });

  it('trims past to the given limit, dropping the oldest entries', () => {
    let h = initHistory(0);
    for (let i = 1; i <= 5; i++) h = pushHistory(h, i, 3);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h.present).toBe(5);
  });
});

describe('undo/redo', () => {
  it('undo moves present back one step and records it into future', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b', 50);
    h = undo(h);
    expect(h).toEqual({ past: [], present: 'a', future: ['b'] });
  });

  it('undo is a no-op at the start of history', () => {
    const h = initHistory('a');
    expect(undo(h)).toEqual(h);
  });

  it('redo moves present forward one step', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b', 50);
    h = undo(h);
    h = redo(h);
    expect(h).toEqual({ past: ['a'], present: 'b', future: [] });
  });

  it('redo is a no-op with nothing to redo', () => {
    const h = initHistory('a');
    expect(redo(h)).toEqual(h);
  });

  it('undo then redo round-trips back to the exact same state', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b', 50);
    h = pushHistory(h, 'c', 50);
    const beforeUndo = h;
    h = undo(h);
    h = redo(h);
    expect(h).toEqual(beforeUndo);
  });

  it('supports at least 50 steps of undo, and no more than the retained limit', () => {
    let h = initHistory(0);
    for (let i = 1; i <= 60; i++) h = pushHistory(h, i, 50);
    // Only the most recent 50 transitions are retained: past = [10..59], present = 60.
    expect(h.past).toEqual(Array.from({ length: 50 }, (_, i) => i + 10));
    expect(h.present).toBe(60);

    for (let i = 0; i < 50; i++) h = undo(h);
    expect(canUndo(h)).toBe(false);
    expect(h.present).toBe(10); // the oldest retained value
    expect(h.future).toEqual(Array.from({ length: 50 }, (_, i) => i + 11));

    // The 51st undo attempt (beyond the retained history) is a no-op.
    const stuck = undo(h);
    expect(stuck).toEqual(h);

    for (let i = 0; i < 50; i++) h = redo(h);
    expect(canRedo(h)).toBe(false);
    expect(h.present).toBe(60);
  });

  it('an interleaved undo/undo/redo/push sequence behaves like a real editor history', () => {
    let h = initHistory('a');
    h = pushHistory(h, 'b', 50);
    h = pushHistory(h, 'c', 50);
    h = pushHistory(h, 'd', 50);
    h = undo(h); // -> c, future=[d]
    h = undo(h); // -> b, future=[c,d]
    expect(h.present).toBe('b');
    h = redo(h); // -> c, future=[d]
    expect(h.present).toBe('c');
    h = pushHistory(h, 'e', 50); // branches away from 'd'
    expect(h).toEqual({ past: ['a', 'b', 'c'], present: 'e', future: [] });
  });
});
