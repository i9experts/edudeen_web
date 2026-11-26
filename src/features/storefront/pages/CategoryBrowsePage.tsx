import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderX } from 'lucide-react';
import { useStorefront } from '../StorefrontContext';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { ProductCatalogSection } from '../sections/ProductCatalogSection';

/** Store-scoped category browse — `/category/:slugOrId`. Resolves against one of the store's own
 *  (up to MAX_STORE_CATEGORIES) subcategory trees client-side — each is small — one root plus its
 *  direct children, categories never nest further — so no new backend endpoint is needed), same
 *  `slugOrId` resolution precedent the main Marketplace already uses for its own category routes.
 *  Renders the real `ProductCatalogSection` scoped to the resolved subcategory, so this page shares
 *  its sort/pagination/filter behavior with every other product grid on the storefront rather than
 *  being a second implementation. */
export function CategoryBrowsePage() {
  const { slugOrId = '' } = useParams<{ slugOrId: string }>();
  const { store, cfg } = useStorefront();
  const categoryIds = store.categoryIds?.length ? store.categoryIds : (store.categoryId ? [store.categoryId] : []);
  const [category, setCategory] = useState<CategoryNode | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (!categoryIds.length) { setCategory(null); return; }
    setCategory(undefined);
    let cancelled = false;
    Promise.all(categoryIds.map(id => apiGetCategoryTree(id).catch(() => null)))
      .then(trees => {
        if (cancelled) return;
        let match: CategoryNode | null = null;
        for (const tree of trees) {
          const found = (tree?.data.children ?? []).find(c => c.slug === slugOrId || c._id === slugOrId);
          if (found) { match = found; break; }
        }
        setCategory(match);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIds.join(','), slugOrId]);

  useEffect(() => {
    document.title = category ? `${category.name} — ${store.name}` : store.name;
    return () => { document.title = 'Edudeen'; };
  }, [category, store.name]);

  if (category === undefined) {
    return <div className="px-4 sm:px-6 lg:px-10 py-16 text-center"><p className="text-[13px] text-slate">Loading…</p></div>;
  }
  if (!category) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-20 flex flex-col items-center gap-3 text-center">
        <FolderX size={28} style={{ color: cfg.textColor, opacity: 0.4 }} />
        <p className="text-[15px] font-semibold" style={{ color: cfg.textColor }}>Category not found</p>
        <p className="text-[13px] text-slate max-w-sm">This category may have been removed or renamed.</p>
      </div>
    );
  }

  return (
    <ProductCatalogSection settings={{ heading: category.name, categoryId: category._id, defaultSort: 'newest', columns: 3, showFilters: true }} />
  );
}
