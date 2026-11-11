import { useEffect, useState } from 'react';
import { Trash2, Star, ArrowUp, ArrowDown } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { SkeletonBox, Button } from '@/components/comman/ui';
import { apiUpdatePinnedProducts } from '@/api/services/store';
import { useMarketingProductSearch } from './useMarketingProductSearch';

export function FeaturedTab() {
  const { store, storeId } = useStoreWorkspace();
  const { productSearch, inventory, inventoryLoading, productNames, productSearchInput, productSearchEmpty } = useMarketingProductSearch(storeId);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinnedSaving, setPinnedSaving] = useState(false);
  const [pinnedError, setPinnedError] = useState('');
  const [pinnedSaved, setPinnedSaved] = useState(false);


  useEffect(() => {
    if (!storeId) return;
    setPinnedIds(store?.pinnedProductIds ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

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

  return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-carbon">Featured products</p>
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
            <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.06em] mb-2">Pinned Order</p>
            <div className="flex flex-col gap-1.5">
              {pinnedIds.map((id, i) => {
                const name = productNames[id];
                return (
                  <div key={id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-cream">
                    <span className="text-[12px] text-slate w-4">{i + 1}</span>
                    <span className="text-[13px] text-charcoal flex-1 truncate">{name ?? id}</span>
                    <button aria-label="Move up" onClick={() => movePinned(i, -1)} disabled={i === 0} className="p-1 rounded-md border-0 bg-transparent cursor-pointer disabled:opacity-30 hover:bg-bone"><ArrowUp size={13} /></button>
                    <button aria-label="Move down" onClick={() => movePinned(i, 1)} disabled={i === pinnedIds.length - 1} className="p-1 rounded-md border-0 bg-transparent cursor-pointer disabled:opacity-30 hover:bg-bone"><ArrowDown size={13} /></button>
                    <button aria-label="Delete" onClick={() => togglePin(id)} className="p-1 rounded-md border-0 bg-transparent cursor-pointer hover:bg-bone text-error"><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-bone rounded-[10px] px-[18px] py-4">
          <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.06em] mb-2">All Products</p>
          {productSearchInput}
          {productSearch.error && <p className="text-xs text-error mb-2">{productSearch.error} <button type="button" onClick={productSearch.retry} className="underline cursor-pointer border-0 bg-transparent text-error">Retry</button></p>}
          {inventoryLoading ? (
            <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={36} rounded="8px" />)}</div>
          ) : (
            <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto">
              {productSearchEmpty}
              {inventory.map(p => (
                <button
                  key={p.productId}
                  type="button"
                  aria-pressed={pinnedIds.includes(p.productId)}
                  aria-label={`${pinnedIds.includes(p.productId) ? 'Remove from' : 'Add to'} featured: ${p.name}`}
                  onClick={() => togglePin(p.productId)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 min-h-11 w-full rounded-lg cursor-pointer hover:bg-cream border-0 bg-transparent text-start"
                >
                  {p.image && <img src={p.image} alt="" className="w-7 h-7 rounded-md object-cover" />}
                  <span className="text-[13px] text-charcoal flex-1 truncate">{p.name}</span>
                  <Star size={16} className={pinnedIds.includes(p.productId) ? 'text-brand-orange fill-brand-orange' : 'text-slate'} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}
