import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Heart, Star } from 'lucide-react';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { coverPaletteFor } from './ProductCoverFallback';
import { ageLabel } from '@/constants/learning';

// Same name-keyed palette as ProductCoverFallback, so a product keeps its
// colours between the grid card and cart/wishlist/detail thumbnails.
const paletteFor = coverPaletteFor;

const LEVEL_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
const TYPE_LABEL: Record<string, string> = { physical: 'Physical', digital: 'Digital', educational: 'Educational' };

export interface ResourceCardProps {
  product:          MarketplaceProduct;
  /** Position in the grid — alternates the paper tilt like a hand-laid shelf. */
  index?:           number;
  onClick:          (slug: string) => void;
  isWishlisted?:    boolean;
  isWishlisting?:   boolean;
  onToggleWishlist?: (e: React.MouseEvent, id: string, variantId: string) => void;
}

function Cover({ product, tilt }: { product: MarketplaceProduct; tilt: number }) {
  const { bg, accent } = paletteFor(product.name || product._id);
  const [imgFailed, setImgFailed] = useState(false);
  const image = !imgFailed ? product.images?.[0] : undefined;

  return (
    <div
      className="h-[205px] sm:h-[230px] lg:h-[245px] rounded-xl overflow-hidden flex items-center justify-center p-[10px] sm:p-[22px]"
      style={{ background: bg }}
    >
      <div
        className="bg-white w-[90%] sm:w-[82%] h-[172px] sm:h-[190px] lg:h-[205px] shadow-[6px_9px_0_rgba(0,0,0,0.06)] border-t-[7px] flex flex-col overflow-hidden transition-transform duration-300 group-hover:rotate-0"
        style={{ borderTopColor: accent, transform: `rotate(${tilt}deg)` }}
      >
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-3 py-4" style={{ color: accent }}>
            <span className="text-[8px] sm:text-[9px] tracking-[2px] uppercase">Learn with purpose</span>
            <strong className="block font-serif font-normal text-[19px] sm:text-[23px] leading-[1.08] my-3 line-clamp-3">
              {product.name}
            </strong>
            <small className="text-[9px] sm:text-[10px] text-[#5d6570] line-clamp-1">
              {product.sellerName ?? 'Edudeen'}
            </small>
          </div>
        )}
      </div>
    </div>
  );
}

/** Stars + review count, e.g. "★ 4.6 (128)". Nothing for an unreviewed item. */
export function RatingLine({ rating, count, className }: { rating?: number; count?: number; className?: string }) {
  if (!count || !rating) return null;
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[12px] text-charcoal', className)} aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${count} reviews`}>
      <Star size={12} className="fill-brand-gold text-brand-gold" aria-hidden />
      <b className="font-semibold">{rating.toFixed(1)}</b>
      <span className="text-slate">({count.toLocaleString()})</span>
    </span>
  );
}

export const ResourceCard = memo(function ResourceCard({
  product, index = 0, onClick, isWishlisted = false, isWishlisting = false, onToggleWishlist,
}: ResourceCardProps) {
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const variant = (product.variants ?? []).find(v => v.isDefault) ?? product.variants?.[0];
  const variantId = variant?._id ?? '';
  const rawPrice = variant?.price ?? 0;
  const price = convert(rawPrice, variant?.currency);
  // Seller's "was" price — only when it's really higher than today's price.
  const rawWas = variant?.compareAtPrice && variant.compareAtPrice > rawPrice ? variant.compareAtPrice : null;
  const was = rawWas ? convert(rawWas, variant?.currency) : null;
  const percentOff = rawWas ? Math.round((1 - rawPrice / rawWas) * 100) : 0;
  const campaign = product.activeCampaign;
  const campaignOff = campaign?.discountValue
    ? campaign.discountType === 'percentage' ? `${campaign.discountValue}% off` : `${currencySymbol(campaign.currency ?? 'USD')} ${campaign.discountValue} off`
    : null;
  const fmt = (n: number) => `${currencySymbol(displayCurrency)} ${n.toLocaleString(undefined, { maximumFractionDigits: displayCurrency === 'PKR' ? 0 : 2 })}`;
  const kind = product.productType ?? product.type ?? 'physical';

  const level = product.educationLevel
    ? (product.educationLevel === 'other' ? product.customLevel : LEVEL_LABEL.get(product.educationLevel)) ?? null
    : null;
  const delivery = kind === 'physical' ? 'Ships to you'
    : product.deliveryFormat === 'course' ? 'Online course'
    : product.deliveryFormat === 'live_class' && product.liveSession
      ? `Live · ${new Date(product.liveSession.startsAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
      : 'Instant download';
  const meta = [ageLabel(product.ageMin, product.ageMax) ?? level ?? 'All ages', delivery].join(' · ');

  return (
    <article className="group relative min-w-0">
      <button
        onClick={() => onClick(product.slug)}
        aria-label={`View ${product.name}`}
        className="block w-full p-0 bg-transparent border-none cursor-pointer text-start"
      >
        <Cover product={product} tilt={index % 2 === 0 ? -4 : 4} />
      </button>

      {(campaignOff || percentOff > 0) && (
        <span className="absolute start-[7px] top-[7px] sm:start-3 sm:top-3 max-w-[70%] truncate text-[10.5px] sm:text-[11px] font-bold px-2 py-[3px] rounded-full bg-error text-white shadow-sm">
          {campaign && campaignOff ? `${campaign.name} · ${campaignOff}` : `-${percentOff}%`}
        </span>
      )}

      {onToggleWishlist && variantId && (
        <button
          onClick={e => onToggleWishlist(e, product._id, variantId)}
          disabled={isWishlisting}
          aria-pressed={isWishlisted}
          aria-label={`${isWishlisted ? 'Unsave' : 'Save'} ${product.name}`}
          className={clsx(
            'absolute end-[7px] top-[7px] sm:end-3 sm:top-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center cursor-pointer transition-colors',
            isWishlisted ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white border-[#dfe5e6] text-brand-orange hover:bg-brand-pale-orange',
            isWishlisting && 'opacity-60',
          )}
        >
          <Heart size={15} className={isWishlisted ? 'fill-white' : ''} />
        </button>
      )}

      <p className="text-[12px] text-slate mt-[13px] mb-[5px] truncate">{meta}</p>
      <button
        onClick={() => onClick(product.slug)}
        className="block p-0 bg-transparent border-none text-start text-carbon font-bold text-[14px] sm:text-[16px] leading-[1.4] cursor-pointer hover:underline line-clamp-2"
      >
        {product.name}
      </button>
      {product.sellerName && (
        product.storeSlug ? (
          <Link
            to={getStorePagePath(product.storeSlug)}
            className="inline-block my-[5px] text-[13px] font-bold text-brand-orange border-b border-current pb-[2px] hover:text-brand-deep-orange truncate max-w-full"
          >
            {product.sellerName}
          </Link>
        ) : (
          <span className="block my-[5px] text-[13px] text-slate truncate">{product.sellerName}</span>
        )
      )}
      <RatingLine rating={product.averageRating} count={product.totalRatings} className="block mb-1" />
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
          <strong className={clsx('text-[14px] sm:text-[16px]', was ? 'text-error' : 'text-carbon')}>
            {rawPrice === 0 ? 'Free' : fmt(price)}
          </strong>
          {was && rawPrice > 0 && (
            <s className="text-[12px] text-slate" aria-label={`Was ${fmt(was)}`}>{fmt(was)}</s>
          )}
        </span>
        <span className="text-[9px] sm:text-[11px] border border-[#dde5e8] px-[7px] py-[3px] rounded text-[#566773] shrink-0">
          {TYPE_LABEL[kind] ?? kind}
        </span>
      </div>
    </article>
  );
});

export function ResourceCardSkeleton() {
  return (
    <div className="min-w-0 animate-pulse">
      <div className="h-[205px] sm:h-[230px] lg:h-[245px] rounded-xl bg-bone" />
      <div className="h-3 w-1/2 bg-bone rounded mt-4" />
      <div className="h-4 w-4/5 bg-bone rounded mt-3" />
      <div className="h-3 w-1/3 bg-bone rounded mt-3" />
    </div>
  );
}
