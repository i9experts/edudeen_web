import { memo, useState } from 'react';
import { clsx } from 'clsx';
import { Heart } from 'lucide-react';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { getStorefrontUrl } from '@/utils/storefrontUrl';

// Soft paper-on-pastel palettes for the "worksheet" cover — picked per
// product (stable hash of its id), so the grid reads as a varied shelf.
const PALETTES = [
  { bg: '#dfedd6', accent: '#477d35' },
  { bg: '#e5eef8', accent: '#2863a2' },
  { bg: '#f6eac9', accent: '#ad711e' },
  { bg: '#e8e1f1', accent: '#785793' },
  { bg: '#f7e0d6', accent: '#af6045' },
  { bg: '#dceceb', accent: '#2b7c77' },
  { bg: '#e2e9f2', accent: '#42688e' },
  { bg: '#eef0ce', accent: '#7b8129' },
];

function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTES[Math.abs(h) % PALETTES.length];
}

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
  const { bg, accent } = paletteFor(product._id);
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

export const ResourceCard = memo(function ResourceCard({
  product, index = 0, onClick, isWishlisted = false, isWishlisting = false, onToggleWishlist,
}: ResourceCardProps) {
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const variant = (product.variants ?? []).find(v => v.isDefault) ?? product.variants?.[0];
  const variantId = variant?._id ?? '';
  const rawPrice = variant?.price ?? 0;
  const price = convert(rawPrice, variant?.currency);
  const kind = product.productType ?? product.type ?? 'physical';

  const level = product.educationLevel
    ? (product.educationLevel === 'other' ? product.customLevel : LEVEL_LABEL.get(product.educationLevel)) ?? null
    : null;
  const meta = [level ?? 'All ages', kind === 'physical' ? 'Ships to you' : 'Instant download'].join(' · ');

  return (
    <article className="group relative min-w-0">
      <button
        onClick={() => onClick(product.slug)}
        aria-label={`View ${product.name}`}
        className="block w-full p-0 bg-transparent border-none cursor-pointer text-left"
      >
        <Cover product={product} tilt={index % 2 === 0 ? -4 : 4} />
      </button>

      {onToggleWishlist && variantId && (
        <button
          onClick={e => onToggleWishlist(e, product._id, variantId)}
          disabled={isWishlisting}
          aria-pressed={isWishlisted}
          aria-label={`${isWishlisted ? 'Unsave' : 'Save'} ${product.name}`}
          className={clsx(
            'absolute right-[7px] top-[7px] sm:right-3 sm:top-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center cursor-pointer transition-colors',
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
        className="block p-0 bg-transparent border-none text-left text-carbon font-bold text-[14px] sm:text-[16px] leading-[1.4] cursor-pointer hover:underline line-clamp-2"
      >
        {product.name}
      </button>
      {product.sellerName && (
        product.storeSlug ? (
          <a
            href={getStorefrontUrl(product.storeSlug)}
            className="inline-block my-[5px] text-[13px] font-bold text-brand-orange border-b border-current pb-[2px] hover:text-brand-deep-orange truncate max-w-full"
          >
            {product.sellerName}
          </a>
        ) : (
          <span className="block my-[5px] text-[13px] text-slate truncate">{product.sellerName}</span>
        )
      )}
      <div className="flex items-center justify-between gap-2 mt-2">
        <strong className="text-[14px] sm:text-[16px] text-carbon">
          {rawPrice === 0
            ? 'Free'
            : `${currencySymbol(displayCurrency)} ${price.toLocaleString(undefined, { maximumFractionDigits: displayCurrency === 'PKR' ? 0 : 2 })}`}
        </strong>
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
