import { memo, useEffect, useRef, useState } from 'react';
import { SaleBadge } from '@/components/comman/ui/SaleBadge';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertCircle, Check, Heart, Loader2, ShoppingCart, Star } from 'lucide-react';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { normalizeProductType } from '@/utils/productType';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';
import { variantPriceView } from '@/utils/saleMath';
import { courseSummaryText } from '@/utils/deliveryFormat';
import { isPlainLeftClick } from '@/utils/productLink';
import { responsiveImg } from '@/utils/cloudinaryImage';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { coverPaletteFor } from './ProductCoverFallback';
import { ageLabel } from '@/constants/learning';
import { classRangeLabel } from '@/constants/classLevels';
import { useLocalizedProduct } from '@/hooks/useLocalizedProduct';
import { TrustBadges } from './TrustBadges';
import { CompareToggle } from './CompareToggle';
import { PremiumChip, PremiumTeaser, memberPriceOf, usePremiumView } from './PremiumBits';
import { holidayBlocksType, holidayLabel } from '@/utils/storeHoliday';

// Same name-keyed palette as ProductCoverFallback, so a product keeps its
// colours between the grid card and cart/wishlist/detail thumbnails.
const paletteFor = coverPaletteFor;

const LEVEL_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
const TYPE_LABEL: Record<string, string> = { physical: 'Physical', digital: 'Digital' };

export interface ResourceCardProps {
  product:          MarketplaceProduct;
  /** Position in the grid — alternates the paper tilt like a hand-laid shelf. */
  index?:           number;
  onClick:          (slug: string) => void;
  isWishlisted?:    boolean;
  isWishlisting?:   boolean;
  onToggleWishlist?: (e: React.MouseEvent, id: string, variantId: string) => void;
  /** `list` lays the card out as a full-width row (browse page list view). */
  layout?:          'grid' | 'list';
  /** When given, the card shows the same round cart button as the Flash Sale cards. */
  onAddToCart?:     (e: React.MouseEvent, id: string, variantId: string, type: 'physical' | 'digital') => void;
  isAdding?:        boolean;
  addToCartFailed?: boolean;
}

function CartButton({ onClick, isAdding, failed, disabled, label, disabledLabel = 'Out of stock' }: { onClick: (e: React.MouseEvent) => void; isAdding: boolean; failed: boolean; disabled: boolean; label: string; disabledLabel?: string }) {
  const [justAdded, setJustAdded] = useState(false);
  const wasAdding = useRef(false);
  useEffect(() => {
    if (wasAdding.current && !isAdding && !failed) {
      setJustAdded(true);
      const t = setTimeout(() => setJustAdded(false), 1500);
      wasAdding.current = isAdding;
      return () => clearTimeout(t);
    }
    wasAdding.current = isAdding;
  }, [isAdding, failed]);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={disabled ? disabledLabel : label}
      title={disabled ? disabledLabel : undefined}
      className={clsx(
        'relative before:absolute before:-inset-[5px] before:rounded-full shrink-0 flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200',
        disabled
          ? 'bg-bone text-slate border-bone cursor-not-allowed'
          : failed
            ? 'bg-error text-white border-error'
            : justAdded
              ? 'bg-success text-white border-success'
              : 'bg-white text-brand-orange border-brand-orange hover:bg-brand-orange hover:text-white active:scale-[0.95] cursor-pointer',
      )}
    >
      {isAdding ? <Loader2 size={14} className="animate-spin" /> : failed ? <AlertCircle size={14} /> : justAdded ? <Check size={14} /> : <ShoppingCart size={14} />}
    </button>
  );
}

function ListCover({ product }: { product: MarketplaceProduct }) {
  const { bg, accent } = paletteFor(product.name || product._id);
  const [imgFailed, setImgFailed] = useState(false);
  const image = !imgFailed ? product.images?.[0] : undefined;
  return (
    <div className="w-[112px] sm:w-[168px] aspect-square rounded-xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: bg }}>
      {image ? (
        <img {...responsiveImg(image, '168px', [168, 336], 336)} alt={product.name} width={168} height={168} loading="lazy" decoding="async" onError={() => setImgFailed(true)} className="w-full h-full object-contain" />
      ) : (
        <strong className="font-serif font-normal text-[15px] sm:text-[18px] leading-[1.1] text-center px-3 line-clamp-4" style={{ color: accent }}>
          {product.name}
        </strong>
      )}
    </div>
  );
}

function Cover({ product }: { product: MarketplaceProduct }) {
  const { accent } = paletteFor(product.name || product._id);
  const [imgFailed, setImgFailed] = useState(false);
  const image = !imgFailed ? (product.images?.[0] || product.video?.posterUrl || undefined) : undefined;
  const imgProps = image ? responsiveImg(image, '(min-width: 1024px) 14vw, (min-width: 640px) 22vw, 36vw', [200, 320, 480, 640], 480) : null;
  const clipId = `bk-${product._id}`;
  // Every book is the same size; the whole picture is stretched to fill it (no bars, nothing cut off).
  const cx = 30, cy = 8, cw = 148, ch = 172;

  // Toys, stationery and other non-book items: plain rounded photo, no book shape.
  if (product.coverStyle === 'flat') {
    return (
      <div className="h-[150px] min-[400px]:h-[165px] sm:h-[194px] lg:h-[205px] rounded-lg overflow-hidden flex items-center justify-center bg-[#f4f6f7]">
        {imgProps ? (
          <img {...imgProps} alt={product.name} loading="lazy" decoding="async" onError={() => setImgFailed(true)} className="w-full h-full object-contain" />
        ) : (
          <strong className="font-serif font-normal text-[14px] leading-[1.15] text-center px-3 line-clamp-5" style={{ color: accent }}>{product.name}</strong>
        )}
      </div>
    );
  }

  // Front-facing book drawn in SVG: the seller's image (or the title) fills the WHOLE cover; pages show as a thin edge behind it.
  return (
    <div className="h-[150px] min-[400px]:h-[165px] sm:h-[194px] lg:h-[205px] rounded-lg overflow-hidden">
      <svg viewBox="0 0 210 198" className="w-full h-full" role="img" aria-label={product.name} preserveAspectRatio="xMidYMid meet">
        <defs>
          <clipPath id={clipId}><rect x={cx} y={cy} width={cw} height={ch} rx="3" /></clipPath>
        </defs>
        <g transform="rotate(-3 106 99)">
        <ellipse cx={cx + cw / 2 + 5} cy="188" rx={Math.max(40, cw / 2)} ry="5" fill="#000" fillOpacity="0.10" />
        {/* pages */}
        <rect x={cx + 5} y={cy + 5} width={cw} height={ch} rx="3" fill="#fff" stroke="#9aa3aa" strokeWidth="1" />
        <path d={`M${cx + cw + 3} ${cy + 9}v${ch - 8}M${cx + cw + 5} ${cy + 11}v${ch - 12}`} stroke="#c9d0d5" strokeWidth="0.8" />
        {/* cover */}
        <g clipPath={`url(#${clipId})`}>
          <rect x={cx} y={cy} width={cw} height={ch} fill="#fff" />
          {imgProps ? (
            // Crops to fill the book shape (like CSS object-fit: cover) instead of stretching — a
            // portrait, landscape or square upload all read as a clean, undistorted book cover.
            <image href={imgProps.src} x={cx} y={cy} width={cw} height={ch} preserveAspectRatio="xMidYMid slice" onError={() => setImgFailed(true)} />
          ) : (
            <foreignObject x="30" y="8" width="148" height="172">
              <div className="w-full h-full flex flex-col items-center justify-center text-center px-3" style={{ color: accent }}>
                <strong className="block font-serif font-normal text-[14px] leading-[1.15] line-clamp-5">{product.name}</strong>
                <small className="mt-2 text-[10px] text-[#5d6570] line-clamp-1">{product.storeName ?? product.sellerName ?? 'Edudeen'}</small>
              </div>
            </foreignObject>
          )}
          {/* spine shading */}
          <rect x={cx} y={cy} width="9" height={ch} fill="#000" fillOpacity="0.16" />
          <rect x={cx + 9} y={cy} width="1.2" height={ch} fill="#000" fillOpacity="0.12" />
        </g>
        <rect x={cx} y={cy} width={cw} height={ch} rx="3" fill="none" stroke="#7d868d" strokeWidth="1.2" />
      </g>
      </svg>
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

function QuickViewCover({ product }: { product: MarketplaceProduct }) {
  const { accent } = paletteFor(product.name || product._id);
  const [imgFailed, setImgFailed] = useState(false);
  const image = !imgFailed ? product.images?.[0] : undefined;
  const imgProps = image ? responsiveImg(image, '88px', [120, 184, 240], 240) : null;
  return (
    <div className="w-[88px] h-[108px] shrink-0 rounded-lg overflow-hidden bg-[#f4f6f7] flex items-center justify-center">
      {imgProps ? (
        <img {...imgProps} alt="" loading="lazy" decoding="async" onError={() => setImgFailed(true)} className="w-full h-full object-contain" />
      ) : (
        <strong className="font-serif font-normal text-[11px] leading-[1.15] text-center px-1.5 line-clamp-5" style={{ color: accent }}>{product.name}</strong>
      )}
    </div>
  );
}

/**
 * Hover-only quick view (desktop pointers that can truly hover — see the
 * `.quick-view`/`.quick-view-trigger` rules in index.css). Shows a BIGGER,
 * undistorted photo plus the full title, store and description.
 */
function QuickView({ product, kind, metaText, shopName, flip, href, onNavigate, actions }: {
  product: MarketplaceProduct; kind: string; metaText: string; shopName?: string | null;
  flip: boolean; href: string; onNavigate: (e: React.MouseEvent) => void; actions?: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        'quick-view absolute top-0 w-[300px] max-w-[88vw]',
        'rounded-2xl border border-[#e6ecee] bg-white p-3.5 text-start',
        'shadow-[0_18px_40px_rgba(15,51,84,0.18)]',
        flip ? 'end-0' : 'start-0',
      )}
    >
      <Link to={href} onClick={onNavigate} aria-hidden="true" tabIndex={-1} className="grid grid-cols-[88px_1fr] gap-3 no-underline">
        <QuickViewCover product={product} />
        <div className="min-w-0">
          <p className="font-bold text-[14px] leading-snug text-carbon line-clamp-2">{product.name}</p>
          {shopName && <p className="text-[11.5px] font-bold text-brand-orange mt-0.5 truncate">{shopName}</p>}
          <p className="text-[11px] text-slate mt-1.5">{TYPE_LABEL[kind] ?? kind} · {metaText}</p>
          <p className="text-[12px] text-slate leading-relaxed line-clamp-3 mt-1.5">{product.description}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 mt-2.5">
        <Link to={href} onClick={onNavigate} tabIndex={-1} className="text-[12px] font-bold text-brand-orange no-underline me-auto">View details &rarr;</Link>
        {actions}
      </div>
    </div>
  );
}

export const ResourceCard = memo(function ResourceCard({
  product: rawProduct, onClick, isWishlisted = false, isWishlisting = false, onToggleWishlist, layout = 'grid',
  onAddToCart, isAdding = false, addToCartFailed = false,
}: ResourceCardProps) {
  const product = useLocalizedProduct(rawProduct);
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const variant = (product.variants ?? []).find(v => v.isDefault) ?? product.variants?.[0];
  const variantId = variant?._id ?? '';
  const rawPrice = variant?.price ?? 0;
  const campaign = product.activeCampaign;
  // A running platform sale is part of the price shown: the SERVER computes it per variant (campaignPrice, taken from the
  // list price and only when cheaper than the seller's price), so cards, product page, cart and checkout agree.
  const campaignRaw = typeof variant?.campaignPrice === 'number' ? variant.campaignPrice : null;
  // Price, struck "was" price and % all come from utils/saleMath (same fields the cart prices from; never -100% / Rs 0 bad data).
  const view = variantPriceView(variant);
  const effectiveRaw = view.price;
  const price = convert(effectiveRaw, variant?.currency);
  const rawWas = view.was;
  const was = rawWas ? convert(rawWas, variant?.currency) : null;
  const percentOff = view.pct;
  // Edudeen Premium: members see the member price (server-computed); everyone else a quiet teaser.
  const { isPremium } = usePremiumView();
  const member = isPremium && campaignRaw == null ? memberPriceOf(variant, convert, price) : null;
  const campaignOff = campaign?.discountValue
    ? campaign.discountType === 'percentage' ? `${campaign.discountValue}% off` : `${formatPrice(campaign.discountValue, campaign.currency ?? 'USD')} off`
    : null;
  const fmt = (n: number) => formatPrice(n, displayCurrency);
  const kind = normalizeProductType(product.productType ?? product.type) ?? 'physical';
  const href = `/product/${product.slug}`;
  const go = (e: React.MouseEvent) => { if (isPlainLeftClick(e)) { e.preventDefault(); onClick(product.slug); } };
  // Show the STORE (links to the store page), falling back to the person's name only when the API sent no store name.
  const shopName = product.storeName ?? product.sellerName;

  const level = product.educationLevel
    ? LEVEL_LABEL.get(product.educationLevel) ?? null
    : null;
  const delivery = kind === 'physical' ? 'Ships to you'
    : product.deliveryFormat === 'course' ? ['Online course', courseSummaryText(product.courseSummary)].filter(Boolean).join(' · ')
    : 'Instant download';
  const metaParts = [classRangeLabel(product.classFrom, product.classTo) ?? ageLabel(product.ageMin, product.ageMax) ?? level ?? 'All ages', delivery];
  // Separate text nodes so the Urdu DOM translator can match each part ("All ages", "Ships to you").
  const meta = metaParts.map((part, i) => <span key={i}>{i > 0 ? ' · ' : ''}<span>{part}</span></span>);
  const metaText = metaParts.join(' · ');

  // Which side the hover quick view opens toward, so it never runs off the right edge of the viewport.
  const [flip, setFlip] = useState(false);
  const coverSlotRef = useRef<HTMLDivElement>(null);
  const checkFlip = () => {
    const el = coverSlotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFlip(rect.left + 300 > window.innerWidth - 12);
  };

  const vVariant = variant;
  const physicalStock = kind === 'physical' && !vVariant?.unlimitedStock ? (vVariant?.stock ?? 0) : Infinity;
  // Store on holiday: the cart button is disabled and says when the store is back (the server refuses the add as well).
  const away = holidayBlocksType(product.storeHoliday, kind === 'physical' ? 'physical' : 'digital');
  const cartButton = onAddToCart && variantId ? (
    <CartButton
      onClick={e => onAddToCart(e, product._id, variantId, kind === 'physical' ? 'physical' : 'digital')}
      isAdding={isAdding}
      failed={addToCartFailed}
      disabled={away || physicalStock <= 0}
      disabledLabel={away ? holidayLabel(product.storeHoliday) : 'Out of stock'}
      label={`Add ${product.name} to cart`}
    />
  ) : null;

  const badge = member ? null : (campaignOff || percentOff > 0) ? (campaign && campaignOff ? `${campaign.name} · ${campaignOff}` : `-${percentOff}%`) : null;
  const wishlistButton = onToggleWishlist && variantId ? (
    <button
      onClick={e => onToggleWishlist(e, product._id, variantId)}
      disabled={isWishlisting}
      aria-pressed={isWishlisted}
      aria-label={`${isWishlisted ? 'Unsave' : 'Save'} ${product.name}`}
      className={clsx(
        'w-9 h-9 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0',
        isWishlisted ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white border-[#dfe5e6] text-brand-orange hover:bg-brand-pale-orange',
        isWishlisting && 'opacity-60',
      )}
    >
      <Heart size={15} className={isWishlisted ? 'fill-white' : ''} />
    </button>
  ) : null;

  if (layout === 'list') {
    return (
      <article className="flex gap-4 sm:gap-6 py-5 border-b border-bone min-w-0">
        <Link to={href} onClick={go} aria-label={`View ${product.name}`} className="block p-0 shrink-0">
          <ListCover product={product} />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-slate mb-1 truncate">{meta}</p>
              <Link
                to={href}
                onClick={go}
                className="block py-1 -my-1 text-start text-carbon no-underline font-bold text-[15px] sm:text-[17px] leading-[1.4] cursor-pointer hover:underline line-clamp-2"
              >
                {product.name}
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0"><CompareToggle product={product} />{wishlistButton}</div>
          </div>
          {shopName && (
            product.storeSlug ? (
              <Link to={getStorePagePath(product.storeSlug)} className="self-start mt-1 text-[13px] font-bold text-brand-orange no-underline hover:underline truncate max-w-full">
                {shopName}
              </Link>
            ) : (
              <span className="mt-1 text-[13px] text-slate truncate">{shopName}</span>
            )
          )}
          <RatingLine rating={product.averageRating} count={product.totalRatings} className="mt-1" />
          <TrustBadges trust={product.trust} className="mt-1.5" />
          <div className="flex items-center gap-2 flex-wrap mt-auto pt-3">
            <strong className={clsx('num text-[16px] sm:text-[18px]', member ? 'text-[#8a6100]' : was ? 'text-error' : 'text-carbon')}>
              {rawPrice === 0 ? 'Free' : fmt(member ? member.price : price)}
            </strong>
            {member && <s className="text-[12.5px] text-slate">{fmt(member.list ?? price)}</s>}
            {!member && was && rawPrice > 0 && <s className="text-[12.5px] text-slate" aria-label={`Was ${fmt(was)}`}>{fmt(was)}</s>}
            {member ? <PremiumChip percent={member.percent} /> : <PremiumTeaser percent={product.premiumPercent} />}
            {badge && <SaleBadge label={badge} />}
            <span className="ms-auto text-[12px] border border-[#dde5e8] px-[7px] py-[3px] rounded text-[#566773] shrink-0">{TYPE_LABEL[kind] ?? kind}</span>
            {cartButton}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card-hover group relative min-w-0 rounded-xl border border-transparent bg-white p-2 transition-colors duration-200 hover:border-[#cfdadf] focus-within:border-[#cfdadf]">
      <div ref={coverSlotRef} onMouseEnter={checkFlip} onFocus={checkFlip} className="relative quick-view-trigger">
        <Link
          to={href}
          onClick={go}
          aria-label={`View ${product.name}`}
          className="block w-full p-0 cursor-pointer text-start"
        >
          <Cover product={product} />
        </Link>
        <QuickView product={product} kind={kind} metaText={metaText} shopName={shopName} flip={flip} href={href} onNavigate={go} actions={<><span className="relative"><CompareToggle product={product} /></span>{wishlistButton && <span className="relative">{wishlistButton}</span>}</>} />
      </div>

      {(campaignOff || percentOff > 0) && (
        <span className="absolute start-[7px] top-[7px] sm:start-3 sm:top-3 max-w-[58%] sm:max-w-[70%] truncate text-[12px] sm:text-[12px] font-bold px-2 py-[3px] rounded-full bg-error text-white shadow-sm">
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
            'absolute end-[6px] top-[6px] sm:end-3 sm:top-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center cursor-pointer transition-colors after:absolute after:-inset-1',
            isWishlisted ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white border-[#dfe5e6] text-brand-orange hover:bg-brand-pale-orange',
            isWishlisting && 'opacity-60',
          )}
        >
          <Heart size={15} className={isWishlisted ? 'fill-white' : ''} />
        </button>
      )}

      <CompareToggle product={product} className="absolute end-[7px] top-[43px] sm:end-3 sm:top-[54px]" />

      <div className="px-1.5 pb-1">
      <p className="text-[12px] text-slate mt-2.5 mb-1 truncate">{meta}</p>
      <Link
        to={href}
        onClick={go}
        className="block py-1 -my-1 text-start text-carbon no-underline font-bold text-[13px] sm:text-[13.5px] leading-[1.35] cursor-pointer hover:underline line-clamp-2"
      >
        {product.name}
      </Link>
      <RatingLine rating={product.averageRating} count={product.totalRatings} className="block mb-1" />
      <TrustBadges trust={product.trust} className="mt-1" />
      {/* Phones (2 narrow columns): price on its own line, then type chip + cart button; sm+: one row. */}
      <div className="flex flex-col gap-1.5 mt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span className="flex items-baseline gap-x-1.5 min-w-0 flex-wrap">
          <strong className={clsx('num text-[14px] sm:text-[15px]', member ? 'text-[#8a6100]' : was ? 'text-error' : 'text-carbon')}>
            {rawPrice === 0 ? 'Free' : fmt(member ? member.price : price)}
          </strong>
          {member && <s className="text-[12px] text-slate">{fmt(member.list ?? price)}</s>}
          {!member && was && rawPrice > 0 && (
            <s className="text-[12px] text-slate" aria-label={`Was ${fmt(was)}`}>{fmt(was)}</s>
          )}
        </span>
        <span className="flex items-center justify-between gap-1.5 sm:justify-end sm:shrink-0">
          <span className="text-[12px] sm:text-[12px] border border-[#dde5e8] px-[7px] py-[3px] rounded text-[#566773] shrink-0">
            {TYPE_LABEL[kind] ?? kind}
          </span>
          {cartButton}
        </span>
      </div>
      {member ? <PremiumChip percent={member.percent} className="mt-1" /> : <PremiumTeaser percent={product.premiumPercent} className="mt-1" />}
      </div>
    </article>
  );
});

export function ResourceCardSkeleton() {
  return (
    <div className="min-w-0 animate-pulse rounded-xl border border-[#e6ecee] p-2">
      <div className="h-[150px] min-[400px]:h-[165px] sm:h-[194px] lg:h-[205px] rounded-lg bg-bone" />
      <div className="h-3 w-1/2 bg-bone rounded mt-4" />
      <div className="h-4 w-4/5 bg-bone rounded mt-3" />
      <div className="h-3 w-1/3 bg-bone rounded mt-3" />
    </div>
  );
}
