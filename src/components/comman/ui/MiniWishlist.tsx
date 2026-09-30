import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Heart, X, ArrowRight } from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { Button } from './Button';

const CLOSE_DELAY_MS = 150;

function WishlistThumb({ images, name }: { images?: string[]; name: string }) {
  const src = images?.[0];
  if (!src) {
    return <ProductCoverFallback name={name} size="xs" className="w-11 h-11 rounded-[9px] shrink-0" />;
  }
  return (
    <img loading="lazy" decoding="async" src={src} alt={name}
      className="w-11 h-11 rounded-[9px] object-cover shrink-0 border border-bone" />
  );
}

// Alibaba/Amazon-style mini wishlist: hovering (or tapping, on touch) the
// wishlist icon opens a preview drawer — recent saved items + View Wishlist
// when there's something in it, or a centered "wishlist is empty" illustration
// + a single "Go to Wishlist" action when there isn't.
export function MiniWishlist() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const { wishlistItems, wishlistCount } = useWishlistContext();
  const pos = useDropdownPosition(ref, open);

  const clearCloseTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { clearCloseTimer(); closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS); };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  const recent = [...wishlistItems].reverse().slice(0, 4);
  const hiddenCount = Math.max(0, wishlistItems.length - recent.length);

  const goTo = (path: string) => { setOpen(false); navigate(path); };

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative h-9 min-w-9 px-0 md:px-1 flex items-center justify-center gap-[5px] bg-transparent border-none cursor-pointer shrink-0 whitespace-nowrap text-[15px] text-carbon hover:text-brand-orange transition-colors outline-none rounded-md focus-visible:ring-2 focus-visible:ring-brand-orange/40"
      >
        <Heart size={15} className={wishlistCount > 0 ? 'text-brand-orange fill-brand-orange' : 'fill-none'} />
        <span className="hidden md:inline">Saved</span>
        <b className="hidden md:inline text-[12px] font-bold bg-mist rounded-full px-[6px] py-[2px] leading-none">
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </b>
        {wishlistCount > 0 && (
          <span className="md:hidden absolute top-[-2px] right-[-4px] min-w-[16px] h-[16px] rounded-[8px] bg-brand-orange text-white text-[9px] font-bold leading-[16px] text-center px-1">
            {wishlistCount > 99 ? '99+' : wishlistCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
          onMouseLeave={scheduleClose}
          style={pos}
          className="dropdown-enter fixed z-[9999] w-[320px] max-w-[calc(100vw-2rem)]"
        >
          <div className="absolute -top-[7px] w-3 h-3 bg-white border-t border-l border-bone rotate-45" style={{ left: pos.arrowLeft }} />
          <div className="relative bg-white border border-bone rounded-[16px] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-bone">
            <p className="text-[13px] font-bold text-carbon">Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ''}</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-slate hover:bg-cream transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <X size={13} />
            </button>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="py-8 px-6 flex flex-col items-center text-center">
              <div className="relative w-20 h-20 mb-4 shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#fff0f5]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Heart size={30} className="text-[#e11d48]" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[13.5px] font-semibold text-charcoal">Your wishlist is empty</p>
              <p className="text-[11.5px] text-slate mt-[3px] mb-5">Save books and courses you love to see them here.</p>
              <Button variant="outline" size="sm" pill onClick={() => goTo('/account/wishlist')}>
                Go to Wishlist
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[264px] overflow-y-auto divide-y divide-[#f5f4ef]">
                {recent.map(item => {
                  const variant = item.variants?.[0];
                  return (
                    <div
                      key={item.product._id}
                      className={clsx('flex gap-2.5 p-3', 'cursor-pointer hover:bg-cream/60 transition-colors')}
                      onClick={() => goTo(`/product/${item.product.slug}`)}
                    >
                      <WishlistThumb images={item.product.images} name={item.product.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-charcoal leading-tight line-clamp-1">{item.product.name}</p>
                        {variant && <p className="text-[11px] text-slate mt-[3px]">${variant.price.toLocaleString()}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hiddenCount > 0 && (
                <p className="text-[10.5px] text-slate text-center py-2 border-t border-bone bg-cream/40">
                  +{hiddenCount} more item{hiddenCount !== 1 ? 's' : ''} in your wishlist
                </p>
              )}

              <div className="p-4 border-t border-bone">
                <Button variant="primary" size="sm" fullWidth className="justify-center" onClick={() => goTo('/account/wishlist')}>
                  View Wishlist <ArrowRight size={12} />
                </Button>
              </div>
            </>
          )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
