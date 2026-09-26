import { describe, expect, it } from 'vitest';
import { defaultTrackNameForVoice, duplicateTrack } from './trackActions';
import { defaultSeqSteps } from './pattern';
import type { SeqProject, SeqTrack } from './types';

function buildTrack(id: string, overrides: Partial<SeqTrack> = {}): SeqTrack {
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
    ...overrides,
  };
}

function buildProject(tracks: SeqTrack[]): SeqProject {
  return { bpm: 100, stepsPerBeat: 4, patternSteps: 16, rootNote: 0, scale: 'major', tracks };
}

describe('defaultTrackNameForVoice', () => {
  it('names every drum voice descriptively', () => {
    expect(defaultTrackNameForVoice('kick')).toBe('Kick');
    expect(defaultTrackNameForVoice('snare')).toBe('Snare');
    expect(defaultTrackNameForVoice('hihat')).toBe('Hihat');
    expect(defaultTrackNameForVoice('rim')).toBe('Rim');
  });

  it('names every melodic voice after its synth preset label', () => {
    expect(defaultTrackNameForVoice('bass')).toBe('Basso');
    expect(defaultTrackNameForVoice('lead')).toBe('Lead');
    expect(defaultTrackNameForVoice('pad')).toBe('Pad');
    expect(defaultTrackNameForVoice('pluck')).toBe('Pluck');
    expect(defaultTrackNameForVoice('keys')).toBe('Keys');
  });
});

describe('duplicateTrack', () => {
  it('inserts a copy right after the original with a fresh id and "(kopio)" suffix', () => {
    const a = buildTrack('a', { name: 'Kick' });
    a.steps[0] = { velocity: 1 };
    const b = buildTrack('b', { name: 'Snare' });
    const project = buildProject([a, b]);

    const result = duplicateTrack(project, 'a', 'a-copy');

    expect(result.tracks.map((t) => t.id)).toEqual(['a', 'a-copy', 'b']);
    expect(result.tracks[1].name).toBe('Kick (kopio)');
    expect(result.tracks[1].steps).toEqual(a.steps);
    expect(result.tracks[1].voiceId).toBe('kick');
  });

  it('the copy\'s steps array is an independent copy, not shared with the original', () => {
    const a = buildTrack('a');
    const project = buildProject([a]);
    const result = duplicateTrack(project, 'a', 'a-copy');
    result.tracks[1].steps[0] = { velocity: 1 };
    expect(result.tracks[0].steps[0].velocity).toBe(0);
  });

  it('is a no-op when trackId does not match any track', () => {
    const project = buildProject([buildTrack('a')]);
    expect(duplicateTrack(project, 'missing', 'x')).toBe(project);
  });
});
