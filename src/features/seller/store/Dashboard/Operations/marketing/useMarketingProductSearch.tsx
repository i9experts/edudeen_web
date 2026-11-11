import { useEffect, useState } from 'react';
import { type InventoryProduct } from '@/api/services/product';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';

/** Product list shared by the Featured and Automatic Discounts pickers: first 100 load up-front, typing searches the whole catalog server-side (name/SKU). */
export function useMarketingProductSearch(storeId: string) {
  const productSearch = useInventorySearch(storeId, { limit: 100, enabled: !!storeId });
  const inventory: InventoryProduct[] = productSearch.products;
  const inventoryLoading = productSearch.loading && inventory.length === 0 && !productSearch.searching;
  const { setQuery: setProductQuery } = productSearch;
  // Names of every product seen so far, so pinned/selected items keep their
  // label even when the current search doesn't return them.
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (inventory.length === 0) return;
    setProductNames(prev => ({ ...prev, ...Object.fromEntries(inventory.map(p => [p.productId, p.name])) }));
  }, [inventory]);
  const productSearchInput = (productSearch.total > inventory.length || productSearch.query) ? (
    <input
      type="search"
      value={productSearch.query}
      onChange={e => setProductQuery(e.target.value)}
      placeholder="Search products by name or SKU…"
      className="w-full mb-2 px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white"
    />
  ) : null;
  const productSearchEmpty = !productSearch.loading && productSearch.searching && inventory.length === 0
    ? <p className="text-xs text-slate px-1 py-2">No products match “{productSearch.query.trim()}”.</p>
    : null;
  return { productSearch, inventory, inventoryLoading, productNames, productSearchInput, productSearchEmpty };
}
