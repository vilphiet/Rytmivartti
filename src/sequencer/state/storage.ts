import type { SeqPersistedState } from './schema';
import { parseSeqState } from './serialize';

/** Injectable backend (defaulting to real localStorage) so pure in-memory
 * fakes can be used in tests without a DOM/jsdom environment. Own keys,
 * entirely separate from the polyrhythm side's rytmivartti:state /
 * rytmivartti:patterns. */
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const SEQ_STATE_KEY = 'rytmivartti:sequencer:state';
const SEQ_PATTERNS_KEY = 'rytmivartti:sequencer:patterns';

export function loadSeqState(storage: StorageLike = localStorage): SeqPersistedState | null {
  try {
    return parseSeqState(storage.getItem(SEQ_STATE_KEY));
  } catch {
    return null;
  }
}

export function saveSeqState(state: SeqPersistedState, storage: StorageLike = localStorage): void {
  try {
    storage.setItem(SEQ_STATE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded, privacy mode, storage disabled, etc. Losing an
    // autosave is preferable to crashing the app.
  }
}

function readSeqPatternsMap(storage: StorageLike): Record<string, SeqPersistedState> {
  try {
    const raw = storage.getItem(SEQ_PATTERNS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data === null) return {};

    const result: Record<string, SeqPersistedState> = {};
    for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
      const parsed = parseSeqState(JSON.stringify(value));
      if (parsed) result[name] = parsed;
    }
    return result;
  } catch {
    return {};
  }
}

function writeSeqPatternsMap(map: Record<string, SeqPersistedState>, storage: StorageLike): void {
  try {
    storage.setItem(SEQ_PATTERNS_KEY, JSON.stringify(map));
  } catch {
    // ignore, see saveSeqState
  }
}

export function listSeqNamedPatterns(storage: StorageLike = localStorage): string[] {
  return Object.keys(readSeqPatternsMap(storage)).sort();
}

export function saveSeqNamedPattern(name: string, state: SeqPersistedState, storage: StorageLike = localStorage): void {
  const map = readSeqPatternsMap(storage);
  map[name] = state;
  writeSeqPatternsMap(map, storage);
}

export function loadSeqNamedPattern(name: string, storage: StorageLike = localStorage): SeqPersistedState | null {
  return readSeqPatternsMap(storage)[name] ?? null;
}

export function deleteSeqNamedPattern(name: string, storage: StorageLike = localStorage): void {
  const map = readSeqPatternsMap(storage);
  delete map[name];
  writeSeqPatternsMap(map, storage);
}
