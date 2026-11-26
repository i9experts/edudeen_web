import { useCallback, useEffect, useRef, useState } from 'react';
import { apiMyTeamStores, apiSwitchToTeamStore, type MyTeamStore } from '@/api/services/storeTeam';
import { handOffActAsSession, getActAsSession } from '@/utils/authCookie';
import { TokenStorage } from '@/api/services/auth';
import { cachedRequest } from '@/api/services/requestCache';

/** Stores this signed-in person was invited to (empty for everyone else). Quiet on failure: the menu entry just does not show. */
export function useMyTeamStores(): MyTeamStore[] {
  const [stores, setStores] = useState<MyTeamStore[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (!TokenStorage.isLoggedIn() || getActAsSession()) { setStores([]); return; }
      const role = TokenStorage.getRole();
      if (role !== 'user' && role !== 'seller') { setStores([]); return; }
      cachedRequest('team:mine', 120_000, () => apiMyTeamStores()).then(s => { if (alive) setStores(s); }).catch(() => { if (alive) setStores([]); });
    };
    load();
    window.addEventListener('edudeen:auth-login', load);
    window.addEventListener('edudeen:auth-logout', load);
    return () => { alive = false; window.removeEventListener('edudeen:auth-login', load); window.removeEventListener('edudeen:auth-logout', load); };
  }, []);
  return stores;
}

/** Opens a store the person is a team member of, in a NEW tab, with a 2-hour store-locked session (their own login is untouched). */
export function useOpenTeamStore() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const open = useCallback(async (storeId: string) => {
    if (busy.current) return;
    busy.current = true; setBusyId(storeId); setError(null);
    const tab = window.open('about:blank', '_blank');
    try {
      const s = await apiSwitchToTeamStore(storeId);
      const ok = handOffActAsSession({ token: s.accessToken, storeId: s.store.id, storeName: s.store.name, expiresAt: Date.now() + s.expiresInSeconds * 1000, kind: 'collaborator', roleName: s.role.name, permissions: s.permissions });
      if (!ok) throw new Error('This browser blocks the storage needed to open the store. Allow site data and try again.');
      const url = `/store/${s.store.id}/dashboard?actas=1`;
      if (tab) tab.location.href = url; else window.location.assign(url);
    } catch (e: any) {
      tab?.close();
      setError(e?.response?.data?.message ?? e?.message ?? 'Could not open the store. Try again.');
    } finally { busy.current = false; setBusyId(null); }
  }, []);
  return { open, busyId, error };
}
