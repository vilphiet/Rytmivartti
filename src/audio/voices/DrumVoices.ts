import type { Voice } from './Voice';

const ACCENT_VELOCITY_THRESHOLD = 0.9;

function disconnectOnEnded(node: AudioScheduledSourceNode, ...rest: AudioNode[]): void {
  node.onended = () => {
    node.disconnect();
    for (const n of rest) n.disconnect();
  };
}

/** Sine with a fast pitch drop (150 -> 50 Hz over ~100ms) and a short amp envelope. */
export class KickVoice implements Voice {
  play(time: number, velocity: number, destination: AudioNode): void {
    const ctx = destination.context;
    const peak = Math.min(1, velocity);
    const decay = velocity >= ACCENT_VELOCITY_THRESHOLD ? 0.22 : 0.16;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(time);
    osc.stop(time + decay + 0.02);
    disconnectOnEnded(osc, gain);
  }
}

/** Filtered noise burst + a short triangle blip for body. */
export class SnareVoice implements Voice {
  private noiseBuffer: AudioBuffer;

  constructor(noiseBuffer: AudioBuffer) {
    this.noiseBuffer = noiseBuffer;
  }

  play(time: number, velocity: number, destination: AudioNode): void {
    const ctx = destination.context;
    const peak = Math.min(1, velocity);
    const decay = velocity >= ACCENT_VELOCITY_THRESHOLD ? 0.18 : 0.13;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, time);
    noiseGain.gain.linearRampToValueAtTime(peak * 0.8, time + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);
    noise.start(time);
    noise.stop(time + decay + 0.02);
    disconnectOnEnded(noise, noiseFilter, noiseGain);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, time);
    oscGain.gain.linearRampToValueAtTime(peak * 0.5, time + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + decay * 0.6);
    osc.connect(oscGain);
    oscGain.connect(destination);
    osc.start(time);
    osc.stop(time + decay);
    disconnectOnEnded(osc, oscGain);
  }
}

/** Highpass-filtered noise, very short — closed hihat. */
export class HihatVoice implements Voice {
  private noiseBuffer: AudioBuffer;

  constructor(noiseBuffer: AudioBuffer) {
    this.noiseBuffer = noiseBuffer;
  }

  play(time: number, velocity: number, destination: AudioNode): void {
    const ctx = destination.context;
    const peak = Math.min(1, velocity);
    const decay = velocity >= ACCENT_VELOCITY_THRESHOLD ? 0.07 : 0.045;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak * 0.7, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
    noise.stop(time + decay + 0.01);
    disconnectOnEnded(noise, filter, gain);
  }
}

/** Bandpass-filtered noise click — rim/clave. */
export class RimVoice implements Voice {
  private noiseBuffer: AudioBuffer;

  constructor(noiseBuffer: AudioBuffer) {
    this.noiseBuffer = noiseBuffer;
  }

  play(time: number, velocity: number, destination: AudioNode): void {
    const ctx = destination.context;
    const peak = Math.min(1, velocity);
    const decay = velocity >= ACCENT_VELOCITY_THRESHOLD ? 0.03 : 0.018;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak * 0.9, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    noise.start(time);
    noise.stop(time + decay + 0.01);
    disconnectOnEnded(noise, filter, gain);
  }
}
