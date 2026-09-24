import { getSharedNoiseBuffer } from '../noiseBuffer';

const COMPRESSOR_THRESHOLD = -6;
const COMPRESSOR_RATIO = 4;
const COMPRESSOR_ATTACK = 0.003;
const COMPRESSOR_RELEASE = 0.1;

/** One AudioContext and master chain (masterGain -> compressor ->
 * destination) shared by every tab's engine. Created lazily on the first
 * call that needs it (typically the first user gesture, e.g. pressing
 * Play), since browsers block audio before any user interaction anyway —
 * this avoids creating a suspended, useless context on page load. Never
 * disposed: it's a session-long singleton, outliving any single tab's
 * engine (whose own dispose() only tears down its own per-track nodes). */
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

  getMasterDestination(): GainNode {
    this.ensureContext();
    return this.masterGain!;
  }

  getNoiseBuffer(): AudioBuffer {
    return getSharedNoiseBuffer(this.ensureContext());
  }
}
