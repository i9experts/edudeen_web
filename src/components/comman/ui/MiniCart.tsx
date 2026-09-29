import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ShoppingCart, X, ArrowRight } from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useCartContext, type CartItem } from '@/contexts/CartContext';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { Button } from './Button';

const CLOSE_DELAY_MS = 150;

function ItemThumb({ item }: { item: CartItem }) {
  const src = item.image?.[0] ?? item.images?.[0];
  if (!src) {
    return <ProductCoverFallback name={item.name} size="xs" className="w-11 h-11 rounded-[9px] shrink-0" />;
  }
  return (
    <img loading="lazy" decoding="async" src={src} alt={item.name}
      className="w-11 h-11 rounded-[9px] object-cover shrink-0 border border-bone" />
  );
}

function lineTotal(item: CartItem) {
  return item.itemTotal ?? (item.unitPrice ?? item.price ?? 0) * item.quantity;
}

// Amazon/Alibaba-style mini cart: hovering (or tapping, on touch) the cart icon
// opens a preview drawer — recent items + subtotal + View Cart / Checkout when
// there's something in it, or a centered "cart is empty" illustration + a single
// "Go to Cart" action when there isn't — instead of navigating away immediately.
export function MiniCart({ accentColor }: { accentColor?: string }) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const { cart, cartCount } = useCartContext();
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

  const items = cart?.items ?? [];
  const recent = [...items].reverse().slice(0, 4);
  const hiddenCount = Math.max(0, items.length - recent.length);
  const subtotal = cart?.totalPrice ?? items.reduce((s, i) => s + lineTotal(i), 0);

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
        aria-label={`Cart${cartCount > 0 ? ` (${cartCount} items)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative h-9 min-w-9 px-0 md:px-1 flex items-center justify-center gap-[5px] bg-transparent border-none cursor-pointer shrink-0 whitespace-nowrap text-[15px] text-carbon hover:text-brand-orange transition-colors outline-none rounded-md focus-visible:ring-2 focus-visible:ring-brand-orange/40"
      >
        <ShoppingCart size={15} style={accentColor ? { color: accentColor } : undefined} className={clsx('shrink-0 md:hidden', !accentColor && 'text-carbon')} />
        <span className="hidden md:inline">Bag</span>
        <b className="hidden md:inline text-[12px] font-bold bg-mist rounded-full px-[6px] py-[2px] leading-none">
          {cartCount > 99 ? '99+' : cartCount}
        </b>
        {cartCount > 0 && (
          <span className="md:hidden absolute top-[-2px] right-[-4px] min-w-[16px] h-[16px] rounded-[8px] bg-brand-orange text-white text-[9px] font-bold leading-[16px] text-center px-1">
            {cartCount > 99 ? '99+' : cartCount}
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
            <p className="text-[13px] font-bold text-carbon">Shopping Cart{cartCount > 0 ? ` (${cartCount})` : ''}</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="w-6 h-6 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-slate hover:bg-cream transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <X size={13} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-8 px-6 flex flex-col items-center text-center">
              <div className="relative w-20 h-20 mb-4 shrink-0">
                <div className="absolute inset-0 rounded-full bg-brand-pale-orange" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShoppingCart size={30} className="text-brand-orange" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[13.5px] font-semibold text-charcoal">Your cart is empty</p>
              <p className="text-[11.5px] text-slate mt-[3px] mb-5">Add items to see them here.</p>
              <Button variant="outline" size="sm" pill onClick={() => goTo('/cart')}>
                Go to Cart
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[264px] overflow-y-auto divide-y divide-[#f5f4ef]">
                {recent.map(item => (
                  <div key={item.productVariantId} className="flex gap-2.5 p-3">
                    <ItemThumb item={item} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-charcoal leading-tight line-clamp-1">{item.name}</p>
                      <p className="text-[11px] text-slate mt-[3px]">Qty {item.quantity}</p>
                    </div>
                    <p className="text-[12.5px] font-bold text-carbon shrink-0">${lineTotal(item).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {hiddenCount > 0 && (
                <p className="text-[10.5px] text-slate text-center py-2 border-t border-bone bg-cream/40">
                  +{hiddenCount} more item{hiddenCount !== 1 ? 's' : ''} in your cart
                </p>
              )}

              <div className="p-4 border-t border-bone">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] text-slate">Subtotal</span>
                  <span className="text-[15px] font-bold text-carbon">${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 min-w-0 justify-center" onClick={() => goTo('/cart')}>
                    View Cart
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1 min-w-0 justify-center" onClick={() => goTo('/checkout')}>
                    Checkout <ArrowRight size={12} />
                  </Button>
                </div>
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
