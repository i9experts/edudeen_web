import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { parseBrowseClass, parseBrowseSubject } from '@/utils/browsePath';
import { BrowsePathCtx } from './browsePathCtx';
import { HomeBrowse } from './HomeBrowse';
import { NotFoundPage } from './NotFoundPage';
import { BuyerNavbar } from '@/components/comman/ui';
import { ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';

/**
 * `/browse/class-5/math` and `/browse/class-5` -> the normal shop browse view, filtered to that class (+ category).
 * Unknown class or category slug -> the 404 page (never an error screen).
 */
export function BrowsePathPage() {
  const params = useParams<{ class: string; subject?: string }>();
  const cls = parseBrowseClass(params.class);
  const subject = parseBrowseSubject(params.subject);
  const { bySlug, loading } = useCategoryTree();
  const value = useMemo(() => (cls && subject !== null ? { cls, subject } : null), [cls, subject]);

  if (!value) return <NotFoundPage />;
  if (value.subject) {
    if (loading) {
      return (
        <div className="bg-white min-h-full">
          <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
          <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-6 pb-12">
            <div className="h-8 w-64 bg-bone rounded animate-pulse mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-5">
              {Array.from({ length: 8 }, (_, i) => <ResourceCardSkeleton key={i} />)}
            </div>
          </main>
        </div>
      );
    }
    if (!bySlug.get(value.subject)) return <NotFoundPage />;
  }
  return <BrowsePathCtx.Provider value={value}><HomeBrowse /></BrowsePathCtx.Provider>;
}
