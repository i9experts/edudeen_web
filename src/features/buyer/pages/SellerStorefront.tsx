import { useState, useEffect } from 'react';
import { SITE_URL } from '@/utils/seo';
import { usePageMeta } from '@/hooks/usePageMeta';
import { clsx } from 'clsx';
import { BannerCarousel } from '@/components/comman/marketplace/BannerCarousel';
import { useStoreBanners } from '@/hooks/useStoreBanners';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import {
  Loader2, MessageCircle, Gift, Check, CreditCard,
} from 'lucide-react';
import { apiFollowStore, apiGetFollowStatus } from '@/api/services/store';
import { useToast } from '@/contexts/ToastContext';
import { apiStartConversation } from '@/api/services/messaging';
import { apiGetMyBalance, apiGetRewards, apiRedeemReward, type LoyaltyBalance, type Reward } from '@/api/services/loyalty';
import { apiGetGiftCardPublicSettings, apiCreateGiftCardPurchaseIntent, type GiftCardPublicSettings } from '@/api/services/giftCards';
import { StripeCardPayment, isStripeConfigured } from '@/features/buyer/components/StripeCardPayment';
import { apiGetPublicStoreProducts } from '@/api/services/store';
import { Modal } from '@/components/comman/ui/Modal';
import { TokenStorage } from '@/api/services/auth';
import { formatPrice } from '@/utils/formatPrice';
import { useStorefront, useStorefrontPaths } from '@/features/storefront/StorefrontContext';
import { useTrackView } from '@/utils/visitTracking';
import { getMainAppUrl } from '@/utils/storefrontUrl';
import { StorefrontHighlights } from '@/features/storefront/sections/StorefrontHighlights';
import { StoreBundlesStrip } from '@/features/storefront/sections/StoreBundlesStrip';
import { EducatorCard, hasEducatorProfile } from '@/components/comman/marketplace/EducatorCard';
import { ProductCatalogSection } from '@/features/storefront/sections/ProductCatalogSection';
import { StoreTrustStrip } from '@/features/storefront/sections/StoreTrustStrip';
import { StoreIdentityBanner } from '@/features/storefront/sections/StoreIdentityBanner';
import { StoreAboutTab } from '@/features/storefront/sections/StoreAboutTab';
import { StorePoliciesFaq } from '@/features/storefront/sections/StorePoliciesFaq';
import { StoreReviewsTab } from '@/features/storefront/sections/StoreReviewsTab';
import { Link, useSearchParams } from 'react-router-dom';

// Loyalty points and gift cards were retired from the seller panel; their
// buttons stay off here too (flip to bring them back).
const SHOW_RETIRED_EXTRAS = false;

const STORE_TABS = [
  { id: 'products', label: 'Products' },
  { id: 'about', label: 'About' },
  { id: 'reviews', label: 'Reviews' },
] as const;
type StoreTab = (typeof STORE_TABS)[number]['id'];

// ── Store page ─────────────────────────────────────────────────────────────────
// A store's page inside Edudeen: identity banner (logo, name, description,
// follow/message, membership), then every product the store sells.
export function SellerStorefront() {
  const { store, cfg, theme } = useStorefront();
  const { toMain, basePath } = useStorefrontPaths();
  useTrackView('store', store.storeId);
  // Slide link from the API (`/product/<slug>`, `/collections/<id>`, or a legacy https link) -> a real href for this host.
  const slideHref = (p?: string | null): string | null => {
    if (!p) return null;
    if (/^https:\/\//i.test(p)) return p;
    if (p.startsWith('/product/')) return basePath ? p : getMainAppUrl(p); // products live on the main app, not a store subdomain
    if (p.startsWith('/collections/')) return `${basePath}${p}`;
    return null;
  };
  // ?tab=about|reviews; anything else (or no value) = Products. The Products tab keeps the catalogue's own filters.
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: StoreTab = rawTab === 'about' || rawTab === 'reviews' ? rawTab : 'products';
  const productsSearch = (() => { const p = new URLSearchParams(searchParams); p.delete('tab'); const s = p.toString(); return s ? `?${s}` : ''; })();
  const identityBanner = theme?.identityBanner;
  const showFollow     = identityBanner?.showFollowButton     !== false;
  const showMessage    = identityBanner?.showMessageButton    !== false;
  const showLoyaltyBtn = identityBanner?.showLoyaltyButton    !== false;
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const isLoggedIn = TokenStorage.isLoggedIn();
  const { requireAuth } = useAuthGate();
  const toast = useToast();

  const [total, setTotal] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followStatusLoaded, setFollowStatusLoaded] = useState(false);
  const [followError, setFollowError] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [loyalty, setLoyalty] = useState<LoyaltyBalance | null>(null);
  const [showRewards, setShowRewards] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemedVoucher, setRedeemedVoucher] = useState<{ code: string; expiresAt: string } | null>(null);
  const [giftCardSettings, setGiftCardSettings] = useState<GiftCardPublicSettings | null>(null);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [giftCardAmount, setGiftCardAmount] = useState<number | null>(null);
  const [giftCardForm, setGiftCardForm] = useState({ recipientEmail: '', recipientName: '', message: '' });
  const [giftCardClientSecret, setGiftCardClientSecret] = useState<string | null>(null);
  const [giftCardBusy, setGiftCardBusy] = useState(false);
  const [giftCardError, setGiftCardError] = useState('');
  const [giftCardPaid, setGiftCardPaid] = useState(false);

  const { banners: storeBanners } = useStoreBanners(store.storeId);

  usePageMeta({
    title: store.name,
    description: ((store as { description?: string | null }).description ?? '').replace(/\s+/g, ' ').trim().slice(0, 155) || `Shop ${store.name} on Edudeen: educational worksheets, books, digital downloads and courses.`,
    image: store.logo ?? null,
    canonical: store.slug ? `/shop/${store.slug}` : undefined,
    jsonLd: { '@context': 'https://schema.org', '@type': 'Store', name: store.name, url: `${SITE_URL}/shop/${store.slug}`, ...(store.logo ? { logo: store.logo } : {}) },
  });

  // Total product count for the identity banner — cheap first-page fetch, the
  // real catalog listing/pagination lives inside `ProductCatalogSection`.
  useEffect(() => {
    apiGetPublicStoreProducts(store.storeId, { page: 1, limit: 1 }).then(res => setTotal(res.data?.pagination?.total ?? 0)).catch(() => {});
  }, [store.storeId]);

  useEffect(() => {
    if (!isLoggedIn) { setFollowStatusLoaded(true); return; }
    apiGetFollowStatus(store.storeId).then(res => setFollowing(res.data.following)).catch(() => {}).finally(() => setFollowStatusLoaded(true));
  }, [store.storeId, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    apiGetMyBalance(store.storeId).then(res => setLoyalty(res.data)).catch(() => {});
  }, [store.storeId, isLoggedIn]);

  useEffect(() => {
    apiGetGiftCardPublicSettings(store.storeId).then(res => setGiftCardSettings(res.data)).catch(() => {});
  }, [store.storeId]);

  const handleCreateGiftCardIntent = async () => {
    if (!isLoggedIn) { toMain('/login'); return; }
    if (!giftCardAmount) return;
    setGiftCardBusy(true);
    setGiftCardError('');
    try {
      const res = await apiCreateGiftCardPurchaseIntent(store.storeId, {
        amount: giftCardAmount,
        recipientEmail: giftCardForm.recipientEmail || undefined,
        recipientName: giftCardForm.recipientName || undefined,
        message: giftCardForm.message || undefined,
      });
      setGiftCardClientSecret(res.data.clientSecret);
    } catch (err) {
      setGiftCardError(err instanceof Error ? err.message : 'Failed to start gift card purchase.');
    } finally {
      setGiftCardBusy(false);
    }
  };

  const closeGiftCardModal = () => {
    setShowGiftCardModal(false);
    setGiftCardAmount(null);
    setGiftCardForm({ recipientEmail: '', recipientName: '', message: '' });
    setGiftCardClientSecret(null);
    setGiftCardError('');
    setGiftCardPaid(false);
  };

  const openRewards = () => {
    setShowRewards(true);
    if (rewards.length === 0) {
      setRewardsLoading(true);
      apiGetRewards(store.storeId).then(res => setRewards(res.data ?? [])).finally(() => setRewardsLoading(false));
    }
  };

  const handleRedeem = async (reward: Reward) => {
    setRedeemingId(reward._id);
    try {
      const res = await apiRedeemReward(store.storeId, reward._id);
      setLoyalty(prev => prev ? { ...prev, pointsBalance: res.data.remainingBalance } : prev);
      setRedeemedVoucher({ code: res.data.voucherCode, expiresAt: res.data.voucherExpiresAt });
      toast.success('Reward redeemed — apply your code at checkout');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to redeem reward.');
    } finally {
      setRedeemingId(null);
    }
  };

  const handleFollow = async () => {
    requireAuth(async () => {
      setFollowLoading(true);
      setFollowError('');
      try {
        const res = await apiFollowStore(store.storeId);
        setFollowing(res.data.following);
      } catch (err) {
        setFollowError(err instanceof Error ? err.message : 'Could not follow this store. Please try again.');
      } finally {
        setFollowLoading(false);
      }
    }, 'Sign in to follow this store.');
  };

  const handleMessage = async () => {
    requireAuth(async () => {
      setMsgLoading(true);
      setMsgError('');
      try {
        const conv = await apiStartConversation({ storeId: store.storeId });
        toMain(`/account/messages?conversation=${conv._id}`);
      } catch (err) {
        setMsgError(err instanceof Error ? err.message : 'Could not start a conversation.');
      } finally {
        setMsgLoading(false);
      }
    }, 'Sign in to message this seller.');
  };

  return (
    <div>
      {/* Identity banner: the SAME component the seller's Customize-store preview renders (StoreIdentityBanner). */}
      <StoreIdentityBanner
        store={store}
        flags={identityBanner}
        total={total}
        primaryColor={cfg.primaryColor}
        background={storeBanners.length > 0
          ? <BannerCarousel entityType="store_banner" intervalMs={6000} banners={storeBanners.map(b => ({ _id: b._id, order: b.order, imageUrl: b.imageUrl, linkUrl: slideHref(b.linkPath), mobileImageUrl: b.mobileImageUrl }))} />
          : undefined}
        actions={(
          <>
              {SHOW_RETIRED_EXTRAS && showLoyaltyBtn && isLoggedIn && loyalty && (
                <button onClick={openRewards}
                  style={{ borderRadius: cfg.buttonRadiusPx }}
                  className="flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors bg-white text-charcoal border border-white hover:bg-[rgba(255,255,255,0.9)] whitespace-nowrap">
                  <Gift size={13} style={{ color: cfg.primaryColor }} /> {loyalty.pointsBalance.toLocaleString()} points
                </button>
              )}
              {SHOW_RETIRED_EXTRAS && giftCardSettings?.purchaseEnabled && (
                <button onClick={() => setShowGiftCardModal(true)}
                  style={{ borderRadius: cfg.buttonRadiusPx }}
                  className="flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors bg-white text-charcoal border border-white hover:bg-[rgba(255,255,255,0.9)] whitespace-nowrap">
                  <CreditCard size={13} style={{ color: cfg.primaryColor }} /> Gift Cards
                </button>
              )}
              {showFollow && (
                <>
                  <button onClick={handleFollow} disabled={followLoading || !followStatusLoaded}
                    style={{ borderRadius: cfg.buttonRadiusPx }}
                    className={clsx('px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors whitespace-nowrap border',
                      following ? 'bg-white text-charcoal border-white' : 'bg-transparent text-white border-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)]')}>
                    {(followLoading || !followStatusLoaded) ? <Loader2 size={13} className="animate-spin inline" /> : following ? 'Following ✓' : 'Follow Store'}
                  </button>
                  {followError && <p className="text-[12px] text-white bg-black/30 rounded-md px-2 py-1 max-w-[220px] text-center sm:text-end">{followError}</p>}
                </>
              )}

              {showMessage && (
                <>
                  <button onClick={handleMessage} disabled={msgLoading}
                    style={{ borderRadius: cfg.buttonRadiusPx }}
                    className="flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors bg-white text-charcoal border border-white hover:bg-[rgba(255,255,255,0.9)] whitespace-nowrap">
                    {msgLoading ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />} Message
                  </button>
                  {msgError && <p className="text-[12px] text-white bg-black/30 rounded-md px-2 py-1 max-w-[220px] text-center sm:text-end">{msgError}</p>}
                </>
              )}
          </>
        )}
      />

      <StoreTrustStrip store={store} />

      <nav aria-label="Store sections" className="border-b border-bone bg-white">
        <div role="tablist" className="px-4 sm:px-6 lg:px-10 max-w-[1480px] mx-auto w-full flex gap-1 overflow-x-auto">
          {STORE_TABS.map(t => (
            <Link
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              to={t.id === 'products' ? { search: productsSearch } : { search: `?tab=${t.id}` }}
              replace={false}
              className={clsx('px-4 py-3 text-[14px] font-semibold whitespace-nowrap border-b-2 -mb-px',
                tab === t.id ? 'border-brand-royal text-brand-royal' : 'border-transparent text-slate hover:text-carbon')}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {tab === 'about' && (
        <StoreAboutTab store={{
          name: store.name,
          aboutBio: store.aboutBio,
          educatorProfile: store.educatorProfile,
          returnPolicy: store.returnPolicy,
          verifiedEducator: (store.badges ?? []).includes('verified_educator'),
        }} />
      )}

      {tab === 'reviews' && <StoreReviewsTab storeId={store.storeId} />}

      {tab === 'products' && (
        <>
          {/* ── Every product this store sells — the store page is a normal
             Edudeen page now, not a seller-designed site, so it's always the
             full catalogue (no custom builder sections). ── */}
          {hasEducatorProfile(store.educatorProfile) && (
            <div className="px-4 sm:px-6 lg:px-10 pt-6 max-w-[1480px] mx-auto w-full">
              <EducatorCard profile={store.educatorProfile} verified={(store.badges ?? []).includes('verified_educator')} name={store.name} />
            </div>
          )}

          {/* Published highlight rows (Featured / New arrivals / Best sellers) — each hidden below 2 products. */}
          <StorefrontHighlights />
          <StoreBundlesStrip />
          <ProductCatalogSection settings={{ heading: `All products from ${store.name}`, showFilters: true, defaultSort: 'newest' }} />
          <StorePoliciesFaq data={{ returnPolicy: store.returnPolicy, shippingNote: store.shippingNote, faqs: store.faqs }} />
        </>
      )}

      {showRewards && (
        <Modal title="Rewards Catalog" onClose={() => { setShowRewards(false); setRedeemedVoucher(null); }}>
          {redeemedVoucher && (
            <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-3 mb-4">
              <div>
                <p className="text-[12.5px] font-semibold text-emerald-800">Reward redeemed! Apply this code at checkout:</p>
                <p className="text-[15px] font-mono font-bold text-emerald-900 tracking-wide">{redeemedVoucher.code}</p>
                <p className="text-[12px] text-emerald-700">Valid until {new Date(redeemedVoucher.expiresAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard?.writeText(redeemedVoucher.code); toast.success('Code copied'); }}
                className="px-3 py-[6px] rounded-lg text-xs font-semibold text-emerald-800 bg-white border border-emerald-300 cursor-pointer whitespace-nowrap">
                Copy
              </button>
            </div>
          )}
          <p className="text-[13px] text-slate mb-4">
            You have <strong style={{ color: cfg.primaryColor }}>{loyalty?.pointsBalance.toLocaleString() ?? 0} points</strong> at {store.name}.
            {loyalty?.nextTier && ` ${loyalty.nextTier.pointsNeeded} more points to reach ${loyalty.nextTier.name}.`}
          </p>
          {rewardsLoading ? (
            <p className="text-xs text-slate">Loading…</p>
          ) : rewards.length === 0 ? (
            <p className="text-xs text-slate italic">No rewards available yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {rewards.map(r => {
                const canAfford = (loyalty?.pointsBalance ?? 0) >= r.pointsCost;
                const outOfStock = r.stockLimit != null && r.redeemedCount >= r.stockLimit;
                return (
                  <div key={r._id} className="flex items-center justify-between gap-3 bg-cream rounded-lg px-3.5 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-carbon">{r.name}</p>
                      <p className="text-[12px] text-slate">
                        {r.pointsCost.toLocaleString()} points — {r.type === 'fixed_discount' ? `${formatPrice(convert(r.discountValue ?? 0, store.baseCurrency), displayCurrency)} off` : 'Free product'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canAfford || outOfStock || redeemingId === r._id}
                      className="px-3.5 py-[7px] rounded-lg text-xs font-semibold text-white border-none cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: cfg.primaryColor }}>
                      {redeemingId === r._id ? 'Redeeming…' : outOfStock ? 'Out of stock' : canAfford ? 'Redeem' : 'Not enough points'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {showGiftCardModal && giftCardSettings && (
        <Modal title="Buy a Gift Card" onClose={closeGiftCardModal}>
          {giftCardPaid ? (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <Check size={32} className="text-success" />
              <p className="text-[14px] font-semibold text-carbon">Payment successful!</p>
              <p className="text-[12.5px] text-slate">
                The gift card code will be emailed to {giftCardForm.recipientEmail || 'you'} shortly.
              </p>
            </div>
          ) : giftCardClientSecret ? (
            isStripeConfigured() ? (
              <StripeCardPayment
                clientSecret={giftCardClientSecret}
                amount={giftCardAmount ?? 0}
                currency={giftCardSettings.currency}
                onConfirmed={() => setGiftCardPaid(true)}
              />
            ) : (
              <p className="text-xs text-error">Online payments aren't configured yet.</p>
            )
          ) : (
            <div className="flex flex-col gap-3.5">
              <div>
                <p className="text-xs font-medium text-graphite mb-2">Choose an amount</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {giftCardSettings.denominations.map(d => (
                    <button
                      key={d}
                      onClick={() => setGiftCardAmount(d)}
                      className={clsx(
                        'py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border transition-colors',
                        giftCardAmount === d ? 'text-white border-transparent' : 'bg-white text-graphite border-bone hover:bg-cream',
                      )}
                      style={giftCardAmount === d ? { background: cfg.primaryColor } : undefined}
                    >
                      {formatPrice(d, giftCardSettings.currency)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">Recipient email (optional)</label>
                <input
                  value={giftCardForm.recipientEmail}
                  onChange={e => setGiftCardForm(f => ({ ...f, recipientEmail: e.target.value }))}
                  placeholder="Send the code to this email"
                  className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">Recipient name (optional)</label>
                <input
                  value={giftCardForm.recipientName}
                  onChange={e => setGiftCardForm(f => ({ ...f, recipientName: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">Message (optional)</label>
                <input
                  value={giftCardForm.message}
                  onChange={e => setGiftCardForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white"
                />
              </div>
              {giftCardError && <p className="text-xs text-error">{giftCardError}</p>}
              <button
                onClick={handleCreateGiftCardIntent}
                disabled={!giftCardAmount || giftCardBusy}
                style={{ background: cfg.primaryColor }}
                className="w-full py-[11px] rounded-xl text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-50"
              >
                {giftCardBusy ? 'Starting…' : `Continue to Payment`}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
