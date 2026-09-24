/** Pure phase math for a row/layer whose own cycle length (beatDuration *
 * cycleBeats) may differ from the engine's single shared sweep — kept
 * separate from AudioEngine so it's unit-testable without an
 * AudioContext. Does not touch scheduling in any way; it's purely a
 * derived read for the grid's visual playhead. */
export function rowPhase(referenceTime: number, baseStartTime: number, beatDuration: number, cycleBeats: number): number {
  const duration = beatDuration * cycleBeats;
  if (!(duration > 0)) return 0;
  const raw = (referenceTime - baseStartTime) / duration;
  return ((raw % 1) + 1) % 1;
}

/** Shifts a reference time back by the audio output pipeline's latency
 * (when known), so a visual indicator matches what's actually audible
 * right now rather than what was just scheduled — this can drift
 * noticeably apart on e.g. Bluetooth headphones. Falls back to no
 * compensation when the value is unavailable or not a finite number. */
export function compensateForOutputLatency(rawTime: number, outputLatency: unknown): number {
  const latency = typeof outputLatency === 'number' && Number.isFinite(outputLatency) ? outputLatency : 0;
  return rawTime - latency;
}
