import type { SeqTrack } from './types';

export const DEFAULT_BASE_OCTAVE = 4;

/** Heuristic initial octave for the piano roll's 2-octave window, so
 * opening it centers the view on the track's existing notes instead of
 * always resetting to a fixed default. Not exact pixel-centering — the
 * window must start on an octave boundary (C), so this picks the octave
 * just below the notes' average, putting them in the window's upper
 * half. An empty track falls back to `fallbackOctave`. */
export function defaultBaseOctaveForTrack(track: SeqTrack, fallbackOctave: number = DEFAULT_BASE_OCTAVE): number {
  const notes = track.steps.map((s) => s.note).filter((n): n is number => n !== undefined);
  if (notes.length === 0) return fallbackOctave;
  const average = notes.reduce((sum, n) => sum + n, 0) / notes.length;
  const centerOctave = Math.floor(average / 12) - 1;
  return centerOctave - 1;
}
