/** Extra per-hit parameters a caller may supply; a Voice that doesn't need
 * them (e.g. today's drum voices) simply omits the parameter — TypeScript's
 * structural typing allows an implementation to declare fewer parameters
 * than the interface. */
export interface VoicePlayOptions {
  /** Reserved for melodic voices (not implemented yet); drum voices ignore it. */
  note?: number;
  /** Sustain length in seconds, for voices whose envelope can be timed. */
  duration?: number;
}

/**
 * A Voice renders one hit. `velocity` is 0..1 and scales loudness (and
 * optionally timbre); `destination` is the node to connect into — callers
 * own the mixer chain downstream of it, a Voice never touches gain/pan
 * beyond its own transient envelope.
 */
export interface Voice {
  play(time: number, velocity: number, destination: AudioNode, options?: VoicePlayOptions): void;
}
