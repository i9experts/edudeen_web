import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import type { BannerStyle } from '@/api/services/banner';
import { cardImage } from './ResourceCard';
import { ProductCoverFallback } from './ProductCoverFallback';
import { responsiveImg } from '@/utils/cloudinaryImage';
import { variantPriceView } from '@/utils/saleMath';
import { formatPrice } from '@/utils/formatPrice';

/** A homepage banner built from real catalog products instead of an uploaded picture — the four
 *  built-in layouts an admin can pick in the Banner builder. Price/photo/stock are whatever the
 *  caller passed in `products` (live-resolved server-side at read time, see banner.service.ts). */

function defaultVariant(p: MarketplaceProduct) {
  return p.variants?.find(v => v.isDefault) ?? p.variants?.[0];
}

function useCountdown(targetIso?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  if (!targetIso) return null;
  const ms = Math.max(0, new Date(targetIso).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { h, m, s, done: ms <= 0 };
}

function TimerBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-center min-w-[36px] sm:min-w-[42px]">
      <b className="block text-[13px] sm:text-[18px] font-bold tabular-nums">{String(value).padStart(2, '0')}</b>
      {/* The eyebrow ("Flash sale ends in") already says what this is — the hrs/min/sec captions are
       *  only worth the extra line once there's room for them (sm:+). */}
      <span className="hidden sm:block text-[9px] uppercase tracking-wide opacity-70">{label}</span>
    </div>
  );
}

function ProductPhoto({ product, className }: { product: MarketplaceProduct; className?: string }) {
  const img = cardImage(product);
  if (!img) return <ProductCoverFallback name={product.name} tags={product.tags} productType={product.productType} size="md" className={className} />;
  return <img {...responsiveImg(img, '50vw', undefined, 480)} alt="" draggable={false} className={clsx('w-full h-full object-contain', className)} />;
}

/** One product's price line: current price, struck "was" price and a % off chip when discounted.
 *  `onDark` for the spotlight/countdown styles' gradient background; the lineup/collection cells
 *  sit on a light background instead. */
function PriceLine({ product, size = 'base', onDark = true }: { product: MarketplaceProduct; size?: 'sm' | 'base'; onDark?: boolean }) {
  const v = defaultVariant(product);
  const { price, was, pct } = variantPriceView(v);
  const big = size === 'base' ? 'text-[14px] sm:text-[22px]' : 'text-[13px]';
  // A multi-product cell is narrow on mobile (3-4 columns in a hero-sized slide) — the struck "was"
  // price and the % badge wrap onto their own line there and overflow the slide's height, so they're
  // sm:+ only; the current price (what matters most) always shows.
  const secondary = size === 'sm' ? 'hidden sm:inline' : 'inline';
  return (
    <div className={clsx('flex items-baseline gap-2 flex-wrap', size === 'sm' && 'justify-center')}>
      <span className={clsx('font-extrabold tabular-nums', big, onDark ? 'text-white' : 'text-brand-deep-orange')}>{formatPrice(price, v?.currency)}</span>
      {was != null && <span className={clsx('text-[12px] line-through tabular-nums', secondary, onDark ? 'text-white/60' : 'text-slate')}>{formatPrice(was, v?.currency)}</span>}
      {pct > 0 && <span className={clsx('bg-brand-green text-[#09260c] text-[11px] font-extrabold px-2 py-[2px] rounded-full', secondary)}>{pct}% off</span>}
    </div>
  );
}

function SpotlightLike({ product, dark, eyebrow, timer }: { product: MarketplaceProduct; dark: string; eyebrow: string; timer?: ReturnType<typeof useCountdown> }) {
  return (
    <div className={clsx('h-full w-full grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] overflow-hidden', dark)}>
      <div className="flex flex-col justify-center gap-1 sm:gap-2 p-3 sm:p-8 lg:p-10 min-w-0 text-white">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-wide font-bold text-[#e8c94c]">{eyebrow}</span>
        {timer && !timer.done && (
          <div className="flex gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
            <TimerBox value={timer.h} label="hrs" /><TimerBox value={timer.m} label="min" /><TimerBox value={timer.s} label="sec" />
          </div>
        )}
        <h2 className="m-0 text-[15px] sm:text-[26px] lg:text-[30px] font-bold leading-tight text-balance line-clamp-2">{product.name}</h2>
        <PriceLine product={product} />
        <span className="mt-0.5 sm:mt-1 self-start bg-white text-brand-deep-orange font-bold text-[11px] sm:text-[13.5px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">Shop now</span>
      </div>
      <div className="hidden sm:flex items-center justify-center p-6">
        <ProductPhoto product={product} className="max-h-[75%] max-w-[75%] drop-shadow-xl" />
      </div>
    </div>
  );
}

function MultiProductCell({ product, className }: { product: MarketplaceProduct; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center text-center gap-1 p-1.5 sm:p-2.5 min-w-0 h-full justify-center overflow-hidden', className)}>
      {/* Fixed small size — NOT full-width/aspect-square: this cell sits in a short, wide banner
          slot, so a photo that scales with column width would quickly outgrow the slide's height. */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-lg flex items-center justify-center p-1.5 shrink-0">
        <ProductPhoto product={product} />
      </div>
      <b className="text-[10.5px] sm:text-[12px] text-charcoal leading-tight line-clamp-1 sm:line-clamp-2 font-semibold">{product.name}</b>
      <PriceLine product={product} size="sm" onDark={false} />
    </div>
  );
}

export function ProductBannerSlide({
  style, products, endAt, title, onProductClick,
}: {
  style: BannerStyle;
  products: MarketplaceProduct[];
  /** 'countdown' style's target time. */
  endAt?: string | null;
  /** Admin-given banner title, shown as the heading on 'lineup'/'collection'. */
  title?: string;
  onProductClick?: (productId: string) => void;
}) {
  const timer = useCountdown(style === 'countdown' ? endAt : null);
  if (!products.length) return null;

  if (style === 'spotlight' || style === 'countdown') {
    const product = products[0];
    return (
      <Link
        to={`/product/${product.slug}`}
        draggable={false}
        onClick={() => onProductClick?.(product._id)}
        className={clsx('absolute inset-0 no-underline', style === 'countdown' && (timer?.done ?? false) && 'pointer-events-none')}
      >
        <SpotlightLike
          product={product}
          dark={style === 'countdown' ? 'bg-gradient-to-br from-[#2b0f12] to-[#5c1a1e]' : 'bg-gradient-to-br from-brand-deep-orange to-brand-orange'}
          eyebrow={style === 'countdown' ? (timer && !timer.done ? 'Flash sale ends in' : 'Flash sale') : 'Featured'}
          timer={style === 'countdown' ? timer ?? undefined : undefined}
        />
      </Link>
    );
  }

  // lineup (up to 3) / collection (up to 4): each product is its own link — no single slide-wide link.
  return (
    <div className="absolute inset-0 bg-brand-pale-orange flex flex-col overflow-hidden">
      {title && (
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-1">
          <h2 className="m-0 text-[14px] sm:text-[18px] font-bold text-brand-deep-orange line-clamp-1">{title}</h2>
        </div>
      )}
      <div
        className={clsx(
          'flex-1 min-h-0 grid',
          // Always a single row, even on mobile: a short hero slide has room for one row of narrow
          // cells, never two (a 2x2 grid roughly doubles the height a row needs).
          style === 'lineup' ? 'grid-cols-3' : 'grid-cols-4',
        )}
      >
        {products.map(product => (
          <Link
            key={product._id}
            to={`/product/${product.slug}`}
            draggable={false}
            onClick={() => onProductClick?.(product._id)}
            className="no-underline border-s border-bone/60 first:border-s-0"
          >
            <MultiProductCell product={product} />
          </Link>
        ))}
      </div>
    </div>
  );
}
