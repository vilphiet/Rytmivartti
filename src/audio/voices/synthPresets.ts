import type { MelodicVoiceId, Waveform } from '../types';

export interface SynthOscillatorSpec {
  type: Waveform;
  /** Detune in cents, applied via the oscillator's own `detune` AudioParam. */
  detuneCents: number;
  /** Relative mix gain, before the shared filter/amp stage. */
  gain: number;
}

/** ADSR in seconds (attack/decay/release) plus a 0..1 sustain level. */
export interface Adsr {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthPreset {
  label: string;
  oscillators: SynthOscillatorSpec[];
  filterType: BiquadFilterType;
  /** Cutoff at rest (Hz). */
  filterBaseFreq: number;
  /** Added to filterBaseFreq at the envelope's peak (Hz). */
  filterEnvAmount: number;
  filterEnvelope: Adsr;
  filterQ: number;
  ampEnvelope: Adsr;
}

const BASS: SynthPreset = {
  label: 'Basso',
  oscillators: [{ type: 'sawtooth', detuneCents: 0, gain: 1 }],
  filterType: 'lowpass',
  filterBaseFreq: 150,
  filterEnvAmount: 800,
  filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.3, release: 0.08 },
  filterQ: 1,
  ampEnvelope: { attack: 0.005, decay: 0.12, sustain: 0.7, release: 0.08 },
};

const LEAD: SynthPreset = {
  label: 'Lead',
  oscillators: [
    { type: 'sawtooth', detuneCents: -7, gain: 0.6 },
    { type: 'sawtooth', detuneCents: 7, gain: 0.6 },
  ],
  filterType: 'lowpass',
  filterBaseFreq: 800,
  filterEnvAmount: 2500,
  filterEnvelope: { attack: 0.02, decay: 0.25, sustain: 0.6, release: 0.15 },
  filterQ: 2,
  ampEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.15 },
};

const PAD: SynthPreset = {
  label: 'Pad',
  oscillators: [
    { type: 'sawtooth', detuneCents: -5, gain: 0.5 },
    { type: 'triangle', detuneCents: 5, gain: 0.5 },
  ],
  filterType: 'lowpass',
  filterBaseFreq: 400,
  filterEnvAmount: 1200,
  filterEnvelope: { attack: 0.8, decay: 0.6, sustain: 0.7, release: 1.2 },
  filterQ: 0.7,
  ampEnvelope: { attack: 0.6, decay: 0.3, sustain: 0.85, release: 1.5 },
};

const PLUCK: SynthPreset = {
  label: 'Pluck',
  oscillators: [{ type: 'triangle', detuneCents: 0, gain: 1 }],
  filterType: 'lowpass',
  filterBaseFreq: 200,
  filterEnvAmount: 3500,
  filterEnvelope: { attack: 0.002, decay: 0.12, sustain: 0.05, release: 0.1 },
  filterQ: 3,
  ampEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.15 },
};

const KEYS: SynthPreset = {
  label: 'Keys',
  oscillators: [
    { type: 'sine', detuneCents: 0, gain: 0.7 },
    { type: 'triangle', detuneCents: 4, gain: 0.5 },
  ],
  filterType: 'lowpass',
  filterBaseFreq: 900,
  filterEnvAmount: 1500,
  filterEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.5, release: 0.4 },
  filterQ: 1,
  ampEnvelope: { attack: 0.008, decay: 0.35, sustain: 0.55, release: 0.5 },
};

export const SYNTH_PRESETS: Record<MelodicVoiceId, SynthPreset> = {
  bass: BASS,
  lead: LEAD,
  pad: PAD,
  pluck: PLUCK,
  keys: KEYS,
};
