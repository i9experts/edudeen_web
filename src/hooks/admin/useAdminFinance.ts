import { useCallback, useEffect, useState } from 'react';
import {
  apiAdminFinanceOverview,
  apiAdminFinanceRevenueOverTime,
  apiAdminFinanceCommissionOverTime,
  apiAdminSellerBalances,
  apiAdminSellerFinancialDetails,
  apiAdminSellerTransactions,
  apiAdminPlatformTransactions,
  apiAdminPayoutQueue,
  apiAdminApprovePayout,
  apiAdminRejectPayout,
  apiAdminRetryPayout,
  apiAdminCreateManualPayout,
  apiAdminProcessClearing,
  apiAdminTriggerScheduledPayouts,
  apiAdminPendingVerificationMethods,
  apiAdminVerifyPayoutMethod,
  apiAdminRefundReport,
  apiAdminTaxReports,
  apiAdminSettlementReport,
  apiAdminMonthlyReport,
  apiAdminFinanceExport,
  apiAdminReconciliation,
  apiAdminReconciliationHistory,
  apiAdminFxExposure,
  apiAdminMonthlySettlement,
  apiAdminRunMonthlySettlement,
  type AdminMonthlySettlementData,
  type MonthlySettlementParams,
  type MonthlySettlementRunResult,
  type MonthlySettlementRunPayload,
  type AdminFinanceParams,
  type AdminTransactionsParams,
  type PayoutQueueParams,
  type SellerBalancesParams,
  type AdminFinanceExportParams,
  type ManualPayoutPayload,
  type PendingPayoutMethodRow,
} from '@/api/services/finance/adminFinance';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';

// ── A. Dashboard overview ───────────────────────────────────────────────────────

export function useAdminFinanceOverview(params: AdminFinanceParams) {
  return useAnalyticsQuery(apiAdminFinanceOverview, params);
}

// ── B. Revenue / commission trends ──────────────────────────────────────────────

export function useAdminFinanceRevenueOverTime(params: AdminFinanceParams) {
  return useAnalyticsQuery(apiAdminFinanceRevenueOverTime, params);
}

export function useAdminFinanceCommissionOverTime(params: AdminFinanceParams) {
  return useAnalyticsQuery(apiAdminFinanceCommissionOverTime, params);
}

// ── C/D. Sellers ──────────────────────────────────────────────────────────────────

export function useAdminSellerBalances(params: SellerBalancesParams) {
  return useAnalyticsQuery(apiAdminSellerBalances, params);
}

export function useAdminSellerFinancialDetails(storeId: string) {
  return useAnalyticsQuery(
    (p: { storeId: string }) => apiAdminSellerFinancialDetails(p.storeId),
    { storeId },
  );
}

export function useAdminSellerTransactions(storeId: string, params: AdminTransactionsParams) {
  return useAnalyticsQuery(
    (p: { storeId: string } & AdminTransactionsParams) => apiAdminSellerTransactions(p.storeId, p),
    { storeId, ...params },
  );
}

// ── E. Platform transactions ──────────────────────────────────────────────────────

export function useAdminPlatformTransactions(params: AdminTransactionsParams) {
  return useAnalyticsQuery(apiAdminPlatformTransactions, params);
}

// ── F. Payout queue & lifecycle ───────────────────────────────────────────────────

export function useAdminPayoutQueue(params: PayoutQueueParams) {
  return useAnalyticsQuery(apiAdminPayoutQueue, params);
}

/** Mutation hook for the approve/reject/retry payout actions — caller calls `refetch()` on the queue hook after a successful action. */
export function useAdminPayoutActions() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const approvePayout = useCallback(async (payoutId: string) => {
    setProcessingId(payoutId);
    setError('');
    try {
      await apiAdminApprovePayout(payoutId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve payout.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const rejectPayout = useCallback(async (payoutId: string, reason: string) => {
    setProcessingId(payoutId);
    setError('');
    try {
      await apiAdminRejectPayout(payoutId, reason);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payout.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const retryPayout = useCallback(async (payoutId: string) => {
    setProcessingId(payoutId);
    setError('');
    try {
      await apiAdminRetryPayout(payoutId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry payout.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  return { approvePayout, rejectPayout, retryPayout, processingId, error };
}

export function useAdminManualPayout() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createManualPayout = useCallback(async (storeId: string, payload: ManualPayoutPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiAdminCreateManualPayout(storeId, payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manual payout.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { createManualPayout, submitting, error };
}

export function useAdminProcessClearing() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ processed: number; totalAmount: number; byCurrency: { currency: string; amount: number }[] } | null>(null);

  const triggerClearing = useCallback(async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await apiAdminProcessClearing();
      setResult(res.data);
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process clearing balances.');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { triggerClearing, processing, error, result };
}

export function useAdminTriggerScheduledPayouts() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ schedulesChecked: number; payoutsCreated: number; totalAmount: number; skipped: number } | null>(null);

  const trigger = useCallback(async () => {
    setProcessing(true);
    setError('');
    try {
      const res = await apiAdminTriggerScheduledPayouts();
      setResult(res.data);
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process scheduled payouts.');
      return null;
    } finally {
      setProcessing(false);
    }
  }, []);

  return { trigger, processing, error, result };
}

// ── Payout method verification ──────────────────────────────────────────────

export function useAdminPendingVerificationMethods() {
  const [methods, setMethods] = useState<PendingPayoutMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    return apiAdminPendingVerificationMethods()
      .then(res => setMethods(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load pending payout methods.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { methods, loading, error, refetch };
}

export function useAdminVerifyPayoutMethod() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const verify = useCallback(async (storeId: string, methodId: string, approve: boolean, note?: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiAdminVerifyPayoutMethod(storeId, methodId, approve, note);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify payout method.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { verify, submitting, error };
}

// ── G. Reports ────────────────────────────────────────────────────────────────────

export function useAdminRefundReport(params: AdminFinanceParams) {
  return useAnalyticsQuery(apiAdminRefundReport, params);
}

export function useAdminTaxReports(params: { storeId?: string; year?: number }) {
  return useAnalyticsQuery(apiAdminTaxReports, params);
}

export function useAdminSettlementReport(params: AdminFinanceParams) {
  return useAnalyticsQuery(apiAdminSettlementReport, params);
}

export function useAdminMonthlyReport(params: { months?: number }) {
  return useAnalyticsQuery(apiAdminMonthlyReport, params);
}

// ── Reconciliation & FX exposure ────────────────────────────────────────────────

export function useAdminReconciliationHistory(limit = 30) {
  return useAnalyticsQuery((p: { limit: number }) => apiAdminReconciliationHistory(p.limit), { limit });
}

export function useAdminFxExposure() {
  return useAnalyticsQuery(() => apiAdminFxExposure(), {});
}

/** Manual "run now" trigger — same underlying call the daily cron makes,
 *  useful for an admin who wants a fresh reconciliation without waiting for
 *  the next scheduled tick. */
export function useAdminRunReconciliation() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (days = 1) => {
    setRunning(true);
    setError('');
    try {
      const res = await apiAdminReconciliation(days);
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run reconciliation.');
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return { run, running, error };
}

// ── I. Monthly settlement ─────────────────────────────────────────────────────────

/** Like `useAnalyticsQuery`, but also keeps the HTTP status so the page can
 *  tell "endpoint not deployed yet" (404) apart from a real failure. */
export function useAdminMonthlySettlement(params: MonthlySettlementParams) {
  const [data, setData] = useState<AdminMonthlySettlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const paramsKey = JSON.stringify(params);

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');
    setErrorStatus(undefined);
    return apiAdminMonthlySettlement(params)
      .then(res => setData(res.data ?? null))
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : 'Failed to load the monthly settlement.');
        setErrorStatus((err as { status?: number } | null)?.status);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, errorStatus, refetch };
}

export function useAdminRunMonthlySettlement() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MonthlySettlementRunResult | null>(null);

  const run = useCallback(async (payload: MonthlySettlementRunPayload = {}) => {
    setRunning(true);
    setError('');
    try {
      const res = await apiAdminRunMonthlySettlement(payload);
      setResult(res.data);
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create this month's payouts.");
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return { run, running, error, result, clearResult: () => setResult(null) };
}

// ── H. Export ─────────────────────────────────────────────────────────────────────

export function useAdminFinanceExport() {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const exportReport = useCallback(async (params: AdminFinanceExportParams) => {
    setExporting(true);
    setError('');
    try {
      await apiAdminFinanceExport(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report.');
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportReport, exporting, error };
}
