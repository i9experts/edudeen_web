import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { ShoppingCart, Heart, Loader2, Star, Check, AlertCircle } from 'lucide-react';
import { ProductImage } from './ProductCard';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';
import { memberPriceOf, usePremiumView } from './PremiumBits';

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function FlashSaleCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-bone overflow-hidden h-full flex flex-col">
      <div className="animate-pulse aspect-square bg-bone" />
      <div className="p-3.5 flex-1 flex flex-col">
        <div className="animate-pulse h-[9px] w-16 bg-bone rounded-full mb-2" />
        <div className="animate-pulse h-[12px] bg-bone rounded-md mb-2" />
        <div className="animate-pulse h-[12px] w-2/3 bg-bone rounded-md mb-3" />
        <div className="mt-auto flex items-end justify-between">
          <div className="animate-pulse h-[18px] w-14 bg-bone rounded-md" />
          <div className="animate-pulse h-9 w-9 bg-bone rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ── Flash Sale card — a dedicated, image-forward design for the Homepage's
// Flash Sale rail. Deliberately not a ProductCard variant: the proportions
// (dominant portrait image, floating wishlist FAB, circular cart button)
// diverge enough from ProductCard's grid-card layout that forcing them into
// one shared component would mean two designs fighting inside the same
// markup. Same product data, same handlers/signatures as ProductCard —
// only the presentation is different. ──
export function FlashSaleCard({ product, onClick, onAddToCart, isAdding, addToCartFailed = false, isWishlisted, isWishlisting, onToggleWishlist, compact = false }: {
  product:          MarketplaceProduct;
  onClick:          (id: string) => void;
  onAddToCart:      (e: React.MouseEvent, id: string, variantId: string, type: 'physical' | 'digital') => void;
  isAdding:         boolean;
  /** Same recoverable-error signal as ProductCard's — a few seconds of
   *  "Try Again" right after this card's own add-to-cart request failed. */
  addToCartFailed?: boolean;
  isWishlisted:     boolean;
  isWishlisting:    boolean;
  onToggleWishlist: (e: React.MouseEvent, id: string, variantId: string) => void;
  /** Smaller, denser proportions for a rail with more cards per row (e.g.
   *  Marketplace's Flash Sale strip) — default (false) is the original size,
   *  unchanged for existing callers like Homepage's Flash Sale rail. */
  compact?: boolean;
}) {
  const pType      = product.productType ?? product.type ?? 'physical';
  const isPhysical = pType === 'physical';
  const isDigital  = !isPhysical;
  const typeLabel  = isPhysical ? 'Physical' : pType === 'educational' ? 'Educational' : 'Digital';

  const variants        = product.variants ?? [];
  const defaultVariant = variants.find(v => v.isDefault) ?? variants[0];
  const nativeLowestPrice = variants.length > 0
    ? Math.min(...variants.map(v => v.price))
    : null;
  const nativeCompareAt = defaultVariant?.compareAtPrice ?? null;
  const ratingCount = product.totalRatings ?? 0;
  const vId         = defaultVariant?._id ?? '';
  const nativeSubscriberPrice = defaultVariant?.subscriberPrice;

  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const nativeCurrency = defaultVariant?.currency;
  const lowestPrice = nativeLowestPrice != null ? convert(nativeLowestPrice, nativeCurrency) : null;
  const subscriberPriceRaw = nativeSubscriberPrice != null ? convert(nativeSubscriberPrice, nativeCurrency) : undefined;
  // Premium member: only the list price struck through + the member price (no seller sale / subscriber price / campaign).
  const { isPremium } = usePremiumView();
  const member = isPremium ? memberPriceOf(defaultVariant, convert, subscriberPriceRaw ?? lowestPrice) : null;
  const subscriberPrice = member ? undefined : subscriberPriceRaw;
  // A running platform sale lowers the price further: the server sends it per variant as `campaignPrice`.
  const campaignNative = typeof defaultVariant?.campaignPrice === 'number' && defaultVariant.campaignPrice < (defaultVariant.price ?? Infinity) ? defaultVariant.campaignPrice : null;
  const campaignPrice = !member && campaignNative != null ? convert(campaignNative, nativeCurrency) : null;
  const displayPrice    = member ? member.price : (campaignPrice ?? subscriberPrice ?? lowestPrice);
  const compareAt = member ? (member.list ?? lowestPrice) : campaignPrice != null && defaultVariant ? convert(defaultVariant.price, nativeCurrency) : (nativeCompareAt != null ? convert(nativeCompareAt, nativeCurrency) : null);
  const pctOff = member && member.percent > 0 ? Math.round(member.percent) : compareAt != null && displayPrice != null && compareAt > displayPrice
    ? Math.round((1 - displayPrice / compareAt) * 100)
    : null;
  const savings = compareAt != null && displayPrice != null && compareAt > displayPrice
    ? compareAt - displayPrice
    : null;
  // Stock tracking only applies to physical goods with tracking enabled — digital/educational
  // products, and any physical variant marked unlimitedStock, are always available.
  const stock = isDigital || defaultVariant?.unlimitedStock ? Infinity : (defaultVariant?.stock ?? 0);

  // Same "Added ✓" confirmation as ProductCard's Add to Cart — this rail is
  // the other high-traffic add-to-cart entry point (Homepage Flash Sale).
  const [justAdded, setJustAdded] = useState(false);
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !isAdding && !addToCartFailed) {
      setJustAdded(true);
      const t = setTimeout(() => setJustAdded(false), 1500);
      wasAdding.current = isAdding;
      return () => clearTimeout(t);
    }
    wasAdding.current = isAdding;
  }, [isAdding, addToCartFailed]);

  return (
    <div
      onClick={() => onClick(product.slug)}
      className={clsx(
        'group relative bg-white rounded-2xl border border-bone overflow-hidden cursor-pointer transition-all duration-300 hover:bg-brand-pale-orange/[0.12] hover:border-brand-orange/25',
        !compact && 'h-full flex flex-col hover:-translate-y-[3px] hover:shadow-card-hover',
      )}
    >
      {/* Accent bar — sweeps in on hover, same signal as ProductCard's grid tiles */}
      <div className="absolute top-0 start-0 w-full h-[3px] bg-gradient-to-r from-brand-orange to-brand-deep-orange scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 z-[1]" />

      {/* Image — square, the card's focal point without dominating the whole card.
          Compact: stays fixed-size on hover (no zoom) — hover instead reveals the
          price/rating overlay below. */}
      <div className="relative overflow-hidden aspect-square">
        <ProductImage
          images={product.images ?? []}
          name={product.name}
          tags={product.tags}
          productType={product.productType ?? product.type}
          className={clsx('w-full h-full object-cover transition-transform duration-500 ease-out', !compact && 'group-hover:scale-[1.06]')}
        />

        {/* Category badge — compact, opaque (no blur/glass) */}
        <span className={clsx(
          'absolute rounded-full font-bold tracking-[0.02em] border bg-white',
          compact ? 'top-[5px] start-[5px] px-[5px] py-[1px] text-[12px]' : 'top-[7px] start-[7px] px-[6px] py-[1.5px] text-[12px]',
          isDigital ? 'text-[#7c3aed] border-[#ddd6fe]' : 'text-[#3b6720] border-[#c7e0b5]',
        )}>
          {typeLabel}
        </span>

        {/* Discount — premium sale chip */}
        {pctOff != null && pctOff > 0 && (
          <span className={clsx(
            'absolute rounded-full font-bold bg-error text-white',
            compact ? 'top-[5px] end-[5px] px-[6px] py-[2px] text-[12px]' : 'top-[7px] end-[7px] px-[7px] py-[2.5px] text-[12px]',
          )}>
            -{pctOff}%
          </span>
        )}

        {/* Wishlist — floating action button, always reachable (no hover-only on touch devices) */}
        <button aria-label="Save"
          onClick={e => onToggleWishlist(e, product._id, vId)}
          disabled={isWishlisting}
          className={clsx(
            'absolute rounded-full bg-white border border-bone flex items-center justify-center z-[1]',
            compact ? 'bottom-[6px] end-[6px] w-7 h-7' : 'bottom-2 end-2 w-8 h-8',
            'transition-all duration-200 hover:scale-110 hover:bg-brand-pale-orange',
            isWishlisting ? 'cursor-wait' : 'cursor-pointer',
          )}
        >
          <Heart
            key={isWishlisted ? 'on' : 'off'}
            size={compact ? 10 : 11}
            className={clsx('heart-pop transition-colors duration-150', isWishlisted ? 'text-[#e11d48] fill-[#e11d48]' : 'text-slate')}
          />
        </button>
      </div>

      {/* Compact (home flash-sale rail): ALWAYS-visible body - title, sale price, original price, rating.
          Nothing depends on hover, so touch screens see the same card. */}
      {compact && (
        <div className="flex flex-col gap-[3px] px-[7px] pt-[6px] pb-[7px]">
          <p className="text-[12px] font-semibold text-carbon leading-snug line-clamp-2 min-h-[2.6em] m-0">{product.name}</p>
          <div className="flex items-center gap-[4px]">
            <Star size={9} className={product.averageRating > 0 ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone'} />
            <span className="text-[12px] font-semibold text-carbon">{product.averageRating > 0 ? product.averageRating.toFixed(1) : 'New'}</span>
          </div>
          <div className="flex items-end justify-between gap-1">
            <div className="min-w-0">
              <span className={clsx('block text-[13px] font-bold tracking-tight', member ? 'text-[#8a6100]' : subscriberPrice != null ? 'text-brand-orange' : 'text-carbon')}>
                {displayPrice != null ? formatPrice(displayPrice, displayCurrency) : '—'}
              </span>
              {compareAt != null && compareAt > (displayPrice ?? 0) && (
                <span className="block text-[12px] text-slate line-through">{formatPrice(compareAt, displayCurrency)}</span>
              )}
            </div>
            <button
              onClick={e => onAddToCart(e, product._id, vId, isPhysical ? 'physical' : 'digital')}
              disabled={stock <= 0}
              aria-label={stock <= 0 ? 'Out of stock' : 'Add to cart'}
              className={clsx(
                'shrink-0 flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-200',
                stock <= 0
                  ? 'bg-bone text-slate border-bone cursor-not-allowed'
                  : addToCartFailed
                    ? 'bg-error text-white border-error'
                    : justAdded
                      ? 'bg-success text-white border-success'
                      : 'bg-white text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white active:scale-[0.95] cursor-pointer',
              )}
            >
              {isAdding ? <Loader2 size={11} className="animate-spin" /> : addToCartFailed ? <AlertCircle size={11} /> : justAdded ? <Check size={11} /> : <ShoppingCart size={11} />}
            </button>
          </div>
        </div>
      )}

      {/* Body - full-size card. */}
      {!compact && (
        <div className="flex-1 flex flex-col p-3">
          {/* Rating */}
          <div className="flex items-center gap-[5px] mb-[6px]">
            <div className="flex items-center gap-[1px]">
              {[1, 2, 3, 4, 5].map(i => (
                <Star
                  key={i}
                  size={9}
                  className={i <= Math.round(product.averageRating) ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone'}
                />
              ))}
            </div>
            <span className="text-[12px] font-semibold text-carbon">
              {product.averageRating > 0 ? product.averageRating.toFixed(1) : 'New'}
            </span>
            {ratingCount > 0 && (
              <span className="text-[12px] text-slate">({ratingCount})</span>
            )}
          </div>

          {/* Title — 2 lines max */}
          <p className="text-[12px] font-semibold text-carbon leading-snug line-clamp-2 mb-2">
            {product.name}
          </p>

          {/* Price hierarchy + Add to Cart */}
          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-[5px] flex-wrap">
                <span className={clsx('text-[14.5px] font-bold tracking-tight', member ? 'text-[#8a6100]' : subscriberPrice != null ? 'text-brand-orange' : 'text-carbon')}>
                  {displayPrice != null ? formatPrice(displayPrice, displayCurrency) : '—'}
                </span>
                {compareAt != null && compareAt > (displayPrice ?? 0) && (
                  <span className="text-[12px] text-slate line-through">{formatPrice(compareAt, displayCurrency)}</span>
                )}
              </div>
              {savings != null && savings > 0 && (
                <p className="text-[12px] font-semibold text-success mt-[2px]">Save {formatPrice(savings, displayCurrency)}</p>
              )}
            </div>

            <button
              onClick={e => onAddToCart(e, product._id, vId, isPhysical ? 'physical' : 'digital')}
              disabled={stock <= 0}
              aria-label={stock <= 0 ? 'Out of stock' : 'Add to cart'}
              className={clsx(
                'shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200',
                stock <= 0
                  ? 'bg-bone text-slate border-bone cursor-not-allowed'
                  : addToCartFailed
                    ? 'bg-error text-white border-error'
                    : justAdded
                      ? 'bg-success text-white border-success'
                      : 'bg-white text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white active:scale-[0.95] cursor-pointer',
              )}
            >
              {isAdding ? <Loader2 size={13} className="animate-spin" /> : addToCartFailed ? <AlertCircle size={13} /> : justAdded ? <Check size={13} /> : <ShoppingCart size={13} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
