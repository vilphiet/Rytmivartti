import type { RhythmLayer } from '../audio/types';

export const CURRENT_SCHEMA_VERSION = 1;

export interface PersistedState {
  schemaVersion: number;
  layers: RhythmLayer[];
  bpm: number;
}
