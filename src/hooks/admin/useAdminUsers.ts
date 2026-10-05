import { useCallback, useEffect, useState } from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiGetAdminUsersStats,
  apiListAdminUsers,
  apiGetAdminUserById,
  type AdminAccountDetail,
  apiSuspendAccount,
  apiUnsuspendAccount,
  type AccountRole,
  type AdminUsersQuery,
} from '@/api/services/users/adminUsers';

export function useAdminUsersStats() {
  return useAnalyticsQuery(() => apiGetAdminUsersStats(), {});
}

export function useAdminUsersList(query: AdminUsersQuery) {
  return useAnalyticsQuery(apiListAdminUsers, query);
}

/** Full account document for the detail modal (the list row is only a summary). */
export function useAdminUserDetail(role: AccountRole, id: string) {
  const [detail, setDetail] = useState<AdminAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGetAdminUserById(role, id)
      .then(res => { if (!cancelled) setDetail(res.data ?? null); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load account.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, id, nonce]);

  const reload = useCallback(() => setNonce(n => n + 1), []);
  return { detail, loading, error, reload };
}

export function useAdminUserActions() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const suspend = useCallback(async (role: AccountRole, id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiSuspendAccount(role, id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suspend account.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const unsuspend = useCallback(async (role: AccountRole, id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiUnsuspendAccount(role, id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsuspend account.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  return { suspend, unsuspend, processingId, error };
}
