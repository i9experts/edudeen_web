import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryArt } from '@/components/comman/art/CategoryArt';
import { SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import { categoryUrl } from '@/hooks/marketplace/useCategoryTree';
import { cloudinaryUrl } from '@/utils/cloudinaryImage';
import type { CategoryNode } from '@/api/services/categories';

const MAX_CARDS = 8;

function photoOf(n: CategoryNode) {
  return n.coverImage || n.image || n.coverImages?.[0] || '';
}

function Tile({ node }: { node: CategoryNode }) {
  const [broken, setBroken] = useState(false);
  const src = photoOf(node);
  return (
    <Link to={categoryUrl(node.slug || node._id)} className="group block min-w-0 no-underline" aria-label={node.name}>
      <div className="aspect-square rounded-lg overflow-hidden bg-[#eaf2f8]">
        {src && !broken
          ? <img src={cloudinaryUrl(src, 400)} alt={node.name} loading="lazy" decoding="async" onError={() => setBroken(true)} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          : <CategoryArt name={node.name} className="w-full h-full" />}
      </div>
      <p className="text-[13px] sm:text-sm text-carbon mt-1.5 mb-0 line-clamp-2 leading-snug group-hover:text-brand-royal group-hover:underline underline-offset-2">{node.name}</p>
    </Link>
  );
}

/** One Amazon-style card: a main category, with its best sub-categories as photo tiles. */
function CategoryCard({ node }: { node: CategoryNode }) {
  const t = useT();
  const to = categoryUrl(node.slug || node._id);
  const subs = (node.children ?? []).filter(c => (c.productCount ?? 0) > 0)
    .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0));
  const tiles = subs.length >= 4 ? subs.slice(0, 4) : subs.length >= 2 ? subs.slice(0, 2) : [];
  const [broken, setBroken] = useState(false);
  const cover = photoOf(node);
  return (
    <article className="flex flex-col bg-white rounded-2xl border border-bone p-4 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-[17px] md:text-[19px] font-extrabold text-carbon leading-tight tracking-tight m-0 line-clamp-2">{node.name}</h3>
        <Link to={to} aria-label={node.name} className="shrink-0 text-carbon hover:text-brand-royal mt-0.5">
          <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
        </Link>
      </div>
      {tiles.length > 0
        ? <div className="grid grid-cols-2 gap-x-3 gap-y-4 flex-1 content-start">{tiles.map(c => <Tile key={c._id} node={c} />)}</div>
        : (
          <Link to={to} className="group block flex-1 no-underline" aria-label={node.name}>
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#eaf2f8]">
              {cover && !broken
                ? <img src={cloudinaryUrl(cover, 640)} alt={node.name} loading="lazy" decoding="async" onError={() => setBroken(true)} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                : <CategoryArt name={node.name} className="w-full h-full" />}
            </div>
          </Link>
        )}
      <Link to={to} className="mt-3 text-[13px] font-medium text-brand-royal no-underline hover:underline self-start">
        {t('Shop all')}{typeof node.productCount === 'number' && node.productCount > 0 ? ` (${node.productCount})` : ''}
      </Link>
    </article>
  );
}

/** Main categories (most products first, empty ones skipped) as Amazon-style cards. */
export function ShopByCategory({ categories, loading }: { categories: CategoryNode[]; loading: boolean }) {
  const t = useT();
  const top = useMemo(
    () => categories
      .filter(c => (c.productCount ?? 0) > 0)
      .map((c, i) => ({ c, i }))
      .sort((a, b) => (b.c.productCount ?? 0) - (a.c.productCount ?? 0) || a.i - b.i)
      .slice(0, MAX_CARDS)
      .map(x => x.c),
    [categories],
  );
  const grid = 'grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5';
  if (loading && top.length === 0) {
    return (
      <section className="mb-12" aria-hidden>
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-bone p-4"><SkeletonBox width="60%" height={20} className="mb-3" /><SkeletonBox height={200} className="rounded-lg" /></div>)}
        </div>
      </section>
    );
  }
  if (top.length === 0) return null;
  return (
    <section className="mb-12" aria-label={t('Shop by category')}>
      <div className={grid}>
        {top.map(c => <CategoryCard key={c._id} node={c} />)}
      </div>
    </section>
  );
}
