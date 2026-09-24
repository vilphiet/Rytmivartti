import { describe, expect, it } from 'vitest';
import {
  deleteNamedPattern,
  listNamedPatterns,
  loadAppState,
  loadNamedPattern,
  saveAppState,
  saveNamedPattern,
} from './storage';
import { serializeState } from './serialize';
import type { RhythmLayer } from '../audio/types';

function makeLayer(): RhythmLayer {
  return {
    id: 'layer-1',
    steps: 4,
    cycleBeats: 1,
    pattern: [{ velocity: 0.7 }, { velocity: 1 }, { velocity: 0 }, { velocity: 0.7 }],
    color: '#4fd8e8',
    voiceId: 'tone',
    waveform: 'sine',
    frequency: 220,
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    hidden: false,
  };
}

/** In-memory Storage-shaped fake so these tests never need a DOM/jsdom. */
function makeFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: () => null,
    get length() {
      return map.size;
    },
  } as Storage;
}

function makeThrowingStorage(): Storage {
  return {
    getItem: () => {
      throw new Error('boom');
    },
    setItem: () => {
      throw new Error('boom');
    },
    removeItem: () => {
      throw new Error('boom');
    },
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
}

describe('saveAppState / loadAppState', () => {
  it('round-trips through a fake storage backend', () => {
    const storage = makeFakeStorage();
    const state = serializeState([makeLayer()], 96);
    saveAppState(state, storage);
    expect(loadAppState(storage)).toEqual(state);
  });

  it('returns null when nothing has been saved', () => {
    expect(loadAppState(makeFakeStorage())).toBeNull();
  });

  it('does not throw when the storage backend throws, e.g. quota exceeded', () => {
    const storage = makeThrowingStorage();
    expect(() => saveAppState(serializeState([makeLayer()], 60), storage)).not.toThrow();
    expect(() => loadAppState(storage)).not.toThrow();
    expect(loadAppState(storage)).toBeNull();
  });
});

describe('named patterns', () => {
  it('saves, lists, loads and deletes named patterns', () => {
    const storage = makeFakeStorage();
    const stateA = serializeState([makeLayer()], 90);
    const stateB = serializeState([makeLayer()], 140);

    saveNamedPattern('Groove A', stateA, storage);
    saveNamedPattern('Groove B', stateB, storage);
    expect(listNamedPatterns(storage)).toEqual(['Groove A', 'Groove B']);

    expect(loadNamedPattern('Groove A', storage)).toEqual(stateA);
    expect(loadNamedPattern('Groove B', storage)).toEqual(stateB);
    expect(loadNamedPattern('Missing', storage)).toBeNull();

    deleteNamedPattern('Groove A', storage);
    expect(listNamedPatterns(storage)).toEqual(['Groove B']);
  });

  it('overwrites a pattern saved under the same name', () => {
    const storage = makeFakeStorage();
    saveNamedPattern('Groove', serializeState([makeLayer()], 90), storage);
    saveNamedPattern('Groove', serializeState([makeLayer()], 150), storage);
    expect(listNamedPatterns(storage)).toEqual(['Groove']);
    expect(loadNamedPattern('Groove', storage)!.bpm).toBe(150);
  });

  it('does not throw when the storage backend throws', () => {
    const storage = makeThrowingStorage();
    expect(() => saveNamedPattern('x', serializeState([makeLayer()], 60), storage)).not.toThrow();
    expect(() => listNamedPatterns(storage)).not.toThrow();
    expect(listNamedPatterns(storage)).toEqual([]);
  });
});
