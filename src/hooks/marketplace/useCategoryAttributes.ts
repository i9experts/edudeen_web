import { useState, useEffect, useCallback } from 'react';
import { apiGetCategoryAttributes, type AttributeDefinition } from '@/api/services/attributes';

// Fetches the structured classification fields (subject, format, etc) a
// seller should fill in for a product once a category is chosen — one
// mechanism serving both taxonomy filtering and the seller product form.
export function useCategoryAttributes(categoryId?: string | null) {
  const [definitions, setDefinitions] = useState<AttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!categoryId) { setDefinitions([]); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGetCategoryAttributes(categoryId)
      .then(res => { if (!cancelled) setDefinitions(res.data ?? []); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load attributes.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [categoryId, reloadKey]);

  return { definitions, loading, error, refetch };
}
