import { useState, useEffect, useCallback } from 'react';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';

// Fetches a store's main category plus its direct subcategories (one level
// deep — categories are capped at 2 levels server-side).
export function useStoreSubcategories(mainCategoryId: string | undefined) {
  const [mainCategory, setMainCategory] = useState<CategoryNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!mainCategoryId) { setMainCategory(null); setLoading(false); return; }
    setLoading(true);
    setError(false);
    apiGetCategoryTree(mainCategoryId)
      .then(res => setMainCategory(res.data))
      .catch(() => { setMainCategory(null); setError(true); })
      .finally(() => setLoading(false));
  }, [mainCategoryId]);

  useEffect(load, [load]);

  return { mainCategory, subcategories: mainCategory?.children ?? [], loading, error, refetch: load };
}
