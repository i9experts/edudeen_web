import { useEffect, useState } from 'react';
import { formatPrice } from '@/utils/formatPrice';
import { Modal, Button, Input, FileDropSelect } from '@/components/comman/ui';
import { StripeCardPayment, isStripeConfigured } from '@/features/buyer/components/StripeCardPayment';
import { SELECTABLE_PROMOTION_PLACEMENTS, type PromotionPlacement } from '@/api/services/banner';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';
import { apiPreviewPromotionPrice, apiCreatePromotionRequest, apiPayPromotionRequest, apiConfirmPromotionPayment, type PromotionRequest, type PromotionPriceBreakdown } from '@/api/services/promotions';

export const PLACEMENT_LABEL: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero', marketplaceHero: 'Marketplace Hero', educationHero: 'Education Marketplace Hero', categoryHero: 'Category Hero', productPage: 'Product Page Banner',
};

export const PROMOTION_STATUS_STYLE: Record<PromotionRequest['status'], { bg: string; color: string; label: string }> = {
  draft:     { bg: '#F0EEE6', color: '#5A5852', label: 'Draft' },
  pending:   { bg: '#FDF3E7', color: '#9A6A17', label: 'Pending Review' },
  approved:  { bg: '#EAF1FB', color: '#1D5EAE', label: 'Approved — Pay to Publish' },
  rejected:  { bg: '#FBEAEA', color: '#B3261E', label: 'Rejected' },
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Live' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#F0EEE6', color: '#5A5852', label: 'Ended' },
  cancelled: { bg: '#F0EEE6', color: '#5A5852', label: 'Cancelled' },
};

// ── Promotion Request create modal ─────────────────────────────────────────────
// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not a raw ISO/UTC string.
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAY_PRESETS = [1, 3, 7] as const;

export function PromotionRequestFormModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => void }) {
  const [placement, setPlacement] = useState<PromotionPlacement>('marketplaceHero');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  // Presets only fill the same Start/End fields (same API payload as before).
  function applyPreset(days: number) {
    const start = startAt ? new Date(startAt) : new Date();
    if (!startAt) setStartAt(toDatetimeLocalValue(start));
    setEndAt(toDatetimeLocalValue(new Date(start.getTime() + days * 24 * 60 * 60 * 1000)));
  }
  const activePreset = (() => {
    if (!startAt || !endAt) return null;
    const diff = (new Date(endAt).getTime() - new Date(startAt).getTime()) / (24 * 60 * 60 * 1000);
    return DAY_PRESETS.find(d => Math.abs(diff - d) < 0.001) ?? null;
  })();
  const rangeInvalid = !!startAt && !!endAt && new Date(endAt).getTime() <= new Date(startAt).getTime();

  const [ctaLabel, setCtaLabel] = useState('');
  const [product, setProduct] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const picker = useInventorySearch(storeId, { limit: 20, status: 'active', enabled: pickerOpen });
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PromotionPriceBreakdown | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) { setPreview(null); setPreviewError(''); return; }
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
    if (!product) { setError('Please choose the product this promotion links to.'); return; }
    if (!file) { setError('Please choose a creative image.'); return; }
    if (!startAt || !endAt) { setError('Please choose a start and end date.'); return; }
    if (rangeInvalid) { setError('End must be after start.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiCreatePromotionRequest(storeId, {
        placement,
        ctaLabel: ctaLabel || undefined,
        linkType: 'product',
        linkTarget: `/product/${product.slug}`,
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
          <Button onClick={submit} loading={saving} disabled={!product || !startAt || !endAt || rangeInvalid}>Submit for Review</Button>
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
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Product to promote</label>
          {product ? (
            <div className="flex items-center gap-2 rounded-lg border border-bone px-3 py-2 min-h-11">
              <p className="flex-1 min-w-0 text-[13px] font-semibold text-charcoal truncate">{product.name}</p>
              <button type="button" onClick={() => { setProduct(null); setPickerOpen(true); }}
                className="shrink-0 min-h-11 px-2 text-[12px] font-medium text-brand-orange cursor-pointer">Change</button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={picker.query}
                onFocus={() => setPickerOpen(true)}
                onChange={e => { setPickerOpen(true); picker.setQuery(e.target.value); }}
                placeholder="Search your products…"
                aria-label="Search your products"
                className="w-full px-3 py-2 min-h-11 rounded-lg border border-bone text-[13px] bg-white outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
              />
              {pickerOpen && (
                <div className="max-h-[200px] overflow-y-auto flex flex-col gap-1 rounded-lg border border-bone p-1">
                  {picker.error ? (
                    <div role="alert" className="flex items-center justify-between gap-2 px-2 py-2">
                      <p className="text-[12px] text-error">{picker.error}</p>
                      <Button size="sm" variant="outline" onClick={picker.retry}>Retry</Button>
                    </div>
                  ) : picker.loading && picker.products.length === 0 ? (
                    <p className="px-2 py-3 text-[12px] text-slate">Loading products…</p>
                  ) : picker.products.length === 0 ? (
                    <p className="px-2 py-3 text-[12px] text-slate">{picker.query.trim() ? 'No matching live products.' : 'You have no live products yet.'}</p>
                  ) : picker.products.map(p => (
                    <button key={p.productId} type="button"
                      onClick={() => { setProduct({ id: p.productId, name: p.name, slug: p.slug || p.productId }); setPickerOpen(false); setError(''); }}
                      className="flex items-center gap-2 px-2 py-1.5 min-h-11 rounded-lg text-left cursor-pointer hover:bg-cream">
                      {p.image && <img src={p.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />}
                      <span className="text-[13px] text-charcoal truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[12px] text-slate">Buyers who tap the banner land on this product page.</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Run dates</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {DAY_PRESETS.map(d => (
              <button key={d} type="button" onClick={() => applyPreset(d)} aria-pressed={activePreset === d}
                className={`min-h-11 px-4 rounded-lg border text-[13px] font-medium cursor-pointer transition-colors ${activePreset === d ? 'border-brand-orange bg-brand-pale-orange text-charcoal' : 'border-bone text-slate hover:bg-cream'}`}>
                {d} {d === 1 ? 'day' : 'days'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Starts" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            <Input label="Ends" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
          </div>
          {rangeInvalid && <p className="text-[12px] text-error mt-1.5">End must be after start.</p>}
        </div>

        <div className="bg-cream rounded-lg px-3.5 py-3 flex items-center justify-between gap-3" aria-live="polite">
          <span className="text-[12px] text-slate min-w-0">
            {previewLoading ? 'Pricing this window…'
              : previewError ? previewError
              : preview && preview.priceUSD > 0
                ? (preview.unit === 'festival' ? `Festival rate (${preview.festivalName})` : `${Math.round((preview.hours / 24) * 10) / 10} days · ${preview.unit} rate`)
                : 'Price'}
          </span>
          <span className="text-[14px] font-bold text-charcoal text-right shrink-0">
            {previewLoading || previewError ? '—'
              : preview && preview.priceUSD > 0 ? formatPrice(preview.priceUSD, 'USD')
              : preview ? 'Price confirmed by admin'
              : 'Pick dates to see price'}
          </span>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Creative Image</label>
          <FileDropSelect value={file} onChange={setFile} label="Click to upload creative" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Mobile Creative (optional)</label>
          <FileDropSelect value={mobileFile} onChange={setMobileFile} label="Click to upload mobile creative" />
        </div>
        <Input label="CTA Label (optional)" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} placeholder="Shop Now" />
        <Input label="Note to admin (optional)" value={message} onChange={e => setMessage(e.target.value)} placeholder="Anything the reviewer should know" />
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Promotion Request payment modal ────────────────────────────────────────────
export function PromotionPaymentModal({ request, onClose, onPaid }: { request: PromotionRequest; onClose: () => void; onPaid: () => void }) {
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
