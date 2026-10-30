import { useCallback, useState } from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiListCampaigns,
  apiCreateCampaign,
  apiUpdateCampaign,
  apiSetCampaignStatus,
  apiDeleteCampaign,
  apiListPlatformCoupons,
  apiCreatePlatformCoupon,
  apiUpdatePlatformCoupon,
  apiDeletePlatformCoupon,
  type CampaignStatus,
  type CreateCampaignPayload,
  type UpdateCampaignPayload,
  type CreatePlatformCouponPayload,
  type UpdatePlatformCouponPayload,
} from '@/api/services/marketing/adminMarketing';

export function useCampaigns(status?: CampaignStatus) {
  return useAnalyticsQuery((p: { status?: CampaignStatus }) => apiListCampaigns(p.status), { status }, ['campaigns', 'marketing']);
}

export function useCampaignActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createCampaign = useCallback(async (payload: CreateCampaignPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiCreateCampaign(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateCampaign = useCallback(async (id: string, payload: UpdateCampaignPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdateCampaign(id, payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const setStatus = useCallback(async (id: string, status: CampaignStatus) => {
    setSubmitting(true);
    setError('');
    try {
      await apiSetCampaignStatus(id, status);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign status.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiDeleteCampaign(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { createCampaign, updateCampaign, setStatus, deleteCampaign, submitting, error };
}

export function usePlatformCoupons() {
  return useAnalyticsQuery(() => apiListPlatformCoupons(), {}, ['campaigns', 'marketing']);
}

export function usePlatformCouponActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createCoupon = useCallback(async (payload: CreatePlatformCouponPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiCreatePlatformCoupon(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateCoupon = useCallback(async (id: string, payload: UpdatePlatformCouponPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdatePlatformCoupon(id, payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update coupon.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteCoupon = useCallback(async (id: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiDeletePlatformCoupon(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { createCoupon, updateCoupon, deleteCoupon, submitting, error };
}
