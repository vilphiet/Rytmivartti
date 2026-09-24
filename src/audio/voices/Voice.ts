/**
 * A Voice renders one hit. `velocity` is 0..1 and scales loudness (and
 * optionally timbre); `destination` is the node to connect into — callers
 * own the mixer chain downstream of it, a Voice never touches gain/pan
 * beyond its own transient envelope.
 */
export interface Voice {
  play(time: number, velocity: number, destination: AudioNode): void;
}
