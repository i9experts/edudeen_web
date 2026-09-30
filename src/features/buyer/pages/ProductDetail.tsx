import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack';
import { useProductById } from '@/hooks/marketplace/useProductById';
import { useProductPreview } from '@/hooks/marketplace/useProductPreview';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { useToast } from '@/contexts/ToastContext';
import { TokenStorage } from '@/api/services/auth';
import { apiGetAllProducts, type MarketplaceProduct, type ProductVariant } from '@/api/services/marketplace';
import { apiStartConversation, apiSendMessage } from '@/api/services/messaging';
import { apiGetPublicStoreProducts, apiGetPublicStore, apiFollowStore, apiGetFollowStatus, type PublicStoreProduct, type PublicStoreData } from '@/api/services/store';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { Button } from '@/components/comman/ui/Button';
import { Badge } from '@/components/comman/ui/Badge';
import { Card } from '@/components/comman/ui/Card';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { TabBar } from '@/components/comman/ui/TabBar';
import { Modal } from '@/components/comman/ui/Modal';
import { BuyerNavbar, Breadcrumb, AppDownloadBanner, Footer, CoverImage, pushRecentlyViewed } from '@/components/comman/ui';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import {
  ArrowRight, Package, Download, ClipboardList, CheckCircle, Minus, Plus,
  ShoppingCart, Star, Link2, Share2, Heart, ShieldCheck, Truck,
  UserPlus, UserCheck, Tag, ZoomIn, Users, Calendar, Award, Sparkles, Flame,
  FileText, Store as StoreIcon, Eye, Loader2, Zap, MessageCircle,
} from 'lucide-react';
import { ProductReviewsSection } from './ProductReviews';
import { currencySymbol } from '@/utils/currency';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="px-4 md:px-6 lg:px-10 py-6 md:py-7">
      <div className="flex gap-2 mb-6">
        {[80, 20, 60, 20, 120].map((w, i) => <SkeletonBox key={i} width={w} height={13} rounded="4px" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[64px_1fr_400px] gap-6 items-start min-w-0">
        <div className="hidden lg:flex flex-col gap-2">
          {[1, 2, 3, 4].map(i => <SkeletonBox key={i} width={64} height={64} rounded="10px" />)}
        </div>
        <SkeletonBox className="w-full h-[320px] md:h-[420px]" rounded="16px" />
        <div className="bg-white rounded-xl border border-bone p-6">
          <SkeletonBox width={60} height={20} rounded="4px" />
          <div className="mt-3"><SkeletonBox width="80%" height={24} rounded="6px" /></div>
          <div className="mt-2"><SkeletonBox width="50%" height={13} rounded="4px" /></div>
          <div className="mt-4"><SkeletonBox width={100} height={32} rounded="6px" /></div>
          <div className="mt-5 flex flex-col gap-[10px]">
            <SkeletonBox width="100%" height={44} rounded="10px" />
            <SkeletonBox width="100%" height={40} rounded="10px" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Image gallery — vertical thumbnail rail (desktop) + hover zoom ────────────
function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);
  const src = images[selected];

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  return (
    <div className="flex flex-col lg:flex-row-reverse gap-3 min-w-0">
      {/* Main image */}
      <div
        className="relative flex-1 min-w-0 h-[300px] md:h-[400px] lg:h-[460px] rounded-2xl overflow-hidden border border-bone bg-white group cursor-zoom-in"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMouseMove}
      >
        {!src || errored[selected] ? (
          <ProductCoverFallback name={name} size="lg" className="w-full h-full" />
        ) : (
          <>
            <img
              loading="lazy" decoding="async" src={src} alt={name}
              onError={() => setErrored(e => ({ ...e, [selected]: true }))}
              className="w-full h-full object-cover"
            />
            {zooming && (
              <div
                className="absolute inset-0 bg-no-repeat pointer-events-none transition-opacity duration-100"
                style={{
                  backgroundImage: `url(${src})`,
                  backgroundSize: '200%',
                  backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                }}
              />
            )}
            <span className="absolute top-3 right-3 flex items-center gap-1 px-[9px] py-[5px] rounded-full bg-black/55 text-white text-[10.5px] font-medium opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              <ZoomIn size={12} /> Hover to zoom
            </span>
          </>
        )}
      </div>

      {/* Thumbnails — vertical rail on desktop, horizontal scroll on mobile */}
      {images.length > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[460px] scrollbar-hide shrink-0">
          {images.slice(0, 8).map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={selected === i}
              className={clsx(
                'w-14 h-14 md:w-16 md:h-16 rounded-[10px] overflow-hidden shrink-0 bg-brand-pale-orange flex items-center justify-center border-2 cursor-pointer transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                selected === i ? 'border-brand-orange' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              {!errored[i] && img
                ? <img loading="lazy" decoding="async" src={img} alt="" onError={() => setErrored(e => ({ ...e, [i]: true }))} className="w-full h-full object-cover" />
                : <ProductCoverFallback name={name} size="xs" className="w-full h-full" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Variant Selector ──────────────────────────────────────────────────────────
// Generic — groups every variant's options by attribute name (Color, Size,
// Material…) and renders one chip-row per distinct attribute, instead of
// hardcoding Color/Size blocks.
function VariantSelector({ variants, selected, onSelect }: {
  variants: ProductVariant[]; selected: ProductVariant | null; onSelect: (v: ProductVariant) => void;
}) {
  if (!variants.length) return null;

  const attributeNames = Array.from(new Set(variants.flatMap(v => (v.options ?? []).map(o => o.name))));
  if (!attributeNames.length) return null;

  const valueOf = (v: ProductVariant | null, name: string) => v?.options?.find(o => o.name === name)?.value;

  function pickVariant(name: string, value: string) {
    const match =
      variants.find(v => valueOf(v, name) === value && attributeNames.every(n => n === name || valueOf(v, n) === valueOf(selected, n))) ??
      variants.find(v => valueOf(v, name) === value);
    if (match) onSelect(match);
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      {attributeNames.map(name => {
        const values = Array.from(new Set(variants.map(v => valueOf(v, name)).filter((x): x is string => !!x)));
        return (
          <div key={name}>
            <p className="text-[12px] font-semibold text-charcoal mb-[6px]">
              {name}: <span className="font-normal text-slate">{valueOf(selected, name) ?? '—'}</span>
            </p>
            <div className="flex flex-wrap gap-[6px]">
              {values.map(val => (
                <button
                  key={val} onClick={() => pickVariant(name, val)}
                  className={clsx(
                    'px-[10px] py-1 rounded-[6px] text-[12px] cursor-pointer border-[1.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                    valueOf(selected, name) === val ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange font-semibold' : 'border-bone bg-white text-charcoal font-normal',
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Quantity stepper ────────────────────────────────────────────────────────────
function QuantityStepper({ qty, max, onChange }: { qty: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center border border-bone rounded-[10px] overflow-hidden w-fit">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        disabled={qty <= 1}
        aria-label="Decrease quantity"
        className="w-8 h-9 flex items-center justify-center bg-cream text-charcoal cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
      >
        <Minus size={13} />
      </button>
      <span className="w-10 text-center text-[13px] font-semibold text-carbon tabular-nums">{qty}</span>
      <button
        onClick={() => onChange(Math.min(max, qty + 1))}
        disabled={qty >= max}
        aria-label="Increase quantity"
        className="w-8 h-9 flex items-center justify-center bg-cream text-charcoal cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// ── Seller-tab avatar — a real uploaded store logo is rarely a perfect
// square (banner-shaped logos are common), so `object-cover` on a small
// circle was cropping to a random slice of the logo instead of showing the
// whole mark. `object-contain` on a padded white disc shows the complete
// logo shrunk-to-fit; `onError` falls back to initials instead of a broken
// image if the URL 404s. ──
function SellerLogoAvatar({ logo, name }: { logo?: string | null; name: string }) {
  const [errored, setErrored] = useState(false);
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-[60px] h-[60px] rounded-full bg-success-bg text-success flex items-center justify-center font-bold text-[18px] flex-shrink-0 overflow-hidden border-2 border-white outline outline-1 outline-bone">
      {logo && !errored
        ? <img loading="lazy" decoding="async" src={logo} alt="" onError={() => setErrored(true)} className="w-full h-full object-contain p-1.5 bg-white" />
        : initials}
    </div>
  );
}

// ── Compact rail card — Related / More-from-seller strips ─────────────────────
interface RelatedCardProps {
  id: string; name: string; image: string | null; price: number | null; compareAtPrice?: number | null;
  currency?: string | null;
  rating?: number; reviewCount?: number; sold?: number; isNew?: boolean; isBestseller?: boolean;
  onClick: (id: string) => void;
  wishlist?: { active: boolean; onToggle: () => void };
}
function RelatedCard({ id, name, image, price: nativePrice, compareAtPrice: nativeCompareAt, currency: nativeCurrency, rating, reviewCount, sold, isNew, isBestseller, onClick, wishlist }: RelatedCardProps) {
  const [errored, setErrored] = useState(false);
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const symbol = currencySymbol(displayCurrency);
  const price = nativePrice != null ? convert(nativePrice, nativeCurrency) : null;
  const compareAtPrice = nativeCompareAt != null ? convert(nativeCompareAt, nativeCurrency) : null;
  const pctOff = compareAtPrice != null && price != null && compareAtPrice > price
    ? Math.round((1 - price / compareAtPrice) * 100)
    : null;
  return (
    <div
      onClick={() => onClick(id)}
      className="relative shrink-0 w-[150px] text-left bg-white rounded-[14px] border border-bone overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-[3px] hover:border-brand-orange/25"
    >
      <div className="relative h-[110px] bg-brand-pale-orange flex items-center justify-center overflow-hidden">
        {image && !errored
          ? <img loading="lazy" decoding="async" src={image} alt="" onError={() => setErrored(true)} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          : <ProductCoverFallback name={name} size="sm" className="w-full h-full" />}

        {/* Badges */}
        <div className="absolute top-[6px] left-[6px] flex flex-col gap-1 items-start">
          {pctOff != null && pctOff > 0 && (
            <span className="text-[9.5px] font-bold text-white bg-error px-[6px] py-[2px] rounded-md">-{pctOff}%</span>
          )}
          {isBestseller && (
            <span className="flex items-center gap-[3px] text-[9.5px] font-bold text-white bg-brand-deep-orange px-[6px] py-[2px] rounded-md"><Flame size={9} /> Bestseller</span>
          )}
          {isNew && !isBestseller && (
            <span className="flex items-center gap-[3px] text-[9.5px] font-bold text-white bg-success px-[6px] py-[2px] rounded-md"><Sparkles size={9} /> New</span>
          )}
        </div>

        {wishlist && (
          <button
            onClick={e => { e.stopPropagation(); wishlist.onToggle(); }}
            aria-label={wishlist.active ? 'Remove from wishlist' : 'Save to wishlist'}
            className={clsx(
              'absolute top-[6px] right-[6px] w-6 h-6 rounded-full flex items-center justify-center border-0 cursor-pointer transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
              wishlist.active ? 'bg-white opacity-100' : 'bg-white/85 opacity-0 group-hover:opacity-100',
            )}
          >
            <Heart size={12} className={wishlist.active ? 'text-[#e11d48] fill-[#e11d48]' : 'text-slate'} />
          </button>
        )}
      </div>
      <div className="px-[10px] py-[9px]">
        <p className="text-[11.5px] font-semibold text-carbon leading-tight line-clamp-2 mb-1 min-h-[28px]">{name}</p>
        <div className="flex items-center justify-between gap-1">
          <span className="flex items-baseline gap-1">
            <span className="text-[12.5px] font-bold text-carbon">{price != null ? `${symbol}${price.toLocaleString()}` : '—'}</span>
            {compareAtPrice != null && price != null && compareAtPrice > price && (
              <span className="text-[10px] text-slate line-through">{symbol}{compareAtPrice.toLocaleString()}</span>
            )}
          </span>
          {!!rating && rating > 0 && (
            <span className="flex items-center gap-[2px] text-[10px] text-slate shrink-0">
              <Star size={9} className="text-brand-orange fill-brand-orange" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        {(sold != null && sold > 0) || (reviewCount != null && reviewCount > 0) ? (
          <p className="text-[10px] text-slate mt-[2px]">
            {sold != null && sold > 0 ? `${sold} sold` : ''}
            {sold != null && sold > 0 && reviewCount != null && reviewCount > 0 ? ' · ' : ''}
            {reviewCount != null && reviewCount > 0 ? `${reviewCount} reviews` : ''}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProductRail({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[15px] font-bold text-carbon mb-3">{title}</p>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">{children}</div>
    </div>
  );
}

export function ProductDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug = '' } = useParams<{ slug: string }>();
  usePageTitle('Product Detail');
  const swipeHandlers = useEdgeSwipeBack(() => navigate(-1));

  const { detail, loading, error, refetch } = useProductById(slug);
  const { addToCart, updateQty, adding } = useCartContext();
  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();
  const { requireAuth } = useAuthGate();
  const toast = useToast();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [qty, setQty] = useState(1);
  const [shareCopied, setShareCopied] = useState(false);

  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [askSellerBusy, setAskSellerBusy] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: previewData, loading: previewLoading, error: previewError, load: loadPreview, reset: resetPreview } = useProductPreview(slug);

  const [sellerProducts, setSellerProducts] = useState<PublicStoreProduct[]>([]);
  const [sellerProductsTotal, setSellerProductsTotal] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<MarketplaceProduct[]>([]);
  const [storeData, setStoreData] = useState<PublicStoreData | null>(null);
  const [activeTab, setActiveTab] = useState('seller');

  const product = detail?.product ?? null;

  // The backend resolves this route's :slug param by slug OR raw id (id
  // kept as a permanent fallback for old bookmarked links) — if we got here
  // via a raw id (or any other stale form), normalize the address bar to
  // the product's real current slug.
  useEffect(() => {
    if (product && product.slug && product.slug !== slug) {
      // Keep any #reviews / #write-review anchor through the normalization.
      navigate(`/product/${product.slug}${location.hash}`, { replace: true });
    }
  }, [product, slug, navigate, location.hash]);

  // Deep links to the reviews section (e.g. "Write a review" from My Orders)
  // — the section only exists once the product has loaded, so scroll then.
  useEffect(() => {
    if (!product) return;
    if (location.hash !== '#reviews' && location.hash !== '#write-review') return;
    const t = setTimeout(() => {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(t);
  }, [product, location.hash]);

  const variants = detail?.variants ?? [];
  const activeVariant = selectedVariant ?? detail?.defaultVariant ?? null;
  const allImages = [...(product?.images ?? []), ...(activeVariant?.images ?? [])].filter((v, i, a) => a.indexOf(v) === i);

  const isLoggedIn = TokenStorage.isLoggedIn();
  const storeId = product?.storeId;
  const pType = product?.productType ?? product?.type ?? 'physical';
  const isPhysical = pType === 'physical';
  const isDigital  = !isPhysical;
  const typeLabel  = isPhysical ? 'Physical' : pType === 'educational' ? 'Educational' : 'Digital';
  // A physical variant marked unlimitedStock (seller disabled inventory
  // tracking for it) is always available — previously this fell through to
  // `?? 0` and incorrectly showed/disabled the page as out of stock.
  const stock = isDigital || activeVariant?.unlimitedStock ? Infinity : (activeVariant?.stock ?? 0);
  const pctOff = activeVariant?.compareAtPrice != null && activeVariant.compareAtPrice > activeVariant.price
    ? Math.round((1 - activeVariant.price / activeVariant.compareAtPrice) * 100)
    : null;

  // Converted from the variant's own native (store) currency into the
  // buyer's currently-selected display currency — this is what makes the
  // navbar PKR/USD switch actually change the prices shown on this page,
  // not just their symbol. The real checkout amount is always computed
  // fresh, server-side, at checkout creation regardless of this.
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const displaySymbol = currencySymbol(displayCurrency);
  const displayPrice = activeVariant ? convert(activeVariant.price, activeVariant.currency) : null;
  const displayCompareAt = activeVariant?.compareAtPrice != null ? convert(activeVariant.compareAtPrice, activeVariant.currency) : null;

  useEffect(() => { setQty(1); }, [activeVariant?._id]);

  // Recently Viewed — client-tracked snapshot (no view-history API exists),
  // surfaced in the navbar search dropdown's empty state.
  useEffect(() => {
    if (!product) return;
    pushRecentlyViewed({
      id: product.slug,
      name: product.name,
      image: product.images?.[0] ?? null,
      price: activeVariant?.price ?? null,
      currency: activeVariant?.currency,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  useEffect(() => {
    if (!storeId || !isLoggedIn) return;
    apiGetFollowStatus(storeId).then(res => setFollowing(res.data.following)).catch(() => {});
  }, [storeId, isLoggedIn]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetPublicStoreProducts(storeId, { limit: 8 })
      .then(res => {
        if (cancelled) return;
        setSellerProducts((res.data?.products ?? []).filter(p => p._id !== product?._id));
        setSellerProductsTotal(res.data?.pagination?.total ?? 0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeId, product?._id]);

  useEffect(() => {
    const slug = product?.storeSlug;
    if (!slug) return;
    let cancelled = false;
    apiGetPublicStore(slug).then(res => { if (!cancelled) setStoreData(res.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [product?.storeSlug]);

  useEffect(() => {
    if (!product?.categoryId) return;
    let cancelled = false;
    apiGetAllProducts(1, 8, product.categoryId)
      .then(res => { if (!cancelled) setRelatedProducts((res.data?.products ?? []).filter(p => p._id !== product._id)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [product?.categoryId, product?._id]);

  function handleFollow() {
    if (!storeId || followBusy) return;
    requireAuth(async () => {
      setFollowBusy(true);
      try {
        const res = await apiFollowStore(storeId);
        setFollowing(res.data.following);
        toast.success(res.data.following ? 'Following store' : 'Unfollowed store');
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update follow status.'); }
      finally { setFollowBusy(false); }
    }, 'Sign in to follow this store.');
  }

  // "Ask the Seller a Question" — the closest real equivalent to a TPT-style
  // Q&A tab this backend can support today (there's no question/answer
  // schema, only Rating), so a pre-purchase question goes through the
  // existing buyer↔seller messaging system instead, opened with this exact
  // product attached as a rich product-share card so the seller has full
  // context without the buyer having to re-describe which listing it's about.
  function handleAskSeller() {
    if (!storeId || !product || askSellerBusy) return;
    requireAuth(async () => {
      setAskSellerBusy(true);
      try {
        const conv = await apiStartConversation({ storeId });
        await apiSendMessage(conv._id, { type: 'product_share', productShare: { productId: product._id } });
        navigate(`/account/messages?conversation=${conv._id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not start a conversation.');
      } finally {
        setAskSellerBusy(false);
      }
    }, 'Sign in to ask the seller a question.');
  }

  async function handleAddToCart(buyNow: boolean) {
    if (!product || !activeVariant) return;
    await addToCart(product._id, activeVariant._id, isPhysical ? 'physical' : 'digital');
    for (let i = 1; i < qty; i++) {
      await updateQty(product._id, activeVariant._id, 'increase');
    }
    // "Buy Now" skips straight to checkout instead of the cart page — the
    // checkout gate itself (see CheckoutPage.tsx) handles a still-logged-out
    // buyer with an inline modal now, so there's no reason to stop at the
    // cart page first.
    if (buyNow) navigate('/checkout');
    else { setAddedFeedback(true); setTimeout(() => setAddedFeedback(false), 2000); }
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); return; } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  const specs: { label: string; value: string }[] = product ? [
    { label: 'Product Type', value: typeLabel },
    ...(activeVariant?.sku ? [{ label: 'SKU', value: activeVariant.sku }] : []),
    ...(activeVariant?.options ?? []).map(o => ({ label: o.name, value: o.value })),
    ...(activeVariant?.shippingWeight ? [{ label: 'Weight', value: activeVariant.shippingWeight }] : []),
    ...(product.digital?.licenseType ? [{ label: 'License', value: product.digital.licenseType }] : []),
    ...(product.digital?.downloadLimit ? [{ label: 'Download Limit', value: String(product.digital.downloadLimit) }] : []),
    { label: 'Status', value: product.status },
  ] : [];

  return (
    <div className="min-h-screen bg-cream" {...swipeHandlers}>
      <BuyerNavbar backTo={{ label: 'Home', path: '/' }} />

      {loading && <DetailSkeleton />}

      {!loading && error && (
        <div className="px-4 md:px-10 py-[60px] text-center">
          <p className="text-[15px] text-error mb-4">{error}</p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" onClick={refetch}>Try again</Button>
            <Button variant="secondary" onClick={() => navigate('/')}>Back to resources</Button>
          </div>
        </div>
      )}

      {!loading && product && (
        <div className="px-4 md:px-6 lg:px-10 py-6 md:py-8 pb-[92px] lg:pb-8">
          <Breadcrumb className="mb-4" items={[
            { label: 'Home', path: '/' },
            { label: 'Home', path: '/' },
            { label: product.name },
          ]} />

          {/* ── Gallery + Purchase panel ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start min-w-0 mb-8">
            <ImageGallery images={allImages} name={product.name} />

            {/* Sticky wrapper's "stick range" is bounded by its own parent —
                that parent must be exactly this grid row (matched in height
                to the taller of the two columns via items-start), NOT a
                container that also includes the tabs section below. Nesting
                the tabs div inside the same flex-col as this previously made
                the purchase panel stay pinned for the tabs section's entire
                scroll range too, overlapping it (see the Buy Now button
                rendering underneath the tabs card while scrolling). */}
            <div className="lg:sticky lg:top-20 min-w-0">
              <Card padding="none">
                <div className="px-6 pt-6 pb-0">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <Badge color="orange">{typeLabel}</Badge>
                    {/* Discount/campaign badges grouped on the opposite corner
                        from the type badge — mirrors ProductCard.tsx's grid
                        card corner layout instead of bunching everything together. */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {pctOff != null && pctOff > 0 && <Badge color="red">-{pctOff}% OFF</Badge>}
                      {product.activeCampaign && (
                        <span
                          title={`${product.activeCampaign.name} — ends ${new Date(product.activeCampaign.endDate).toLocaleDateString()}`}
                          className="flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-orange to-[#66AD36] px-2.5 py-[3px] text-[11px] font-bold text-white"
                        >
                          <Zap size={10} className="fill-white shrink-0" />
                          {product.activeCampaign.discountType && product.activeCampaign.discountValue != null
                            ? (product.activeCampaign.discountType === 'percentage'
                                ? `${product.activeCampaign.discountValue}% OFF`
                                : `${displaySymbol}${convert(product.activeCampaign.discountValue, product.activeCampaign.currency ?? 'USD')} OFF`)
                            : product.activeCampaign.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <h1 className="text-[20px] font-bold text-carbon mb-[6px] leading-[1.35] break-words">
                    {product.name}
                  </h1>
                  <p className="text-[12px] text-slate mb-4 flex items-center gap-1 flex-wrap">
                    {/* "Sold by" prefers the store/brand name (what a buyer is
                        actually shopping from) over the individual seller's
                        personal account name — falls back to sellerName only
                        if the store lookup hasn't resolved (or has no name). */}
                    {(storeData?.name ?? product.sellerName) && <>by {storeData?.name ?? product.sellerName}</>}
                    {product.averageRating > 0 && (
                      <span className="flex items-center gap-[3px]">
                        • <Star size={11} className="text-brand-orange fill-brand-orange" />
                        {product.averageRating.toFixed(1)} ({product.totalRatings} reviews)
                      </span>
                    )}
                    {product.purchaseCount > 0 && <span className="text-slate/70">• {product.purchaseCount} sold</span>}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-[10px] mb-1">
                    <span className="text-[30px] font-extrabold text-carbon tracking-[-0.5px]">
                      {displayPrice != null ? `${displaySymbol}${displayPrice.toLocaleString()}` : '—'}
                    </span>
                    {displayCompareAt != null && displayPrice != null && displayCompareAt > displayPrice && (
                      <span className="text-[14px] text-slate line-through">{displaySymbol}{displayCompareAt.toLocaleString()}</span>
                    )}
                  </div>
                  {activeVariant?.subscriberPrice != null && (
                    <p className="text-[11.5px] font-semibold text-brand-orange mb-2">
                      Members pay {displaySymbol}{convert(activeVariant.subscriberPrice, activeVariant.currency).toLocaleString()} — save {activeVariant.discountPercent}%
                    </p>
                  )}

                  {/* Stock / delivery status */}
                  <div className={clsx(
                    'inline-flex w-fit items-center gap-[6px] rounded-full border px-3 py-[6px] mb-3 text-[12px] font-semibold',
                    stock <= 0 ? 'border-[#fecdd3] bg-[#fff0f5] text-error'
                      : stock <= 5 ? 'border-amber-200 bg-amber-50 text-amber-600'
                      : 'border-[#cfeeda] bg-success-bg text-success',
                  )}>
                    <CheckCircle size={13} />
                    {stock <= 0 ? 'Out of stock' : isDigital ? 'Available — instant delivery' : stock <= 5 ? `Only ${stock} left in stock` : 'In stock'}
                  </div>

                  {isDigital && product.digital?.previewAvailable && (
                    <Button
                      variant="outline" size="md" fullWidth className="justify-center mb-3"
                      onClick={() => { setPreviewOpen(true); loadPreview(); }}
                    >
                      <Eye size={14} className="inline align-middle mr-[6px]" /> Preview before you buy
                    </Button>
                  )}

                  <VariantSelector variants={variants} selected={activeVariant} onSelect={setSelectedVariant} />

                  {!isDigital && stock > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[12px] font-semibold text-charcoal">Quantity</span>
                      <QuantityStepper qty={qty} max={Math.min(stock, 99)} onChange={setQty} />
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex flex-col gap-[10px] mb-6">
                    <Button
                      variant="primary" size="lg" fullWidth className="justify-center"
                      disabled={stock <= 0} loading={adding === activeVariant?._id}
                      onClick={() => handleAddToCart(true)}
                    >
                      {stock <= 0 ? 'Out of Stock' : <>Buy Now <ArrowRight size={14} className="inline align-middle ml-[6px]" />{displayPrice != null ? ` ${displaySymbol}${(displayPrice * qty).toLocaleString()}` : ''}</>}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary" size="md" fullWidth className="justify-center flex-1"
                        disabled={stock <= 0} loading={adding === activeVariant?._id}
                        onClick={() => handleAddToCart(false)}
                      >
                        {stock <= 0 ? 'Out of Stock' : addedFeedback ? '✓ Added to Cart' : <><ShoppingCart size={14} /> Add to Cart</>}
                      </Button>
                      {product && activeVariant && (() => {
                        const wishlisted = isWishlisted(product._id, activeVariant._id);
                        const busy = wishlisting === activeVariant._id;
                        return (
                          <button
                            onClick={() => toggleWishlist(product._id, activeVariant._id)}
                            disabled={busy}
                            title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                            className={clsx(
                              'w-10 flex-shrink-0 rounded-[10px] flex items-center justify-center transition-all duration-150 border-[1.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                              wishlisted ? 'border-[#fecdd3] bg-[#fff0f5]' : 'border-bone bg-white',
                              busy ? 'cursor-wait' : 'cursor-pointer',
                            )}
                          >
                            <Heart size={16} className={clsx('transition-[color,fill] duration-150', wishlisted ? 'text-[#e11d48] fill-[#e11d48]' : 'text-slate fill-none')} />
                          </button>
                        );
                      })()}
                      <button
                        onClick={handleShare}
                        title="Share this listing"
                        aria-label="Share this listing"
                        className="w-10 flex-shrink-0 rounded-[10px] flex items-center justify-center border-[1.5px] border-bone bg-white cursor-pointer text-slate hover:text-brand-orange hover:border-brand-orange/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                      >
                        {shareCopied ? <Link2 size={15} className="text-success" /> : <Share2 size={15} />}
                      </button>
                    </div>
                    {storeId && (
                      <button
                        onClick={handleAskSeller}
                        disabled={askSellerBusy}
                        className="flex items-center justify-center gap-[6px] py-2 text-[12.5px] font-medium text-slate hover:text-brand-orange transition-colors cursor-pointer bg-transparent border-none disabled:opacity-60"
                      >
                        {askSellerBusy ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                        Ask the seller a question
                      </button>
                    )}
                  </div>

                  {/* Trust row */}
                  <div className="rounded-xl border border-bone bg-cream/60 px-4 py-3 mb-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-[8px] min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white border border-bone flex items-center justify-center shrink-0">
                        <ShieldCheck size={14} className="text-brand-orange" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold text-charcoal leading-tight truncate">Secure checkout</p>
                        <p className="text-[10px] text-slate mt-[1px] truncate">Pay safely through Edudeen</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-[8px] min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white border border-bone flex items-center justify-center shrink-0">
                        <Truck size={14} className="text-brand-orange" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-semibold text-charcoal leading-tight truncate">{isDigital ? 'Instant delivery' : 'Shipped by the seller'}</p>
                        <p className="text-[10px] text-slate mt-[1px] truncate">{isDigital ? 'Download right after purchase' : 'Track it from My Orders'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* ── Description / Specifications / Seller / Shipping tabs ──────────── */}
            <div className="bg-white rounded-2xl border border-bone overflow-hidden mb-6">
              <TabBar
                className="px-3"
                dense
                tabs={[
                  { id: 'seller', label: 'Seller', icon: <StoreIcon size={12} /> },
                  { id: 'description', label: 'Description', icon: <FileText size={12} /> },
                  { id: 'specs', label: 'Specs', icon: <ClipboardList size={12} /> },
                  { id: 'shipping', label: 'Shipping', icon: <Truck size={12} /> },
                ]}
                active={activeTab}
                onChange={setActiveTab}
              />

              <div className="p-6">
                {activeTab === 'description' && (
                  <div>
                    <p className="text-[13px] text-slate leading-[1.8] mb-4">{product.description || 'No description available.'}</p>
                    {(product.tags?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-[6px]">
                        {product.tags!.map(tag => (
                          <span key={tag} className="flex items-center gap-1 text-[11px] px-[9px] py-[3px] rounded-full bg-cream text-slate border border-bone">
                            <Tag size={9} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'specs' && (
                  <dl className="flex flex-col gap-y-3">
                    {specs.map(s => (
                      <div key={s.label} className="flex items-center justify-between border-b border-bone pb-2">
                        <dt className="text-[12px] text-slate">{s.label}</dt>
                        <dd className="text-[12.5px] font-medium text-charcoal capitalize">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {activeTab === 'seller' && (
                  <div>
                    <CoverImage src={storeData?.coverImage} className="h-[100px] -mx-6 -mt-6" />
                    <div className="relative flex items-start gap-[14px] mb-5 flex-wrap -mt-8">
                      <SellerLogoAvatar logo={storeData?.logo} name={product.sellerName ?? 'Unknown Seller'} />
                      <div className="flex-1 min-w-0 pt-8">
                        <div className="flex items-center gap-[6px] flex-wrap">
                          <span className="text-[16px] font-bold text-carbon">{storeData?.name ?? product.sellerName ?? 'Unknown Seller'}</span>
                          {storeData?.badges?.includes('verified') && (
                            <Badge color="green" size="sm"><ShieldCheck size={11} /> Verified Seller</Badge>
                          )}
                          {storeData?.badges?.includes('top_seller') && (
                            <Badge color="orange" size="sm"><Award size={11} /> Top Seller</Badge>
                          )}
                          {storeData?.badges?.includes('featured') && (
                            <Badge color="blue" size="sm"><Sparkles size={11} /> Featured</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-[4px]">
                          <Star size={12} className="text-brand-orange fill-brand-orange" />
                          <span className="text-[12px] font-semibold text-charcoal">
                            {(storeData?.averageRating ?? product.averageRating ?? 0).toFixed(1)}
                          </span>
                          <span className="text-[12px] text-slate">
                            ({storeData?.reviewCount ?? product.totalRatings ?? 0} reviews)
                          </span>
                        </div>
                        {storeData?.description && (
                          <p className="text-[12px] text-slate mt-[6px] leading-[1.6] line-clamp-2">{storeData.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 pt-8">
                        <Button variant="secondary" size="sm" disabled={!product.storeSlug} onClick={() => product.storeSlug && (window.location.href = getStorefrontUrl(product.storeSlug))}>
                          Visit Store <ArrowRight size={13} className="inline align-middle ml-1" />
                        </Button>
                        {storeId && (
                          <Button
                            variant={following ? 'ghost' : 'outline'} size="sm"
                            loading={followBusy} onClick={handleFollow}
                          >
                            {following ? <><UserCheck size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-5">
                      <div className="rounded-xl bg-cream border border-bone p-3 text-center">
                        <Users size={14} className="text-brand-orange mx-auto mb-1" />
                        <p className="text-[13px] font-bold text-carbon leading-none">{storeData?.followersCount ?? 0}</p>
                        <p className="text-[10px] text-slate mt-[3px]">Followers</p>
                      </div>
                      <div className="rounded-xl bg-cream border border-bone p-3 text-center">
                        <Package size={14} className="text-brand-orange mx-auto mb-1" />
                        <p className="text-[13px] font-bold text-carbon leading-none">{sellerProductsTotal || sellerProducts.length}</p>
                        <p className="text-[10px] text-slate mt-[3px]">Products</p>
                      </div>
                      <div className="rounded-xl bg-cream border border-bone p-3 text-center">
                        <Calendar size={14} className="text-brand-orange mx-auto mb-1" />
                        <p className="text-[13px] font-bold text-carbon leading-none">
                          {storeData?.createdAt ? new Date(storeData.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}
                        </p>
                        <p className="text-[10px] text-slate mt-[3px]">Joined</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="flex flex-col gap-4">
                    {[
                      isDigital
                        ? { Icon: Download, label: 'Instant Digital Delivery', value: 'Download link available immediately after purchase' }
                        : { Icon: Truck, label: 'Shipping', value: 'Ships after purchase — rate calculated at checkout' },
                      { Icon: Package, label: 'Seller Fulfilled', value: `Sold and shipped by ${product.sellerName ?? 'seller'}` },
                      { Icon: ClipboardList, label: 'SKU', value: activeVariant?.sku ?? '—' },
                    ].map(row => (
                      <div key={row.label} className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-lg bg-brand-pale-orange flex items-center justify-center flex-shrink-0">
                          <row.Icon size={15} className="text-brand-orange" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[12px] text-charcoal mb-[2px]">{row.label}</div>
                          <div className="text-[11px] text-slate break-words leading-[1.55]">{row.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          {/* ── Reviews ────────────────────────────────────────────────────────── */}
          <div id="reviews" className="bg-white rounded-2xl border border-bone p-6 mb-6 scroll-mt-24">
            <ProductReviewsSection productId={product._id} storeName={product.sellerName} />
          </div>

          {/* ── More from this Seller ────────────────────────────────────────── */}
          {sellerProducts.length > 0 && (
            <ProductRail title="More from this Seller">
              {sellerProducts.map(p => (
                <RelatedCard
                  key={p._id} id={p.slug} name={p.name} image={p.images?.[0] ?? null}
                  price={p.subscriberPrice ?? p.defaultVariantPrice}
                  // Every product from this same seller shares the seller's
                  // one locked Store.baseCurrency — there's no per-item
                  // currency field on this "other products from this store"
                  // endpoint response, so the store's own currency is the
                  // correct native currency to convert from here.
                  currency={storeData?.baseCurrency}
                  rating={p.averageRating}
                  onClick={slug => navigate(`/product/${slug}`)}
                />
              ))}
            </ProductRail>
          )}

          {/* ── Related Products ─────────────────────────────────────────────── */}
          {relatedProducts.length > 0 && (() => {
            const topSeller = relatedProducts.reduce((max, p) => p.purchaseCount > max ? p.purchaseCount : max, 0);
            const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            return (
              <ProductRail title="Related Products">
                {relatedProducts.map(p => {
                  const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
                  const wishlisted = dv ? isWishlisted(p._id, dv._id) : false;
                  return (
                    <RelatedCard
                      key={p._id} id={p.slug} name={p.name} image={p.images?.[0] ?? null}
                      price={dv?.price ?? null} compareAtPrice={dv?.compareAtPrice ?? null} currency={dv?.currency}
                      rating={p.averageRating} reviewCount={p.totalRatings} sold={p.purchaseCount}
                      isNew={new Date(p.createdAt).getTime() >= fourteenDaysAgo}
                      isBestseller={topSeller > 0 && p.purchaseCount === topSeller}
                      onClick={slug => navigate(`/product/${slug}`)}
                      wishlist={dv ? { active: wishlisted, onToggle: () => toggleWishlist(p._id, dv._id) } : undefined}
                    />
                  );
                })}
              </ProductRail>
            );
          })()}
        </div>
      )}

      {!loading && product && (
        <div className="pb-[76px] lg:pb-0">
          <div className="px-4 md:px-6 lg:px-10 pb-8"><AppDownloadBanner /></div>
          <Footer />
        </div>
      )}

      {/* Mobile sticky Add to Cart bar */}
      {!loading && product && activeVariant && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-bone px-4 py-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate leading-none mb-[3px]">Price</p>
            <p className="text-[17px] font-extrabold text-carbon leading-none truncate">{displaySymbol}{displayPrice?.toLocaleString()}</p>
          </div>
          <Button
            variant="primary" size="md" className="justify-center flex-1 max-w-[220px]"
            disabled={stock <= 0} loading={adding === activeVariant._id}
            onClick={() => handleAddToCart(false)}
          >
            {stock <= 0 ? 'Out of Stock' : addedFeedback ? '✓ Added to Cart' : <><ShoppingCart size={14} /> Add to Cart</>}
          </Button>
        </div>
      )}


      {previewOpen && (
        <Modal title="Preview" onClose={() => { setPreviewOpen(false); resetPreview(); }} width={560} mobileSheet>
          {previewLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate">
              <Loader2 size={16} className="animate-spin" /> Loading preview…
            </div>
          )}
          {!previewLoading && previewError && (
            <p className="text-[13px] text-error text-center py-10">{previewError}</p>
          )}
          {!previewLoading && !previewError && previewData?.type === 'pdf' && (
            <div className="flex flex-col gap-3">
              {previewData.pages.map((url, i) => (
                <img key={i} src={url} alt={`Preview page ${i + 1}`} className="w-full rounded-lg border border-bone" />
              ))}
            </div>
          )}
          {!previewLoading && !previewError && previewData?.type === 'image' && (
            <img src={previewData.url} alt="Preview" className="w-full rounded-lg border border-bone" />
          )}
          {!previewLoading && !previewError && previewData?.type === 'video' && (
            <video src={previewData.url} controls className="w-full rounded-lg" />
          )}
          {!previewLoading && !previewError && previewData?.type === 'audio' && (
            <audio src={previewData.url} controls className="w-full" />
          )}
        </Modal>
      )}
    </div>
  );
}
