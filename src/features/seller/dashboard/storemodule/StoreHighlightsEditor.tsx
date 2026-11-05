import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, GripVertical, Loader2, Monitor, Smartphone, Star, X } from 'lucide-react';
import { Button, Input, Toggle } from '@/components/comman/ui';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useToast } from '@/contexts/ToastContext';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { apiGetPublicStoreProducts, type PublicStoreData, type PublicStoreProduct } from '@/api/services/store';
import { apiPreviewStorefrontHighlights, type StorefrontHighlightRows } from '@/api/services/product';
import {
  apiGetStoreThemeDraft, apiPublishStoreTheme, apiUpdateStorefrontHighlights, type StorefrontHighlights,
} from '@/api/services/storeTheme';
import { StorefrontProvider, resolveEdudeenStoreCfg } from '@/features/storefront/StorefrontContext';
import { HighlightRows } from '@/features/storefront/sections/StorefrontHighlights';

const MAX_FEATURED = 8;
const EMPTY: StorefrontHighlights = { featuredProductIds: [], showNewArrivals: false, showBestSellers: false };
const same = (a: StorefrontHighlights, b: StorefrontHighlights) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Store highlights: Featured (up to 8 of your own active products, in the order you drag them), New arrivals and
 * Best sellers. Edits are a DRAFT: buyers only see them after Publish. The preview below renders the same rows the
 * buyer page renders, from the current (even unsaved) choices.
 */
export function StoreHighlightsEditor({ storeId, store }: { storeId: string; store: unknown }) {
  const toast = useToast();
  const [cfg, setCfg] = useState<StorefrontHighlights>(EMPTY);
  const [saved, setSaved] = useState<StorefrontHighlights>(EMPTY);
  const [published, setPublished] = useState<StorefrontHighlights>(EMPTY);
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [busy, setBusy] = useState<'save' | 'publish' | null>(null);

  const load = useCallback(() => {
    setLoadState('loading');
    apiGetStoreThemeDraft(storeId)
      .then(res => {
        const d = res.data.storefront ?? EMPTY;
        setCfg(d); setSaved(d); setPublished(res.data.publishedStorefront ?? EMPTY);
        setLoadState('ready');
      })
      .catch(() => setLoadState('error'));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  // ── Picker ──
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const [products, setProducts] = useState<PublicStoreProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [known, setKnown] = useState<Record<string, PublicStoreProduct>>({});
  useEffect(() => {
    let cancelled = false;
    setProductsLoading(true); setProductsError(false);
    apiGetPublicStoreProducts(storeId, { page: 1, limit: 50, search: debounced || undefined })
      .then(res => {
        if (cancelled) return;
        const list = res.data?.products ?? [];
        setProducts(list);
        setKnown(prev => ({ ...prev, ...Object.fromEntries(list.map(p => [p._id, p])) }));
      })
      .catch(() => { if (!cancelled) { setProducts([]); setProductsError(true); } })
      .finally(() => { if (!cancelled) setProductsLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, debounced]);

  const ids = cfg.featuredProductIds;
  const toggleProduct = (id: string) => {
    if (ids.includes(id)) setCfg(c => ({ ...c, featuredProductIds: c.featuredProductIds.filter(x => x !== id) }));
    else if (ids.length >= MAX_FEATURED) toast.error(`You can feature up to ${MAX_FEATURED} products.`);
    else setCfg(c => ({ ...c, featuredProductIds: [...c.featuredProductIds, id] }));
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCfg(c => ({ ...c, featuredProductIds: next }));
  };
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  // ── Preview (unsaved choices, rendered with the buyer components) ──
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const [preview, setPreview] = useState<StorefrontHighlightRows | null>(null);
  const [previewState, setPreviewState] = useState<'loading' | 'error' | 'ready'>('loading');
  const previewKey = useDebouncedValue(JSON.stringify(cfg), 400);
  useEffect(() => {
    if (loadState !== 'ready') return;
    let cancelled = false;
    setPreviewState('loading');
    apiPreviewStorefrontHighlights(storeId, JSON.parse(previewKey) as StorefrontHighlights)
      .then(res => { if (!cancelled) { setPreview(res.data); setPreviewState('ready'); } })
      .catch(() => { if (!cancelled) setPreviewState('error'); });
    return () => { cancelled = true; };
  }, [storeId, previewKey, loadState]);

  const providerValue = useMemo(() => ({
    store: store as PublicStoreData,
    theme: null,
    cfg: resolveEdudeenStoreCfg(null),
    resolveLink: () => ({}),
    goToMainApp: () => {}, // preview only: clicking a card does nothing
  }), [store]);

  // ── Actions ──
  const dirty = !same(cfg, saved);
  const unpublished = !same(cfg, published);
  const saveDraft = async () => {
    setBusy('save');
    try {
      const res = await apiUpdateStorefrontHighlights(storeId, cfg);
      setSaved(res.data.storefront);
      toast.success('Draft saved. Buyers see it after you publish.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the draft.');
    } finally { setBusy(null); }
  };
  const publish = async () => {
    setBusy('publish');
    try {
      if (dirty) setSaved((await apiUpdateStorefrontHighlights(storeId, cfg)).data.storefront);
      await apiPublishStoreTheme(storeId);
      setSaved(cfg); setPublished(cfg);
      toast.success('Published. Your store page is updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish.');
    } finally { setBusy(null); }
  };

  if (loadState === 'loading') return <p className="text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading highlights…</p>;
  if (loadState === 'error') {
    return (
      <div className="text-[12.5px] text-slate flex items-center gap-3">
        <span>Could not load your highlights.</span>
        <Button variant="outline" size="sm" onClick={load}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Featured picker */}
      <div>
        <p className="text-[13px] font-semibold text-carbon mb-1 flex items-center gap-1.5"><Star size={13} /> Featured products ({ids.length}/{MAX_FEATURED})</p>
        <p className="text-[12px] text-slate mb-3">Pick up to 8 of your own active products. Drag them (or use the arrows) to set the order buyers see.</p>

        {ids.length > 0 && (
          <ol className="flex gap-2 overflow-x-auto pb-2 mb-3 list-none p-0 m-0">
            {ids.map((id, i) => {
              const p = known[id];
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragFrom != null) move(dragFrom, i); setDragFrom(null); }}
                  onDragEnd={() => setDragFrom(null)}
                  className={clsx('relative w-[92px] shrink-0 rounded-lg border bg-white overflow-hidden', dragFrom === i ? 'border-brand-orange opacity-60' : 'border-bone')}
                >
                  <span className="block aspect-square bg-cream">
                    {p?.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <ProductCoverFallback name={p?.name ?? '…'} size="xs" className="w-full h-full" />}
                  </span>
                  <span className="block px-1.5 pt-1 text-[12px] leading-tight text-charcoal line-clamp-2 min-h-[2.4em]">{p?.name ?? 'Product'}</span>
                  <span className="flex items-center justify-between px-1 pb-1">
                    <GripVertical size={13} className="text-slate cursor-grab" aria-hidden />
                    <span className="flex">
                      <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)} className="size-6 flex items-center justify-center bg-transparent border-none cursor-pointer disabled:opacity-30"><ArrowLeft size={12} /></button>
                      <button type="button" aria-label="Move later" disabled={i === ids.length - 1} onClick={() => move(i, i + 1)} className="size-6 flex items-center justify-center bg-transparent border-none cursor-pointer disabled:opacity-30"><ArrowRight size={12} /></button>
                    </span>
                  </span>
                  <span className="absolute top-1 start-1 size-5 rounded-full bg-brand-orange text-white text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                  <button type="button" aria-label="Remove from featured" onClick={() => toggleProduct(id)} className="absolute top-1 end-1 size-5 rounded-full bg-white/90 border border-bone flex items-center justify-center cursor-pointer"><X size={11} /></button>
                </li>
              );
            })}
          </ol>
        )}

        <Input placeholder="Search your products…" value={query} onChange={e => setQuery(e.target.value)} className="mb-3" />
        {productsLoading && products.length === 0 ? (
          <p className="text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading products…</p>
        ) : productsError ? (
          <p className="text-[12.5px] text-error">Could not load your products. Change the search or reload the page.</p>
        ) : products.length === 0 ? (
          <p className="text-[12.5px] text-slate">{debounced ? `No products match “${debounced}”.` : 'No active products yet. Add a product first.'}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto pe-1">
            {products.map(p => {
              const order = ids.indexOf(p._id);
              const picked = order >= 0;
              return (
                <button
                  key={p._id}
                  type="button"
                  aria-pressed={picked}
                  onClick={() => toggleProduct(p._id)}
                  className={clsx('relative text-start rounded-xl border overflow-hidden bg-white cursor-pointer transition-colors', picked ? 'border-brand-orange ring-2 ring-brand-orange/25' : 'border-bone hover:border-slate')}
                >
                  <span className="block aspect-square bg-cream">
                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" /> : <ProductCoverFallback name={p.name} size="xs" className="w-full h-full" />}
                  </span>
                  <span className="block px-2 py-1.5 text-[12px] font-medium text-charcoal line-clamp-2">{p.name}</span>
                  {picked && <span className="absolute top-1.5 end-1.5 size-6 rounded-full bg-brand-orange text-white text-[12px] font-bold flex items-center justify-center">{order + 1}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Automatic rows */}
      <div className="flex flex-col gap-2.5">
        <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal">
          <span>New arrivals <span className="text-slate text-[12px]">· your 8 newest published products</span></span>
          <Toggle label="Show New arrivals" checked={cfg.showNewArrivals} onChange={v => setCfg(c => ({ ...c, showNewArrivals: v }))} />
        </label>
        <label className="flex items-center justify-between gap-3 text-[13px] text-charcoal">
          <span>Best sellers <span className="text-slate text-[12px]">· your 8 most purchased products</span></span>
          <Toggle label="Show Best sellers" checked={cfg.showBestSellers} onChange={v => setCfg(c => ({ ...c, showBestSellers: v }))} />
        </label>
        <p className="text-[12px] text-slate">A row with fewer than 2 products is hidden from buyers, and a product shows in only one row (Featured, then New arrivals, then Best sellers).</p>
      </div>

      {/* Preview */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate">Preview {unpublished && <span className="normal-case tracking-normal font-semibold text-brand-orange ms-1">· not published yet</span>}</p>
          <div className="flex rounded-lg border border-bone overflow-hidden" role="group" aria-label="Preview size">
            {([['phone', 'Phone', Smartphone], ['desktop', 'Desktop', Monitor]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" aria-pressed={device === v} onClick={() => setDevice(v)}
                className={clsx('flex items-center gap-1 px-2.5 py-1 text-[12px] border-none cursor-pointer', device === v ? 'bg-carbon text-white' : 'bg-white text-charcoal')}>
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className={clsx('rounded-2xl border border-bone bg-white overflow-hidden mx-auto min-h-[60px]', device === 'phone' ? 'w-[390px] max-w-full' : 'w-full')}>
          {previewState === 'loading' && !preview ? (
            <p className="p-4 text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading preview…</p>
          ) : previewState === 'error' ? (
            <p className="p-4 text-[12.5px] text-error">Could not load the preview.</p>
          ) : preview ? (
            <StorefrontProvider value={providerValue}>
              <HighlightRows data={preview} />
              {!preview.featured.length && !preview.newArrivals.length && !preview.bestSellers.length && (
                <p className="p-4 text-[12.5px] text-slate">Nothing to show yet. Pick products or switch a row on.</p>
              )}
              <div className="px-4 py-3 border-t border-bone text-[12px] text-slate">All your products appear below these rows.</div>
            </StorefrontProvider>
          ) : null}
        </div>
      </div>

      {/* Draft / publish */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={!dirty || !!busy} onClick={() => setCfg(saved)}>Discard changes</Button>
        <Button variant="outline" size="sm" disabled={!dirty || !!busy} onClick={saveDraft}>
          {busy === 'save' && <Loader2 size={13} className="inline align-middle me-1 animate-spin" />} Save draft
        </Button>
        <Button variant="primary" size="sm" disabled={!unpublished || !!busy} onClick={publish}>
          {busy === 'publish' && <Loader2 size={13} className="inline align-middle me-1 animate-spin" />} Publish
        </Button>
        <span className="text-[12px] text-slate">{unpublished ? (dirty ? 'You have unsaved changes.' : 'Saved as a draft. Buyers do not see it yet.') : 'Live: buyers see exactly this.'}</span>
      </div>
    </div>
  );
}
