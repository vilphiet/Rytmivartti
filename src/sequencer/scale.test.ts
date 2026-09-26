import { describe, expect, it } from 'vitest';
import {
  PITCH_CLASS_NAMES,
  SCALES,
  applyScaleToProject,
  scaleChangeAffectsNotes,
  snapNoteToScale,
  transposeDelta,
  transposeProject,
} from './scale';
import { defaultSeqSteps } from './pattern';
import type { ScaleId, SeqProject, SeqTrack } from './types';

function buildMelodicTrack(id: string, notes: (number | undefined)[]): SeqTrack {
  const steps = defaultSeqSteps();
  notes.forEach((note, i) => {
    if (note !== undefined) steps[i] = { velocity: 0.8, note };
  });
  return {
    id,
    name: id,
    kind: 'melodic',
    voiceId: 'bass',
    gain: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    lengthSteps: 16,
    steps,
  };
}

function buildDrumTrack(id: string): SeqTrack {
  return {
    id,
    name: id,
    kind: 'drum',
    voiceId: 'kick',
    gain: 0.8,
    pan: 0,
    mute: false,
    solo: false,
    lengthSteps: 16,
    steps: defaultSeqSteps(),
  };
}

function buildProject(tracks: SeqTrack[], rootNote = 0, scale: ScaleId = 'major'): SeqProject {
  return { bpm: 100, stepsPerBeat: 4, patternSteps: 16, rootNote, scale, tracks };
}

describe('transposeDelta', () => {
  it('picks the shorter direction for non-tie intervals', () => {
    expect(transposeDelta(0, 2)).toBe(2); // C -> D, up 2
    expect(transposeDelta(2, 0)).toBe(-2); // D -> C, down 2
    expect(transposeDelta(1, 10)).toBe(-3); // C# -> A#, shorter down 3 (not up 9)
  });

  it('never exceeds a magnitude of 6', () => {
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        expect(Math.abs(transposeDelta(a, b))).toBeLessThanOrEqual(6);
      }
    }
  });

  it('is exactly antisymmetric for every pair, including the tritone tie (magnitude 6)', () => {
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        // `+ 0` normalizes a possible -0 to 0 so toBe's Object.is check
        // doesn't fail on sign-of-zero when a === b.
        expect(transposeDelta(a, b) + 0).toBe(-transposeDelta(b, a) + 0);
      }
    }
  });

  it('C -> F# resolves up, F# -> C resolves down (direction of the plain difference, not always up)', () => {
    expect(transposeDelta(0, 6)).toBe(6);
    expect(transposeDelta(6, 0)).toBe(-6);
  });
});

describe('transposeProject', () => {
  it('transposes every melodic note by the same interval, leaves drum tracks untouched', () => {
    const melodic = buildMelodicTrack('m', [60, 64, undefined, 67]);
    const drum = buildDrumTrack('d');
    const project = buildProject([melodic, drum], 0);

    const transposed = transposeProject(project, 2); // C -> D, up 2

    const mSteps = transposed.tracks[0].steps;
    expect(mSteps[0].note).toBe(62);
    expect(mSteps[1].note).toBe(66);
    expect(mSteps[2].note).toBeUndefined();
    expect(mSteps[3].note).toBe(69);
    expect(transposed.rootNote).toBe(2);
    expect(transposed.tracks[1]).toEqual(drum);
  });

  it('round trip C -> F# -> C restores the original notes exactly, for every starting root note', () => {
    for (let root = 0; root < 12; root++) {
      const target = (root + 6) % 12; // the tritone from this root
      const melodic = buildMelodicTrack('m', [60, 61, 65, 72, 77]);
      const original = melodic.steps.map((s) => s.note);
      const project = buildProject([melodic], root);

      const there = transposeProject(project, target);
      const back = transposeProject(there, root);

      expect(back.tracks[0].steps.map((s) => s.note)).toEqual(original);
      expect(back.rootNote).toBe(root);
    }
  });

  it('round trip works for an arbitrary (non-tritone) root change too', () => {
    const melodic = buildMelodicTrack('m', [60, 67]);
    const original = melodic.steps.map((s) => s.note);
    const project = buildProject([melodic], 3);

    const there = transposeProject(project, 9);
    const back = transposeProject(there, 3);

    expect(back.tracks[0].steps.map((s) => s.note)).toEqual(original);
  });

  it('no-op when the new root equals the current root', () => {
    const melodic = buildMelodicTrack('m', [60]);
    const project = buildProject([melodic], 0);
    const result = transposeProject(project, 0);
    expect(result.tracks[0].steps[0].note).toBe(60);
  });
});

describe('snapNoteToScale', () => {
  it('leaves an already-in-scale note unchanged', () => {
    expect(snapNoteToScale(62, 0, SCALES.major)).toBe(62); // D, in C major
  });

  it('snaps an out-of-scale note to the nearest scale tone (non-tied case)', () => {
    // Major pentatonic has uneven gaps, unlike major (where every
    // out-of-scale note happens to sit exactly at a tie). F (pc 5) is
    // closer to E (4) than to G (7) in C major pentatonic [0,2,4,7,9].
    expect(snapNoteToScale(65, 0, SCALES.majorPentatonic)).toBe(64);
  });

  it('breaks an equidistant tie downward', () => {
    // C# (pc 1) is equidistant from C (0) and D (2) in C major.
    expect(snapNoteToScale(61, 0, SCALES.major)).toBe(60);
  });

  it('chromatic scale never changes anything', () => {
    for (let n = 48; n < 72; n++) {
      expect(snapNoteToScale(n, 0, SCALES.chromatic)).toBe(n);
    }
  });

  it('respects a non-zero root', () => {
    // Root D (2): D major-ish scale relative to D. F (pc 5 from C, pc 3 from D)
    // is out of the "major" pattern relative to root 2; nearest should snap.
    const note = 65; // F4
    const snapped = snapNoteToScale(note, 2, SCALES.major);
    const pitchClass = ((snapped - 2) % 12 + 12) % 12;
    expect(SCALES.major).toContain(pitchClass);
  });
});

describe('applyScaleToProject', () => {
  it('snaps every melodic track, leaves drum tracks untouched', () => {
    const melodic = buildMelodicTrack('m', [61, undefined, 63]);
    const drum = buildDrumTrack('d');
    const project = buildProject([melodic, drum], 0, 'chromatic');

    const result = applyScaleToProject(project, 'major');

    expect(result.tracks[0].steps[0].note).toBe(60); // C# -> C (tie down)
    expect(result.tracks[0].steps[1].note).toBeUndefined();
    expect(result.tracks[0].steps[2].note).toBe(62); // D# -> D (tie down)
    expect(result.scale).toBe('major');
    expect(result.tracks[1]).toEqual(drum);
  });

  it('is idempotent: applying the same scale twice changes nothing further', () => {
    const melodic = buildMelodicTrack('m', [61, 63, 66]);
    const project = buildProject([melodic], 0, 'chromatic');
    const once = applyScaleToProject(project, 'major');
    const twice = applyScaleToProject(once, 'major');
    expect(twice.tracks[0].steps).toEqual(once.tracks[0].steps);
  });

  it('every named scale only ever produces notes within its own intervals', () => {
    const scaleIds = Object.keys(SCALES) as ScaleId[];
    for (const scale of scaleIds) {
      const notes = Array.from({ length: 24 }, (_, i) => 48 + i);
      const melodic = buildMelodicTrack('m', notes);
      const project = buildProject([melodic], 0, 'chromatic');
      const result = applyScaleToProject(project, scale);
      for (const step of result.tracks[0].steps) {
        if (step.note === undefined) continue;
        const pc = ((step.note - 0) % 12 + 12) % 12;
        expect(SCALES[scale]).toContain(pc);
      }
    }
  });
});

describe('scaleChangeAffectsNotes', () => {
  it('false when every note is already in the target scale', () => {
    const melodic = buildMelodicTrack('m', [60, 62, 64]);
    const project = buildProject([melodic], 0, 'chromatic');
    expect(scaleChangeAffectsNotes(project, 'major')).toBe(false);
  });

  it('true when at least one note would move', () => {
    const melodic = buildMelodicTrack('m', [60, 61]);
    const project = buildProject([melodic], 0, 'chromatic');
    expect(scaleChangeAffectsNotes(project, 'major')).toBe(true);
  });

  it('ignores drum tracks entirely', () => {
    const project = buildProject([buildDrumTrack('d')], 0, 'chromatic');
    expect(scaleChangeAffectsNotes(project, 'major')).toBe(false);
  });
});

describe('PITCH_CLASS_NAMES', () => {
  it('has exactly 12 names starting at C', () => {
    expect(PITCH_CLASS_NAMES).toHaveLength(12);
    expect(PITCH_CLASS_NAMES[0]).toBe('C');
  });
});
