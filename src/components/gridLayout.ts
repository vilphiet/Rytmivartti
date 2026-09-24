/** Pure time-axis math for the grid view, kept separate from the React
 * component so it's unit-testable without rendering anything.
 *
 * A row's total width is proportional to its cycleBeats ("L"), and each
 * cell's width is proportional to its own step duration (cycleBeats /
 * steps) — so two rows with the same cycleBeats (today's only case, since
 * there's no UI for L yet) end up the SAME total width even with a
 * different step count, and the polyrhythm is directly visible: e.g. a
 * 3-step row's cells are individually wider than a 4-step row's, but both
 * rows span the same width.
 *
 * MIN_CELL_WIDTH_PX guarantees a comfortable touch target: when a row has
 * enough steps that pure proportionality would make cells too small, the
 * cell width is clamped up and the row simply grows wider (handled by
 * horizontal scroll in the component), rather than ever shrinking below
 * the minimum.
 */

export const MIN_CELL_WIDTH_PX = 32;

export function cellWidthPx(pixelsPerBeat: number, cycleBeats: number, steps: number): number {
  if (steps <= 0) return MIN_CELL_WIDTH_PX;
  return Math.max(MIN_CELL_WIDTH_PX, (pixelsPerBeat * cycleBeats) / steps);
}

export function rowWidthPx(pixelsPerBeat: number, cycleBeats: number, steps: number): number {
  return cellWidthPx(pixelsPerBeat, cycleBeats, steps) * steps;
}
