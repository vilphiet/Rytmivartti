import { describe, expect, it } from 'vitest';
import { parseAppState, serializeState } from './serialize';
import { CURRENT_SCHEMA_VERSION } from './schema';
import type { RhythmLayer } from '../audio/types';

function makeLayer(overrides: Partial<RhythmLayer> = {}): RhythmLayer {
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
    ...overrides,
  };
}

describe('serialize round-trip', () => {
  it('deserializing a serialized state returns an identical state', () => {
    const layers = [
      makeLayer(),
      makeLayer({
        id: 'layer-2',
        steps: 3,
        pattern: [{ velocity: 1 }, { velocity: 0 }, { velocity: 0.7 }],
        voiceId: 'kick',
        pan: -0.5,
        solo: true,
      }),
    ];
    const original = serializeState(layers, 96);
    const restored = parseAppState(JSON.stringify(original));
    expect(restored).toEqual(original);
  });

  it('round-trips every voiceId and waveform', () => {
    const layers: RhythmLayer[] = [
      makeLayer({ id: 'a', voiceId: 'kick' }),
      makeLayer({ id: 'b', voiceId: 'snare' }),
      makeLayer({ id: 'c', voiceId: 'hihat' }),
      makeLayer({ id: 'd', voiceId: 'rim' }),
      makeLayer({ id: 'e', voiceId: 'tone', waveform: 'sawtooth' }),
    ];
    const original = serializeState(layers, 60);
    expect(parseAppState(JSON.stringify(original))).toEqual(original);
  });
});

describe('parseAppState error handling', () => {
  it('returns null for invalid JSON', () => {
    expect(parseAppState('{not valid json')).toBeNull();
  });

  it('returns null for null/empty input', () => {
    expect(parseAppState(null)).toBeNull();
    expect(parseAppState('')).toBeNull();
  });

  it('returns null for an unknown schema version', () => {
    const json = JSON.stringify({ schemaVersion: 999, layers: [makeLayer()], bpm: 60 });
    expect(parseAppState(json)).toBeNull();
  });

  it('returns null when layers is missing or empty', () => {
    expect(parseAppState(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, bpm: 60 }))).toBeNull();
    expect(parseAppState(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, layers: [], bpm: 60 }))).toBeNull();
  });

  it('returns null for a plain non-object JSON value', () => {
    expect(parseAppState(JSON.stringify('just a string'))).toBeNull();
    expect(parseAppState(JSON.stringify(42))).toBeNull();
  });
});

describe('normalization of missing/invalid fields', () => {
  it('fills in missing layer fields with defaults instead of throwing', () => {
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      layers: [{ steps: 5 }], // everything else missing
      bpm: 120,
    });
    const restored = parseAppState(json);
    expect(restored).not.toBeNull();
    const layer = restored!.layers[0];
    expect(layer.steps).toBe(5);
    expect(layer.pattern).toHaveLength(5);
    expect(layer.cycleBeats).toBe(1);
    expect(layer.voiceId).toBe('tone');
    expect(layer.volume).toBeGreaterThanOrEqual(0);
    expect(layer.volume).toBeLessThanOrEqual(1);
    expect(typeof layer.color).toBe('string');
    expect(layer.muted).toBe(false);
    expect(layer.solo).toBe(false);
    expect(layer.hidden).toBe(false);
  });

  it('replaces an invalid voiceId with the tone default', () => {
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      layers: [{ ...makeLayer(), voiceId: 'not-a-real-voice' }],
      bpm: 60,
    });
    expect(parseAppState(json)!.layers[0].voiceId).toBe('tone');
  });

  it('replaces an invalid waveform with a valid default', () => {
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      layers: [{ ...makeLayer(), waveform: 'not-a-real-waveform' }],
      bpm: 60,
    });
    const waveform = parseAppState(json)!.layers[0].waveform;
    expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(waveform);
  });

  it('clamps out-of-range volume/pan instead of rejecting the whole layer', () => {
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      layers: [{ ...makeLayer(), volume: 5, pan: -99 }],
      bpm: 60,
    });
    const restored = parseAppState(json);
    expect(restored!.layers[0].volume).toBe(1);
    expect(restored!.layers[0].pan).toBe(-1);
  });

  it('resizes a pattern whose length does not match steps', () => {
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      layers: [{ ...makeLayer(), steps: 6, pattern: [{ velocity: 1 }] }],
      bpm: 60,
    });
    expect(parseAppState(json)!.layers[0].pattern).toHaveLength(6);
  });

  it('falls back to a default bpm when missing or invalid', () => {
    const json = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, layers: [makeLayer()], bpm: 'fast' });
    expect(parseAppState(json)!.bpm).toBe(60);
  });

  it('generates a fallback id for a layer missing one, without throwing', () => {
    const json = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      layers: [{ steps: 4 }],
      bpm: 60,
    });
    const id = parseAppState(json)!.layers[0].id;
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
