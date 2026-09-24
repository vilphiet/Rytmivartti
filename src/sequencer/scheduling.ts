/** Pure sequencer scheduling math, kept separate from SequencerEngine so it
 * can be unit tested without an AudioContext. Mirrors audio/scheduling.ts's
 * approach: every hit time is computed fresh from a formula (base + idx *
 * interval), never accumulated, so timing can't drift over a long run. */

export function seqStepIntervalSeconds(bpm: number, stepsPerBeat: number): number {
  return 60 / bpm / stepsPerBeat;
}

/** Which slot in a track's own pattern a monotonically increasing global
 * step index maps to — a track's own length steps is its "polymeter"
 * cycle, independent of every other track's. */
export function trackStepIndex(globalIndex: number, lengthSteps: number): number {
  return ((globalIndex % lengthSteps) + lengthSteps) % lengthSteps;
}

/** Voice duration in seconds for a step, given the current step duration.
 * Drum voices ignore this; it's for melodic tracks in a later phase. */
export function voiceDurationSeconds(stepLength: number | undefined, stepDuration: number): number {
  return (stepLength ?? 1) * stepDuration * 0.9;
}
