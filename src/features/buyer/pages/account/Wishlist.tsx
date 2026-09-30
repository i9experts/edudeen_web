import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Heart, Star, ShoppingCart, Loader2 } from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useCartContext } from '@/contexts/CartContext';
import { Card, EmptyState, SkeletonBox, PageHeader, Modal, Button } from '@/components/comman/ui';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';

function WishlistImg({ images, name }: { images?: string[]; name: string }) {
  const [err, setErr] = useState(false);
  const src = images?.[0];
  if (!src || err) {
    return <ProductCoverFallback name={name} size="sm" className="w-[84px] h-[84px] rounded-[12px] shrink-0" />;
  }
  return (
    <img loading="lazy" decoding="async" src={src} alt={name} onError={() => setErr(true)}
      className="w-[84px] h-[84px] rounded-[12px] object-cover shrink-0 border border-[#edebe2]" />
  );
}

export function Wishlist() {
  const navigate = useNavigate();
  const { wishlistItems, wishlistCount, loading: wLoading, wishlisting, removeFromWishlist, clearWishlist, clearing } = useWishlistContext();
  const { addToCart, adding } = useCartContext();
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const displaySymbol = currencySymbol(displayCurrency);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearError, setClearError] = useState('');

  const handleRemove = (productId: string, variantId: string) => {
    setRemovingId(variantId);
    removeFromWishlist(productId, variantId).finally(() => setRemovingId(null));
  };
  const handleAddToCart = (productId: string, variantId: string, type?: 'physical' | 'digital') => {
    setAddingId(variantId);
    addToCart(productId, variantId, type).finally(() => setAddingId(null));
  };
  const handleClearAll = async () => {
    setClearError('');
    try {
      await clearWishlist();
      setConfirmingClear(false);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Failed to clear wishlist.');
    }
  };

  if (wLoading) {
    return (
      <Card padding="none">
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader eyebrow="Account" title="Wishlist" />
        </div>
        <div className="divide-y divide-[#f5f4ef]">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center px-5 py-[18px]">
              <SkeletonBox width={84} height={84} rounded="12px" />
              <div className="flex-1 flex flex-col gap-[10px]">
                <SkeletonBox width="50%" height={14} />
                <SkeletonBox width="20%" height={10} />
                <SkeletonBox width="35%" height={16} />
              </div>
              <div className="flex flex-col gap-[8px] items-end shrink-0">
                <SkeletonBox width={110} height={36} rounded="10px" />
                <SkeletonBox width={80} height={30} rounded="8px" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (wishlistCount === 0) {
    return (
      <Card padding="none">
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader eyebrow="Account" title="Wishlist" />
        </div>
        <EmptyState
          icon={<Heart size={28} className="text-brand-orange opacity-55" />}
          title="Wishlist is empty"
          description="Save products you love and find them here anytime."
          action={{ label: 'Browse resources', onClick: () => navigate('/') }}
          className="py-12"
        />
      </Card>
    );
  }

  return (
    <div>
    <Card padding="none">
      <div className="px-5 pt-5 pb-4 border-b border-bone">
        <PageHeader
          eyebrow="Account"
          title="Wishlist"
          description={`${wishlistCount} item${wishlistCount !== 1 ? 's' : ''} saved`}
          actions={
            <Button variant="ghost" size="sm" onClick={() => { setConfirmingClear(true); setClearError(''); }} disabled={clearing} className="text-error!">
              Clear All
            </Button>
          }
        />
      </div>
      <div className="divide-y divide-[#f5f4ef]">
        {wishlistItems.map(item => {
          const p = item.product;
          const variant = item.variants?.[0];
          // Same domain-wide rule used by ProductCard/ProductDetail/SellerStorefront/etc.:
          // productType can be 'educational' (which still counts as non-physical for
          // cart/shipping purposes), so check it before the stricter `type` field.
          const pType = p.productType ?? p.type ?? 'physical';
          const isPhysical = pType === 'physical';
          const isRemoving = removingId === variant?._id || wishlisting === variant?._id;
          const isAdding = addingId === variant?._id || adding === variant?._id;

          const discount = variant?.compareAtPrice && variant.compareAtPrice > variant.price
            ? Math.round((1 - variant.price / variant.compareAtPrice) * 100)
            : null;

          return (
            <div
              key={p._id}
              className={clsx(
                'group flex gap-4 items-center px-5 py-[18px] transition-all hover:bg-[#fafaf8]',
                isRemoving && 'opacity-40',
              )}
            >
              <WishlistImg images={p.images ?? []} name={p.name} />

              <div className="flex-1 min-w-0 flex flex-col gap-[7px]">
                <p
                  onClick={() => navigate(`/product/${p.slug}`)}
                  className="font-bold text-[14px] text-carbon cursor-pointer leading-snug hover:text-brand-orange transition-colors line-clamp-1"
                >
                  {p.name}
                </p>

                <div className="flex items-center gap-[4px]">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={11} className={clsx(
                      i <= Math.round(p.averageRating) ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone',
                    )} />
                  ))}
                  {p.averageRating > 0 && (
                    <span className="text-[11px] text-slate ml-[2px]">({p.averageRating.toFixed(1)})</span>
                  )}
                </div>

                {variant && variant.options?.length > 0 && (
                  <div className="flex items-center gap-[5px] flex-wrap">
                    {variant.options.map(o => (
                      <span key={o.name} className="text-[11px] px-[8px] py-[2px] rounded-[6px] bg-[#f2f0ea] text-slate font-medium">{o.value}</span>
                    ))}
                  </div>
                )}

                {variant && (
                  <div className="flex items-center gap-[8px]">
                    <span className="font-bold text-[16px] text-carbon">{displaySymbol}{convert(variant.price, variant.currency).toLocaleString()}</span>
                    {variant.compareAtPrice && variant.compareAtPrice > variant.price && (
                      <span className="text-[12px] line-through text-[#b0aeaa]">{displaySymbol}{convert(variant.compareAtPrice, variant.currency).toLocaleString()}</span>
                    )}
                    {discount && (
                      <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-[5px] bg-[#dcfce7] text-[#15803d]">Save {discount}%</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-[8px] justify-center shrink-0">
                {variant && (
                  <button
                    onClick={() => handleAddToCart(p._id, variant._id, isPhysical ? 'physical' : 'digital')}
                    disabled={isAdding}
                    className={clsx(
                      'flex items-center gap-[6px] px-[16px] py-[9px] rounded-[10px] text-[12px] font-bold bg-brand-orange text-white border-none whitespace-nowrap',
                      isAdding ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:opacity-90',
                    )}
                  >
                    {isAdding ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
                    {isAdding ? 'Adding…' : 'Add to Cart'}
                  </button>
                )}
                <button
                  onClick={() => variant && handleRemove(p._id, variant._id)}
                  disabled={isRemoving}
                  className={clsx(
                    'flex items-center justify-center gap-[5px] px-3 py-[6px] rounded-[8px] text-[11px] font-medium border border-bone bg-white text-slate whitespace-nowrap transition-colors',
                    isRemoving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[#fecdd3] hover:text-[#e11d48] hover:bg-[#fff5f7]',
                  )}
                >
                  {isRemoving ? <Loader2 size={11} className="animate-spin" /> : <Heart size={11} />}
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>

    {confirmingClear && (
      <Modal title="Clear your wishlist?" onClose={() => setConfirmingClear(false)} footer={
        <>
          <Button variant="ghost" onClick={() => setConfirmingClear(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleClearAll} loading={clearing}>Remove All</Button>
        </>
      }>
        <p className="text-[13px] text-slate">
          This removes all {wishlistCount} item{wishlistCount !== 1 ? 's' : ''} from your wishlist. This cannot be undone.
        </p>
        {clearError && <p className="text-[12px] text-error mt-2">{clearError}</p>}
      </Modal>
    )}
    </div>
  );
}
