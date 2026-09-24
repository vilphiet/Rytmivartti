import type { Voice } from './Voice';

/** Plays an AudioBuffer. Safe to construct before the buffer has loaded —
 * play() is a no-op until a buffer is set. */
export class SampleVoice implements Voice {
  private buffer: AudioBuffer | null;

  constructor(buffer: AudioBuffer | null) {
    this.buffer = buffer;
  }

  play(time: number, velocity: number, destination: AudioNode): void {
    if (!this.buffer) return;
    const ctx = destination.context;
    const source = ctx.createBufferSource();
    source.buffer = this.buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.min(1, velocity), time);

    source.connect(gain);
    gain.connect(destination);
    source.start(time);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }
}
