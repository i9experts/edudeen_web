import { useCallback, useState } from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiAdminListPendingRefunds, apiAdminApproveRefund, apiAdminRejectRefund,
  type RefundApprovalResult,
} from '@/api/services/adminRefundRequests';

export function useAdminPendingRefunds(page: number, limit = 20) {
  return useAnalyticsQuery(apiAdminListPendingRefunds, { page, limit });
}

export function useAdminRefundActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const approve = useCallback(async (id: string): Promise<RefundApprovalResult | null> => {
    setSubmitting(true);
    setError('');
    try {
      // One key per click — a double-submit / retry of the same click can't double-refund.
      const key = `refund-approve-${id}-${Date.now()}`;
      const res = await apiAdminApproveRefund(id, key);
      return res.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve refund.');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reject = useCallback(async (id: string, notes: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiAdminRejectRefund(id, notes);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject refund.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { approve, reject, submitting, error, clearError: () => setError('') };
}
