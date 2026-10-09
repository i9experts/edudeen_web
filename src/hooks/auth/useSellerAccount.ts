import { useEffect, useState, useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { TokenStorage, apiBecomeSeller, type AppRole } from '@/api/services/auth';
import { apiFreeTrialEligibility } from '@/api/services/platformPlans';
import { invalidateProfileCache } from '@/hooks/auth/useGetProfile';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';

/** For a signed-in BUYER: does this email already own a seller account? (null = unknown / not a buyer session). */
export function useHasSellerAccount(): boolean | null {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    const role = TokenStorage.getUser<{ role?: AppRole }>()?.role;
    if (!TokenStorage.isLoggedIn() || role !== 'user') { setHas(null); return; }
    let cancelled = false;
    apiFreeTrialEligibility().then(r => { if (!cancelled) setHas(!!r.data.hasSellerAccount); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return has;
}

/** Signs the buyer into their EXISTING seller account (same email + password, no new sign-up) and opens the store. */
export function useSwitchToStore(navigate: NavigateFunction) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const switchToStore = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const res = await apiBecomeSeller();
      TokenStorage.save(res.data.token.accessToken, res.data.token.refreshToken);
      TokenStorage.saveUser(res.data.user);
      invalidateProfileCache();
      navigate(await resolveSellerDestinationRemote(), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open your store.');
    } finally {
      setBusy(false);
    }
  }, [navigate]);
  return { switchToStore, busy, error };
}
