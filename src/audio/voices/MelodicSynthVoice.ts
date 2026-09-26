import type { Voice, VoicePlayOptions } from './Voice';
import type { SynthPreset } from './synthPresets';
import { midiNoteToFrequency } from '../midi';

const DEFAULT_NOTE = 60;
const DEFAULT_DURATION = 0.3;
const STOP_MARGIN = 0.05;
/** setTargetAtTime's time constant reaches ~95% of the way to the target
 * after 3 time constants — dividing the desired release time by 3 makes
 * the release "feel" like it takes about that long. */
const RELEASE_TIME_CONSTANT_DIVISOR = 3;

/**
 * oscillator(s) → shared lowpass filter (its own envelope) → shared
 * ADSR amp gain → destination. Frequency = 440 * 2^((note-69)/12).
 *
 * Note-off starts at time+duration: every envelope uses
 * cancelAndHoldAtTime() at that instant before starting its release, so a
 * note shorter than its own attack+decay releases cleanly from wherever
 * the envelope actually was (no jump/click), rather than snapping to the
 * sustain level first. Oscillators are stopped comfortably after both
 * envelopes' releases have practically finished, and every node is
 * disconnected on `onended` — nothing is left connected once a note ends.
 */
export class MelodicSynthVoice implements Voice {
  private preset: SynthPreset;

  constructor(preset: SynthPreset) {
    this.preset = preset;
  }

  play(time: number, velocity: number, destination: AudioNode, options?: VoicePlayOptions): void {
    const ctx = destination.context;
    const note = options?.note ?? DEFAULT_NOTE;
    const duration = Math.max(0, options?.duration ?? DEFAULT_DURATION);
    const frequency = midiNoteToFrequency(note);
    const peak = Math.max(0, Math.min(1, velocity));

    const { filterEnvelope: fe, ampEnvelope: ae } = this.preset;
    const noteOffTime = time + duration;
    const stopTime = noteOffTime + Math.max(fe.release, ae.release) * 2 + STOP_MARGIN;

    const filter = ctx.createBiquadFilter();
    filter.type = this.preset.filterType;
    filter.Q.value = this.preset.filterQ;
    const filterPeak = this.preset.filterBaseFreq + this.preset.filterEnvAmount;
    const filterSustainLevel = this.preset.filterBaseFreq + this.preset.filterEnvAmount * fe.sustain;
    filter.frequency.setValueAtTime(this.preset.filterBaseFreq, time);
    filter.frequency.linearRampToValueAtTime(filterPeak, time + fe.attack);
    filter.frequency.linearRampToValueAtTime(filterSustainLevel, time + fe.attack + fe.decay);
    filter.frequency.cancelAndHoldAtTime(noteOffTime);
    filter.frequency.setTargetAtTime(this.preset.filterBaseFreq, noteOffTime, fe.release / RELEASE_TIME_CONSTANT_DIVISOR);

    const ampGain = ctx.createGain();
    const ampSustainLevel = peak * ae.sustain;
    ampGain.gain.setValueAtTime(0, time);
    ampGain.gain.linearRampToValueAtTime(peak, time + ae.attack);
    ampGain.gain.linearRampToValueAtTime(ampSustainLevel, time + ae.attack + ae.decay);
    ampGain.gain.cancelAndHoldAtTime(noteOffTime);
    ampGain.gain.setTargetAtTime(0, noteOffTime, ae.release / RELEASE_TIME_CONSTANT_DIVISOR);

    filter.connect(ampGain);
    ampGain.connect(destination);

    const oscillators: OscillatorNode[] = [];
    const oscGains: GainNode[] = [];
    for (const spec of this.preset.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(frequency, time);
      osc.detune.setValueAtTime(spec.detuneCents, time);
      const oscGain = ctx.createGain();
      oscGain.gain.value = spec.gain;
      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(time);
      osc.stop(stopTime);
      oscillators.push(osc);
      oscGains.push(oscGain);
    }

    const cleanup = () => {
      filter.disconnect();
      ampGain.disconnect();
      for (const osc of oscillators) osc.disconnect();
      for (const oscGain of oscGains) oscGain.disconnect();
    };
    for (const osc of oscillators) osc.onended = cleanup;
  }
}
