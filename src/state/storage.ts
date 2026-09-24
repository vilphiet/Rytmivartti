import type { PersistedState } from './schema';
import { parseAppState } from './serialize';

/** Every storage function takes an injectable backend (defaulting to the
 * real localStorage) so pure in-memory fakes can be used in tests without
 * a DOM/jsdom environment. */
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STATE_KEY = 'rytmivartti:state';
const PATTERNS_KEY = 'rytmivartti:patterns';

export function loadAppState(storage: StorageLike = localStorage): PersistedState | null {
  try {
    return parseAppState(storage.getItem(STATE_KEY));
  } catch {
    return null;
  }
}

export function saveAppState(state: PersistedState, storage: StorageLike = localStorage): void {
  try {
    storage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded, privacy mode, storage disabled, etc. Losing an
    // autosave is preferable to crashing the app.
  }
}

function readPatternsMap(storage: StorageLike): Record<string, PersistedState> {
  try {
    const raw = storage.getItem(PATTERNS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== 'object' || data === null) return {};

    const result: Record<string, PersistedState> = {};
    for (const [name, value] of Object.entries(data as Record<string, unknown>)) {
      const parsed = parseAppState(JSON.stringify(value));
      if (parsed) result[name] = parsed;
    }
    return result;
  } catch {
    return {};
  }
}

function writePatternsMap(map: Record<string, PersistedState>, storage: StorageLike): void {
  try {
    storage.setItem(PATTERNS_KEY, JSON.stringify(map));
  } catch {
    // ignore, see saveAppState
  }
}

export function listNamedPatterns(storage: StorageLike = localStorage): string[] {
  return Object.keys(readPatternsMap(storage)).sort();
}

export function saveNamedPattern(name: string, state: PersistedState, storage: StorageLike = localStorage): void {
  const map = readPatternsMap(storage);
  map[name] = state;
  writePatternsMap(map, storage);
}

export function loadNamedPattern(name: string, storage: StorageLike = localStorage): PersistedState | null {
  return readPatternsMap(storage)[name] ?? null;
}

export function deleteNamedPattern(name: string, storage: StorageLike = localStorage): void {
  const map = readPatternsMap(storage);
  delete map[name];
  writePatternsMap(map, storage);
}
