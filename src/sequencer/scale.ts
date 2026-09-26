import type { ScaleId, SeqProject } from './types';

/** Pitch-class intervals (semitones from the root, within one octave). */
export const SCALES: Record<ScaleId, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const SCALE_LABELS: Record<ScaleId, string> = {
  major: 'Duuri',
  naturalMinor: 'Luonnollinen molli',
  majorPentatonic: 'Pentatoninen duuri',
  minorPentatonic: 'Pentatoninen molli',
  dorian: 'Dorinen',
  chromatic: 'Kromaattinen',
};

export const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Semitone interval to transpose by when the root changes from `oldRoot`
 * to `newRoot` (both 0-11 pitch classes), always the shorter direction
 * around the 12-tone circle (magnitude <= 6).
 *
 * At the exact tritone (|diff| = 6, both directions equally short) this
 * deliberately does NOT force a fixed direction: it keeps whichever sign
 * the plain difference (newRoot - oldRoot) already has. That choice is
 * what makes transposeDelta(a, b) always exactly cancel
 * transposeDelta(b, a) — including at the tritone — so a round trip like
 * C -> F# -> C nets to zero instead of silently shifting everything up an
 * octave. */
export function transposeDelta(oldRoot: number, newRoot: number): number {
  let diff = newRoot - oldRoot;
  if (diff > 6) diff -= 12;
  else if (diff < -6) diff += 12;
  return diff;
}

/** Transposes every melodic track's notes by the same interval (the
 * shortest direction from the project's current root to `newRootNote`).
 * Drum tracks, and steps with no note, are untouched. */
export function transposeProject(project: SeqProject, newRootNote: number): SeqProject {
  const delta = transposeDelta(project.rootNote, newRootNote);
  return {
    ...project,
    rootNote: newRootNote,
    tracks: project.tracks.map((t) => {
      if (t.kind !== 'melodic' || delta === 0) return t;
      return { ...t, steps: t.steps.map((s) => (s.note === undefined ? s : { ...s, note: s.note + delta })) };
    }),
  };
}

/** Snaps `note` to the nearest pitch in `scaleIntervals` (relative to
 * `rootNote`), preferring the shorter direction around the octave; a tie
 * (equally close up and down) resolves downward. Already-in-scale notes
 * are returned unchanged. */
export function snapNoteToScale(note: number, rootNote: number, scaleIntervals: readonly number[]): number {
  const pitchClass = ((note - rootNote) % 12 + 12) % 12;
  if (scaleIntervals.includes(pitchClass)) return note;

  let bestOffset: number | null = null;
  for (const interval of scaleIntervals) {
    let offset = interval - pitchClass;
    if (offset > 6) offset -= 12;
    else if (offset < -6) offset += 12;
    if (bestOffset === null || Math.abs(offset) < Math.abs(bestOffset) || (Math.abs(offset) === Math.abs(bestOffset) && offset < bestOffset)) {
      bestOffset = offset;
    }
  }
  return note + (bestOffset ?? 0);
}

/** Snaps every melodic track's out-of-scale notes to the nearest tone of
 * `scale` (relative to the project's current root). Drum tracks, and
 * steps with no note, are untouched. */
export function applyScaleToProject(project: SeqProject, scale: ScaleId): SeqProject {
  const intervals = SCALES[scale];
  return {
    ...project,
    scale,
    tracks: project.tracks.map((t) => {
      if (t.kind !== 'melodic') return t;
      return {
        ...t,
        steps: t.steps.map((s) => (s.note === undefined ? s : { ...s, note: snapNoteToScale(s.note, project.rootNote, intervals) })),
      };
    }),
  };
}

/** True if applying `scale` would actually move at least one melodic
 * note — used to decide whether the UI should confirm before applying. */
export function scaleChangeAffectsNotes(project: SeqProject, scale: ScaleId): boolean {
  const intervals = SCALES[scale];
  return project.tracks.some(
    (t) =>
      t.kind === 'melodic' &&
      t.steps.some((s) => s.note !== undefined && snapNoteToScale(s.note, project.rootNote, intervals) !== s.note),
  );
}
