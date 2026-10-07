import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import { apiGetAlsoBought, type MarketplaceProduct } from '@/api/services/marketplace';
import { Button } from '@/components/comman/ui/Button';
import { BuyerNavbar, Breadcrumb, Footer, SkeletonBox, getRecentlyViewed } from '@/components/comman/ui';
import { ProductCard } from '@/components/comman/marketplace/ProductCard';
import {
  Minus, Plus, Trash2, ShoppingBag,
  Loader2, Package, Download, ChevronRight, ShieldCheck, RotateCcw, Lock,
} from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { clsx } from 'clsx';
import { currencySymbol } from '@/utils/currency';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';

function CartItemImage({ images, name }: { images?: string[]; name: string }) {
  const [errored, setErrored] = useState(false);
  const src = images?.[0];
  if (!src || errored) {
    return <ProductCoverFallback name={name} size="sm" className="w-[72px] h-[72px] rounded-[10px] shrink-0" />;
  }
  return (
    <img loading="lazy" decoding="async"
      src={src} alt={name} onError={() => setErrored(true)}
      className="w-[72px] h-[72px] rounded-[10px] object-cover shrink-0 block"
    />
  );
}

export function CartPage() {
  const navigate = useNavigate();
  usePageTitle('Cart');

  // No login gate here — a guest's cart (localStorage, see CartContext) is
  // fully viewable/editable. Only "Proceed to Checkout" below requires
  // login (CheckoutPage's own gate), matching how Amazon/Daraz let a guest
  // manage their cart freely and only ask for an account at checkout.
  const { cart, loading, cartCount, updateQty, removeItem, clearCart, error, clearError, addToCart, adding } = useCartContext();
  const [clearing,   setClearing]   = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // "You might also like" — a real, unfiltered catalog pool (same source
  // Marketplace.tsx's/Homepage's own rails draw from), minus whatever's
  // already in the cart. A genuine discovery rail, not a fabricated "bundle
  // savings" claim — Edudeen has no bundle-pricing data model to back that up.
  const { products: discoveryPool } = useProductsByCategory(1, 12);

  // "Customers also bought" for the cart's own products (first few distinct
  // ones), merged round-robin so each cart item contributes, deduped.
  const cartKey = Array.from(new Set((cart?.items ?? []).map(i => i.productId))).sort().join(',');
  const [alsoBought, setAlsoBought] = useState<MarketplaceProduct[]>([]);
  useEffect(() => {
    const ids = cartKey ? cartKey.split(',').slice(0, 4) : [];
    if (ids.length === 0) { setAlsoBought([]); return; }
    let cancelled = false;
    Promise.all(ids.map(id => apiGetAlsoBought(id, 6).then(r => r.data?.products ?? []).catch(() => [] as MarketplaceProduct[])))
      .then(lists => {
        if (cancelled) return;
        const inCart = new Set(ids);
        const seen = new Set<string>();
        const merged: MarketplaceProduct[] = [];
        const longest = Math.max(0, ...lists.map(l => l.length));
        for (let i = 0; i < longest; i++) {
          for (const list of lists) {
            const p = list[i];
            if (!p || seen.has(p._id) || inCart.has(p._id)) continue;
            seen.add(p._id);
            merged.push(p);
          }
        }
        setAlsoBought(merged);
      });
    return () => { cancelled = true; };
  }, [cartKey]);

  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();
  const [addToCartFailedId, setAddToCartFailedId] = useState<string | null>(null);
  const lastAddAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!error || !lastAddAttemptRef.current) return;
    const failedId = lastAddAttemptRef.current;
    setAddToCartFailedId(failedId);
    const t = setTimeout(() => { setAddToCartFailedId(id => id === failedId ? null : id); clearError(); }, 2600);
    return () => clearTimeout(t);
  }, [error, clearError]);
  const handleCardClick = useCallback((slug: string) => navigate(`/product/${slug}`), [navigate]);
  const handleAddToCart = useCallback((e: React.MouseEvent, id: string, variantId: string, type: 'physical' | 'digital') => {
    e.stopPropagation();
    if (!variantId) return;
    lastAddAttemptRef.current = variantId;
    setAddToCartFailedId(prev => prev === variantId ? null : prev);
    addToCart(id, variantId, type);
  }, [addToCart]);
  const handleToggleWishlist = useCallback((e: React.MouseEvent, id: string, variantId: string) => {
    e.stopPropagation();
    if (variantId) toggleWishlist(id, variantId);
  }, [toggleWishlist]);

  const handleUpdateQty = (productId: string, variantId: string, action: 'increase' | 'decrease') => {
    setUpdatingId(variantId);
    updateQty(productId, variantId, action).finally(() => setUpdatingId(null));
  };

  const handleRemove = (productId: string, variantId: string) => {
    setRemovingId(variantId);
    removeItem(productId, variantId).finally(() => setRemovingId(null));
  };

  const handleClear = () => {
    setClearing(true);
    clearCart().finally(() => setClearing(false));
  };

  // ── Cart type detection ────────────────────────────────────────────────────
  const items       = cart?.items ?? [];
  const hasPhysical = items.some(i => i.type === 'physical');
  const hasDigital  = items.some(i => i.type === 'digital');
  const typeKnown   = hasPhysical || hasDigital;

  const physicalCount = items.filter(i => i.type === 'physical').reduce((s, i) => s + i.quantity, 0);
  const digitalCount  = items.filter(i => i.type === 'digital').reduce((s, i) => s + i.quantity, 0);

  const isEmpty = !loading && !items.length;

  // Main site: the cart can hold several stores' items. Each store ships and
  // bills on its own, so each gets its own checkout.
  const storeCarts = cart?.stores ?? [];
  const isMultiStore = storeCarts.length > 1;

  // Real, honest recall — the shopper's own recently-viewed products
  // (client-tracked from ProductDetail, same source the navbar's search
  // dropdown already uses), never a fabricated "trending" list.
  const recentlyViewed = isEmpty ? getRecentlyViewed() : [];

  const cartProductIds = new Set(items.map(i => i.productId));
  // Prefer real "bought together / similar" picks for what's in the cart;
  // the generic catalogue pool is only the fallback (empty cart, or no
  // related products came back).
  const relatedPool = alsoBought.filter(p => !cartProductIds.has(p._id));
  const discoveryItems = (relatedPool.length > 0 ? relatedPool : discoveryPool.filter(p => !cartProductIds.has(p._id))).slice(0, 5);

  // Every line is converted from its OWN native (seller) currency into the
  // buyer's currently-selected display currency — this is what makes the
  // navbar PKR/USD switch actually update prices here, and it's also what
  // lets a cart with items from different-currency sellers still show one
  // real, correctly-summed total instead of an ambiguous "confirmed at
  // checkout" placeholder. The authoritative amount is still always
  // recomputed fresh, server-side, at checkout creation regardless.
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const displaySymbol = currencySymbol(displayCurrency);
  const displayTotal = items.reduce((s, i) => {
    const unit = i.unitPrice ?? i.price ?? 0;
    const lineTotal = i.itemTotal ?? unit * i.quantity;
    return s + convert(lineTotal, i.currency);
  }, 0);

  return (
    <div className="min-h-screen bg-cream">

      <BuyerNavbar/>

      <div className={clsx('max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-8', !isEmpty && items.length > 0 && 'pb-[88px] lg:pb-8')}>
        <Breadcrumb className="mb-4" items={[
          { label: 'Home', path: '/' },
          { label: 'Cart' },
        ]} />

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-[10px] border border-error-border bg-error-bg px-4 py-3">
            <span className="text-[13px] text-error">{error}</span>
            <button
              onClick={clearError}
              aria-label="Dismiss error"
              className="text-[12px] font-semibold text-error cursor-pointer shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Empty — a guided moment, not a dead end: a real re-entry path
            back into the catalog (via the shopper's own recently-viewed
            products, when there are any) plus honest trust reassurance,
            instead of just an icon and one button. ── */}
        {isEmpty && (
          <div className="flex flex-col gap-5">
            <div className="relative overflow-hidden bg-white rounded-2xl border border-bone px-6 py-10 sm:py-12 flex flex-col items-center text-center">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-pale-orange/40 to-transparent pointer-events-none" />
              <span className="relative flex size-16 items-center justify-center rounded-full bg-brand-pale-orange mb-4">
                <ShoppingBag size={26} className="text-brand-orange" />
              </span>
              <p className="relative text-[19px] font-bold text-carbon mb-1">Your cart is empty</p>
              <p className="relative text-[13px] text-slate max-w-[360px] leading-[1.6] mb-5">
                Nothing here yet — explore books, Quran and Islamic learning, courses, and worksheets from verified educators.
              </p>
              <div className="relative flex items-center gap-2 flex-wrap justify-center">
                <Button variant="primary" onClick={() => navigate('/')}>Browse resources</Button>
              </div>
            </div>

            {/* Continue where you left off — the shopper's own recently-viewed
                products, real client-tracked history, shown only when it exists. */}
            {recentlyViewed.length > 0 && (
              <div className="bg-white rounded-xl border border-bone p-5">
                <p className="text-[13px] font-bold text-carbon mb-3">Continue where you left off</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {recentlyViewed.slice(0, 4).map(item => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/product/${item.id}`)}
                      className="group flex flex-col text-start bg-transparent border border-transparent rounded-xl p-1.5 cursor-pointer transition-all duration-200 hover:border-bone hover:-translate-y-[2px]"
                    >
                      <div className="aspect-square rounded-lg overflow-hidden bg-brand-pale-orange mb-2">
                        {item.image
                          ? <img loading="lazy" decoding="async" src={item.image} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                          : <ProductCoverFallback name={item.name} size="sm" className="w-full h-full" />}
                      </div>
                      <span className="text-[11px] font-medium text-charcoal leading-tight line-clamp-2 group-hover:text-brand-orange transition-colors">{item.name}</span>
                      {item.price != null && (
                        <span className="text-[11px] font-bold text-carbon mt-[2px]">{displaySymbol}{convert(item.price, item.currency).toLocaleString()}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trust reassurance — only claims backed by a real feature
                (token downloads, platform checkout, buyer return requests). */}
            <div className="flex items-center justify-center gap-5 sm:gap-8 flex-wrap text-[11.5px] text-slate">
              <button onClick={() => navigate('/faq')} className="flex items-center gap-[6px] bg-transparent border-none cursor-pointer p-0 hover:text-brand-orange transition-colors">
                <ShieldCheck size={14} className="text-success" /> Instant Digital Downloads
              </button>
              <button onClick={() => navigate('/faq')} className="flex items-center gap-[6px] bg-transparent border-none cursor-pointer p-0 hover:text-brand-orange transition-colors">
                <Lock size={14} className="text-success" /> Secure Checkout
              </button>
              <button onClick={() => navigate('/faq')} className="flex items-center gap-[6px] bg-transparent border-none cursor-pointer p-0 hover:text-brand-orange transition-colors">
                <RotateCcw size={14} className="text-success" /> Returns on Physical Items
              </button>
            </div>
          </div>
        )}

        {/* ── Cart + Summary ── */}
        {(loading || items.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

            {/* ── Left: Cart card ── */}
            <div className="bg-white rounded-xl border border-bone overflow-hidden">

              {/* Card header */}
              <div className="px-6 pt-5 pb-4 border-b border-bone flex items-center justify-between">
                <div>
                  <h1 className="text-[20px] font-bold text-carbon leading-tight">Shopping Cart</h1>
                  <p className="text-[12px] text-slate mt-[2px]">
                    {loading ? 'Loading…' : `${cartCount} item${cartCount !== 1 ? 's' : ''} in your cart`}
                  </p>
                </div>
                {!loading && cartCount > 0 && (
                  <span className="text-[11px] font-semibold px-3 py-[5px] rounded-full bg-brand-pale-orange text-brand-orange">
                    {cartCount} {cartCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>

              {/* Loading skeleton */}
              {loading && (
                <div className="divide-y divide-bone">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 items-center px-5 py-4">
                      <SkeletonBox width={72} height={72} rounded="10px" className="shrink-0" />
                      <div className="flex-1 flex flex-col gap-[10px]">
                        <SkeletonBox height={13} width="55%" />
                        <SkeletonBox height={11} width="25%" />
                        <SkeletonBox height={32} width={100} rounded="8px" />
                      </div>
                      <SkeletonBox width={55} height={20} />
                    </div>
                  ))}
                </div>
              )}

              {/* Items */}
              {!loading && items.map((item, idx) => {
                const key        = item.productVariantId;
                const imgs       = item.image ?? item.images;
                const nativePrice = item.unitPrice ?? item.price ?? 0;
                const nativeLineTotal = item.itemTotal ?? nativePrice * item.quantity;
                const price      = convert(nativePrice, item.currency);
                const lineTotal  = convert(nativeLineTotal, item.currency);
                const isRemoving = removingId === key;
                const isUpdating = updatingId === key;
                const isLast     = idx === (items.length - 1);
                const startsStore = isMultiStore && item.storeId !== items[idx - 1]?.storeId;

                return (
                  <div key={key}>
                  {startsStore && (
                    <div className={clsx('px-5 pt-3 pb-2 bg-cream text-[12px] font-semibold text-charcoal flex items-center gap-2', idx > 0 && 'border-t border-bone')}>
                      <Package size={13} className="text-slate" /> {item.storeName ?? 'Store'}
                    </div>
                  )}
                  <div
                    className={clsx(
                      'flex flex-wrap gap-4 items-start px-5 py-4 transition-opacity duration-200',
                      !isLast && 'border-b border-bone',
                      isRemoving && 'opacity-50',
                    )}
                  >
                    <CartItemImage images={imgs} name={item.name} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-[3px] flex-wrap">
                        <p className="font-semibold text-[14px] text-carbon leading-[1.35]">
                          {item.name}
                        </p>
                        {item.type === 'physical' && (
                          <span className="shrink-0 px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#fff4dc] text-[#b36200]">
                            Physical
                          </span>
                        )}
                        {item.type === 'digital' && (
                          <span className="shrink-0 flex items-center gap-[3px] px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#eef0ff] text-[#3851d1]">
                            <Download size={9} /> Digital
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-slate mb-3">
                        {displaySymbol}{price.toLocaleString()} each
                      </p>

                      {/* Qty controls — 40x40px min hit area for touch */}
                      <div className="flex items-center gap-[6px] flex-wrap">
                        <button
                          onClick={() => handleUpdateQty(item.productId, key, 'decrease')}
                          disabled={item.quantity <= 1 || isUpdating}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className={clsx(
                            'w-10 h-10 rounded-[7px] border border-bone bg-cream flex items-center justify-center text-charcoal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                            item.quantity <= 1 || isUpdating
                              ? 'cursor-not-allowed opacity-40'
                              : 'cursor-pointer hover:bg-bone',
                          )}
                        >
                          <Minus size={14} />
                        </button>

                        <span className="min-w-[36px] text-center text-[14px] font-bold text-carbon">
                          {isUpdating
                            ? <Loader2 size={13} className="animate-spin mx-auto block" />
                            : item.quantity}
                        </span>

                        <button
                          onClick={() => handleUpdateQty(item.productId, key, 'increase')}
                          disabled={isUpdating}
                          aria-label={`Increase quantity of ${item.name}`}
                          className={clsx(
                            'w-10 h-10 rounded-[7px] border border-bone bg-cream flex items-center justify-center text-charcoal transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                            isUpdating ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-bone',
                          )}
                        >
                          <Plus size={14} />
                        </button>

                        <Button
                          variant="danger" size="xs"
                          className="ms-2! py-[11px]! min-h-10"
                          onClick={() => handleRemove(item.productId, key)}
                          loading={isRemoving}
                          icon={!isRemoving && <Trash2 size={11} />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    {/* Line total */}
                    <p className="font-bold text-[15px] text-carbon shrink-0">
                      {displaySymbol}{lineTotal.toLocaleString()}
                    </p>
                  </div>
                  </div>
                );
              })}

              {/* Footer: clear cart */}
              {!loading && items.length > 0 && (
                <div className="px-5 py-3 border-t border-bone flex justify-end">
                  <Button
                    variant="outline" size="xs"
                    onClick={handleClear}
                    loading={clearing}
                    icon={!clearing && <Trash2 size={12} />}
                  >
                    Clear Cart
                  </Button>
                </div>
              )}
            </div>

            {/* ── Right: Order Summary ── */}
            <div className="bg-white rounded-xl border border-bone p-6 lg:sticky top-20 flex flex-col gap-5">
              <p className="text-[15px] font-bold text-carbon">Order Summary</p>

              {/* Item list */}
              {!loading && (
                <div className="flex flex-col gap-2">
                  {items.map(item => {
                    const nativePrice = item.unitPrice ?? item.price ?? 0;
                    const nativeTtl   = item.itemTotal ?? nativePrice * item.quantity;
                    const ttl = convert(nativeTtl, item.currency);
                    return (
                      <div key={item.productVariantId} className="flex justify-between text-[12px] gap-2">
                        <span className="text-carbon truncate">
                          {item.name}
                          <span className="text-slate ms-1">×{item.quantity}</span>
                        </span>
                        <span className="font-medium text-carbon shrink-0">{displaySymbol}{ttl.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="h-px bg-bone" />

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate">Subtotal ({cartCount} items)</span>
                  <span className="font-semibold text-carbon">{displaySymbol}{displayTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate">{hasPhysical ? 'Shipping' : 'Delivery'}</span>
                  <span className="text-charcoal font-medium text-[12px]">
                    {hasPhysical ? 'Calculated at checkout' : 'Instant'}
                  </span>
                </div>
              </div>

              <div className="h-px bg-bone" />

              <div className="flex justify-between text-[16px] font-bold">
                <span className="text-carbon">Total</span>
                <span className="text-carbon">{displaySymbol}{displayTotal.toLocaleString()}</span>
              </div>

              {/* ── Checkout ── One order for the whole cart, mixed physical +
                  digital included — matches Amazon/Alibaba/Shopify/Daraz, and
                  avoids the old two-button flow's double-checkout/billing bug. */}
              <div className="flex flex-col gap-2">
                {typeKnown && hasPhysical && hasDigital && (
                  <p className="text-[11px] text-slate text-center -mt-1 mb-1">
                    {physicalCount} physical · {digitalCount} digital — delivered together
                  </p>
                )}
                {isMultiStore ? (
                  <>
                    <p className="text-[11px] text-slate text-center -mt-1 mb-1">
                      Items from {storeCarts.length} stores — each store checks out separately
                    </p>
                    {storeCarts.map(sc => (
                      <Button
                        key={sc.storeId}
                        variant="primary" fullWidth
                        className="justify-between! px-5! py-[11px]! rounded-xl!"
                        onClick={() => navigate(`/checkout?store=${encodeURIComponent(sc.storeId)}`)}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Package size={15} className="shrink-0" />
                          <span className="truncate">Checkout {sc.store.name}</span>
                        </span>
                        <span className="flex items-center gap-1 opacity-80 text-[12px] shrink-0">
                          {sc.totalItems}
                          <ChevronRight size={13} />
                        </span>
                      </Button>
                    ))}
                  </>
                ) : (
                  <Button
                    variant="primary" fullWidth
                    className="justify-between! px-5! py-[11px]! rounded-xl!"
                    onClick={() => navigate('/checkout')}
                  >
                    <span className="flex items-center gap-2">
                      <Package size={15} />
                      Proceed to Checkout
                    </span>
                    <span className="flex items-center gap-1 opacity-80 text-[12px]">
                      {cartCount} item{cartCount !== 1 ? 's' : ''}
                      <ChevronRight size={13} />
                    </span>
                  </Button>
                )}
              </div>

              <Button
                variant="ghost" size="sm" fullWidth className="justify-center"
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
            </div>

          </div>
        )}

        {/* ── You might also like — a real discovery rail, not shown until the
            cart itself has loaded so it never pops in above the cart card. ── */}
        {!loading && items.length > 0 && discoveryItems.length > 0 && (
          <div className="mt-8">
            <p className="text-[15px] font-bold text-carbon mb-4">You might also like</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {discoveryItems.map(p => {
                const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
                const vId = dv?._id ?? '';
                return (
                  <ProductCard
                    key={p._id}
                    layout="grid"
                    product={p}
                    onClick={handleCardClick}
                    isAdding={adding === vId}
                    addToCartFailed={addToCartFailedId === vId}
                    onAddToCart={handleAddToCart}
                    isWishlisted={isWishlisted(p._id, vId)}
                    isWishlisting={wishlisting === vId}
                    onToggleWishlist={handleToggleWishlist}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky checkout bar — mirrors ProductDetail's sticky Add to
          Cart bar, sits just above the bottom nav (CartPage is login-gated,
          so BottomNav is always the plain logged-in height here). */}
      {!isEmpty && items.length > 0 && (
        <div className="fixed bottom-[64px] inset-x-0 z-40 lg:hidden bg-white border-t border-bone px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate leading-none mb-[3px]">Total</p>
            <p className="text-[17px] font-extrabold text-carbon leading-none truncate">{displaySymbol}{displayTotal.toLocaleString()}</p>
          </div>
          <Button
            variant="primary" size="md" className="justify-center flex-1 max-w-[220px]"
            onClick={() => navigate('/checkout')}
          >
            Checkout <ChevronRight size={14} />
          </Button>
        </div>
      )}

      <Footer />
    </div>
  );
}
