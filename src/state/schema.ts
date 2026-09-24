import type { RhythmLayer } from '../audio/types';

export const CURRENT_SCHEMA_VERSION = 1;

export type ViewMode = 'grid' | 'circle';

export const DEFAULT_VIEW_MODE: ViewMode = 'grid';

export interface PersistedState {
  schemaVersion: number;
  layers: RhythmLayer[];
  bpm: number;
  /** Additive field: older saved data without it defaults to
   * DEFAULT_VIEW_MODE on load, no schemaVersion bump needed. */
  viewMode: ViewMode;
}
