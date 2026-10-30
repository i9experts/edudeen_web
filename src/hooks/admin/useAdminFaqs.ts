import { useState, useEffect, useCallback } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { apiGetAllFaqs, type Faq, type FaqStats } from '@/api/services/faq';

export function useAdminFaqs() {
  const [faqs, setFaqs]   = useState<Faq[]>([]);
  const [stats, setStats] = useState<FaqStats>({ active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback((quiet: boolean) => {
    if (!quiet) setLoading(true);
    return apiGetAllFaqs()
      .then(res => { setFaqs(res.data ?? []); setStats(res.stats ?? { active: 0, inactive: 0 }); })
      .catch((err: unknown) => { if (!quiet) setError(err instanceof Error ? err.message : 'Failed to load FAQs.'); })
      .finally(() => { if (!quiet) setLoading(false); });
  }, []);
  const refetch = useCallback(() => load(false), [load]);

  useEffect(() => { refetch(); }, [refetch]);
  // Another admin / inline editor changed an FAQ: the list updates by itself.
  useLiveRefresh(['faqs'], () => { void load(true); });

  return { faqs, stats, loading, error, refetch };
}
