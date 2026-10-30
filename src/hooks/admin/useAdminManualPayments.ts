import { useState, useEffect, useCallback } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import {
  apiAdminListManualPayments, apiAdminApproveManualPayment, apiAdminRejectManualPayment,
  type AdminManualPaymentProof, type ManualPaymentProofStatus,
} from '@/api/services/manualPayment';

export function useAdminManualPayments(status?: ManualPaymentProofStatus) {
  const [proofs,  setProofs]  = useState<AdminManualPaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback((quiet: boolean) => {
    if (!quiet) setLoading(true);
    return apiAdminListManualPayments(status)
      .then(res => setProofs(res.data.proofs ?? []))
      .catch((err: unknown) => { if (!quiet) setError(err instanceof Error ? err.message : 'Failed to load manual payments.'); })
      .finally(() => { if (!quiet) setLoading(false); });
  }, [status]);
  const refetch = useCallback(() => load(false), [load]);

  useEffect(() => { refetch(); }, [refetch]);
  // A buyer just uploaded a payment proof: it shows up in the queue straight away.
  useLiveRefresh(['manual-payments', 'payment', 'orders'], () => { void load(true); });

  return { proofs, loading, error, refetch };
}

export function useApproveManualPayment() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const approve = useCallback(async (proofId: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiAdminApproveManualPayment(proofId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve payment.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { approve, submitting, error };
}

export function useRejectManualPayment() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reject = useCallback(async (proofId: string, reason: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiAdminRejectManualPayment(proofId, reason);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject payment.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { reject, submitting, error };
}
