import { useCallback, useEffect, useState } from 'react';
import {
  apiAdminListConversationRows, apiAdminListReportRows,
  type AdminConversationRow, type AdminReportRow, type AdminListConversationsParams, type GetReportsParams,
} from '@/api/services/messaging';

/** Admin conversation list with store/buyer/seller names attached server-side. */
export function useAdminConversationRows(params: AdminListConversationsParams) {
  const [conversations, setConversations] = useState<AdminConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');
    return apiAdminListConversationRows(params)
      .then(res => setConversations(res.conversations ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load conversations.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.storeId, params.buyerId, params.sellerId, params.isArchived, params.page, params.limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { conversations, loading, error, refetch };
}

/** Admin messaging-report list with reporter / reported-user names attached server-side. */
export function useAdminReportRows(params: GetReportsParams) {
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');
    return apiAdminListReportRows(params)
      .then(res => setReports(res.reports ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load reports.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.status, params.targetType, params.page, params.limit]);

  useEffect(() => { refetch(); }, [refetch]);

  return { reports, loading, error, refetch };
}
