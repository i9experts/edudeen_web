import { useCallback, useRef, useState } from 'react';
import { apiStartManageSession } from '@/api/services/adminStores';
import { handOffActAsSession } from '@/utils/authCookie';

/** Admin: opens the seller panel of one store in a NEW tab with a 30-minute, store-locked session. The admin's own tab/cookies are untouched. */
export function useManageAsSeller() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const start = useCallback(async (storeId: string) => {
    if (busy.current) return;
    busy.current = true; setBusyId(storeId); setError(null);
    // Open the tab inside the click so the popup blocker allows it, then point it at the store once the session exists.
    const tab = window.open('about:blank', '_blank');
    try {
      const s = await apiStartManageSession(storeId);
      const ok = handOffActAsSession({ token: s.accessToken, storeId: s.store.id, storeName: s.store.name, expiresAt: Date.now() + s.expiresInSeconds * 1000 });
      if (!ok) throw new Error('This browser blocks the storage needed to open the store. Allow site data and try again.');
      const url = `/store/${s.store.id}/dashboard?actas=1`;
      if (tab) tab.location.href = url; else window.location.assign(url);
    } catch (e: any) {
      tab?.close();
      if (e?.response?.data?.code === 'REAUTH_REQUIRED') return; // password prompt cancelled
      setError(e?.response?.data?.message ?? e?.message ?? 'Could not open the store. Try again.');
    } finally {
      busy.current = false; setBusyId(null);
    }
  }, []);

  return { start, busyId, error };
}
