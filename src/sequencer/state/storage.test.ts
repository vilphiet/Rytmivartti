import { describe, expect, it } from 'vitest';
import { defaultSeqSteps } from '../pattern';
import type { SeqProject } from '../types';
import { deleteSeqNamedPattern, listSeqNamedPatterns, loadSeqNamedPattern, loadSeqState, saveSeqNamedPattern, saveSeqState } from './storage';
import { serializeSeqState } from './serialize';
import { CURRENT_SCHEMA_VERSION } from '../../state/schema';
import { loadAppState } from '../../state/storage';
import { defaultPattern } from '../../audio/pattern';

class FakeStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function buildProject(): SeqProject {
  return {
    bpm: 100,
    stepsPerBeat: 4,
    patternSteps: 16,
    rootNote: 0,
    scale: 'major',
    tracks: [
      { id: 'kick', name: 'Kick', kind: 'drum', voiceId: 'kick', gain: 0.9, pan: 0, mute: false, solo: false, lengthSteps: 16, steps: defaultSeqSteps() },
    ],
  };
}

describe('sequencer state persistence', () => {
  it('round-trips through save/load', () => {
    const storage = new FakeStorage();
    const project = buildProject();
    saveSeqState(serializeSeqState(project), storage);
    const loaded = loadSeqState(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.project).toEqual(project);
  });

  it('returns null when nothing has been saved yet', () => {
    const storage = new FakeStorage();
    expect(loadSeqState(storage)).toBeNull();
  });

  it('named patterns: save, list, load, delete', () => {
    const storage = new FakeStorage();
    const project = buildProject();
    saveSeqNamedPattern('Beat 1', serializeSeqState(project), storage);
    expect(listSeqNamedPatterns(storage)).toEqual(['Beat 1']);
    expect(loadSeqNamedPattern('Beat 1', storage)!.project).toEqual(project);
    deleteSeqNamedPattern('Beat 1', storage);
    expect(listSeqNamedPatterns(storage)).toEqual([]);
  });

  it('backward compatibility: existing polyrhythm state loads unchanged when no sequencer state has ever been saved', () => {
    const storage = new FakeStorage();
    // Simulate a save from before the sequencer existed: only the
    // polyrhythm key is present, no rytmivartti:sequencer:state at all.
    const oldLayers = [
      {
        id: 'layer-1',
        steps: 4,
        cycleBeats: 1,
        pattern: defaultPattern(4),
        color: '#ffffff',
        voiceId: 'tone' as const,
        waveform: 'sine' as const,
        frequency: 220,
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        hidden: false,
      },
    ];
    storage.setItem('rytmivartti:state', JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, layers: oldLayers, bpm: 90, viewMode: 'grid' }));

    // The polyrhythm side still loads exactly as before...
    const polyState = loadAppState(storage);
    expect(polyState).not.toBeNull();
    expect(polyState!.bpm).toBe(90);
    expect(polyState!.layers).toEqual(oldLayers);

    // ...and the sequencer side sees "nothing saved yet" rather than
    // crashing or misinterpreting the polyrhythm key.
    expect(loadSeqState(storage)).toBeNull();
  });
});
