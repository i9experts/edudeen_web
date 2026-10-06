import { useCallback, useState } from 'react';
import type { MaintenancePayload } from '@/api/services/maintenance';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiGetPlatformConfig,
  apiUpdateFeatureFlags,
  apiUpdateAiConfig,
  apiUpdateEmailConfig,
  apiUpdateMaintenanceMode,
  apiUpdatePlacementLimits,
  apiUpdatePromotionPricing,
  apiUpdateManualPaymentConfig,
  apiUpdatePayoutConfig,
  type PayoutConfig,
  type FeatureFlags,
  type AiConfig,
  type EmailConfig,
  type PlacementLimits,
  type PromotionPricing,
  type ManualPaymentConfig,
} from '@/api/services/config/adminConfig';

export function useAdminConfig() {
  return useAnalyticsQuery(() => apiGetPlatformConfig(), {});
}

export function useUpdateFeatureFlags() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: Partial<FeatureFlags>) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdateFeatureFlags(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature flags.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdateAiConfig() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: Partial<AiConfig>) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdateAiConfig(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update AI config.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdateEmailConfig() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: Partial<EmailConfig>) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdateEmailConfig(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email config.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdatePlacementLimits() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: Partial<PlacementLimits>) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdatePlacementLimits(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update placement limits.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdatePromotionPricing() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: PromotionPricing) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdatePromotionPricing(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promotion pricing.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdateManualPaymentConfig() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: Partial<ManualPaymentConfig>) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdateManualPaymentConfig(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update manual payment config.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdatePayoutConfig() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: Partial<PayoutConfig>) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdatePayoutConfig(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payout settings.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}

export function useUpdateMaintenanceMode() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback(async (payload: MaintenancePayload) => {
    setSubmitting(true);
    setError('');
    try {
      return (await apiUpdateMaintenanceMode(payload)).data ?? true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update maintenance mode.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { update, submitting, error };
}
