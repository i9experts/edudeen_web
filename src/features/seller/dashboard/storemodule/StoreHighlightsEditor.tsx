import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, GripVertical, Loader2, Star, X } from 'lucide-react';
import { Button, Input, Toggle } from '@/components/comman/ui';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useToast } from '@/contexts/ToastContext';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { apiGetPublicStoreProducts, type PublicStoreProduct } from '@/api/services/store';
import type { StorefrontHighlights } from '@/api/services/storeTheme';

export const MAX_FEATURED = 8;
const PICKER_PAGE = 9;

/**
 * Store highlights picker: Featured (up to 8 of your own active products, in the order you drag them), New arrivals and
 * Best sellers. CONTROLLED: the Customize-store page owns the value and the single Save draft / Publish bar, and the
 * preview panel renders the rows from the same value.
 */
export function StoreHighlightsEditor({ storeId, value, onChange }: { storeId: string; value: StorefrontHighlights; onChange: (next: StorefrontHighlights) => void }) {
  const toast = useToast();
  const cfg = value;
  // Functional updates against the latest value, so two quick clicks are two picks.
  const latest = useRef(value);
  latest.current = value;
  const setCfg = (fn: (c: StorefrontHighlights) => StorefrontHighlights) => { const next = fn(latest.current); latest.current = next; onChange(next); };
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
  const [limitHit, setLimitHit] = useState(false);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { if (limitHit) { toast.error(`You can feature up to ${MAX_FEATURED} products.`); setLimitHit(false); } }, [limitHit, toast]);
  useEffect(() => { setShowAll(false); }, [debounced]);
  const visibleProducts = showAll ? products : products.slice(0, PICKER_PAGE);
  const toggleProduct = (id: string) => {
    setCfg(c => {
      const cur = c.featuredProductIds;
      if (cur.includes(id)) return { ...c, featuredProductIds: cur.filter(x => x !== id) };
      if (cur.length >= MAX_FEATURED) { setLimitHit(true); return c; }
      return { ...c, featuredProductIds: [...cur, id] };
    });
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setCfg(c => ({ ...c, featuredProductIds: next }));
  };
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Featured picker */}
      <div>
        <p className="text-[13px] font-semibold text-carbon mb-1 flex items-center gap-1.5"><Star size={13} /> Featured products ({ids.length}/{MAX_FEATURED})</p>
        <p className="text-[12px] text-slate mb-3">Pick up to 8 of your own active products. Drag them (or use the arrows) to set the order buyers see.</p>

        <Input placeholder="Search your products…" value={query} onChange={e => setQuery(e.target.value)} className="mb-3" />
        {productsLoading && products.length === 0 ? (
          <p className="text-[12.5px] text-slate flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Loading products…</p>
        ) : productsError ? (
          <p className="text-[12.5px] text-error">Could not load your products. Change the search or reload the page.</p>
        ) : products.length === 0 ? (
          <p className="text-[12.5px] text-slate">{debounced ? `No products match “${debounced}”.` : 'No active products yet. Add a product first.'}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleProducts.map(p => {
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
        {products.length > PICKER_PAGE && !showAll && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAll(true)}>Show more ({products.length - PICKER_PAGE})</Button>
        )}
        <div className="mt-4 min-h-[170px]" aria-live="polite">
        <p className="text-[12px] font-semibold text-charcoal mb-2">Selected ({ids.length}/{MAX_FEATURED})</p>
        {ids.length > 0 ? (
          <ol className="flex flex-wrap gap-2 pb-2 list-none p-0 m-0">
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
        ) : <p className="text-[12px] text-slate">Nothing selected yet. Tap products above.</p>}
          {ids.length === 1 && <p role="alert" className="text-[12px] text-warning mt-2">Add 1 more product — rows with fewer than 2 are hidden from buyers.</p>}
        </div>

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

    </div>
  );
}
