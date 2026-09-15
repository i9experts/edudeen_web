import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { SkeletonBox } from '@/components/comman/ui';
import { apiGetPublicStorePage, type StorePageData } from '@/api/services/storePages';
import { useStorefront } from '@/features/storefront/StorefrontContext';
import { SectionRenderer } from '@/features/storefront/SectionRenderer';

// Generic leaf for any seller-created custom page (About Us, Contact, Shipping
// Policy, ...) — served at `/:slug/:pageSlug` (e.g. `/hello/about-us`).
// Unlike the home page,
// there's no fixed transactional chrome here: the page is entirely whatever
// sections the seller composed.
export function StorefrontCustomPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const { store, cfg } = useStorefront();
  const [page, setPage] = useState<StorePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!pageSlug) return;
    setLoading(true);
    setNotFound(false);
    apiGetPublicStorePage(store.storeId, pageSlug)
      .then(res => setPage(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [store.storeId, pageSlug]);

  useEffect(() => {
    document.title = page?.seo.metaTitle || page?.title || store.name;
    return () => { document.title = 'Edudeen'; };
  }, [page, store.name]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-10 flex flex-col gap-4">
        <SkeletonBox width="40%" height={28} rounded="6px" />
        <SkeletonBox height={200} rounded="10px" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 py-16">
        <FileQuestion size={40} className="text-bone" />
        <p className="text-[14px] text-slate">This page doesn't exist.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 sm:px-6 lg:px-10 pt-8 pb-2">
        <h1 className="text-[24px] font-bold" style={{ color: cfg.textColor }}>{page.title}</h1>
      </div>
      <SectionRenderer sections={page.sections} />
    </div>
  );
}
