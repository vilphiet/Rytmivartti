export type Waveform = OscillatorType;

export type VoiceId = 'tone' | 'kick' | 'snare' | 'hihat' | 'rim' | 'sample';

export interface RhythmLayer {
  id: string;
  n: number;
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
