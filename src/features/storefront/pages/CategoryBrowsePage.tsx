import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderX } from 'lucide-react';
import { useStorefront } from '../StorefrontContext';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { ProductCatalogSection } from '../sections/ProductCatalogSection';

/** Store-scoped category browse — `/category/:slugOrId`. Resolves against the
 *  store's own subcategory tree client-side (the tree is small — one root
 *  plus its direct children, categories never nest further — so no new
 *  backend endpoint is needed), same `slugOrId` resolution precedent the
 *  main Marketplace already uses for its own category routes. Renders the
 *  real `ProductCatalogSection` scoped to the resolved subcategory, so this
 *  page shares its sort/pagination/filter behavior with every other product
 *  grid on the storefront rather than being a second implementation. */
export function CategoryBrowsePage() {
  const { slugOrId = '' } = useParams<{ slugOrId: string }>();
  const { store, cfg } = useStorefront();
  const [category, setCategory] = useState<CategoryNode | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (!store.categoryId) { setCategory(null); return; }
    setCategory(undefined);
    apiGetCategoryTree(store.categoryId)
      .then(res => {
        const match = (res.data.children ?? []).find(c => c.slug === slugOrId || c._id === slugOrId) ?? null;
        setCategory(match);
      })
      .catch(() => setCategory(null));
  }, [store.categoryId, slugOrId]);

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
