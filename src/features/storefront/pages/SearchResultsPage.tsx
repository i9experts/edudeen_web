import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useStorefront } from '../StorefrontContext';
import { ProductCatalogSection } from '../sections/ProductCatalogSection';

/** `/search?q=` — the navbar search box's results. Reuses the real
 *  `ProductCatalogSection` (grid/sort/pagination) scoped by `search`,
 *  rather than a second product-listing implementation. */
export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { store } = useStorefront();

  useEffect(() => {
    document.title = q ? `"${q}" — ${store.name}` : store.name;
    return () => { document.title = 'Edudeen'; };
  }, [q, store.name]);

  if (!q.trim()) {
    return <div className="px-4 sm:px-6 lg:px-10 py-16 text-center"><p className="text-[13px] text-slate">Type something to search this store.</p></div>;
  }

  return <ProductCatalogSection settings={{ heading: `Search results for "${q}"`, search: q, defaultSort: 'newest', columns: 3, showFilters: true }} />;
}
