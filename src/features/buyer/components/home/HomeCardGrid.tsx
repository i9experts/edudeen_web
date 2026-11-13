import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { CategoryArt } from '@/components/comman/art/CategoryArt';
import { useT } from '@/contexts/languageCtx';
import { useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { cloudinaryUrl } from '@/utils/cloudinaryImage';
import { categorySlugOf } from '@/utils/linkTarget';
import { safeHttpUrl } from '@/utils/safeRedirect';
import { SkeletonBox } from '@/components/comman/ui';
import type { CategoryNode } from '@/api/services/categories';
import type { HomeCard, HomeCardTile } from '@/api/services/homeCards';
import { CARD_GRID_CLASS, CARD_ITEM_CLASS, placeOthersLast, tileSpanClass, uniqueByIdThenName } from './categoryCardRules';

/** In-site path -> router Link; http(s) URL -> new-tab anchor; anything else -> plain box (not clickable). */
function SmartLink({ to, className, children, label }: { to: string; className?: string; children: ReactNode; label?: string }) {
  if (to.startsWith('/') && !to.startsWith('//')) return <Link to={to} className={className} aria-label={label}>{children}</Link>;
  const href = safeHttpUrl(to);
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>{children}</a>;
  return <div className={className}>{children}</div>;
}

/** A tile with its linked category (if any) already resolved. */
interface ResolvedTile { tile: HomeCardTile; cat?: CategoryNode; label: string }

function TileView({ rt, span }: { rt: ResolvedTile; span?: string }) {
  const { tile, cat, label } = rt;
  const [brokenSrc, setBrokenSrc] = useState('');
  // Admin photo first, then the linked category's real product photo / image, then the brand illustration.
  const src = tile.imageUrl || cat?.coverImage || cat?.image || '';
  const broken = brokenSrc === src;
  return (
    <SmartLink to={tile.link} className={clsx('group block min-w-0 no-underline', span)} label={label || undefined}>
      <div className={clsx(span ? 'aspect-[2/1]' : 'aspect-square', 'rounded-lg overflow-hidden bg-[#eaf2f8]')}>
        {src && !broken
          ? <img src={cloudinaryUrl(src, 400)} alt={label} loading="lazy" decoding="async" onError={() => setBrokenSrc(src)} onLoad={e => { if (e.currentTarget.naturalWidth < 2) setBrokenSrc(src); }} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          : <CategoryArt name={label || 'Resources'} className="w-full h-full" />}
      </div>
      <p title={label || undefined} className="text-[13px] sm:text-sm text-carbon mt-1.5 mb-0 line-clamp-2 break-words min-h-[2.75em] leading-snug group-hover:text-brand-royal group-hover:underline underline-offset-2">{label}</p>
    </SmartLink>
  );
}

/** Up to 4 tiles: empty linked categories dropped, unique by link then label, "Others" last (hidden under 2 products). */
function resolveTiles(card: HomeCard, bySlug: Map<string, { node: CategoryNode }>): ResolvedTile[] {
  const all: ResolvedTile[] = card.tiles.map(tile => {
    const slug = categorySlugOf(tile.link);
    const cat = slug ? bySlug.get(slug)?.node : undefined;
    return { tile, cat, label: tile.label || cat?.name || '' };
  }).filter(r => !(r.cat && (r.cat.productCount ?? 0) <= 0));
  const unique = uniqueByIdThenName(all, r => r.tile.link, r => r.label);
  return placeOthersLast(unique, r => r.label, r => (r.cat ? r.cat.productCount : 99)).slice(0, 4);
}

function CardView({ card, bySlug }: { card: HomeCard; bySlug: Map<string, { node: CategoryNode }> }) {
  const t = useT();
  const [brokenCover, setBrokenCover] = useState('');
  const tiles = card.layout === 'single' ? [] : resolveTiles(card, bySlug);
  if (card.layout !== 'single' && tiles.length === 0) return null;
  // Same number the /?category= page uses (tree productCount); only when the admin left the button text blank.
  const linkSlug = categorySlugOf(card.link);
  const linkCount = linkSlug ? bySlug.get(linkSlug)?.node.productCount : undefined;
  const cta = card.ctaLabel || (linkCount && linkCount > 0 ? `${t('Shop all')} (${linkCount})` : 'See more');
  const chevron = (
    <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
  );
  return (
    <article className={clsx('flex flex-col bg-white rounded-2xl border border-bone p-4 min-w-0', CARD_ITEM_CLASS)}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-[17px] md:text-[19px] font-extrabold text-carbon leading-tight tracking-tight m-0 line-clamp-2 min-h-[2.5em]">{card.title}</h2>
        {card.link && (
          <SmartLink to={card.link} className="shrink-0 text-carbon hover:text-brand-royal no-underline mt-0.5" label={t(cta)}>{chevron}</SmartLink>
        )}
      </div>
      {card.layout === 'single'
        ? (
          <SmartLink to={card.link} className="group block flex-1 no-underline" label={card.title}>
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#eaf2f8]">
              {card.imageUrl && brokenCover !== card.imageUrl
                ? <img src={cloudinaryUrl(card.imageUrl, 640)} alt={card.title} loading="lazy" decoding="async" onError={() => setBrokenCover(card.imageUrl)} onLoad={e => { if (e.currentTarget.naturalWidth < 2) setBrokenCover(card.imageUrl); }} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                : <CategoryArt name={card.title} className="w-full h-full" />}
            </div>
          </SmartLink>
        )
        : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 flex-1 content-start">
            {tiles.map((rt, i) => <TileView key={rt.tile.link + i} rt={rt} span={tileSpanClass(tiles.length, i) || undefined} />)}
          </div>
        )}
      {card.link && (
        <SmartLink to={card.link} className="mt-3 text-[13px] font-medium text-brand-royal no-underline hover:underline self-start">
          {t(cta)}
        </SmartLink>
      )}
    </article>
  );
}
/** Amazon-style card row under the hero. Every card the admin publishes is shown (no cap), in the admin's order. */
export function HomeCardGrid({ cards, overlap = false, className, loading = false }: { cards: HomeCard[]; overlap?: boolean; className?: string; loading?: boolean }) {
  const { bySlug } = useCategoryTree();
  const wrap = clsx('relative z-10 mb-10', CARD_GRID_CLASS, overlap && 'lg:-mt-20', className);
  if (loading && !cards.length) {
    return (
      <section aria-hidden className={wrap}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={clsx('bg-white rounded-2xl border border-bone p-4', CARD_ITEM_CLASS)}><SkeletonBox width="60%" height={20} className="mb-3" /><SkeletonBox height={200} className="rounded-lg" /></div>
        ))}
      </section>
    );
  }
  if (!cards.length) return null;
  // "Others" cards go last, never in the first row, and only with >= 2 products (count unknown = keep).
  const ordered = placeOthersLast(
    cards,
    c => c.title,
    c => { const s = categorySlugOf(c.link); const n = s ? bySlug.get(s)?.node.productCount : undefined; return typeof n === 'number' ? n : 99; },
    4,
  );
  return (
    <section aria-label="Featured collections" className={wrap}>
      {ordered.map(c => <CardView key={c._id} card={c} bySlug={bySlug} />)}
    </section>
  );
}