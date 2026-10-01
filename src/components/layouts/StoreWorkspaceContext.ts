import { createContext, useContext } from 'react';
import type { StoreData } from '@/api/services/store';

// Lives in its own module (not inside StoreLayout.tsx) on purpose: when
// StoreLayout is edited and hot-reloaded, a context created inside it would be
// re-created, while every store page still held the old one — every page then
// crashed with "useStoreWorkspace must be inside StoreLayout". A context in a
// file that rarely changes stays the same object across those reloads.
export interface StoreWorkspaceValue {
  store:    StoreData | null;
  storeId:  string;
  loading:  boolean;
  error:    string;
  refetch:  () => void;
}

export const StoreWorkspaceCtx = createContext<StoreWorkspaceValue | null>(null);

export function useStoreWorkspace(): StoreWorkspaceValue {
  const ctx = useContext(StoreWorkspaceCtx);
  if (!ctx) throw new Error('useStoreWorkspace must be inside StoreLayout');
  return ctx;
}
