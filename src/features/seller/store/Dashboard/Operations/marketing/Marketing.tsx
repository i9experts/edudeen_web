import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Tag as TagIcon, Mail, ShoppingCart, Handshake, Gift, Megaphone, Building2, User, Image as ImageIcon, Pause, Play, Trash2, Plus, Star, Bell, ArrowUp, ArrowDown, Rocket, X, Percent, type LucideIcon } from 'lucide-react';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox, Modal, Button, Input, FileDropSelect } from '@/components/comman/ui';
import { StripeCardPayment, isStripeConfigured } from '@/features/buyer/components/StripeCardPayment';
import { currencySymbol } from '@/utils/currency';
import {
  apiGetCoupons, apiCreateCoupon, apiUpdateCoupon, apiDeleteCoupon,
  apiGetJoinableCampaigns, apiJoinCampaign, apiLeaveCampaign,
  type Coupon, type DiscountType, type JoinableCampaign,
} from '@/api/services/marketing';
import {
  apiGetStoreBanners, apiCreateStoreBanner, apiPauseStoreBanner, apiResumeStoreBanner, apiDeleteStoreBanner,
  STORE_BANNER_TYPES, STORE_BANNER_LINK_TYPES,
  type StoreBanner, type StoreBannerType, type StoreBannerLinkType,
} from '@/api/services/storeBanner';
import { apiUpdatePinnedProducts, apiUpdateAnnouncementBar, type StoreAnnouncementType } from '@/api/services/store';
import { apiGetStoreInventory, type InventoryProduct } from '@/api/services/product';
import { SELECTABLE_PROMOTION_PLACEMENTS, type PromotionPlacement } from '@/api/services/banner';
import {
  apiPreviewPromotionPrice, apiListPromotionRequests, apiCreatePromotionRequest, apiPayPromotionRequest, apiConfirmPromotionPayment, apiCancelPromotionRequest,
  apiGetSellerPromotionAnalytics,
  type PromotionRequest, type PromotionPriceBreakdown, type PromotionAnalyticsData,
} from '@/api/services/promotions';
import {
  apiGetGiftCardSettings, apiUpdateGiftCardSettings, apiIssueGiftCard, apiListGiftCards, apiDisableGiftCard,
  type GiftCardSettings, type GiftCard,
} from '@/api/services/giftCards';
import {
  apiCreateDiscount, apiGetDiscounts, apiUpdateDiscount, apiDeleteDiscount,
  type AutomaticDiscount, type DiscountType as AutoDiscountType, type DiscountTarget,
} from '@/api/services/discounts';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';

type Tab = 'banners' | 'featured' | 'announcement' | 'promotions' | 'coupons' | 'discounts' | 'platform' | 'email' | 'cart' | 'affiliate' | 'giftcards';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'banners',      label: 'Store Banners',  Icon: ImageIcon    },
  { id: 'featured',     label: 'Featured & Collections', Icon: Star },
  { id: 'announcement', label: 'Announcement Bar', Icon: Bell },
  { id: 'promotions',   label: 'Promotion Requests', Icon: Rocket },
  { id: 'coupons',   label: 'Coupons',        Icon: TagIcon      },
  { id: 'discounts', label: 'Discounts',      Icon: Percent      },
  { id: 'platform',  label: 'Platform Sales', Icon: Megaphone    },
  { id: 'email',     label: 'Email Campaigns', Icon: Mail         },
  { id: 'cart',      label: 'Abandoned Cart',  Icon: ShoppingCart },
  { id: 'affiliate', label: 'Affiliate',       Icon: Handshake    },
  { id: 'giftcards', label: 'Gift Cards',      Icon: Gift         },
];

const PLACEMENT_LABEL: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero', marketplaceHero: 'Marketplace Hero', educationHero: 'Education Marketplace Hero', categoryHero: 'Category Hero',
};

const PROMOTION_STATUS_STYLE: Record<PromotionRequest['status'], { bg: string; color: string; label: string }> = {
  draft:     { bg: '#F0EEE6', color: '#5A5852', label: 'Draft' },
  pending:   { bg: '#FDF3E7', color: '#9A6A17', label: 'Pending Review' },
  approved:  { bg: '#EAF1FB', color: '#1D5EAE', label: 'Approved — Pay to Publish' },
  rejected:  { bg: '#FBEAEA', color: '#B3261E', label: 'Rejected' },
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Live' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#F0EEE6', color: '#5A5852', label: 'Ended' },
  cancelled: { bg: '#F0EEE6', color: '#5A5852', label: 'Cancelled' },
};

const ANNOUNCEMENT_TYPES: StoreAnnouncementType[] = ['info', 'sale', 'coupon', 'warning', 'shipping', 'holiday'];

const BANNER_TYPE_LABEL: Record<StoreBannerType, string> = {
  hero: 'Hero', promotion: 'Promotion', season: 'Season', collection: 'Collection', video: 'Video',
};

const BANNER_STATUS_STYLE: Record<StoreBanner['status'], { bg: string; color: string; label: string }> = {
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Active' },
  scheduled: { bg: '#EAF1FB', color: '#1D5EAE', label: 'Scheduled' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#F0EEE6', color: '#5A5852', label: 'Expired' },
  draft:     { bg: '#F0EEE6', color: '#5A5852', label: 'Draft' },
};

const emptyBannerForm = {
  type: 'hero' as StoreBannerType,
  ctaLabel: '',
  linkType: 'external' as StoreBannerLinkType,
  linkTarget: '',
  startAt: '',
  endAt: '',
};

// ── Store Banner create modal ──────────────────────────────────────────────────
function StoreBannerFormModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(emptyBannerForm);
  const [file, setFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!file) { setError('Please choose a banner image.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiCreateStoreBanner(storeId, {
        type: form.type,
        ctaLabel: form.ctaLabel || undefined,
        linkType: form.linkType,
        linkTarget: form.linkTarget || undefined,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
      }, file, mobileFile ?? undefined);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store banner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add Store Banner"
      onClose={onClose}
      mobileSheet
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Add Banner</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Desktop Image</label>
          <FileDropSelect value={file} onChange={setFile} label="Click to upload desktop banner" />
          <p className="mt-1.5 text-[11px] text-slate/70">
            Recommended: 2560×720px (minimum 1280px wide) — renders full-width on desktop, so anything narrower will look blurry.
          </p>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Mobile Image (optional)</label>
          <FileDropSelect value={mobileFile} onChange={setMobileFile} label="Click to upload mobile banner" />
          <p className="mt-1.5 text-[11px] text-slate/70">Recommended: 1440×600px (minimum 640px wide).</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as StoreBannerType }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              {STORE_BANNER_TYPES.map(t => <option key={t} value={t}>{BANNER_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Link Type</label>
            <select value={form.linkType} onChange={e => setForm(f => ({ ...f, linkType: e.target.value as StoreBannerLinkType }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              {STORE_BANNER_LINK_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">CTA Label (optional)</label>
            <input value={form.ctaLabel} onChange={e => setForm(f => ({ ...f, ctaLabel: e.target.value }))} placeholder="Shop Now"
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Link Target</label>
            <input value={form.linkTarget} onChange={e => setForm(f => ({ ...f, linkTarget: e.target.value }))}
              placeholder={form.linkType === 'external' ? 'https://…' : 'Product/category/collection id'}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Starts (optional)</label>
            <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Ends (optional)</label>
            <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

const emptyForm = { code: '', discountType: '' as DiscountType | '', value: '', minOrder: '', usageLimit: '', expiryDate: '' };

const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50';

// ── Promotion Request create modal ─────────────────────────────────────────────
// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not a raw ISO/UTC string.
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DURATION_UNITS: { value: 'hours' | 'days' | 'weeks' | 'months'; label: string; inHours: number }[] = [
  { value: 'hours', label: 'Hours', inHours: 1 },
  { value: 'days', label: 'Days', inHours: 24 },
  { value: 'weeks', label: 'Weeks', inHours: 24 * 7 },
  { value: 'months', label: 'Months', inHours: 24 * 30 },
];

function PromotionRequestFormModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => void }) {
  const [placement, setPlacement] = useState<PromotionPlacement>('marketplaceHero');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [durationValue, setDurationValue] = useState('');
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days' | 'weeks' | 'months'>('hours');

  function applyDuration(value: string, unit: typeof durationUnit) {
    setDurationValue(value);
    setDurationUnit(unit);
    const n = Number(value);
    if (!value || Number.isNaN(n) || n <= 0) return;
    const unitHours = DURATION_UNITS.find(u => u.value === unit)!.inHours;
    const start = startAt ? new Date(startAt) : new Date();
    const end = new Date(start.getTime() + n * unitHours * 60 * 60 * 1000);
    if (!startAt) setStartAt(toDatetimeLocalValue(start));
    setEndAt(toDatetimeLocalValue(end));
  }
  const [ctaLabel, setCtaLabel] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PromotionPriceBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!startAt || !endAt) { setPreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError('');
    apiPreviewPromotionPrice(storeId, placement, new Date(startAt).toISOString(), new Date(endAt).toISOString())
      .then(res => { if (!cancelled) setPreview(res.data); })
      .catch(err => { if (!cancelled) setPreviewError(err instanceof Error ? err.message : 'Failed to price this window.'); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, placement, startAt, endAt]);

  async function submit() {
    if (!file) { setError('Please choose a creative image.'); return; }
    if (!startAt || !endAt) { setError('Please choose a start and end date.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiCreatePromotionRequest(storeId, {
        placement,
        ctaLabel: ctaLabel || undefined,
        linkType: 'external',
        linkTarget: linkTarget || undefined,
        message: message || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      }, file, mobileFile ?? undefined);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit promotion request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Request a Platform Promotion"
      onClose={onClose}
      mobileSheet
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Submit for Review</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Placement</label>
          <select value={placement} onChange={e => setPlacement(e.target.value as PromotionPlacement)}
            className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
            {SELECTABLE_PROMOTION_PLACEMENTS.map(p => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Duration (optional — fills in Ends for you)</label>
          <div className="flex gap-2">
            <input
              type="number" min={1} placeholder="e.g. 5" value={durationValue}
              onChange={e => applyDuration(e.target.value, durationUnit)}
              className="w-24 px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
            />
            <select
              value={durationUnit}
              onChange={e => applyDuration(durationValue, e.target.value as typeof durationUnit)}
              className="flex-1 px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
            >
              {DURATION_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-slate mt-1.5">Any number of hours/days/weeks/months — pricing matches whichever unit fits the window. Or skip this and pick exact Start/End below.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Starts" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          <Input label="Ends" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
        </div>

        {previewLoading && <p className="text-[12px] text-slate">Pricing this window…</p>}
        {previewError && <p className="text-[12px] text-error">{previewError}</p>}
        {preview && (
          <div className="bg-cream rounded-lg px-3.5 py-3 flex items-center justify-between">
            <span className="text-[12px] text-slate">
              {preview.unit === 'festival' ? `Festival rate (${preview.festivalName})` : `${preview.unit} rate, ${preview.hours.toFixed(1)}h`}
            </span>
            <span className="text-[16px] font-bold text-charcoal">${preview.priceUSD.toFixed(2)}</span>
          </div>
        )}

        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Creative Image</label>
          <FileDropSelect value={file} onChange={setFile} label="Click to upload creative" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Mobile Creative (optional)</label>
          <FileDropSelect value={mobileFile} onChange={setMobileFile} label="Click to upload mobile creative" />
        </div>
        <Input label="CTA Label (optional)" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Shop Now" />
        <Input label="Link (optional)" value={linkTarget} onChange={e => setLinkTarget(e.target.value)} placeholder="https://…" />
        <Input label="Note to admin (optional)" value={message} onChange={e => setMessage(e.target.value)} placeholder="Anything the reviewer should know" />
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Promotion Request payment modal ────────────────────────────────────────────
function PromotionPaymentModal({ request, onClose, onPaid }: { request: PromotionRequest; onClose: () => void; onPaid: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  // Unique per modal open (not just per request) — a fixed key would let one
  // interrupted attempt permanently lock out every future retry for this
  // same request via the backend's IdempotencyInterceptor ("already being
  // processed" forever). Stripe's own idempotency key (server-side, keyed on
  // request id + amount) is what actually prevents a duplicate charge, so
  // this one is free to be attempt-scoped.
  const [idempotencyKey] = useState(() => `promo-pay-${request._id}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    apiPayPromotionRequest(request._id, idempotencyKey)
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to start payment.'));
  }, [request._id, idempotencyKey]);

  async function handleConfirmed() {
    setConfirming(true);
    // Verify + activate right away instead of waiting on the Stripe webhook —
    // in local dev the webhook only arrives if Stripe CLI is forwarding to
    // this machine, and either way this is a strictly better UX than waiting.
    // Safe even if the webhook also later fires for the same payment.
    await apiConfirmPromotionPayment(request._id).catch(() => {});
    setConfirming(false);
    onPaid();
  }

  return (
    <Modal title={`Pay for ${PLACEMENT_LABEL[request.placement]}`} onClose={onClose} mobileSheet>
      {!isStripeConfigured() ? (
        <p className="text-[13px] text-slate">Online payments aren't configured yet.</p>
      ) : error ? (
        <p className="text-[13px] text-error">{error}</p>
      ) : !clientSecret ? (
        <p className="text-[13px] text-slate">Preparing payment…</p>
      ) : confirming ? (
        <p className="text-[13px] text-slate">Payment received — activating your promotion…</p>
      ) : (
        <StripeCardPayment clientSecret={clientSecret} amount={request.priceUSD} currency="usd" onConfirmed={handleConfirmed} />
      )}
    </Modal>
  );
}

export function StoreMarketing() {
  usePageTitle('Marketing');
  const { store, storeId } = useStoreWorkspace();
  const [tab, setTab] = useState<Tab>('coupons');

  // Featured & Collections (pinned products)
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedSaving, setPinnedSaving] = useState(false);
  const [pinnedError, setPinnedError] = useState('');
  const [pinnedSaved, setPinnedSaved] = useState(false);

  useEffect(() => {
    if (!storeId || tab !== 'featured') return;
    setPinnedIds(store?.pinnedProductIds ?? []);
    setInventoryLoading(true);
    apiGetStoreInventory(storeId, 1, 100)
      .then(res => setInventory(res.data.products ?? []))
      .catch(() => {})
      .finally(() => setInventoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, tab]);

  function togglePin(productId: string) {
    setPinnedSaved(false);
    setPinnedIds(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  }

  function movePinned(index: number, dir: -1 | 1) {
    setPinnedSaved(false);
    setPinnedIds(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function savePinnedProducts() {
    setPinnedSaving(true);
    setPinnedError('');
    try {
      await apiUpdatePinnedProducts(storeId, pinnedIds);
      setPinnedSaved(true);
    } catch (err) {
      setPinnedError(err instanceof Error ? err.message : 'Failed to save featured products.');
    } finally {
      setPinnedSaving(false);
    }
  }

  // Announcement Bar
  const [announcement, setAnnouncement] = useState({
    message: '', type: 'info' as StoreAnnouncementType, ctaLabel: '', ctaLink: '', isActive: false, startAt: '', endAt: '',
  });
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [announcementSaved, setAnnouncementSaved] = useState(false);

  useEffect(() => {
    if (tab !== 'announcement' || !store?.announcementBar) return;
    const bar = store.announcementBar;
    setAnnouncement({
      message: bar.message ?? '',
      type: bar.type ?? 'info',
      ctaLabel: bar.ctaLabel ?? '',
      ctaLink: bar.ctaLink ?? '',
      isActive: bar.isActive ?? false,
      startAt: bar.startAt ? bar.startAt.slice(0, 16) : '',
      endAt: bar.endAt ? bar.endAt.slice(0, 16) : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, store?.announcementBar]);

  async function saveAnnouncement() {
    setAnnouncementSaving(true);
    setAnnouncementError('');
    setAnnouncementSaved(false);
    try {
      await apiUpdateAnnouncementBar(storeId, {
        message: announcement.message || null,
        type: announcement.type,
        ctaLabel: announcement.ctaLabel || null,
        ctaLink: announcement.ctaLink || null,
        isActive: announcement.isActive,
        startAt: announcement.startAt ? new Date(announcement.startAt).toISOString() : null,
        endAt: announcement.endAt ? new Date(announcement.endAt).toISOString() : null,
      });
      setAnnouncementSaved(true);
    } catch (err) {
      setAnnouncementError(err instanceof Error ? err.message : 'Failed to save announcement bar.');
    } finally {
      setAnnouncementSaving(false);
    }
  }

  // Store Banners
  const [storeBanners, setStoreBanners] = useState<StoreBanner[]>([]);
  const [storeBannersLoading, setStoreBannersLoading] = useState(true);
  const [storeBannersError, setStoreBannersError] = useState('');
  const [addingBanner, setAddingBanner] = useState(false);
  const [bannerBusyId, setBannerBusyId] = useState<string | null>(null);

  function refetchStoreBanners() {
    if (!storeId) return;
    setStoreBannersLoading(true);
    apiGetStoreBanners(storeId)
      .then(res => setStoreBanners(res.data ?? []))
      .catch(err => setStoreBannersError(err instanceof Error ? err.message : 'Failed to load store banners.'))
      .finally(() => setStoreBannersLoading(false));
  }

  useEffect(() => {
    if (!storeId || tab !== 'banners') return;
    refetchStoreBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, tab]);

  // Promotion Requests
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [promotionsError, setPromotionsError] = useState('');
  const [addingPromotion, setAddingPromotion] = useState(false);
  const [payingRequest, setPayingRequest] = useState<PromotionRequest | null>(null);
  const [promotionBusyId, setPromotionBusyId] = useState<string | null>(null);

  function refetchPromotionRequests() {
    if (!storeId) return;
    setPromotionsLoading(true);
    apiListPromotionRequests(storeId)
      .then(res => setPromotionRequests(res.data ?? []))
      .catch(err => setPromotionsError(err instanceof Error ? err.message : 'Failed to load promotion requests.'))
      .finally(() => setPromotionsLoading(false));
  }

  useEffect(() => {
    if (!storeId || tab !== 'promotions') return;
    refetchPromotionRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, tab]);

  const [promotionAnalytics, setPromotionAnalytics] = useState<PromotionAnalyticsData | null>(null);

  useEffect(() => {
    if (!storeId || tab !== 'promotions') return;
    apiGetSellerPromotionAnalytics(storeId).then(res => setPromotionAnalytics(res.data)).catch(() => {});
  }, [storeId, tab]);

  async function cancelPromotionRequest(r: PromotionRequest) {
    setPromotionBusyId(r._id);
    try {
      await apiCancelPromotionRequest(r._id);
      refetchPromotionRequests();
    } catch {
      // best-effort
    } finally {
      setPromotionBusyId(null);
    }
  }

  async function toggleBannerPause(b: StoreBanner) {
    setBannerBusyId(b._id);
    try {
      if (b.status === 'paused') await apiResumeStoreBanner(storeId, b._id);
      else await apiPauseStoreBanner(storeId, b._id);
      refetchStoreBanners();
    } catch {
      // best-effort — button just stays as-is on failure
    } finally {
      setBannerBusyId(null);
    }
  }

  async function removeBanner(b: StoreBanner) {
    setBannerBusyId(b._id);
    try {
      await apiDeleteStoreBanner(storeId, b._id);
      setStoreBanners(prev => prev.filter(x => x._id !== b._id));
    } catch {
      // best-effort
    } finally {
      setBannerBusyId(null);
    }
  }

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    apiGetCoupons(storeId)
      .then(res => setCoupons(res.data.coupons ?? []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load coupons.'))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Platform-wide sale campaigns (admin-created) this store can opt into
  const [campaigns, setCampaigns] = useState<JoinableCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');
  const [campaignBusyId, setCampaignBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || tab !== 'platform') return;
    setCampaignsLoading(true);
    apiGetJoinableCampaigns(storeId)
      .then(res => setCampaigns(res.data ?? []))
      .catch(err => setCampaignsError(err instanceof Error ? err.message : 'Failed to load campaigns.'))
      .finally(() => setCampaignsLoading(false));
  }, [storeId, tab]);

  async function toggleCampaign(campaign: JoinableCampaign) {
    setCampaignBusyId(campaign._id);
    setCampaignsError('');
    try {
      if (campaign.isJoined) await apiLeaveCampaign(storeId, campaign._id);
      else await apiJoinCampaign(storeId, campaign._id);
      setCampaigns(prev => prev.map(c => c._id === campaign._id ? { ...c, isJoined: !c.isJoined } : c));
    } catch (err) {
      setCampaignsError(err instanceof Error ? err.message : 'Failed to update campaign.');
    } finally {
      setCampaignBusyId(null);
    }
  }

  function startEdit(c: Coupon) {
    setEditingId(c._id);
    setForm({
      code: c.code,
      discountType: c.discountType,
      value: String(c.discountValue),
      minOrder: c.minOrderAmount != null ? String(c.minOrderAmount) : '',
      usageLimit: c.usageLimit != null ? String(c.usageLimit) : '',
      expiryDate: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
    });
  }

  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function togglePause(c: Coupon) {
    setError('');
    try {
      const res = await apiUpdateCoupon(storeId, c._id, { isActive: !c.isActive });
      setCoupons(prev => prev.map(x => x._id === c._id ? res.data : x));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update coupon.');
    }
  }

  async function handleSubmit() {
    if (!form.code || !form.discountType || !form.value) return;
    setError('');
    const payload = {
      code: form.code,
      discountType: form.discountType as DiscountType,
      discountValue: Number(form.value),
      minOrderAmount: form.minOrder ? Number(form.minOrder) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      expiresAt: form.expiryDate || undefined,
    };
    try {
      if (editingId) {
        const res = await apiUpdateCoupon(storeId, editingId, payload);
        setCoupons(prev => prev.map(c => c._id === editingId ? res.data : c));
      } else {
        const res = await apiCreateCoupon(storeId, payload);
        setCoupons(prev => [res.data, ...prev]);
      }
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save coupon.');
    }
  }

  // ── Gift Cards ────────────────────────────────────────────────────────────
  const [giftCardSettings, setGiftCardSettings] = useState<GiftCardSettings | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [giftCardsLoading, setGiftCardsLoading] = useState(true);
  const [giftCardsError, setGiftCardsError] = useState('');
  const [giftCardSettingsBusy, setGiftCardSettingsBusy] = useState(false);
  const [denominationsInput, setDenominationsInput] = useState('');
  const [issueForm, setIssueForm] = useState({ value: '', recipientEmail: '', recipientName: '', message: '' });
  const [issueBusy, setIssueBusy] = useState(false);
  const [giftCardDisableBusyId, setGiftCardDisableBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || tab !== 'giftcards') return;
    setGiftCardsLoading(true);
    setGiftCardsError('');
    Promise.all([apiGetGiftCardSettings(storeId), apiListGiftCards(storeId, { limit: 50 })])
      .then(([settingsRes, listRes]) => {
        setGiftCardSettings(settingsRes.data);
        setDenominationsInput(settingsRes.data.denominations.join(', '));
        setGiftCards(listRes.data.items ?? []);
      })
      .catch(err => setGiftCardsError(err instanceof Error ? err.message : 'Failed to load gift cards.'))
      .finally(() => setGiftCardsLoading(false));
  }, [storeId, tab]);

  async function saveGiftCardSettings(patch: Partial<GiftCardSettings>) {
    if (!giftCardSettings) return;
    setGiftCardSettingsBusy(true);
    setGiftCardsError('');
    try {
      const res = await apiUpdateGiftCardSettings(storeId, patch);
      setGiftCardSettings(res.data);
      setDenominationsInput(res.data.denominations.join(', '));
    } catch (err) {
      setGiftCardsError(err instanceof Error ? err.message : 'Failed to update gift card settings.');
    } finally {
      setGiftCardSettingsBusy(false);
    }
  }

  function saveDenominations() {
    const values = denominationsInput.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (values.length === 0) return;
    saveGiftCardSettings({ denominations: values });
  }

  async function handleIssueGiftCard() {
    if (!issueForm.value || Number(issueForm.value) <= 0) return;
    setIssueBusy(true);
    setGiftCardsError('');
    try {
      const res = await apiIssueGiftCard(storeId, {
        value: Number(issueForm.value),
        recipientEmail: issueForm.recipientEmail || undefined,
        recipientName: issueForm.recipientName || undefined,
        message: issueForm.message || undefined,
      });
      setGiftCards(prev => [res.data, ...prev]);
      setIssueForm({ value: '', recipientEmail: '', recipientName: '', message: '' });
    } catch (err) {
      setGiftCardsError(err instanceof Error ? err.message : 'Failed to issue gift card.');
    } finally {
      setIssueBusy(false);
    }
  }

  async function disableGiftCard(giftCard: GiftCard) {
    setGiftCardDisableBusyId(giftCard._id);
    try {
      const res = await apiDisableGiftCard(storeId, giftCard._id);
      setGiftCards(prev => prev.map(g => g._id === giftCard._id ? res.data : g));
    } catch (err) {
      setGiftCardsError(err instanceof Error ? err.message : 'Failed to disable gift card.');
    } finally {
      setGiftCardDisableBusyId(null);
    }
  }

  // ── Automatic Discounts ───────────────────────────────────────────────────
  const emptyDiscountForm = {
    name: '', discountType: 'percentage' as AutoDiscountType, value: '',
    target: 'store' as DiscountTarget, categoryIds: [] as string[], productIds: [] as string[],
    minOrderAmount: '', startsAt: '', endsAt: '',
  };
  const [discounts, setDiscounts] = useState<AutomaticDiscount[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [discountsError, setDiscountsError] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountBusyId, setDiscountBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || tab !== 'discounts') return;
    setDiscountsLoading(true);
    setDiscountsError('');
    Promise.all([apiGetDiscounts(storeId), apiGetCategoryTree(), apiGetStoreInventory(storeId, 1, 100)])
      .then(([discRes, catRes, invRes]) => {
        setDiscounts(discRes.data ?? []);
        setCategoryTree(catRes.data ?? []);
        setInventory(invRes.data.products ?? []);
      })
      .catch(err => setDiscountsError(err instanceof Error ? err.message : 'Failed to load discounts.'))
      .finally(() => setDiscountsLoading(false));
  }, [storeId, tab]);

  function flattenCategories(nodes: CategoryNode[], depth = 0): { _id: string; name: string; depth: number }[] {
    return nodes.flatMap(n => [{ _id: n._id, name: n.name, depth }, ...flattenCategories(n.children ?? [], depth + 1)]);
  }
  const flatCategories = flattenCategories(categoryTree);

  async function handleCreateDiscount() {
    if (!discountForm.name || !discountForm.value) return;
    if (discountForm.target === 'category' && discountForm.categoryIds.length === 0) return;
    if (discountForm.target === 'products' && discountForm.productIds.length === 0) return;
    setDiscountSaving(true);
    setDiscountsError('');
    try {
      const res = await apiCreateDiscount(storeId, {
        name: discountForm.name,
        discountType: discountForm.discountType,
        discountValue: Number(discountForm.value),
        target: discountForm.target,
        categoryIds: discountForm.target === 'category' ? discountForm.categoryIds : undefined,
        productIds: discountForm.target === 'products' ? discountForm.productIds : undefined,
        minOrderAmount: discountForm.minOrderAmount ? Number(discountForm.minOrderAmount) : undefined,
        startsAt: discountForm.startsAt || undefined,
        endsAt: discountForm.endsAt || undefined,
      });
      setDiscounts(prev => [res.data, ...prev]);
      setDiscountForm(emptyDiscountForm);
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : 'Failed to create discount.');
    } finally {
      setDiscountSaving(false);
    }
  }

  async function toggleDiscount(d: AutomaticDiscount) {
    setDiscountBusyId(d._id);
    try {
      const res = await apiUpdateDiscount(storeId, d._id, { isActive: !d.isActive });
      setDiscounts(prev => prev.map(x => x._id === d._id ? res.data : x));
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : 'Failed to update discount.');
    } finally {
      setDiscountBusyId(null);
    }
  }

  async function removeDiscount(d: AutomaticDiscount) {
    setDiscountBusyId(d._id);
    try {
      await apiDeleteDiscount(storeId, d._id);
      setDiscounts(prev => prev.filter(x => x._id !== d._id));
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : 'Failed to delete discount.');
    } finally {
      setDiscountBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingCoupon) return;
    setDeleteBusy(true);
    setError('');
    try {
      await apiDeleteCoupon(storeId, deletingCoupon._id);
      setCoupons(prev => prev.filter(c => c._id !== deletingCoupon._id));
      setDeletingCoupon(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete coupon.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const activeCount = coupons.filter(c => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usageCount, 0);

  return (
    <>
      <StorePageHeader
        title="Marketing"
        subtitle="Drive traffic, recover sales, and reward customers."
      />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">

        {/* Metrics — coupon numbers are real; email/cart features below have no backend yet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">Active Coupons</p>
            <p className="text-[28px] font-bold text-carbon leading-[1.15]">{activeCount}</p>
          </div>
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">Total Redemptions</p>
            <p className="text-[28px] font-bold text-carbon leading-[1.15]">{totalRedemptions}</p>
          </div>
        </div>

        {/* Tab bar — horizontally scrollable so 9 tabs never wrap/get cut off on narrower screens */}
        <div className="border-b border-bone overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 w-max">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 shrink-0 whitespace-nowrap px-3 sm:px-4 py-2.5 text-[13px] font-medium cursor-pointer border-none bg-transparent -mb-px transition-colors duration-150 hover:text-brand-orange rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                style={{ borderBottom: `2px solid ${tab === t.id ? '#D97757' : 'transparent'}`, color: tab === t.id ? '#D97757' : '#8C8A82' }}
              >
                <t.Icon size={14} className="shrink-0" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Store Banners Tab */}
        {tab === 'banners' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-carbon">Store Banners</p>
                <p className="text-[12.5px] text-slate mt-0.5">
                  Hero, promotion, season, collection, and (coming soon) video banners for your storefront.
                </p>
              </div>
              <Button icon={<Plus size={14} />} onClick={() => setAddingBanner(true)}>Add Banner</Button>
            </div>

            {storeBannersError && <p className="text-xs text-error">{storeBannersError}</p>}

            {storeBannersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={160} rounded="10px" />)}
              </div>
            ) : storeBanners.length === 0 ? (
              <EmptyState
                icon={<ImageIcon size={28} className="text-brand-orange opacity-55" />}
                title="No store banners yet"
                description="Add a hero banner to make your storefront feel professional."
                action={{ label: 'Add Banner', onClick: () => setAddingBanner(true), icon: <Plus size={14} /> }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...storeBanners].sort((a, b) => b.priority - a.priority || a.order - b.order).map(b => {
                  const st = BANNER_STATUS_STYLE[b.status] ?? BANNER_STATUS_STYLE.draft;
                  return (
                    <div key={b._id} className="bg-white border border-bone rounded-[10px] overflow-hidden flex flex-col transition-colors duration-200 hover:border-brand-orange/25">
                      <div className="aspect-[16/9] bg-cream">
                        <img loading="lazy" decoding="async" src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 flex flex-col gap-2 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="px-[8px] py-[2px] rounded-[5px] text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          <span className="text-[11px] text-slate">{BANNER_TYPE_LABEL[b.type]}</span>
                        </div>
                        {b.ctaLabel && <p className="text-[12px] text-charcoal font-medium truncate">{b.ctaLabel}</p>}
                        <div className="flex items-center gap-2 mt-auto pt-2">
                          <button onClick={() => toggleBannerPause(b)} disabled={bannerBusyId === b._id}
                            className="flex-1 px-[10px] py-[6px] rounded-[6px] text-[11px] font-medium text-charcoal bg-cream border border-bone cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-bone disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                            {b.status === 'paused' ? <Play size={11} /> : <Pause size={11} />} {b.status === 'paused' ? 'Resume' : 'Pause'}
                          </button>
                          <button onClick={() => removeBanner(b)} disabled={bannerBusyId === b._id}
                            className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-medium text-error bg-error-bg border border-error-border cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-error hover:text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Promotion Requests Tab */}
        {tab === 'promotions' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-carbon">Promotion Requests</p>
                <p className="text-[12.5px] text-slate mt-0.5">
                  Request a paid placement on the Homepage, Marketplace, Education Marketplace, or a Category page. Admin reviews before it goes live.
                </p>
              </div>
              <Button icon={<Plus size={14} />} onClick={() => setAddingPromotion(true)}>Request Promotion</Button>
            </div>

            {promotionAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  ['Impressions', promotionAnalytics.impressions.toLocaleString()],
                  ['Clicks', promotionAnalytics.clicks.toLocaleString()],
                  ['CTR', `${promotionAnalytics.ctr.toFixed(1)}%`],
                  ['Orders', promotionAnalytics.orders.toLocaleString()],
                  ['Revenue', `$${promotionAnalytics.revenueUSD.toFixed(2)}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white border border-bone rounded-[10px] px-3.5 py-3">
                    <p className="text-[10px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{label}</p>
                    <p className="text-[18px] font-bold text-carbon leading-[1.15]">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {promotionsError && <p className="text-xs text-error">{promotionsError}</p>}

            {promotionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonBox key={i} height={140} rounded="10px" />)}</div>
            ) : promotionRequests.length === 0 ? (
              <EmptyState
                icon={<Rocket size={28} className="text-brand-orange opacity-55" />}
                title="No promotion requests yet"
                description="Request a paid placement to get featured on the marketplace or homepage."
                action={{ label: 'Request Promotion', onClick: () => setAddingPromotion(true), icon: <Plus size={14} /> }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {promotionRequests.map(r => {
                  const st = PROMOTION_STATUS_STYLE[r.status] ?? PROMOTION_STATUS_STYLE.draft;
                  return (
                    <div key={r._id} className="bg-white border border-bone rounded-[10px] overflow-hidden">
                      <img loading="lazy" decoding="async" src={r.creativeUrl} alt="" className="w-full h-[100px] object-cover bg-cream" />
                      <div className="p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-carbon">{PLACEMENT_LABEL[r.placement]}</span>
                          <span className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </div>
                        <p className="text-[11px] text-slate">
                          {new Date(r.startAt).toLocaleDateString()} – {new Date(r.endAt).toLocaleDateString()} · ${r.priceUSD.toFixed(2)}
                        </p>
                        {r.status === 'rejected' && r.rejectionReason && (
                          <p className="text-[11px] text-error bg-error-bg rounded-md px-2 py-1.5">{r.rejectionReason}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {r.status === 'approved' && r.paymentStatus !== 'paid' && (
                            <button onClick={() => setPayingRequest(r)} className="flex-1 py-[7px] bg-brand-orange border-0 rounded-[7px] text-xs font-semibold text-white cursor-pointer hover:bg-brand-deep-orange">
                              Pay ${r.priceUSD.toFixed(2)}
                            </button>
                          )}
                          {['pending', 'approved', 'active'].includes(r.status) && (
                            <button onClick={() => cancelPromotionRequest(r)} disabled={promotionBusyId === r._id}
                              className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer hover:bg-cream disabled:opacity-50 flex items-center justify-center gap-1">
                              <X size={11} /> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Featured & Collections Tab */}
        {tab === 'featured' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-carbon">Featured Products</p>
                <p className="text-[12.5px] text-slate mt-0.5">
                  Pin products to the top of your storefront. Best Sellers, New Arrivals, and Trending sections are automatic — no setup needed.
                </p>
              </div>
              <Button onClick={savePinnedProducts} loading={pinnedSaving}>Save Order</Button>
            </div>
            {pinnedError && <p className="text-xs text-error">{pinnedError}</p>}
            {pinnedSaved && <p className="text-xs text-success">Saved.</p>}

            {pinnedIds.length > 0 && (
              <div className="bg-white border border-bone rounded-[10px] px-[18px] py-4">
                <p className="text-[11px] font-semibold text-slate uppercase tracking-[0.06em] mb-2">Pinned Order</p>
                <div className="flex flex-col gap-1.5">
                  {pinnedIds.map((id, i) => {
                    const product = inventory.find(p => p.productId === id);
                    return (
                      <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-cream">
                        <span className="text-[11px] text-slate w-4">{i + 1}</span>
                        <span className="text-[13px] text-charcoal flex-1 truncate">{product?.name ?? id}</span>
                        <button onClick={() => movePinned(i, -1)} disabled={i === 0} className="p-1 rounded-md border-0 bg-transparent cursor-pointer disabled:opacity-30 hover:bg-bone"><ArrowUp size={13} /></button>
                        <button onClick={() => movePinned(i, 1)} disabled={i === pinnedIds.length - 1} className="p-1 rounded-md border-0 bg-transparent cursor-pointer disabled:opacity-30 hover:bg-bone"><ArrowDown size={13} /></button>
                        <button onClick={() => togglePin(id)} className="p-1 rounded-md border-0 bg-transparent cursor-pointer hover:bg-bone text-error"><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white border border-bone rounded-[10px] px-[18px] py-4">
              <p className="text-[11px] font-semibold text-slate uppercase tracking-[0.06em] mb-2">All Products</p>
              {inventoryLoading ? (
                <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={36} rounded="8px" />)}</div>
              ) : (
                <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
                  {inventory.map(p => (
                    <label key={p.productId} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-cream">
                      <input type="checkbox" checked={pinnedIds.includes(p.productId)} onChange={() => togglePin(p.productId)} className="cursor-pointer" />
                      {p.image && <img src={p.image} alt="" className="w-7 h-7 rounded-md object-cover" />}
                      <span className="text-[13px] text-charcoal flex-1 truncate">{p.name}</span>
                      <Star size={13} className={pinnedIds.includes(p.productId) ? 'text-brand-orange fill-brand-orange' : 'text-bone'} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Announcement Bar Tab */}
        {tab === 'announcement' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[15px] font-bold text-carbon">Store Announcement Bar</p>
              <p className="text-[12.5px] text-slate mt-0.5">A dismissible bar shown at the top of your storefront — e.g. "Free Shipping" or "Ramadan Sale, 20% Off".</p>
            </div>

            <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-charcoal">Active</span>
                <input type="checkbox" checked={announcement.isActive} onChange={e => setAnnouncement(f => ({ ...f, isActive: e.target.checked }))} className="cursor-pointer" />
              </div>
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">Message</label>
                <input value={announcement.message} onChange={e => setAnnouncement(f => ({ ...f, message: e.target.value }))} placeholder="e.g. Free shipping on all orders this week!"
                  className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Type</label>
                  <select value={announcement.type} onChange={e => setAnnouncement(f => ({ ...f, type: e.target.value as StoreAnnouncementType }))} className={`${INPUT_CLS} cursor-pointer`}>
                    {ANNOUNCEMENT_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">CTA Label (optional)</label>
                  <input value={announcement.ctaLabel} onChange={e => setAnnouncement(f => ({ ...f, ctaLabel: e.target.value }))} placeholder="Shop Now" className={INPUT_CLS} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">CTA Link (optional)</label>
                <input value={announcement.ctaLink} onChange={e => setAnnouncement(f => ({ ...f, ctaLink: e.target.value }))} placeholder="https://…" className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Starts (optional)</label>
                  <input type="datetime-local" value={announcement.startAt} onChange={e => setAnnouncement(f => ({ ...f, startAt: e.target.value }))} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Ends (optional)</label>
                  <input type="datetime-local" value={announcement.endAt} onChange={e => setAnnouncement(f => ({ ...f, endAt: e.target.value }))} className={INPUT_CLS} />
                </div>
              </div>
              {announcementError && <p className="text-[12px] text-error">{announcementError}</p>}
              {announcementSaved && <p className="text-[12px] text-success">Saved.</p>}
              <div>
                <Button onClick={saveAnnouncement} loading={announcementSaving}>Save Announcement</Button>
              </div>
            </div>
          </div>
        )}

        {/* Coupons Tab */}
        {tab === 'coupons' && (
          <div className="flex flex-col gap-5">
            <p className="text-[15px] font-bold text-carbon">Active Coupons</p>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col gap-3">
                    <SkeletonBox width="45%" height={26} rounded="8px" />
                    <SkeletonBox width="60%" height={16} />
                    <SkeletonBox width="100%" height={40} rounded="6px" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="text-xs text-error">{error}</p>
            ) : coupons.length === 0 ? (
              <EmptyState
                icon={<TagIcon size={28} className="text-brand-orange opacity-55" />}
                title="No coupons yet"
                description="Create your first coupon using the form below."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coupon => (
                  <div key={coupon._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 transition-transform duration-200 hover:-translate-y-[1px]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="px-3 py-[5px] rounded-lg border-2 border-dashed border-brand-orange font-mono text-[13px] font-bold text-brand-deep-orange bg-brand-pale-orange">
                        {coupon.code}
                      </div>
                      <span className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: coupon.isActive ? '#E3F4EA' : '#F0EEE6', color: coupon.isActive ? '#1E7A3C' : '#5A5852' }}>
                        {coupon.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-carbon mb-3">
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}% Off` : `${currencySymbol(store?.baseCurrency)}${coupon.discountValue} Off`}
                    </p>
                    <table className="w-full border-collapse text-xs mb-3">
                      <tbody>
                        {[
                          ['Uses', `${coupon.usageCount} / ${coupon.usageLimit ?? 'Unlimited'}`],
                          ['Expires', coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'],
                        ].map(([label, val], i) => (
                          <tr key={label} style={{ borderBottom: i === 0 ? '1px solid #F0EEE6' : 'none' }}>
                            <td className="py-1.5 text-slate">{label}</td>
                            <td className="py-1.5 font-semibold text-carbon text-right">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(coupon)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Edit</button>
                      <button onClick={() => togglePause(coupon)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">{coupon.isActive ? 'Pause' : 'Activate'}</button>
                      <button onClick={() => setDeletingCoupon(coupon)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-error cursor-pointer transition-colors duration-150 hover:bg-error hover:text-white hover:border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create / Edit coupon form */}
            <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
              <p className="text-sm font-bold text-carbon mb-4">{editingId ? 'Edit Coupon' : 'Create New Coupon'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-4">
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Coupon Code</label>
                  <input placeholder="e.g. SAVE20" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Discount Type</label>
                  <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as DiscountType }))}
                    className={`${INPUT_CLS} cursor-pointer`}>
                    <option value="">Select type…</option>
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Amount Off</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Value</label>
                  <input placeholder="e.g. 20 or 10.00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Minimum Order ($)</label>
                  <input placeholder="0.00" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
                    className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Usage Limit</label>
                  <input placeholder="Leave blank for unlimited" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                    className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                    className={INPUT_CLS} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} className="px-6 py-2.5 bg-brand-orange border-none rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
                  {editingId ? 'Update Coupon' : 'Create Coupon'}
                </button>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="px-6 py-2.5 bg-white border border-bone rounded-lg text-[13px] font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Platform Sales Tab — admin-created campaigns this store can opt into */}
        {tab === 'platform' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[15px] font-bold text-carbon">Platform Sale Campaigns</p>
              <p className="text-[12.5px] text-slate mt-0.5">
                Edudeen-wide sale events. Join one to get your products featured in the marketplace deals banner for its duration.
              </p>
            </div>

            {campaignsError && <p className="text-xs text-error">{campaignsError}</p>}

            {campaignsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <SkeletonBox key={i} height={120} rounded="10px" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon={<Megaphone size={28} className="text-brand-orange opacity-55" />}
                title="No active campaigns right now"
                description="When the Edudeen team launches a platform-wide sale, it'll show up here for you to join."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {campaigns.map(c => (
                  <div key={c._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-carbon">{c.name}</p>
                      {c.isJoined && c.sponsorType !== 'platform' && (
                        <span className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold shrink-0 ml-2 bg-success-bg text-success">Joined</span>
                      )}
                    </div>
                    {c.description && <p className="text-xs text-slate mb-2">{c.description}</p>}
                    <p className="text-[11px] text-slate mb-2">
                      {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                      {c.discountType && c.discountValue != null && (
                        <> · {c.discountType === 'percentage' ? `${c.discountValue}% off` : `${currencySymbol(c.currency ?? 'USD')}${c.discountValue} off`}</>
                      )}
                    </p>
                    {c.sponsorType === 'platform' ? (
                      <div className="flex items-start gap-1.5 mb-3 px-2.5 py-2 rounded-[7px] bg-success-bg">
                        <Building2 size={13} className="text-success shrink-0 mt-[1px]" />
                        <p className="text-[11px] text-success font-medium leading-snug">
                          Platform sponsored — Edudeen covers this discount. Your store is automatically included, no action needed.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 mb-3 px-2.5 py-2 rounded-[7px] bg-cream">
                        <User size={13} className="text-slate shrink-0 mt-[1px]" />
                        <p className="text-[11px] text-slate leading-snug">
                          Seller sponsored — this discount comes out of your own payout for orders placed during the sale.
                        </p>
                      </div>
                    )}
                    {c.sponsorType === 'platform' ? (
                      <div className="w-full py-2 rounded-[7px] text-xs font-semibold text-center border border-bone bg-cream text-slate">
                        Automatically Included
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleCampaign(c)}
                        disabled={campaignBusyId === c._id}
                        className={`w-full py-2 rounded-[7px] text-xs font-semibold cursor-pointer transition-colors duration-150 border disabled:opacity-50 ${
                          c.isJoined
                            ? 'bg-white border-bone text-graphite hover:bg-cream'
                            : 'bg-brand-orange border-transparent text-white hover:bg-brand-deep-orange'
                        }`}
                      >
                        {campaignBusyId === c._id ? 'Updating…' : c.isJoined ? 'Leave Campaign' : 'Join Campaign'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'discounts' && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[15px] font-bold text-carbon">Automatic Discounts</p>
              <p className="text-xs text-slate">No code needed — these apply automatically at checkout to whichever items they target. Only the single best-value discount applies per order.</p>
            </div>
            {discountsError && <p className="text-xs text-error">{discountsError}</p>}

            {discountsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} width="100%" height={110} rounded="10px" />)}
              </div>
            ) : discounts.length === 0 ? (
              <EmptyState icon={<Percent size={28} className="text-brand-orange opacity-55" />} title="No automatic discounts yet" description="Create one using the form below." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {discounts.map(d => (
                  <div key={d._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-bold text-carbon">{d.name}</p>
                      <span className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: d.isActive ? '#E3F4EA' : '#F0EEE6', color: d.isActive ? '#1E7A3C' : '#5A5852' }}>
                        {d.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-brand-deep-orange mb-1">
                      {d.discountType === 'percentage' ? `${d.discountValue}% off` : `${currencySymbol(d.currency ?? store?.baseCurrency)}${d.discountValue} off`}
                    </p>
                    <p className="text-xs text-slate mb-3 capitalize">
                      {d.target === 'store' ? 'Entire store' : d.target === 'category' ? `${d.categoryIds.length} categor${d.categoryIds.length === 1 ? 'y' : 'ies'}` : `${d.productIds.length} product${d.productIds.length === 1 ? '' : 's'}`}
                      {d.endsAt && ` · ends ${new Date(d.endsAt).toLocaleDateString()}`}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => toggleDiscount(d)} disabled={discountBusyId === d._id} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer hover:bg-cream disabled:opacity-50">{d.isActive ? 'Pause' : 'Activate'}</button>
                      <button onClick={() => removeDiscount(d)} disabled={discountBusyId === d._id} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-error cursor-pointer hover:bg-error hover:text-white hover:border-error disabled:opacity-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
              <p className="text-sm font-bold text-carbon mb-4">Create Automatic Discount</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-3.5">
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Name</label>
                  <input value={discountForm.name} onChange={e => setDiscountForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Sale" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Discount Type</label>
                  <select value={discountForm.discountType} onChange={e => setDiscountForm(f => ({ ...f, discountType: e.target.value as AutoDiscountType }))} className={`${INPUT_CLS} cursor-pointer`}>
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Amount Off</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Value</label>
                  <input value={discountForm.value} onChange={e => setDiscountForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 15" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Applies To</label>
                  <select value={discountForm.target} onChange={e => setDiscountForm(f => ({ ...f, target: e.target.value as DiscountTarget, categoryIds: [], productIds: [] }))} className={`${INPUT_CLS} cursor-pointer`}>
                    <option value="store">Entire Store</option>
                    <option value="category">Specific Categories</option>
                    <option value="products">Specific Products</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Minimum Order ({currencySymbol(store?.baseCurrency)})</label>
                  <input value={discountForm.minOrderAmount} onChange={e => setDiscountForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="Optional" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Starts</label>
                  <input type="date" value={discountForm.startsAt} onChange={e => setDiscountForm(f => ({ ...f, startsAt: e.target.value }))} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Ends</label>
                  <input type="date" value={discountForm.endsAt} onChange={e => setDiscountForm(f => ({ ...f, endsAt: e.target.value }))} className={INPUT_CLS} />
                </div>
              </div>

              {discountForm.target === 'category' && (
                <div className="mb-3.5">
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Categories</label>
                  <div className="max-h-40 overflow-y-auto border border-bone rounded-lg p-2.5 flex flex-col gap-1.5">
                    {flatCategories.map(c => (
                      <label key={c._id} className="flex items-center gap-2 text-xs text-graphite cursor-pointer" style={{ paddingLeft: c.depth * 14 }}>
                        <input
                          type="checkbox"
                          checked={discountForm.categoryIds.includes(c._id)}
                          onChange={e => setDiscountForm(f => ({ ...f, categoryIds: e.target.checked ? [...f.categoryIds, c._id] : f.categoryIds.filter(id => id !== c._id) }))}
                          className="accent-brand-orange"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {discountForm.target === 'products' && (
                <div className="mb-3.5">
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Products</label>
                  <div className="max-h-40 overflow-y-auto border border-bone rounded-lg p-2.5 flex flex-col gap-1.5">
                    {inventory.map(p => (
                      <label key={p.productId} className="flex items-center gap-2 text-xs text-graphite cursor-pointer">
                        <input
                          type="checkbox"
                          checked={discountForm.productIds.includes(p.productId)}
                          onChange={e => setDiscountForm(f => ({ ...f, productIds: e.target.checked ? [...f.productIds, p.productId] : f.productIds.filter(id => id !== p.productId) }))}
                          className="accent-brand-orange"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateDiscount}
                disabled={discountSaving || !discountForm.name || !discountForm.value}
                className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer hover:bg-brand-deep-orange disabled:opacity-50"
              >
                {discountSaving ? 'Creating…' : 'Create Discount'}
              </button>
            </div>
          </div>
        )}

        {tab === 'giftcards' && (
          <div className="flex flex-col gap-5">
            {giftCardsError && <p className="text-xs text-error">{giftCardsError}</p>}

            {/* Settings */}
            <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
              <p className="text-sm font-bold text-carbon mb-4">Gift Card Settings</p>
              {giftCardSettings && (
                <div className="flex flex-col gap-3.5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={giftCardSettings.purchaseEnabled}
                      disabled={giftCardSettingsBusy}
                      onChange={e => saveGiftCardSettings({ purchaseEnabled: e.target.checked })}
                      className="w-4 h-4 accent-brand-orange cursor-pointer"
                    />
                    <span className="text-[13px] text-graphite">Allow buyers to purchase a gift card on my storefront</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-medium text-graphite mb-[5px] block">
                        Purchase amounts ({currencySymbol(store?.baseCurrency)}, comma-separated)
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={denominationsInput}
                          onChange={e => setDenominationsInput(e.target.value)}
                          placeholder="10, 25, 50, 100"
                          className={INPUT_CLS}
                        />
                        <button
                          onClick={saveDenominations}
                          disabled={giftCardSettingsBusy}
                          className="px-3.5 py-2 bg-white border border-bone rounded-lg text-xs font-semibold text-graphite cursor-pointer hover:bg-cream disabled:opacity-50 whitespace-nowrap"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-graphite mb-[5px] block">Expiry</label>
                      <select
                        value={giftCardSettings.neverExpires ? 'never' : 'expires'}
                        disabled={giftCardSettingsBusy}
                        onChange={e => saveGiftCardSettings({ neverExpires: e.target.value === 'never' })}
                        className={`${INPUT_CLS} cursor-pointer`}
                      >
                        <option value="never">Never expires</option>
                        <option value="expires">Expires after {giftCardSettings.expiryMonths} months</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Manual issue */}
            <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
              <p className="text-sm font-bold text-carbon mb-1">Issue a Gift Card</p>
              <p className="text-xs text-slate mb-4">Send a gift card directly to a customer — e.g. a goodwill credit — with no purchase required.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Value ({currencySymbol(store?.baseCurrency)})</label>
                  <input value={issueForm.value} onChange={e => setIssueForm(f => ({ ...f, value: e.target.value }))} placeholder="25.00" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Recipient Email</label>
                  <input value={issueForm.recipientEmail} onChange={e => setIssueForm(f => ({ ...f, recipientEmail: e.target.value }))} placeholder="customer@email.com" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Recipient Name</label>
                  <input value={issueForm.recipientName} onChange={e => setIssueForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Optional" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite mb-[5px] block">Message</label>
                  <input value={issueForm.message} onChange={e => setIssueForm(f => ({ ...f, message: e.target.value }))} placeholder="Optional note" className={INPUT_CLS} />
                </div>
              </div>
              <button
                onClick={handleIssueGiftCard}
                disabled={issueBusy || !issueForm.value}
                className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer hover:bg-brand-deep-orange disabled:opacity-50"
              >
                {issueBusy ? 'Issuing…' : 'Issue Gift Card'}
              </button>
            </div>

            {/* Issued gift cards list */}
            <div>
              <p className="text-[15px] font-bold text-carbon mb-3">Issued Gift Cards</p>
              {giftCardsLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} width="100%" height={48} rounded="8px" />)}
                </div>
              ) : giftCards.length === 0 ? (
                <EmptyState icon={<Gift size={28} className="text-brand-orange opacity-55" />} title="No gift cards yet" description="Gift cards you issue or buyers purchase will show up here." />
              ) : (
                <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-cream text-left">
                        <th className="px-4 py-2.5 font-semibold text-graphite">Code</th>
                        <th className="px-4 py-2.5 font-semibold text-graphite">Balance</th>
                        <th className="px-4 py-2.5 font-semibold text-graphite">Source</th>
                        <th className="px-4 py-2.5 font-semibold text-graphite">Status</th>
                        <th className="px-4 py-2.5 font-semibold text-graphite">Recipient</th>
                        <th className="px-4 py-2.5 font-semibold text-graphite"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {giftCards.map(g => (
                        <tr key={g._id} className="border-t border-bone">
                          <td className="px-4 py-2.5 font-mono font-semibold text-carbon">{g.code}</td>
                          <td className="px-4 py-2.5 text-carbon">{currencySymbol(g.currency)}{g.balance.toFixed(2)} / {currencySymbol(g.currency)}{g.initialValue.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-slate capitalize">{g.issuedBy}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: g.status === 'active' ? '#E3F4EA' : '#F0EEE6', color: g.status === 'active' ? '#1E7A3C' : '#5A5852' }}>
                              {g.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate">{g.recipientEmail ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right">
                            {g.status === 'active' && (
                              <button
                                onClick={() => disableGiftCard(g)}
                                disabled={giftCardDisableBusyId === g._id}
                                className="px-2.5 py-1 bg-white border border-bone rounded-md text-[11px] text-error cursor-pointer hover:bg-error hover:text-white hover:border-error disabled:opacity-50"
                              >
                                {giftCardDisableBusyId === g._id ? '…' : 'Disable'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Coming Soon Tabs — Email Campaigns has no backend yet (no automation/
            send/open-tracking exists), so it gets the same honest placeholder as
            the other unbuilt tabs instead of fabricated performance numbers. */}
        {(tab === 'email' || tab === 'cart' || tab === 'affiliate') && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-brand-orange mb-4">
              {(() => { const found = TABS.find(t => t.id === tab); return found ? <found.Icon size={48} /> : null; })()}
            </div>
            <p className="text-base font-semibold text-carbon mb-1.5">
              {TABS.find(t => t.id === tab)?.label} — Coming Soon
            </p>
            <p className="text-[13px] text-slate">
              This feature is being built. Stay tuned for updates!
            </p>
          </div>
        )}

      </div>

      {deletingCoupon && (
        <Modal title="Delete Coupon" onClose={() => setDeletingCoupon(null)} mobileSheet footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingCoupon(null)} disabled={deleteBusy}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteBusy}>Delete Coupon</Button>
          </>
        }>
          <p className="text-[13px] text-charcoal">
            Delete coupon <strong>{deletingCoupon.code}</strong>? {deletingCoupon.usageCount > 0 && `It has been redeemed ${deletingCoupon.usageCount} time${deletingCoupon.usageCount !== 1 ? 's' : ''}. `}This cannot be undone.
          </p>
          {error && <p className="text-[12px] text-error mt-2">{error}</p>}
        </Modal>
      )}

      {addingBanner && (
        <StoreBannerFormModal
          storeId={storeId}
          onClose={() => setAddingBanner(false)}
          onSaved={() => { setAddingBanner(false); refetchStoreBanners(); }}
        />
      )}

      {addingPromotion && (
        <PromotionRequestFormModal
          storeId={storeId}
          onClose={() => setAddingPromotion(false)}
          onSaved={() => { setAddingPromotion(false); refetchPromotionRequests(); }}
        />
      )}

      {payingRequest && (
        <PromotionPaymentModal
          request={payingRequest}
          onClose={() => setPayingRequest(null)}
          onPaid={() => { setPayingRequest(null); refetchPromotionRequests(); }}
        />
      )}
    </>
  );
}
