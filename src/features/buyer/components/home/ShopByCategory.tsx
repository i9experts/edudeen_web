import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CategoryArt } from '@/components/comman/art/CategoryArt';
import { SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import { categoryUrl } from '@/hooks/marketplace/useCategoryTree';
import { cloudinaryUrl } from '@/utils/cloudinaryImage';
import type { CategoryNode } from '@/api/services/categories';
import { CARD_GRID_CLASS, CARD_ITEM_CLASS, placeOthersLast, tileSpanClass, uniqueByIdThenName } from './categoryCardRules';

const MAX_CARDS = 8;

function photoOf(n: CategoryNode) {
  return n.coverImage || n.image || n.coverImages?.[0] || '';
}

function flattenSubs(n: CategoryNode): CategoryNode[] {
  return (n.children ?? []).flatMap(c => [c, ...flattenSubs(c)]);
}

/** `label` '' = photo-only tile (fallback photos never repeat a name). The label row keeps its height so cards line up. */
function Tile({ node, label, span }: { node: CategoryNode; label: string; span?: string }) {
  // `brokenSrc` (not a boolean): a new photo URL after a live refresh gets a fresh try.
  const [brokenSrc, setBrokenSrc] = useState('');
  const src = photoOf(node);
  const broken = brokenSrc === src;
  return (
    <Link to={categoryUrl(node.slug || node._id)} className={`group block min-w-0 no-underline ${span ?? ''}`} aria-label={label || node.name} title={label || undefined}>
      <div className={`${span ? 'aspect-[2/1]' : 'aspect-square'} rounded-lg overflow-hidden bg-[#eaf2f8]`}>
        {src && !broken
          ? <img src={cloudinaryUrl(src, 400)} alt={label} loading="lazy" decoding="async" onError={() => setBrokenSrc(src)} onLoad={e => { if (e.currentTarget.naturalWidth < 2) setBrokenSrc(src); }} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          : <CategoryArt name={node.name} className="w-full h-full" />}
      </div>
      <p className="text-[13px] sm:text-sm text-carbon mt-1.5 mb-0 line-clamp-2 break-words min-h-[2.75em] leading-snug group-hover:text-brand-royal group-hover:underline underline-offset-2">{label}</p>
    </Link>
  );
}

/** One Amazon-style card: a main category, with its best sub-categories as photo tiles. */
function CategoryCard({ node }: { node: CategoryNode }) {
  const t = useT();
  const to = categoryUrl(node.slug || node._id);
  const subs = placeOthersLast(
    uniqueByIdThenName(
      flattenSubs(node).filter(c => (c.productCount ?? 0) > 0 && c._id !== node._id)
        .sort((a, b) => (b.productCount ?? 0) - (a.productCount ?? 0)),
      c => c._id, c => c.name,
    ),
    c => c.name, c => c.productCount,
  );
  // Up to 4 tiles: sub-categories first, then distinct product photos of this category (unlabelled,
  // so a name never repeats). No subs and no photos = the category itself as one tile.
  const tiles: { key: string; node: CategoryNode; label: string }[] = subs.slice(0, 4).map(c => ({ key: c._id, node: c, label: c.name }));
  const used = new Set(tiles.map(t => photoOf(t.node)).filter(Boolean));
  for (const src of node.coverImages ?? []) {
    if (tiles.length >= 4) break;
    if (!src || used.has(src)) continue;
    used.add(src);
    tiles.push({
      key: `${node._id}-photo-${tiles.length}`,
      node: { ...node, coverImage: src, image: src, coverImages: [] } as CategoryNode,
      label: tiles.length === 0 ? node.name : '',
    });
  }
  if (tiles.length === 0) tiles.push({ key: node._id, node, label: node.name });
  return (
    <article className={`flex flex-col bg-white rounded-2xl border border-bone p-4 min-w-0 ${CARD_ITEM_CLASS}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-[17px] md:text-[19px] font-extrabold text-carbon leading-tight tracking-tight m-0 line-clamp-2 min-h-[2.5em]">{node.name}</h3>
        <Link to={to} aria-label={node.name} className="shrink-0 text-carbon hover:text-brand-royal mt-0.5">
          <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 flex-1 content-start">{tiles.map((c, i) => <Tile key={c.key} node={c.node} label={c.label} span={tileSpanClass(tiles.length, i) || undefined} />)}</div>
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
    () => placeOthersLast(
      uniqueByIdThenName(
        categories
          .filter(c => (c.productCount ?? 0) > 0)
          .map((c, i) => ({ c, i }))
          .sort((a, b) => (b.c.productCount ?? 0) - (a.c.productCount ?? 0) || a.i - b.i)
          .map(x => x.c),
        c => c._id, c => c.name,
      ),
      c => c.name, c => c.productCount, 4, // "Others" never lands in the first row of 4
    ).slice(0, MAX_CARDS),
    [categories],
  );
  const grid = CARD_GRID_CLASS;
  if (loading && top.length === 0) {
    return (
      <section className="mb-12" aria-hidden>
        <div className={grid}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className={`bg-white rounded-2xl border border-bone p-4 ${CARD_ITEM_CLASS}`}><SkeletonBox width="60%" height={20} className="mb-3" /><SkeletonBox height={200} className="rounded-lg" /></div>)}
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
