import type { SeqProject } from '../types';

export const SEQ_SCHEMA_VERSION = 1;

/** Own section, own schemaVersion — entirely independent of the polyrhythm
 * side's PersistedState/CURRENT_SCHEMA_VERSION, so the two can evolve
 * without touching each other's saved data. */
export interface SeqPersistedState {
  schemaVersion: number;
  project: SeqProject;
}
