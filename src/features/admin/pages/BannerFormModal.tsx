import { useEffect, useState } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { CalendarClock, ImageIcon, Package, Search, X } from 'lucide-react';
import {
  apiCreateBannerFromUrl, apiCreateBannerFromProducts, apiUpdateBanner, apiPreviewBannerProducts,
  bannerPlacements, ADMIN_BANNER_PLACEMENTS, BANNER_STYLES, BANNER_STYLE_LABEL, MAX_PRODUCTS_BY_STYLE,
  type Banner, type PromotionPlacement, type BannerStyle,
} from '@/api/services/banner';
import { apiGetMarketplaceListings, type MarketplaceListingRow } from '@/api/services/marketplace/adminMarketplace';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input } from '@/components/comman/ui/Input';
import { BannerImagePicker } from '@/features/admin/components/BannerImagePicker';
import { LinkTargetPicker } from '@/features/admin/components/LinkTargetPicker';
import { ProductBannerSlide } from '@/components/comman/marketplace/ProductBannerSlide';
import { formatPrice } from '@/utils/formatPrice';
import { clsx } from 'clsx';
export const PLACEMENT_LABEL: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero',
  marketplaceHero: 'Marketplace Hero',
  educationHero: 'Education Marketplace Hero',
  categoryHero: 'Category Hero',
  productPage: 'Product Page Banner',
};

export const STATUS_STYLE: Record<Banner['status'], { bg: string; color: string; label: string }> = {
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Live now' },
  scheduled: { bg: '#EAF1FB', color: '#1D5EAE', label: 'Scheduled' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#EDF2F4', color: '#486071', label: 'Expired' },
  draft:     { bg: '#EDF2F4', color: '#486071', label: 'Draft' },
};

/** ISO (UTC) -> the value a datetime-local input expects, in the admin's own timezone. */
function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fmtWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

/** What the admin should read on the card: live / scheduled for a date / draft ... */
export function effectiveState(b: Banner): { key: 'live' | 'scheduled' | 'draft' | 'paused' | 'expired'; style: { bg: string; color: string; label: string } } {
  if (b.live) return { key: 'live', style: STATUS_STYLE.active };
  if (b.status === 'scheduled') return { key: 'scheduled', style: { ...STATUS_STYLE.scheduled, label: b.startAt ? `Goes live ${fmtWhen(b.startAt)}` : 'Scheduled' } };
  if (b.status === 'paused') return { key: 'paused', style: STATUS_STYLE.paused };
  if (b.status === 'expired') return { key: 'expired', style: STATUS_STYLE.expired };
  if (b.status === 'active') return { key: 'expired', style: STATUS_STYLE.expired };
  return { key: 'draft', style: STATUS_STYLE.draft };
}

// ── Product picker — search the whole catalog, pick up to the style's limit, in display order ──
function ProductPicker({
  productIds, onChange, max, known, onKnown,
}: {
  productIds: string[];
  onChange: (ids: string[]) => void;
  max: number;
  known: Record<string, { title: string; price: number | null; currency?: string | null }>;
  onKnown: (rows: MarketplaceListingRow[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MarketplaceListingRow[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setSearching(true);
      apiGetMarketplaceListings({ search: query.trim() || undefined, limit: 20 })
        .then(res => { if (alive) { setResults(res.data.items); onKnown(res.data.items); } })
        .finally(() => { if (alive) setSearching(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function toggle(id: string) {
    if (productIds.includes(id)) { onChange(productIds.filter(x => x !== id)); return; }
    if (productIds.length >= max) return;
    onChange([...productIds, id]);
  }
  function move(id: string, dir: -1 | 1) {
    const i = productIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= productIds.length) return;
    const next = [...productIds];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-col gap-1.5 mb-2">
        {productIds.map((id, i) => (
          <div key={id} className="flex items-center gap-2 bg-cream border border-bone rounded-lg px-2.5 py-1.5">
            <span className="flex-1 min-w-0 text-[12.5px] text-charcoal truncate">{known[id]?.title ?? id}</span>
            {known[id]?.price != null && <span className="text-[12px] font-semibold text-brand-orange shrink-0">{formatPrice(known[id].price, known[id].currency)}</span>}
            <button type="button" onClick={() => move(id, -1)} disabled={i === 0} className="text-slate hover:text-charcoal disabled:opacity-30 bg-transparent border-none cursor-pointer p-0.5">▲</button>
            <button type="button" onClick={() => move(id, 1)} disabled={i === productIds.length - 1} className="text-slate hover:text-charcoal disabled:opacity-30 bg-transparent border-none cursor-pointer p-0.5">▼</button>
            <button type="button" onClick={() => toggle(id)} aria-label="Remove" className="text-slate hover:text-error bg-transparent border-none cursor-pointer p-0.5"><X size={13} /></button>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-slate mb-1.5">{productIds.length} of {max} selected</p>
      <div className="relative mb-1.5">
        <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search the catalog by name…"
          className="w-full ps-8 pe-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:border-brand-orange/50"
        />
      </div>
      <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto border border-bone rounded-lg p-1.5">
        {searching && results.length === 0 && <p className="text-[12px] text-slate text-center py-3">Searching…</p>}
        {!searching && results.length === 0 && <p className="text-[12px] text-slate text-center py-3">No products match “{query.trim()}”.</p>}
        {results.map(r => {
          const picked = productIds.includes(r.id);
          const atLimit = !picked && productIds.length >= max;
          return (
            <label key={r.id} className={clsx('flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none', picked ? 'bg-brand-pale-orange' : 'hover:bg-cream', atLimit && 'opacity-40 cursor-not-allowed')}>
              <input type="checkbox" checked={picked} disabled={atLimit} onChange={() => toggle(r.id)} className="size-[15px] rounded border-bone accent-brand-orange cursor-pointer shrink-0" />
              <span className="flex-1 min-w-0 text-[12.5px] text-charcoal truncate">{r.title}</span>
              <span className="text-[12px] text-slate shrink-0">{formatPrice(r.price, r.currency)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Form modal ────────────────────────────────────────────────────────────────
export function BannerFormModal({
  banner, currentCount, onClose, onSaved, defaultPlacement, beforeWrite,
}: {
  banner: Banner | null;
  currentCount: number;
  onClose: () => void;
  onSaved: () => void;
  /** Placement pre-ticked when adding a new banner. */
  defaultPlacement?: PromotionPlacement;
  /** Inline site editor: runs before the save request. Resolve to the extra request config (reauth headers) or null to cancel — nothing is sent. */
  beforeWrite?: () => Promise<AxiosRequestConfig | null>;
}) {
  const isEdit = !!banner;
  const [mode, setMode] = useState<'image' | 'products'>(banner?.kind === 'products' ? 'products' : 'image');
  const [images, setImages] = useState<string[]>(banner?.bannerImage ? [banner.bannerImage] : []);
  const [title, setTitle] = useState(banner?.title ?? '');
  const [urlOnTap, setUrlOnTap] = useState(banner?.urlOnTap ?? '');
  const [style, setStyle] = useState<BannerStyle>(banner?.style ?? 'spotlight');
  const [productIds, setProductIds] = useState<string[]>(banner?.productIds ?? []);
  // Names/prices for selected ids not in the current search results (e.g. an id carried over from editing).
  const [known, setKnown] = useState<Record<string, { title: string; price: number | null; currency?: string | null }>>(() =>
    Object.fromEntries((banner?.products ?? []).map(p => [p._id, { title: p.name, price: p.variants?.[0]?.price ?? null, currency: p.variants?.[0]?.currency }])),
  );
  const [placements, setPlacements] = useState<PromotionPlacement[]>(
    banner ? bannerPlacements(banner) : [defaultPlacement ?? 'homepageHero'],
  );
  const [order, setOrder] = useState(String(banner?.order ?? currentCount));
  const [startAt, setStartAt] = useState(toLocalInput(banner?.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(banner?.endAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function togglePlacement(p: PromotionPlacement) {
    setPlacements(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));
  }

  // A style change may leave more products selected than it has slots for — trim to fit rather than
  // silently reject the save later. Done in the picker's own click handler (an event, not an effect)
  // so switching style and trimming the selection happen as one update.
  function selectStyle(s: BannerStyle) {
    setStyle(s);
    const max = MAX_PRODUCTS_BY_STYLE[s];
    setProductIds(prev => (prev.length > max ? prev.slice(0, max) : prev));
  }

  // Live preview — resolved the SAME way the real banner will be (see banner.service.ts's
  // previewProducts), so this is never an approximation of what gets published.
  const [previewProducts, setPreviewProducts] = useState<MarketplaceProduct[]>(banner?.products ?? []);
  const [previewLoading, setPreviewLoading] = useState(false);
  useEffect(() => {
    if (mode !== 'products') return;
    let alive = true;
    const t = setTimeout(() => {
      if (!alive) return;
      if (productIds.length === 0) { setPreviewProducts([]); return; }
      setPreviewLoading(true);
      apiPreviewBannerProducts(productIds)
        .then(res => { if (alive) setPreviewProducts(res.data ?? []); })
        .finally(() => { if (alive) setPreviewLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, productIds.join(',')]);

  const scheduledForLater = !!startAt && new Date(startAt).getTime() > Date.now();

  async function submit(asDraft: boolean) {
    if (mode === 'image' && !images[0]) { setError('Please upload a banner image.'); return; }
    if (mode === 'products' && productIds.length === 0) { setError('Select at least one product.'); return; }
    if (placements.length === 0) { setError('Select at least one placement.'); return; }
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) { setError('The end time must be after the start time.'); return; }
    if (!asDraft && endAt && new Date(endAt).getTime() < Date.now()) { setError('The end time is already in the past.'); return; }
    setError('');
    setSaving(true);
    try {
      let reqCfg: AxiosRequestConfig | undefined;
      if (beforeWrite) {
        const cfg = await beforeWrite();
        if (!cfg) return; // password not confirmed: nothing is changed
        reqCfg = cfg;
      }
      const startIso = startAt ? new Date(startAt).toISOString() : undefined;
      const endIso = endAt ? new Date(endAt).toISOString() : undefined;
      if (mode === 'products') {
        const common = { style, productIds, title: title.trim() || undefined, placements, order: Number(order) || 0, saveAsDraft: asDraft };
        if (isEdit) {
          await apiUpdateBanner(banner._id, { ...common, kind: 'products', startAt: startIso ?? null, endAt: endIso ?? null }, reqCfg);
        } else {
          await apiCreateBannerFromProducts({ ...common, startAt: startIso, endAt: endIso }, reqCfg);
        }
      } else {
        const common = { bannerImage: images[0], title: title.trim(), urlOnTap: urlOnTap || undefined, placements, order: Number(order) || 0, saveAsDraft: asDraft };
        if (isEdit) {
          // null clears a schedule that was set earlier.
          await apiUpdateBanner(banner._id, { ...common, kind: 'image', startAt: startIso ?? null, endAt: endIso ?? null }, reqCfg);
        } else {
          await apiCreateBannerFromUrl({ ...common, startAt: startIso, endAt: endIso }, reqCfg);
        }
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save banner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet
      title={isEdit ? 'Edit Banner' : 'Add Banner'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={saving}>Save as draft</Button>
          <Button onClick={() => submit(false)} loading={saving}>{scheduledForLater ? 'Schedule banner' : (isEdit && banner?.status !== 'draft' ? 'Save changes' : 'Publish now')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!isEdit && (
          <div role="tablist" aria-label="Banner type" className="flex gap-1 bg-cream rounded-lg p-1 w-fit">
            {(['image', 'products'] as const).map(m => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12.5px] font-medium cursor-pointer border-none transition-colors',
                  mode === m ? 'bg-white text-brand-orange shadow-sm' : 'bg-transparent text-slate hover:text-charcoal')}>
                {m === 'image' ? <ImageIcon size={13} /> : <Package size={13} />}
                {m === 'image' ? 'Upload image' : 'Feature products'}
              </button>
            ))}
          </div>
        )}

        {mode === 'products' ? (
          <>
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BANNER_STYLES.map(s => (
                  <button key={s} type="button" onClick={() => selectStyle(s)}
                    className={clsx('px-2.5 py-2 rounded-lg border text-[12px] font-medium cursor-pointer text-start',
                      style === s ? 'border-brand-orange bg-brand-pale-orange text-brand-orange' : 'border-bone bg-white text-charcoal hover:bg-cream')}>
                    {BANNER_STYLE_LABEL[s]}
                    <span className="block text-[10.5px] text-slate font-normal mt-0.5">up to {MAX_PRODUCTS_BY_STYLE[s]} product{MAX_PRODUCTS_BY_STYLE[s] === 1 ? '' : 's'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Input label="Banner title (optional)" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="e.g. This week's bestsellers" />
              <p className="text-[12px] text-slate/70 mt-1 mb-3">Shown as a heading above the products on the "lineup" and "collection grid" styles.</p>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Products</label>
              <ProductPicker
                productIds={productIds}
                onChange={setProductIds}
                max={MAX_PRODUCTS_BY_STYLE[style]}
                known={known}
                onKnown={rows => setKnown(prev => ({ ...prev, ...Object.fromEntries(rows.map(r => [r.id, { title: r.title, price: r.price, currency: r.currency }])) }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Live preview</label>
              <div className="relative rounded-2xl overflow-hidden bg-cream aspect-[2/1] sm:aspect-[5/2] lg:aspect-[3.2/1]">
                {previewProducts.length > 0 ? (
                  <ProductBannerSlide style={style} products={previewProducts} endAt={endAt ? new Date(endAt).toISOString() : null} title={title.trim() || undefined} />
                ) : (
                  <p className="absolute inset-0 flex items-center justify-center text-[12.5px] text-slate text-center px-4">
                    {previewLoading ? 'Loading preview…' : 'Pick a product above to see it here.'}
                  </p>
                )}
              </div>
              <p className="text-[11.5px] text-slate mt-1.5">This is exactly what goes live — not an approximation.</p>
            </div>
          </>
        ) : (
          <div>
            <Input label="Banner title" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mathematics sale" />
            <p className="text-[12px] text-slate/70 mt-1 mb-3">Shown as a headline on the left side of the banner. Leave it empty if the picture already has its own text.</p>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Banner Image</label>
            <BannerImagePicker value={images[0] ?? ''} onChange={u => setImages([u])} />
          </div>
        )}

        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Placement</label>
          <p className="text-[12px] text-slate/70 mb-1.5">Pick one or more — this banner will rotate on every placement checked.</p>
          <div className="flex flex-col gap-1.5">
            {ADMIN_BANNER_PLACEMENTS.map(p => (
              <label key={p} className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={placements.includes(p)}
                  onChange={() => togglePlacement(p)}
                  className="size-[15px] rounded border-bone accent-brand-orange cursor-pointer"
                />
                {PLACEMENT_LABEL[p]}
              </label>
            ))}
          </div>
        </div>
        {mode === 'image' && (
          <LinkTargetPicker value={urlOnTap} onChange={setUrlOnTap} label="Banner category (opens that category's products when clicked)" defaultKind="category" />
        )}
        <Input label="Display Order" type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} />
        <div className="rounded-xl border border-bone bg-cream/50 p-3">
          <p className="text-[12px] font-semibold text-charcoal mb-1 flex items-center gap-1.5"><CalendarClock size={13} /> Schedule (optional)</p>
          <p className="text-[12px] text-slate mb-2.5">
            Set a start date to prepare a banner in advance (for example next month's sale): it goes live by itself at that time and is removed after the end time. Leave both empty to publish right away and keep it until you remove it. Times are in your own timezone.
            {mode === 'products' && style === 'countdown' && ' The end time is also the countdown shown on the banner.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Goes live at" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            <Input label={mode === 'products' && style === 'countdown' ? 'Ends at (the countdown target)' : 'Ends at'} type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
          </div>
          <p className="text-[12px] text-slate mt-2">"Save as draft" keeps it hidden until you publish it.</p>
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

