/** Pure scheduling math, kept separate from AudioEngine so it can be unit
 * tested without an AudioContext. */

export const ACCENT_EPSILON_SECONDS = 0.004;
export const ACCENT_BOOST_FACTOR = 1.3;
export const MAX_VELOCITY = 1;

/** Seconds per step for a layer with its own cycle length (cycleBeats,
 * "L") and step count, given the shared beat duration. With cycleBeats=1
 * for every layer (today's only case) this is exactly beatDuration/steps —
 * the historical formula — so default behavior is unchanged. Different L
 * per layer (polymeter) is supported by this formula without any other
 * scheduler change; only the UI to set L is out of scope for now. */
export function stepIntervalSeconds(beatDuration: number, cycleBeats: number, steps: number): number {
  return (beatDuration * cycleBeats) / steps;
}

/** Which pattern slot a monotonically increasing step index maps to. */
export function stepIndexForBeat(idx: number, steps: number): number {
  return ((idx % steps) + steps) % steps;
}

/** Coincidence-accent boost: only applied when isAccent is true, capped at 1. */
export function applyAccentBoost(velocity: number, isAccent: boolean): number {
  if (!isAccent) return velocity;
  return Math.min(MAX_VELOCITY, velocity * ACCENT_BOOST_FACTOR);
}

export interface PendingBeat {
  layerId: string;
  time: number;
  /** Whether this layer is actually audible right now (not muted, and —
   * when some other layer is soloed — itself soloed). Computed by the
   * caller from current mute/solo state at scheduling time. */
  audible: boolean;
}

/** For each entry, true if some OTHER *audible* layer has an entry within
 * epsilon of its time. An inaudible entry is never itself flagged, and
 * never counts toward flagging another entry — a muted (or non-soloed
 * while something else is soloed) layer can't make a real coincidence
 * happen, nor register one for itself. Callers are expected to have
 * already excluded velocity=0 (off) steps from `pending`, so coincidence
 * is only ever detected between steps that actually sound. */
export function detectAccents(pending: PendingBeat[], epsilonSeconds: number): boolean[] {
  return pending.map((entry, i) => {
    if (!entry.audible) return false;
    return pending.some(
      (other, j) =>
        j !== i &&
        other.audible &&
        other.layerId !== entry.layerId &&
        Math.abs(other.time - entry.time) < epsilonSeconds,
    );
  });
}
