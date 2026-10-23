import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { BuyerNavbar } from '@/components/comman/ui';
import { FeatureMaintenance } from '@/components/comman/ui/FeatureMaintenance';
import { ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { usePageMeta } from '@/hooks/usePageMeta';
import { breadcrumbJsonLd } from '@/utils/seoSchema';
import { SITE_URL } from '@/utils/seo';
import { useCategoryTree, categoryPath } from '@/hooks/marketplace/useCategoryTree';
import { useT } from '@/contexts/languageCtx';
import { BrowseResults } from './BrowseResults';
import { isBrowseMode } from '@/utils/homeMode';

/**
 * The homepage IS the shop. When the URL carries a category / search / filter
 * (`/?category=maths&sort=rating&class=class-3`, `/?search=quran`), `Homepage`
 * shows this browse view instead of the landing sections. Everything lives in
 * the query string, so Back and shared links work. The category can be a main
 * category or any nested subcategory slug.
 */
export { isBrowseMode };

export function HomeBrowse() {
  const t = useT();
  const [params] = useSearchParams();
  const slug = (params.get('category') ?? '').trim();
  const q = (params.get('search') ?? params.get('q') ?? '').trim();
  const { bySlug, byId, loading } = useCategoryTree();
  const entry = slug ? (bySlug.get(slug.toLowerCase()) ?? byId.get(slug) ?? null) : null;

  const pageTitle = entry ? entry.node.name : q ? `“${q}” — ${t('Search')}` : t('All resources');
  // Category pages are indexable (canonical /c/<slug>, the same URL the bot prerender serves); search / filtered lists are not.
  const isFiltered = ['sort', 'class', 'type', 'min', 'max', 'rating', 'free', 'board', 'age', 'grade', 'page', 'exact', 'cat'].some(k => params.has(k));
  usePageMeta(entry ? {
    title: `${entry.node.name} - worksheets, books & courses`,
    description: (entry.node.description ?? '').replace(/\s+/g, ' ').trim().slice(0, 155) || `Browse ${entry.node.name} resources on Edudeen: worksheets, books, digital downloads and courses from trusted sellers.`,
    canonical: `/c/${entry.node.slug ?? slug}`,
    image: entry.node.image ?? null,
    noindex: isFiltered && params.has('page') && params.get('page') !== '1',
    jsonLd: breadcrumbJsonLd([
      { name: 'Home', url: `${SITE_URL}/` },
      ...entry.ancestors.map(a => ({ name: a.name, url: `${SITE_URL}/c/${a.slug}` })),
      { name: entry.node.name, url: `${SITE_URL}/c/${entry.node.slug ?? slug}` },
    ]),
  } : { title: pageTitle, canonical: '/', noindex: !!q || isFiltered });

  const crumbs = useMemo(() => {
    if (entry) {
      return [
        { label: 'Home', path: '/' },
        ...entry.ancestors.map(a => ({ label: a.name, path: categoryPath(a) })),
        { label: entry.node.name },
      ];
    }
    return [{ label: 'Home', path: '/' }, { label: q ? `Search: ${q}` : 'All resources' }];
  }, [entry, q]);

  // Unknown category slug: fall back to a text search for the slug words, keeping the other filters.
  if (slug && !loading && !entry) {
    const next = new URLSearchParams(params);
    next.delete('category');
    if (!q) next.set('search', slug.replace(/-/g, ' '));
    return <Navigate to={`/?${next.toString()}`} replace />;
  }

  if (slug && !entry) {
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

  if (entry) {
    // A category lists its subcategories; a leaf subcategory lists its siblings.
    const ownChildren = entry.node.children ?? [];
    const subs = ownChildren.length || !entry.parent ? ownChildren : entry.parent.children ?? [];
    return (
      <FeatureMaintenance feature="categories" variant="page">
        <BrowseResults
          key={entry.node._id}
          title={entry.node.name}
          eyebrow={entry.parent?.name ?? 'Category'}
          intro={entry.node.description}
          breadcrumb={crumbs}
          categoryId={entry.node._id}
          subcategories={subs.filter(s => s._id !== entry.node._id)}
          showCategoryFilter={false}
          showMainCategories
          bannerPlacement="categoryHero"
          emptyHint="Sellers haven't listed anything in this category yet."
        />
      </FeatureMaintenance>
    );
  }

  return (
    <FeatureMaintenance feature="search" variant="page">
      <BrowseResults
        title={q ? `Results for “${q}”` : 'All resources'}
        eyebrow={q ? 'Search' : undefined}
        breadcrumb={crumbs}
        showCategoryFilter
        showMainCategories
        bannerPlacement="marketplaceHero"
        emptyHint="Check the spelling, or try a broader word like “maths” or “Quran”."
      />
    </FeatureMaintenance>
  );
}
