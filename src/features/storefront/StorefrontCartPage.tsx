import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCartContext } from '@/contexts/CartContext';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui';
import {
  Minus, Plus, Trash2, ShoppingBag,
  Loader2, Download, Lock,
} from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { clsx } from 'clsx';
import { currencySymbol } from '@/utils/currency';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { useNavigate } from 'react-router-dom';
import { TokenStorage } from '@/api/services/auth';
import { useStorefront, useStorefrontPaths } from './StorefrontContext';

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

// This store's own cart — no marketplace breadcrumb, no cross-store
// "recently viewed"/"browse marketplace" recovery links, since a buyer on
// this subdomain only ever shops this one store. Checkout runs on the main
// Edudeen site's checkout, scoped to this store (`?store=`): the login
// cookie is shared across subdomains, and this store's server-side cart is
// the same one the main site reads. A guest's cart lives only in this
// subdomain's localStorage, so they sign in here first (which merges it
// into their server cart).
export function StorefrontCartPage() {
  usePageTitle('Cart');
  const navigate = useNavigate();
  const { store } = useStorefront();
  const { basePath, path, toMain } = useStorefrontPaths();
  const { cart, loading, cartCount, updateQty, removeItem, clearCart, error, clearError } = useCartContext();

  const handleCheckout = () => {
    if (!TokenStorage.isLoggedIn()) {
      // Inside the main app the normal Edudeen login is used; a subdomain has its own.
      if (basePath) toMain(`/login?redirect=${encodeURIComponent(path('/cart'))}`);
      else navigate('/login');
      return;
    }
    const storeId = cart?.storeId ?? store?.storeId;
    toMain(`/checkout${storeId ? `?store=${encodeURIComponent(storeId)}` : ''}`);
  };
  const [clearing,   setClearing]   = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const items   = cart?.items ?? [];
  const isEmpty = !loading && !items.length;

  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const displaySymbol = currencySymbol(displayCurrency);
  const displayTotal = items.reduce((s, i) => {
    const unit = i.unitPrice ?? i.price ?? 0;
    const lineTotal = i.itemTotal ?? unit * i.quantity;
    return s + convert(lineTotal, i.currency);
  }, 0);

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

  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[10px] border border-error-border bg-error-bg px-4 py-3">
          <span className="text-[13px] text-error">{error}</span>
          <button
            onClick={clearError}
            aria-label="Dismiss error"
            className="text-[12px] font-semibold text-error cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="relative overflow-hidden bg-white rounded-2xl border border-bone px-6 py-10 sm:py-12 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-brand-pale-orange mb-4">
            <ShoppingBag size={26} className="text-brand-orange" />
          </span>
          <p className="text-[19px] font-bold text-carbon mb-1">Your cart is empty</p>
          <p className="text-[13px] text-slate max-w-[360px] leading-[1.6]">
            Nothing here yet — browse the store to find something you'll love.
          </p>
        </div>
      )}

      {(loading || items.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          <div className="bg-white rounded-xl border border-bone overflow-hidden">
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

              return (
                <div
                  key={key}
                  className={clsx(
                    'flex flex-wrap gap-4 items-start px-5 py-4 transition-opacity duration-200',
                    !isLast && 'border-b border-bone',
                    isRemoving && 'opacity-50',
                  )}
                >
                  <CartItemImage images={imgs} name={item.name} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-[3px] flex-wrap">
                      <p className="font-semibold text-[14px] text-carbon leading-[1.35]">{item.name}</p>
                      {item.type === 'digital' && (
                        <span className="shrink-0 flex items-center gap-[3px] px-2 py-[2px] rounded-full text-[10px] font-semibold bg-[#eef0ff] text-[#3851d1]">
                          <Download size={9} /> Digital
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate mb-3">{displaySymbol}{price.toLocaleString()} each</p>

                    <div className="flex items-center gap-[6px] flex-wrap">
                      <button
                        onClick={() => handleUpdateQty(item.productId, key, 'decrease')}
                        disabled={item.quantity <= 1 || isUpdating}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className={clsx(
                          'w-10 h-10 rounded-[7px] border border-bone bg-cream flex items-center justify-center text-charcoal transition-colors',
                          item.quantity <= 1 || isUpdating ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-bone',
                        )}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-[36px] text-center text-[14px] font-bold text-carbon">
                        {isUpdating ? <Loader2 size={13} className="animate-spin mx-auto block" /> : item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.productId, key, 'increase')}
                        disabled={isUpdating}
                        aria-label={`Increase quantity of ${item.name}`}
                        className={clsx(
                          'w-10 h-10 rounded-[7px] border border-bone bg-cream flex items-center justify-center text-charcoal transition-colors',
                          isUpdating ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-bone',
                        )}
                      >
                        <Plus size={14} />
                      </button>
                      <Button
                        variant="danger" size="xs"
                        className="ml-2! py-[11px]! min-h-10"
                        onClick={() => handleRemove(item.productId, key)}
                        loading={isRemoving}
                        icon={!isRemoving && <Trash2 size={11} />}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  <p className="font-bold text-[15px] text-carbon shrink-0">{displaySymbol}{lineTotal.toLocaleString()}</p>
                </div>
              );
            })}

            {!loading && items.length > 0 && (
              <div className="px-5 py-3 border-t border-bone flex justify-end">
                <Button variant="outline" size="xs" onClick={handleClear} loading={clearing} icon={!clearing && <Trash2 size={12} />}>
                  Clear Cart
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-bone p-6 lg:sticky top-20 flex flex-col gap-5">
            <p className="text-[15px] font-bold text-carbon">Order Summary</p>

            {!loading && (
              <div className="flex flex-col gap-2">
                {items.map(item => {
                  const nativePrice = item.unitPrice ?? item.price ?? 0;
                  const nativeTtl   = item.itemTotal ?? nativePrice * item.quantity;
                  const ttl = convert(nativeTtl, item.currency);
                  return (
                    <div key={item.productVariantId} className="flex justify-between text-[12px] gap-2">
                      <span className="text-carbon truncate">
                        {item.name}<span className="text-slate ml-1">×{item.quantity}</span>
                      </span>
                      <span className="font-medium text-carbon shrink-0">{displaySymbol}{ttl.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-bone" />

            <div className="flex justify-between text-[16px] font-bold">
              <span className="text-carbon">Total</span>
              <span className="text-carbon">{displaySymbol}{displayTotal.toLocaleString()}</span>
            </div>

            <Button variant="primary" fullWidth className="justify-center!" onClick={handleCheckout}>
              <Lock size={13} className="mr-1.5" /> {TokenStorage.isLoggedIn() ? 'Checkout' : 'Sign in to checkout'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
