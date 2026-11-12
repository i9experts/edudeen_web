import { useEffect, useState } from 'react';
import { apiListCollections, type CollectionData } from '@/api/services/collections';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';
import type { StoreBannerLinkType } from '@/api/services/storeBanner';

export interface SlideLink { linkType: StoreBannerLinkType; linkTarget: string }

const SELECT_CLS = 'w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10';

/**
 * Where a slide goes when tapped: nothing, one of the seller's OWN live products, or one of their active collections.
 * (The API refuses anything else, so there is no free-text field.) `value.linkType` outside product/collection = no link.
 */
export function SlideLinkPicker({ storeId, value, onChange }: { storeId: string; value: SlideLink | null; onChange: (v: SlideLink | null) => void }) {
  const kind: 'none' | 'product' | 'collection' = value?.linkType === 'product' ? 'product' : value?.linkType === 'collection' ? 'collection' : 'none';
  const products = useInventorySearch(storeId, { limit: 100, status: 'active', enabled: kind === 'product' });
  const [collections, setCollections] = useState<CollectionData[] | null>(null);
  const [colError, setColError] = useState(false);

  useEffect(() => {
    if (kind !== 'collection' || collections) return;
    let cancelled = false;
    setColError(false);
    apiListCollections(storeId)
      .then(res => { if (!cancelled) setCollections((res.data ?? []).filter(c => c.status === 'active')); })
      .catch(() => { if (!cancelled) setColError(true); });
    return () => { cancelled = true; };
  }, [kind, storeId, collections]);

  const liveProducts = products.products.filter(p => p.status === 'active');
  const hasSelection = !!value?.linkTarget;

  return (
    <div className="flex flex-col gap-2">
      <select
        aria-label="When tapped, open"
        value={kind}
        onChange={e => {
          const k = e.target.value;
          onChange(k === 'product' ? { linkType: 'product', linkTarget: '' } : k === 'collection' ? { linkType: 'collection', linkTarget: '' } : null);
        }}
        className={SELECT_CLS}
      >
        <option value="none">No link</option>
        <option value="product">One of my products</option>
        <option value="collection">One of my collections</option>
      </select>

      {kind === 'product' && (
        <>
          <input
            type="search"
            value={products.query}
            onChange={e => products.setQuery(e.target.value)}
            placeholder="Search your products by name or SKU…"
            aria-label="Search your products"
            className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white"
          />
          {products.error ? (
            <p className="text-[12px] text-error">{products.error}. <button type="button" onClick={products.retry} className="underline bg-transparent border-0 cursor-pointer text-error p-0">Try again</button></p>
          ) : products.loading && liveProducts.length === 0 ? (
            <p className="text-[12px] text-slate">Loading your products…</p>
          ) : liveProducts.length === 0 && !hasSelection ? (
            <p className="text-[12px] text-slate">{products.searching ? 'No live product matches that search.' : 'You have no live products yet. Publish one first, or leave this slide without a link.'}</p>
          ) : (
            <select
              aria-label="Product"
              value={value?.linkTarget ?? ''}
              onChange={e => onChange({ linkType: 'product', linkTarget: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">Choose a product…</option>
              {hasSelection && !liveProducts.some(p => p.productId === value!.linkTarget) && <option value={value!.linkTarget}>Current product</option>}
              {liveProducts.map(p => <option key={p.productId} value={p.productId}>{p.name}</option>)}
            </select>
          )}
        </>
      )}

      {kind === 'collection' && (
        colError ? (
          <p className="text-[12px] text-error">Couldn&apos;t load your collections. <button type="button" onClick={() => { setCollections(null); setColError(false); }} className="underline bg-transparent border-0 cursor-pointer text-error p-0">Try again</button></p>
        ) : !collections ? (
          <p className="text-[12px] text-slate">Loading your collections…</p>
        ) : collections.length === 0 && !hasSelection ? (
          <p className="text-[12px] text-slate">You have no visible collections yet. Create one in Customize your store, or leave this slide without a link.</p>
        ) : (
          <select
            aria-label="Collection"
            value={value?.linkTarget ?? ''}
            onChange={e => onChange({ linkType: 'collection', linkTarget: e.target.value })}
            className={SELECT_CLS}
          >
            <option value="">Choose a collection…</option>
            {hasSelection && !collections.some(c => c._id === value!.linkTarget) && <option value={value!.linkTarget}>Current collection</option>}
            {collections.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        )
      )}
    </div>
  );
}
