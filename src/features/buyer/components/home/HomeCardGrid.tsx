import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { CategoryArt } from '@/components/comman/art/CategoryArt';
import { useT } from '@/contexts/languageCtx';
import { useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { cloudinaryUrl } from '@/utils/cloudinaryImage';
import { categorySlugOf } from '@/utils/linkTarget';
import { safeHttpUrl } from '@/utils/safeRedirect';
import type { HomeCard, HomeCardTile } from '@/api/services/homeCards';

/** In-site path -> router Link; http(s) URL -> new-tab anchor; anything else -> plain box (not clickable). */
function SmartLink({ to, className, children, label }: { to: string; className?: string; children: ReactNode; label?: string }) {
  if (to.startsWith('/') && !to.startsWith('//')) return <Link to={to} className={className} aria-label={label}>{children}</Link>;
  const href = safeHttpUrl(to);
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={label}>{children}</a>;
  return <div className={className}>{children}</div>;
}

function TileView({ tile }: { tile: HomeCardTile }) {
  const { bySlug } = useCategoryTree();
  const [broken, setBroken] = useState(false);
  const slug = categorySlugOf(tile.link);
  const cat = slug ? bySlug.get(slug)?.node : undefined;
  // Admin photo first, then the linked category's real product photo / image, then the brand illustration.
  const src = tile.imageUrl || cat?.coverImage || cat?.image || '';
  const label = tile.label || cat?.name || '';
  return (
    <SmartLink to={tile.link} className="group block min-w-0 no-underline" label={label || undefined}>
      <div className="aspect-square rounded-lg overflow-hidden bg-[#eaf2f8]">
        {src && !broken
          ? <img src={cloudinaryUrl(src, 400)} alt={label} loading="lazy" decoding="async" onError={() => setBroken(true)} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          : <CategoryArt name={label || 'Resources'} className="w-full h-full" />}
      </div>
      {label && <p className="text-[13px] sm:text-sm text-carbon mt-1.5 mb-0 line-clamp-2 leading-snug group-hover:text-brand-royal group-hover:underline underline-offset-2">{label}</p>}
    </SmartLink>
  );
}

function CardView({ card }: { card: HomeCard }) {
  const t = useT();
  const cta = card.ctaLabel || 'See more';
  const chevron = (
    <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
  );
  return (
    <article className="flex flex-col bg-white rounded-2xl border border-bone p-4 min-w-0">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h2 className="text-[17px] md:text-[19px] font-extrabold text-carbon leading-tight tracking-tight m-0 line-clamp-2">{card.title}</h2>
        {card.link && (
          <SmartLink to={card.link} className="shrink-0 text-carbon hover:text-brand-royal no-underline mt-0.5" label={t(cta)}>{chevron}</SmartLink>
        )}
      </div>
      {card.layout === 'single'
        ? (
          <SmartLink to={card.link} className="group block flex-1 no-underline" label={card.title}>
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#eaf2f8]">
              {card.imageUrl
                ? <img src={cloudinaryUrl(card.imageUrl, 640)} alt={card.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                : <CategoryArt name={card.title} className="w-full h-full" />}
            </div>
          </SmartLink>
        )
        : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 flex-1 content-start">
            {card.tiles.slice(0, 4).map((tile, i) => <TileView key={i} tile={tile} />)}
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
export function HomeCardGrid({ cards, overlap = false, className }: { cards: HomeCard[]; overlap?: boolean; className?: string }) {
  if (!cards.length) return null;
  return (
    <section
      aria-label="Featured collections"
      className={clsx('relative z-10 grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-10', overlap && 'lg:-mt-20', className)}
    >
      {cards.map(c => <CardView key={c._id} card={c} />)}
    </section>
  );
}