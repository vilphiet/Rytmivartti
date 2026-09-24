import type { Waveform } from './types';

const LAYER_COLORS = [
  '#4fd8e8',
  '#ff5c8a',
  '#ffd166',
  '#7ee787',
  '#b48cff',
  '#ff8a5c',
  '#5cc8ff',
  '#f45d9c',
];

const WAVEFORMS: Waveform[] = ['sine', 'triangle', 'square', 'sawtooth'];

export const VALID_WAVEFORMS: readonly Waveform[] = WAVEFORMS;

// A minor pentatonic-ish spread so simultaneous layers stay pleasant.
const FREQUENCIES = [220, 261.63, 329.63, 392, 440, 523.25, 587.33, 659.25];

export function colorForIndex(i: number): string {
  return LAYER_COLORS[i % LAYER_COLORS.length];
}

export function waveformForIndex(i: number): Waveform {
  return WAVEFORMS[i % WAVEFORMS.length];
}

export function frequencyForIndex(i: number): number {
  return FREQUENCIES[i % FREQUENCIES.length];
}

export function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** "r, g, b" triplet for embedding in a CSS custom property, e.g. for
 * `rgba(var(--cell-color-rgb), var(--glow-opacity))`. */
export function hexToRgbTriplet(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
