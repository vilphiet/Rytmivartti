import type { SeqStep } from './types';
import { SEQ_STEP_ACCENT, SEQ_STEP_NORMAL } from './pattern';

/** A melodic track is monophonic: at most one "note head" (a step with
 * velocity > 0 and a note) at a time, whose `length` (in steps) covers
 * the steps right after it — those covered steps are plain velocity-0
 * steps, not separately marked; a step's "owner" is found by scanning
 * backward for the nearest head whose length reaches it (see
 * ownerNoteHeadIndex). This file's functions are the only place that
 * edits a melodic track's steps, so they're what keeps that invariant
 * (at most one head covering any given step) true. */

export function isNoteHead(step: SeqStep | undefined): step is SeqStep & { note: number } {
  return !!step && step.velocity > 0 && step.note !== undefined;
}

/** First note-head index at or after `fromIndex`, within [0, lengthSteps).
 * Returns `lengthSteps` if there is none (i.e. nothing bounds a note
 * placed at `fromIndex` before the pattern's own end). */
function nextNoteHeadIndex(steps: SeqStep[], lengthSteps: number, fromIndex: number): number {
  for (let i = fromIndex; i < lengthSteps; i++) {
    if (isNoteHead(steps[i])) return i;
  }
  return lengthSteps;
}

/** The note head that covers `index` (including `index` itself if it IS a
 * head), or -1 if `index` isn't covered by any note. */
function ownerNoteHeadIndex(steps: SeqStep[], index: number): number {
  for (let i = index; i >= 0; i--) {
    const step = steps[i];
    if (isNoteHead(step)) {
      const length = step.length ?? 1;
      return i + length - 1 >= index ? i : -1;
    }
  }
  return -1;
}

/** Places a new note (length 1) at `index`, truncating a previous note
 * whose sustain would otherwise still reach into `index` — this is what
 * keeps the track monophonic (setting a new note always wins). Overwrites
 * whatever was at `index` itself, head or covered step alike. */
export function setMelodicNote(steps: SeqStep[], index: number, note: number, velocity: number = SEQ_STEP_NORMAL): SeqStep[] {
  const next = steps.slice();
  const prevOwner = index > 0 ? ownerNoteHeadIndex(steps, index - 1) : -1;
  if (prevOwner !== -1) {
    next[prevOwner] = { ...next[prevOwner], length: index - prevOwner };
  }
  next[index] = { velocity, note, length: 1 };
  return next;
}

export type MelodicCellVisual =
  | { kind: 'off' }
  /** `note` is the covering note's own pitch — a piano-roll row needs this
   * to tell whether a covered step belongs to ITS row or to some other
   * pitch's sustain passing through the same column. */
  | { kind: 'covered'; note: number }
  | { kind: 'head'; note: number; length: number; isAccent: boolean };

/** What a melodic track's cell at `index` should show: an actual note
 * head (with its note/length/accent), a step covered by an earlier note's
 * sustain, or a truly empty step. Shared by rendering (StepGrid/PianoRoll)
 * and interaction hit-testing (a piano-roll tap only counts as "on the
 * note" when it's a 'head' AND its note matches the tapped row). */
export function melodicCellVisual(steps: SeqStep[], index: number): MelodicCellVisual {
  const step = steps[index];
  if (isNoteHead(step)) {
    return { kind: 'head', note: step.note, length: step.length ?? 1, isAccent: step.velocity >= SEQ_STEP_ACCENT };
  }
  const ownerIndex = ownerNoteHeadIndex(steps, index);
  if (ownerIndex === -1) return { kind: 'off' };
  const owner = steps[ownerIndex];
  return { kind: 'covered', note: owner.note! };
}

/** Removes the note head at `index` (a no-op if it isn't one). The steps
 * it used to cover simply become unowned — they were already velocity-0
 * entries, nothing else to clean up. */
export function clearMelodicNote(steps: SeqStep[], index: number): SeqStep[] {
  if (!isNoteHead(steps[index])) return steps;
  const next = steps.slice();
  next[index] = { velocity: 0 };
  return next;
}

/** The "Piirrä" (draw) tool: tapping the exact cell that already shows a
 * note (same step index AND same pitch) deletes it; tapping anything else
 * — a truly empty step, a step covered by another note's sustain, or even
 * an occupied step at a *different* pitch row than its current note —
 * places a new note there instead (relocating an existing note to a new
 * pitch reads, visually, as tapping an empty cell at that pitch). */
export function drawMelodicStep(steps: SeqStep[], index: number, note: number, velocity: number = SEQ_STEP_NORMAL): SeqStep[] {
  const existing = steps[index];
  const isExactHead = isNoteHead(existing) && existing.note === note;
  return isExactHead ? clearMelodicNote(steps, index) : setMelodicNote(steps, index, note, velocity);
}

/** The "Pituus" (length) tool: extends/shortens the note at `headIndex` so
 * it reaches `targetIndex`, clamped to never reach the next note head nor
 * past `lengthSteps` (the pattern's currently visible/playable length). A
 * no-op if `headIndex` isn't a note head. */
export function setMelodicNoteLength(steps: SeqStep[], lengthSteps: number, headIndex: number, targetIndex: number): SeqStep[] {
  if (!isNoteHead(steps[headIndex])) return steps;

  const boundary = Math.min(nextNoteHeadIndex(steps, lengthSteps, headIndex + 1), lengthSteps);
  const maxLength = Math.max(1, boundary - headIndex);
  const requestedLength = targetIndex - headIndex + 1;
  const length = Math.max(1, Math.min(maxLength, requestedLength));

  const next = steps.slice();
  next[headIndex] = { ...next[headIndex], length };
  for (let i = headIndex + 1; i < headIndex + length && i < lengthSteps; i++) {
    next[i] = { velocity: 0 };
  }
  return next;
}

/** The "Aksentti" tool: toggles a note head between normal and accent
 * velocity. A no-op if `index` isn't a note head. */
export function setMelodicAccent(steps: SeqStep[], index: number, isAccent: boolean): SeqStep[] {
  if (!isNoteHead(steps[index])) return steps;
  const next = steps.slice();
  next[index] = { ...next[index], velocity: isAccent ? SEQ_STEP_ACCENT : SEQ_STEP_NORMAL };
  return next;
}
