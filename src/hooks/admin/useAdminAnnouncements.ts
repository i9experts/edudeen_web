import { useCallback, useState } from 'react';
import { useAnalyticsQuery } from '@/hooks/useAnalyticsQuery';
import {
  apiListAnnouncements,
  apiCreateAnnouncement,
  apiUpdateAnnouncement,
  apiSetAnnouncementStatus,
  apiDeleteAnnouncement,
  type AnnouncementQuery,
  type AnnouncementStatus,
  type CreateAnnouncementPayload,
  type UpdateAnnouncementPayload,
} from '@/api/services/announcements/adminAnnouncements';

export function useAdminAnnouncements(query: AnnouncementQuery) {
  return useAnalyticsQuery(apiListAnnouncements, query, ['announcements']);
}

export function useAnnouncementActions() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createAnnouncement = useCallback(async (payload: CreateAnnouncementPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiCreateAnnouncement(payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const updateAnnouncement = useCallback(async (id: string, payload: UpdateAnnouncementPayload) => {
    setSubmitting(true);
    setError('');
    try {
      await apiUpdateAnnouncement(id, payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const setStatus = useCallback(async (id: string, status: AnnouncementStatus, scheduledAt?: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiSetAnnouncementStatus(id, status, scheduledAt);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update announcement status.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id: string) => {
    setSubmitting(true);
    setError('');
    try {
      await apiDeleteAnnouncement(id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete announcement.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { createAnnouncement, updateAnnouncement, setStatus, deleteAnnouncement, submitting, error };
}
