/** Shared step-cell sizing, so StepGrid and PianoRoll can't drift apart.
 * StepGrid itself (post-pagination) sizes its cells fluidly via flexbox
 * rather than these fixed pixels — CELL_WIDTH_PX/STEP_SPAN_PX remain in
 * use by PianoRoll, which still scrolls horizontally until Commit 4. */
export const CELL_WIDTH_PX = 42;
export const CELL_GAP_PX = 4;
export const GROUP_SIZE = 4;
export const STEP_SPAN_PX = CELL_WIDTH_PX + CELL_GAP_PX;
