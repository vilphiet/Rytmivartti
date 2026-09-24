/** Which top-level tab is active. Persisted separately from the polyrhythm
 * PersistedState (its own key, no schemaVersion needed — this is a single
 * string, not a data shape that will ever need migration). */
export type AppTab = 'polyrhythm' | 'sequencer';

export const DEFAULT_APP_TAB: AppTab = 'polyrhythm';

const ACTIVE_TAB_KEY = 'rytmivartti:activeTab';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadActiveTab(storage: StorageLike = localStorage): AppTab {
  try {
    const raw = storage.getItem(ACTIVE_TAB_KEY);
    return raw === 'polyrhythm' || raw === 'sequencer' ? raw : DEFAULT_APP_TAB;
  } catch {
    return DEFAULT_APP_TAB;
  }
}

export function saveActiveTab(tab: AppTab, storage: StorageLike = localStorage): void {
  try {
    storage.setItem(ACTIVE_TAB_KEY, tab);
  } catch {
    // Ignore storage failures (private mode, quota) — tab choice just won't persist.
  }
}
