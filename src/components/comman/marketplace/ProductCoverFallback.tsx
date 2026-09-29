import { clsx } from 'clsx';

// Soft paper-on-pastel palettes used wherever a product has no photo —
// picked by a stable hash of the product name, so the same product always
// gets the same colours on every page (card, cart, wishlist, detail).
export const COVER_PALETTES = [
  { bg: '#dfedd6', accent: '#477d35' },
  { bg: '#e5eef8', accent: '#2863a2' },
  { bg: '#f6eac9', accent: '#ad711e' },
  { bg: '#e8e1f1', accent: '#785793' },
  { bg: '#f7e0d6', accent: '#af6045' },
  { bg: '#dceceb', accent: '#2b7c77' },
  { bg: '#e2e9f2', accent: '#42688e' },
  { bg: '#eef0ce', accent: '#7b8129' },
];

export function coverPaletteFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return COVER_PALETTES[Math.abs(h) % COVER_PALETTES.length];
}

type CoverSize = 'xs' | 'sm' | 'md' | 'lg';

const TEXT: Record<CoverSize, string> = {
  xs: 'text-[8px] leading-[1.1] line-clamp-3',
  sm: 'text-[10px] leading-[1.15] line-clamp-3',
  md: 'text-[13px] leading-[1.15] line-clamp-3',
  lg: 'text-[22px] sm:text-[28px] leading-[1.1] line-clamp-4',
};

/**
 * Stand-in for a missing/broken product photo: a pastel tile with a white
 * "worksheet" sheet carrying the product name — the same look as the
 * storefront ResourceCard cover, so an image-less product reads as designed
 * rather than broken. Fills its container; size it via `className`.
 */
export function ProductCoverFallback({ name, size = 'sm', className }: {
  name: string;
  size?: CoverSize;
  className?: string;
}) {
  const { bg, accent } = coverPaletteFor(name || 'Edudeen');
  const tiny = size === 'xs';
  return (
    <div
      role="img"
      aria-label={name}
      className={clsx('flex items-center justify-center overflow-hidden', tiny ? 'p-[3px]' : 'p-[8%]', className)}
      style={{ background: bg }}
    >
      <div
        className={clsx(
          'bg-white w-full h-full flex flex-col items-center justify-center text-center shadow-[3px_4px_0_rgba(0,0,0,0.06)]',
          tiny ? 'border-t-[2px] px-[2px]' : size === 'lg' ? 'border-t-[6px] px-4' : 'border-t-[3px] px-[6px]',
        )}
        style={{ borderTopColor: accent, color: accent }}
      >
        {size === 'lg' && (
          <span className="text-[10px] tracking-[2px] uppercase mb-3">Learn with purpose</span>
        )}
        <span className={clsx('font-serif break-words', TEXT[size])}>{name}</span>
      </div>
    </div>
  );
}
