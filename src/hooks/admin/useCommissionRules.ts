import { useState, useEffect, useCallback } from 'react';
import {
  apiGetGlobalCommissionDefault, apiSetGlobalCommissionDefault, apiGetGlobalCommissionHistory,
  apiListSellerCommissionOverrides, apiSetSellerCommissionOverride, apiRemoveSellerCommissionOverride,
  apiResolveCommissionRate, apiGetSellerCommissionHistory,
  type CommissionRule, type SellerOverridesPage, type ResolvedCommissionRate,
} from '@/api/services/commissionRules';

export function useGlobalCommissionDefault() {
  const [rule, setRule] = useState<CommissionRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGetGlobalCommissionDefault()
      .then(res => setRule(res ?? null))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load global commission rate.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { rule, loading, error, refetch };
}

export function useSetGlobalCommissionDefault() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (rate: number, notes?: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiSetGlobalCommissionDefault(rate, notes);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update global commission rate.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useGlobalCommissionHistory() {
  const [history, setHistory] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGetGlobalCommissionHistory()
      .then(res => { if (!cancelled) setHistory(res ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { history, loading };
}

export function useSellerCommissionOverrides(page: number, limit = 20) {
  const [data, setData] = useState<SellerOverridesPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    return apiListSellerCommissionOverrides(page, limit)
      .then(res => setData(res))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load seller overrides.'))
      .finally(() => setLoading(false));
  }, [page, limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export function useResolveCommissionRate(storeId: string | null) {
  const [resolved, setResolved] = useState<ResolvedCommissionRate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!storeId) { setResolved(null); return; }
    let cancelled = false;
    setLoading(true);
    apiResolveCommissionRate(storeId)
      .then(res => { if (!cancelled) setResolved(res); })
      .catch(() => { if (!cancelled) setResolved(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  return { resolved, loading };
}

export function useSellerCommissionHistory(storeId: string | null) {
  const [history, setHistory] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeId) { setHistory([]); setError(''); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGetSellerCommissionHistory(storeId)
      .then(res => { if (!cancelled) setHistory(res ?? []); })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rate history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId]);

  return { history, loading, error };
}

export function useSetSellerCommissionOverride() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (storeId: string, rate: number, notes?: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiSetSellerCommissionOverride(storeId, rate, notes);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set seller commission override.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useRemoveSellerCommissionOverride() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const remove = useCallback(async (storeId: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiRemoveSellerCommissionOverride(storeId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove commission override.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { remove, submitting, error };
}
