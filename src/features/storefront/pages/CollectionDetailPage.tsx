import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PackageX } from 'lucide-react';
import { useStorefront } from '../StorefrontContext';
import { apiGetPublicCollectionBySlug, type PublicCollectionSummary } from '@/api/services/collections';
import { ProductCatalogSection } from '../sections/ProductCatalogSection';

/** `/collections/:slugOrId` — a named collection's own product grid. Reuses
 *  the real `ProductCatalogSection` (same sort/pagination/tag-filter
 *  behavior as any other product grid) scoped via `collectionId`, whose
 *  resolution (`CollectionsService.resolveProductIds`) already accepts a
 *  slug or an id, so this works whether the visitor arrived via a pretty
 *  `/collections/new-arrivals` URL or a nav link storing the raw id. */
export function CollectionDetailPage() {
  const { slugOrId = '' } = useParams<{ slugOrId: string }>();
  const { store, cfg } = useStorefront();
  const [collection, setCollection] = useState<PublicCollectionSummary | null | undefined>(undefined);

  useEffect(() => {
    setCollection(undefined);
    apiGetPublicCollectionBySlug(store.storeId, slugOrId)
      .then(res => setCollection(res.data))
      .catch(() => setCollection(null));
  }, [store.storeId, slugOrId]);

  useEffect(() => {
    document.title = collection ? `${collection.name} — ${store.name}` : store.name;
    return () => { document.title = 'Edudeen'; };
  }, [collection, store.name]);

  if (collection === undefined) {
    return <div className="px-4 sm:px-6 lg:px-10 py-16 text-center"><p className="text-[13px] text-slate">Loading…</p></div>;
  }
  if (!collection) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-20 flex flex-col items-center gap-3 text-center">
        <PackageX size={28} style={{ color: cfg.textColor, opacity: 0.4 }} />
        <p className="text-[15px] font-semibold" style={{ color: cfg.textColor }}>Collection not found</p>
        <p className="text-[13px] text-slate max-w-sm">This collection may have been removed or unpublished.</p>
      </div>
    );
  }

  return (
    <>
      {collection.description && (
        <p className="px-4 sm:px-6 lg:px-10 pt-6 text-[13px] max-w-2xl" style={{ color: cfg.textColor, opacity: 0.75 }}>{collection.description}</p>
      )}
      <ProductCatalogSection settings={{ heading: collection.name, collectionId: slugOrId, defaultSort: 'newest', columns: 3, showFilters: true }} />
    </>
  );
}
