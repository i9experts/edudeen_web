import { useState, useEffect, useCallback } from 'react';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';

// Every active main category (each with its direct subcategories) for the
// seller's product category picker. Uses the public category tree.
export function useSellerCategories() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    apiGetCategoryTree()
      .then(res => setCategories([...(res.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))))
      .catch(() => { setCategories([]); setError(true); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return { categories, loading, error, refetch: load };
}