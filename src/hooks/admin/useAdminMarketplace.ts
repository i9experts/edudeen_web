import { useCallback, useState } from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiGetMarketplaceStats,
  apiGetMarketplaceListings,
  apiSetListingFeatured,
  apiRemoveListing,
  apiSetStoreBadge,
  apiSetStoreFulfillmentMode,
  apiGetLeads,
  apiGetLeadDetail,
  apiMarkLeadUnderReview,
  apiApproveLead,
  apiRejectLead,
  type MarketplaceListingQuery,
  type GrantableStoreBadge,
  type LeadsQuery,
  type LeadDetail,
} from '@/api/services/marketplace/adminMarketplace';

export function useMarketplaceStats() {
  return useAnalyticsQuery(() => apiGetMarketplaceStats(), {});
}

export function useMarketplaceListings(query: MarketplaceListingQuery) {
  return useAnalyticsQuery(apiGetMarketplaceListings, query);
}

export function useMarketplaceListingActions() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const setFeatured = useCallback(async (id: string, isFeatured: boolean) => {
    setProcessingId(id);
    setError('');
    try {
      await apiSetListingFeatured(id, isFeatured);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update listing.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const removeListing = useCallback(async (id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiRemoveListing(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove listing.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const setStoreBadge = useCallback(async (storeId: string, badge: GrantableStoreBadge, grant: boolean) => {
    setProcessingId(storeId);
    setError('');
    try {
      await apiSetStoreBadge(storeId, badge, grant);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update store badge.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const setFulfillmentMode = useCallback(async (storeId: string, mode: 'seller' | 'platform') => {
    setProcessingId(storeId);
    setError('');
    try {
      await apiSetStoreFulfillmentMode(storeId, mode);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update fulfillment mode.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  return { setFeatured, removeListing, setStoreBadge, setFulfillmentMode, processingId, error };
}

export function useLeads(query: LeadsQuery) {
  return useAnalyticsQuery(apiGetLeads, query);
}

/** Lazily fetched — only call `refetch` once a lead's detail view (e.g. a
 *  Modal) actually opens, since each fetch generates fresh signed document
 *  URLs server-side. */
export function useLeadDetail(id: string | null) {
  const [data, setData] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    apiGetLeadDetail(id)
      .then(res => setData(res.data))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load lead.'))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error, refetch, setData };
}

export function useLeadActions() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const markUnderReview = useCallback(async (id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiMarkLeadUnderReview(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead status.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const approve = useCallback(async (id: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiApproveLead(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve lead.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  const reject = useCallback(async (id: string, reason: string) => {
    setProcessingId(id);
    setError('');
    try {
      await apiRejectLead(id, reason);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject lead.');
      return false;
    } finally {
      setProcessingId(null);
    }
  }, []);

  return { markUnderReview, approve, reject, processingId, error };
}
