import { getSharedNoiseBuffer } from '../noiseBuffer';

const COMPRESSOR_THRESHOLD = -6;
const COMPRESSOR_RATIO = 4;
const COMPRESSOR_ATTACK = 0.003;
const COMPRESSOR_RELEASE = 0.1;

/**
 * The one shared AudioContext + master chain (masterGain -> compressor ->
 * destination) for the whole app. Both the polyrhythm engine and the
 * sequencer engine connect their own per-track mixer chains into
 * `getMasterDestination()`, so there is exactly one AudioContext and one
 * compressor no matter how many tabs/engines exist.
 *
 * Lazily created on first use (ensureContext()), same as the previous
 * per-engine pattern — the browser autoplay policy is already satisfied by
 * `ctx.resume()` inside a gesture-triggered start() call, not by delaying
 * the `new AudioContext()` construction itself.
 *
 * This class is never disposed during normal operation: it outlives any
 * individual engine (which come and go as tabs mount/unmount).
 */
export class AudioBus {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = COMPRESSOR_THRESHOLD;
      this.compressor.ratio.value = COMPRESSOR_RATIO;
      this.compressor.attack.value = COMPRESSOR_ATTACK;
      this.compressor.release.value = COMPRESSOR_RELEASE;
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.compressor);
    }
    return this.ctx;
  }

  getAudioTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** The node every engine's per-track mixer chains should connect into. */
  getMasterDestination(): GainNode {
    this.ensureContext();
    return this.masterGain!;
  }

  getNoiseBuffer(): AudioBuffer {
    return getSharedNoiseBuffer(this.ensureContext());
  }
}
