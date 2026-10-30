import { useCallback, useState } from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiGetModerationStats,
  apiGetModerationQueue,
  apiMarkReportReviewed,
  apiApproveReport,
  apiRemoveReportTarget,
  type ModerationQuery,
} from '@/api/services/moderation/adminModeration';

export function useModerationStats() {
  return useAnalyticsQuery(() => apiGetModerationStats(), {}, ['reviews', 'messaging', 'messages']);
}

export function useModerationQueue(query: ModerationQuery) {
  return useAnalyticsQuery(apiGetModerationQueue, query, ['reviews', 'messaging', 'messages']);
}

export function useModerationActions() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const markReviewed = useCallback(async (id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiMarkReportReviewed(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark report as reviewed.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const approve = useCallback(async (id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiApproveReport(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve report.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiRemoveReportTarget(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove flagged item.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  return { markReviewed, approve, remove, processingId, error };
}
