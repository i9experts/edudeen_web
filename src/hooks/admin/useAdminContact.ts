import { useState, useEffect, useCallback } from 'react';
import { apiGetAllContactSubmissions, type ContactSubmission, type ContactStats } from '@/api/services/contact';

export function useAdminContact(priorityOnly = false) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [stats, setStats] = useState<ContactStats>({ new: 0, read: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGetAllContactSubmissions(priorityOnly)
      .then(res => { setSubmissions(res.data ?? []); setStats(res.stats ?? { new: 0, read: 0, resolved: 0 }); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load contact messages.'))
      .finally(() => setLoading(false));
  }, [priorityOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  return { submissions, stats, loading, error, refetch };
}
