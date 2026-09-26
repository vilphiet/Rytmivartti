export type Waveform = OscillatorType;

export type VoiceId = 'tone' | 'kick' | 'snare' | 'hihat' | 'rim' | 'sample' | MelodicVoiceId;

/** Melodic synth presets, for the sequencer's melodic tracks. */
export type MelodicVoiceId = 'bass' | 'lead' | 'pad' | 'pluck' | 'keys';

export interface Step {
  /** 0 = off, e.g. 0.6 = normal, 1 = accent. Any 0..1 value is valid. */
  velocity: number;
}

export interface RhythmLayer {
  id: string;
  steps: number;
  /** Layer's cycle length in shared beats ("L"). Default 1 for every
   * layer reproduces today's polyrhythm exactly; per-layer values > 1
   * enable polymeter, once a UI exposes it. */
  cycleBeats: number;
  pattern: Step[];
  color: string;
  voiceId: VoiceId;
  waveform: Waveform;
  frequency: number;
  sampleUrl?: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  hidden: boolean;
}

export interface BeatEvent {
  layerId: string;
  time: number;
  vertexIndex: number;
  isAccent: boolean;
  velocity: number;
}
