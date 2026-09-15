import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { type MyStoreItem } from '@/api/services/store';
import { useMyStores } from '@/hooks/store/useMyStores';

const STORAGE_KEY = 'edudeen_active_store';

interface ActiveStoreContextValue {
  stores:        MyStoreItem[];
  activeStoreId: string;
  activeStore:   MyStoreItem | null;
  loading:       boolean;
  switchStore:   (id: string) => void;
}

const Ctx = createContext<ActiveStoreContextValue | null>(null);

export function ActiveStoreProvider({ children }: { children: ReactNode }) {
  const { stores, loading } = useMyStores();
  const [activeStoreId, setActiveStoreId] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? 'all'
  );

  // Once the shared store list resolves, drop a stale persisted store id
  // (e.g. a store that was deleted, or belongs to a stale cached session).
  useEffect(() => {
    if (loading) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== 'all' && !stores.find(s => s._id === saved)) {
      setActiveStoreId('all');
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [loading, stores]);

  const switchStore = useCallback((id: string) => {
    setActiveStoreId(id);
    if (id === 'all') localStorage.removeItem(STORAGE_KEY);
    else              localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeStore =
    activeStoreId === 'all' ? null : (stores.find(s => s._id === activeStoreId) ?? null);

  const value = useMemo<ActiveStoreContextValue>(() => ({
    stores, activeStoreId, activeStore, loading, switchStore,
  }), [stores, activeStoreId, activeStore, loading, switchStore]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveStore(): ActiveStoreContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActiveStore must be inside ActiveStoreProvider');
  return ctx;
}
