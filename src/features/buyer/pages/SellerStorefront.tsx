import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { CoverImage } from '@/components/comman/ui';
import { BannerCarousel } from '@/components/comman/marketplace/BannerCarousel';
import { useStoreBanners } from '@/hooks/useStoreBanners';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import {
  Star, Users, Loader2, MessageCircle, BadgeCheck, Award, Gift, RefreshCw, Check, Store, CreditCard,
} from 'lucide-react';
import { apiFollowStore, apiGetFollowStatus } from '@/api/services/store';
import { useToast } from '@/contexts/ToastContext';
import { apiStartConversation } from '@/api/services/messaging';
import { apiGetPublicHomePage, type StorePageData } from '@/api/services/storePages';
import { apiGetMyBalance, apiGetRewards, apiRedeemReward, type LoyaltyBalance, type Reward } from '@/api/services/loyalty';
import { apiGetGiftCardPublicSettings, apiCreateGiftCardPurchaseIntent, type GiftCardPublicSettings } from '@/api/services/giftCards';
import { StripeCardPayment, isStripeConfigured } from '@/features/buyer/components/StripeCardPayment';
import { apiBrowseStorePlans, apiSubscribeToPlan, type BuyerPlan, type BillingInterval, type PlanBenefit } from '@/api/services/subscriptions';
import { apiGetPublicStoreProducts } from '@/api/services/store';
import { Modal } from '@/components/comman/ui/Modal';
import { TokenStorage } from '@/api/services/auth';
import { currencySymbol } from '@/utils/currency';
import { useStorefront } from '@/features/storefront/StorefrontContext';
import { getMainAppUrl } from '@/utils/storefrontUrl';
import { SectionRenderer } from '@/features/storefront/SectionRenderer';

// ── Badge config ──────────────────────────────────────────────────────────────
const SELLER_TYPE_LABEL: Record<string, string> = {
  educator:       'Education Specialist',
  creator:        'Content Creator',
  retailer:       'Retail Seller',
  brand_business: 'Brand / Business',
  freelancer:     'Freelancer',
};

function StoreBadges({ badges, sellerType }: { badges: string[]; sellerType: string | null }) {
  const items: { label: string; icon: React.ReactNode; cls: string }[] = [];
  const safeBadges = badges ?? [];

  if (safeBadges.includes('top_seller'))
    items.push({ label: 'Top Seller', icon: <Award size={10} />, cls: 'bg-amber-100 text-amber-700 border-amber-200' });
  if (safeBadges.includes('verified'))
    items.push({ label: 'Verified', icon: <BadgeCheck size={10} />, cls: 'bg-blue-50 text-blue-600 border-blue-200' });
  if (safeBadges.includes('featured'))
    items.push({ label: 'Featured', icon: <Star size={10} />, cls: 'bg-purple-50 text-purple-600 border-purple-200' });

  const specialistLabel = sellerType ? SELLER_TYPE_LABEL[sellerType] : null;
  if (specialistLabel)
    items.push({ label: specialistLabel, icon: <BadgeCheck size={10} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' });

  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-[5px] mt-[8px]">
      {items.map(b => (
        <span key={b.label} className={clsx('inline-flex items-center gap-[3px] px-[7px] py-[3px] rounded-full text-[10px] font-semibold border', b.cls)}>
          {b.icon}{b.label}
        </span>
      ))}
    </div>
  );
}

// ── Home page ──────────────────────────────────────────────────────────────────
// The seller's storefront home — the fixed transactional chrome below (store
// identity banner, follow/message, loyalty rewards, membership plans) is not
// seller-composable content, so it stays fixed rather than being modeled as a
// section (see the storefront builder plan). The seller-authored content
// (hero slides, rich text, featured products, the product catalog, etc.)
// renders via `SectionRenderer` from the store's home `StorePage`.
export function SellerStorefront() {
  const navigate = useNavigate();
  const { store, cfg, theme } = useStorefront();
  const identityBanner = theme?.identityBanner;
  const showFollow     = identityBanner?.showFollowButton     !== false;
  const showMessage    = identityBanner?.showMessageButton    !== false;
  const showLoyaltyBtn = identityBanner?.showLoyaltyButton    !== false;
  const showMembership = identityBanner?.showMembershipButton !== false;
  const bannerLayout      = identityBanner?.layout ?? 'standard';
  const showBadges        = identityBanner?.showBadges        !== false;
  const showFollowerCount = identityBanner?.showFollowerCount !== false;
  const showProductCount  = identityBanner?.showProductCount  !== false;
  const showRating        = identityBanner?.showRating        !== false;
  const descriptionClampCls = identityBanner?.descriptionMaxLines
    ? { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' }[Math.min(identityBanner.descriptionMaxLines, 3)]
    : '';
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const displaySymbol = currencySymbol(displayCurrency);
  const isLoggedIn = TokenStorage.isLoggedIn();
  const { requireAuth } = useAuthGate();
  const toast = useToast();

  const [homePage, setHomePage] = useState<StorePageData | null>(null);
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
  const [plans, setPlans] = useState<BuyerPlan[]>([]);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState('');
  const [subscribedMsg, setSubscribedMsg] = useState('');

  const { banners: storeBanners } = useStoreBanners(store.storeId);

  useEffect(() => {
    document.title = homePage?.seo.metaTitle || store.name;
    return () => { document.title = 'Edudeen'; };
  }, [homePage?.seo.metaTitle, store.name]);

  useEffect(() => {
    apiGetPublicHomePage(store.storeId).then(res => setHomePage(res.data)).catch(() => setHomePage(null));
  }, [store.storeId]);

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
    apiBrowseStorePlans(store.storeId).then(res => setPlans(res.data ?? [])).catch(() => {});
  }, [store.storeId]);

  useEffect(() => {
    apiGetGiftCardPublicSettings(store.storeId).then(res => setGiftCardSettings(res.data)).catch(() => {});
  }, [store.storeId]);

  const handleCreateGiftCardIntent = async () => {
    if (!isLoggedIn) { window.location.href = getMainAppUrl('/login'); return; }
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

  const handleSubscribe = async (plan: BuyerPlan, interval: BillingInterval) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setSubscribingId(plan._id);
    setSubscribeError('');
    setSubscribedMsg('');
    try {
      await apiSubscribeToPlan(plan._id, interval);
      setSubscribedMsg(`You're in! Welcome to ${plan.name} — member pricing is already live across the store.`);
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Failed to subscribe.');
    } finally {
      setSubscribingId(null);
    }
  };

  const benefitLabel = (b: PlanBenefit): string | null => {
    switch (b.type) {
      case 'discount': {
        const scope = b.scope === 'store' ? 'storewide' : b.scope === 'category' ? 'on select categories' : 'on select products';
        return `${b.discountPercent}% off ${scope}`;
      }
      case 'shipping':
        return b.shippingType === 'free' ? 'Free shipping' : `${b.shippingDiscountPercent}% off shipping`;
      case 'early_access':
        return `Early access to new arrivals (${b.earlyAccessHours}h head start)`;
      case 'loyalty_multiplier':
        return `${b.multiplier}x loyalty points`;
      case 'credits':
        return `${b.creditsPerCycle} ${b.creditType === 'service' ? 'service' : 'download'} credits every cycle`;
      case 'priority_support':
        return 'Priority customer support';
      case 'priority_booking':
        return 'Priority booking slots';
      default:
        return b.label ?? null;
    }
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
        window.location.href = getMainAppUrl(`/account/messages?conversation=${conv._id}`);
      } catch (err) {
        setMsgError(err instanceof Error ? err.message : 'Could not start a conversation.');
      } finally {
        setMsgLoading(false);
      }
    }, 'Sign in to message this seller.');
  };

  return (
    <div>
      {/* ── Store identity banner — 3 real layouts (Phase 11), not just a CSS
          tweak: 'compact' is a shorter cover for stores that want their
          content sooner; 'immersive' is a taller, centered full-bleed hero;
          'standard' is today's exact bottom-left composition, unchanged. ── */}
      <CoverImage
        className={clsx(
          'flex',
          bannerLayout === 'compact' ? 'min-h-[180px] sm:min-h-[220px] items-end' :
          bannerLayout === 'immersive' ? 'min-h-[420px] sm:min-h-[520px] lg:min-h-[620px] items-center' :
          'min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] items-end',
        )}
        src={store.coverImage}
        loading="eager"
        overlay
        overlayClassName={bannerLayout === 'immersive' ? 'bg-black/50' : 'bg-black/40'}
        fallbackClassName=""
        fallbackStyle={{ background: `linear-gradient(135deg, ${cfg.primaryColor}CC, ${cfg.accentColor}CC)` }}
        backgroundOverride={storeBanners.length > 0
          ? <BannerCarousel entityType="store_banner" banners={storeBanners.map(b => ({ _id: b._id, order: b.order, imageUrl: b.imageUrl, linkUrl: b.linkTarget, mobileImageUrl: b.mobileImageUrl }))} />
          : undefined}
      >
        <div className={clsx('px-4 sm:px-6 lg:px-10 w-full', bannerLayout === 'compact' ? 'py-4 sm:py-5' : 'py-7 sm:py-9')}>
          <div className={clsx(
            'flex gap-5 sm:gap-6',
            bannerLayout === 'immersive' ? 'flex-col items-center text-center' : 'flex-col sm:flex-row items-start sm:items-center',
          )}>
            <div className={clsx(
              'rounded-[18px] bg-white flex items-center justify-center shrink-0 outline outline-2 outline-white/40',
              bannerLayout === 'compact' ? 'w-[52px] h-[52px]' : bannerLayout === 'immersive' ? 'w-[96px] h-[96px] sm:w-[108px] sm:h-[108px]' : 'w-[72px] h-[72px] sm:w-[84px] sm:h-[84px]',
            )}>
              {store.logo
                ? <img loading="lazy" decoding="async" src={store.logo} alt={store.name} className="w-full h-full rounded-[18px] object-cover" />
                : <Store size={bannerLayout === 'compact' ? 24 : 36} style={{ color: cfg.primaryColor }} />}
            </div>

            <div className={clsx('flex-1 min-w-0', bannerLayout === 'immersive' && 'flex-none max-w-2xl')}>
              <h1 className={clsx('font-bold text-white mb-[4px] leading-tight', bannerLayout === 'compact' ? 'text-[17px]' : bannerLayout === 'immersive' ? 'text-[28px] sm:text-[34px]' : 'text-[22px] sm:text-[26px]')}>{store.name}</h1>
              {store.tagline && bannerLayout !== 'compact' && (
                <p className="text-[12.5px] sm:text-[13.5px] text-[rgba(255,255,255,0.85)] font-medium -mt-[2px] mb-[4px]">{store.tagline}</p>
              )}
              {showBadges && <div className={clsx(bannerLayout === 'immersive' && 'flex justify-center')}><StoreBadges badges={store.badges} sellerType={store.sellerType} /></div>}
              {store.description && bannerLayout !== 'compact' && (
                <p className={clsx('text-[12px] sm:text-[13px] text-[rgba(255,255,255,0.75)] mt-[8px] mb-[10px]', descriptionClampCls || 'line-clamp-2')}>{store.description}</p>
              )}
              <div className={clsx('flex items-center gap-[5px] text-[12px] text-[rgba(255,255,255,0.7)] mt-[6px]', bannerLayout === 'immersive' && 'justify-center')}>
                {showRating && (store.reviewCount ?? 0) > 0 && (
                  <>
                    <Star size={13} className="fill-current" style={{ color: cfg.primaryColor }} />
                    <span>{store.averageRating.toFixed(1)} ({store.reviewCount.toLocaleString()} reviews)</span>
                    <span className="mx-1">·</span>
                  </>
                )}
                {showFollowerCount && (
                  <>
                    <Users size={13} />
                    <span>{store.followersCount.toLocaleString()} followers</span>
                  </>
                )}
                {showProductCount && (
                  <>
                    <span className="mx-1">·</span>
                    <span>{total} products</span>
                  </>
                )}
              </div>
            </div>

            <div className={clsx('flex flex-wrap gap-2 items-center justify-center shrink-0', bannerLayout === 'immersive' ? 'sm:flex-row' : 'sm:flex-col sm:items-end')}>
              {showMembership && plans.length > 0 && (
                <button onClick={() => document.getElementById('store-membership')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ borderRadius: cfg.buttonRadiusPx }}
                  className="flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors bg-white text-charcoal border border-white hover:bg-[rgba(255,255,255,0.9)] whitespace-nowrap">
                  <RefreshCw size={13} style={{ color: cfg.primaryColor }} /> Membership
                </button>
              )}
              {showLoyaltyBtn && isLoggedIn && loyalty && (
                <button onClick={openRewards}
                  style={{ borderRadius: cfg.buttonRadiusPx }}
                  className="flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors bg-white text-charcoal border border-white hover:bg-[rgba(255,255,255,0.9)] whitespace-nowrap">
                  <Gift size={13} style={{ color: cfg.primaryColor }} /> {loyalty.pointsBalance.toLocaleString()} points
                </button>
              )}
              {giftCardSettings?.purchaseEnabled && (
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
                  {followError && <p className="text-[11px] text-white bg-black/30 rounded-md px-2 py-1 max-w-[220px] text-center sm:text-right">{followError}</p>}
                </>
              )}

              {showMessage && (
                <>
                  <button onClick={handleMessage} disabled={msgLoading}
                    style={{ borderRadius: cfg.buttonRadiusPx }}
                    className="flex items-center gap-[6px] px-[14px] py-[7px] text-[13px] font-medium cursor-pointer transition-colors bg-white text-charcoal border border-white hover:bg-[rgba(255,255,255,0.9)] whitespace-nowrap">
                    {msgLoading ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />} Message
                  </button>
                  {msgError && <p className="text-[11px] text-white bg-black/30 rounded-md px-2 py-1 max-w-[220px] text-center sm:text-right">{msgError}</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </CoverImage>

      {/* ── Seller-composed sections ───────────────────────────────────────── */}
      {homePage && <SectionRenderer sections={homePage.sections} />}

      {/* ── Store Membership ───────────────────────────────────────────────── */}
      {showMembership && plans.length > 0 && (
        <div id="store-membership" className="border-t border-bone py-10 px-4 sm:px-6 lg:px-10" style={{ background: cfg.bgColor }}>
          <div className="max-w-[900px] mx-auto text-center mb-8">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.12em] rounded-full px-3 py-1 mb-3" style={{ color: cfg.primaryColor, background: `${cfg.primaryColor}18` }}>
              Store Membership
            </span>
            <h2 className="text-[22px] sm:text-[26px] font-bold mb-2" style={{ color: cfg.textColor }}>Shop {store.name} for less, every time</h2>
            <p className="text-[13px] text-slate max-w-[520px] mx-auto">Join once and member pricing applies automatically on every visit — no codes to remember. Cancel anytime.</p>

            {plans.some(p => p.yearlyPriceUSD != null) && (
              <div className="inline-flex items-center gap-1 mt-5 bg-white rounded-full p-1 border border-bone">
                {(['monthly', 'yearly'] as const).map(iv => (
                  <button key={iv} onClick={() => setBillingInterval(iv)}
                    className="px-4 py-[7px] rounded-full text-[12px] font-semibold cursor-pointer border-none capitalize transition-colors"
                    style={{ background: billingInterval === iv ? cfg.primaryColor : 'transparent', color: billingInterval === iv ? '#fff' : cfg.textColor }}>
                    {iv}{iv === 'yearly' && ' · save more'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {subscribedMsg && <div className="max-w-[520px] mx-auto mb-6 px-4 py-3 rounded-lg bg-success-bg text-success text-[13px] font-medium text-center">{subscribedMsg}</div>}
          {subscribeError && <div className="max-w-[520px] mx-auto mb-6 px-4 py-3 rounded-lg bg-error-bg text-error text-[13px] font-medium text-center">{subscribeError}</div>}

          <div className={clsx('grid gap-5 max-w-[960px] mx-auto', plans.length === 1 ? 'grid-cols-1 max-w-[380px]' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
            {plans.map((plan, idx) => {
              const price = billingInterval === 'yearly' && plan.displayYearlyPrice != null ? plan.displayYearlyPrice : plan.displayMonthlyPrice;
              const bullets = (plan.benefits ?? []).map(benefitLabel).filter(Boolean) as string[];
              const isPopular = idx === Math.min(1, plans.length - 1) && plans.length > 1;
              return (
                <div key={plan._id} className="relative bg-white rounded-2xl p-6 flex flex-col" style={{ border: isPopular ? `2px solid ${cfg.primaryColor}` : '1px solid #E8E6DC' }}>
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: cfg.primaryColor }}>
                      Most Popular
                    </span>
                  )}
                  <p className="text-[16px] font-bold text-carbon mb-1">{plan.name}</p>
                  {plan.description && <p className="text-[12px] text-slate mb-4">{plan.description}</p>}
                  <div className="mb-4">
                    <span className="text-[32px] font-bold" style={{ color: cfg.textColor }}>{displaySymbol}{convert(price, plan.displayCurrency).toLocaleString()}</span>
                    <span className="text-[12px] text-slate">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                  </div>
                  <ul className="flex flex-col gap-2 mb-6 p-0 list-none flex-1">
                    {(bullets.length > 0 ? bullets : plan.features ?? []).map(b => (
                      <li key={b} className="flex items-start gap-2 text-[12.5px] text-graphite">
                        <Check size={13} className="mt-[2px] shrink-0" style={{ color: cfg.primaryColor }} />{b}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan, billingInterval === 'yearly' && plan.yearlyPriceUSD != null ? 'yearly' : 'monthly')}
                    disabled={subscribingId === plan._id}
                    className="w-full py-[11px] rounded-xl text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-50 transition-opacity"
                    style={{ background: cfg.primaryColor }}>
                    {subscribingId === plan._id ? 'Subscribing…' : 'Become a Member'}
                  </button>
                  <p className="text-[10.5px] text-slate text-center mt-2">Cancel anytime — no long-term commitment</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showRewards && (
        <Modal title="Rewards Catalog" onClose={() => { setShowRewards(false); setRedeemedVoucher(null); }}>
          {redeemedVoucher && (
            <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-3 mb-4">
              <div>
                <p className="text-[12.5px] font-semibold text-emerald-800">Reward redeemed! Apply this code at checkout:</p>
                <p className="text-[15px] font-mono font-bold text-emerald-900 tracking-wide">{redeemedVoucher.code}</p>
                <p className="text-[10.5px] text-emerald-700">Valid until {new Date(redeemedVoucher.expiresAt).toLocaleDateString()}</p>
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
                      <p className="text-[11px] text-slate">
                        {r.pointsCost.toLocaleString()} points — {r.type === 'fixed_discount' ? `${displaySymbol}${convert(r.discountValue ?? 0, store.baseCurrency).toLocaleString()} off` : 'Free product'}
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
                      {currencySymbol(giftCardSettings.currency)}{d}
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
