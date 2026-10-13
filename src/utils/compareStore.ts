import { createContext, useContext, useSyncExternalStore } from 'react';

// Product comparison selection (2-4 items). Kept in localStorage so it works logged-out and survives reloads;
// a tiny external store so every card, the tray and the Compare page stay in sync without a provider.

export const MAX_COMPARE = 4;
const KEY = 'edudeen.compare';

export interface CompareItem { id: string; slug: string; name: string; image?: string }

function read(): CompareItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x): x is CompareItem => !!x && typeof x.id === 'string' && typeof x.slug === 'string' && typeof x.name === 'string')
      .slice(0, MAX_COMPARE);
  } catch { return []; }
}

let items: CompareItem[] = read();
const listeners = new Set<() => void>();

function commit(next: CompareItem[]) {
  items = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable - selection lasts for this tab only */ }
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { items = read(); l(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
};

/** BuyerLayout turns this on, so cards only show the Compare toggle where the tray exists (not on seller storefronts). */
export const CompareAvailableCtx = createContext(false);
export const useCompareAvailable = () => useContext(CompareAvailableCtx);

export function toCompareItem(p: { _id: string; slug: string; name: string; images?: string[] }): CompareItem {
  return { id: p._id, slug: p.slug, name: p.name, image: p.images?.[0] };
}

export function useCompare() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);
  return {
    items: list,
    isSelected: (id: string) => list.some(i => i.id === id),
    isFull: list.length >= MAX_COMPARE,
    /** Adds or removes. Returns false when the tray is full and the item was not added. */
    toggle: (item: CompareItem): boolean => {
      if (items.some(i => i.id === item.id)) { commit(items.filter(i => i.id !== item.id)); return true; }
      if (items.length >= MAX_COMPARE) return false;
      commit([...items, item]);
      return true;
    },
    remove: (id: string) => commit(items.filter(i => i.id !== id)),
    clear: () => commit([]),
  };
}
