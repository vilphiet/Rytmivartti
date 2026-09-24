import { describe, expect, it } from 'vitest';
import { cellWidthPx, MIN_CELL_WIDTH_PX, rowWidthPx } from './gridLayout';

describe('cellWidthPx / rowWidthPx', () => {
  it('gives a 3-step row and a 4-step row the same total width when cycleBeats matches (acceptance case)', () => {
    const pixelsPerBeat = 240;
    const width3 = rowWidthPx(pixelsPerBeat, 1, 3);
    const width4 = rowWidthPx(pixelsPerBeat, 1, 4);
    expect(width3).toBeCloseTo(width4);
    expect(width3).toBeCloseTo(pixelsPerBeat);
  });

  it('makes the 3-step row\'s cells wider than the 4-step row\'s cells, same cycleBeats', () => {
    const pixelsPerBeat = 240;
    const cell3 = cellWidthPx(pixelsPerBeat, 1, 3);
    const cell4 = cellWidthPx(pixelsPerBeat, 1, 4);
    expect(cell3).toBeGreaterThan(cell4);
    expect(cell3).toBeCloseTo(pixelsPerBeat / 3);
    expect(cell4).toBeCloseTo(pixelsPerBeat / 4);
  });

  it('doubles row width for double cycleBeats at the same step count (polymeter)', () => {
    // pixelsPerBeat chosen large enough that neither case hits MIN_CELL_WIDTH_PX,
    // so this isolates pure proportionality from the touch-target clamp.
    const pixelsPerBeat = 200;
    expect(rowWidthPx(pixelsPerBeat, 2, 4)).toBeCloseTo(rowWidthPx(pixelsPerBeat, 1, 4) * 2);
  });

  it('clamps cell width to the minimum touch target when steps is large', () => {
    const pixelsPerBeat = 100; // would give 100/32 ≈ 3.1px cells unclamped
    const cell = cellWidthPx(pixelsPerBeat, 1, 32);
    expect(cell).toBe(MIN_CELL_WIDTH_PX);
  });

  it('grows row width beyond the proportional value once the minimum clamp kicks in', () => {
    const pixelsPerBeat = 100;
    const steps = 32;
    const width = rowWidthPx(pixelsPerBeat, 1, steps);
    expect(width).toBeCloseTo(MIN_CELL_WIDTH_PX * steps);
    expect(width).toBeGreaterThan(pixelsPerBeat); // wider than the "ideal" proportional width
  });

  it('never returns a cell narrower than the minimum, regardless of steps', () => {
    for (const steps of [1, 4, 8, 16, 32, 64]) {
      expect(cellWidthPx(50, 1, steps)).toBeGreaterThanOrEqual(MIN_CELL_WIDTH_PX);
    }
  });
});
