import type { Voice } from './Voice';
import type { Waveform } from '../types';

const ATTACK = 0.004;
const ACCENT_VELOCITY_THRESHOLD = 0.9;

/** The original oscillator + envelope synthesis, now behind the Voice interface. */
export class ToneVoice implements Voice {
  private waveform: Waveform;
  private frequency: number;

  constructor(waveform: Waveform, frequency: number) {
    this.waveform = waveform;
    this.frequency = frequency;
  }

  play(time: number, velocity: number, destination: AudioNode): void {
    const ctx = destination.context;
    const peak = Math.min(1, velocity);
    const decay = velocity >= ACCENT_VELOCITY_THRESHOLD ? 0.3 : 0.16;

    const osc = ctx.createOscillator();
    osc.type = this.waveform;
    osc.frequency.setValueAtTime(this.frequency, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + decay + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
