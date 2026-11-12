import { useCallback, useEffect, useState } from 'react';
import { apiGetStorefrontHighlights, type StorefrontHighlightRows } from '@/api/services/product';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { storeHighlightRows } from '@/features/buyer/components/home/homeRules';
import { useStorefront } from '../StorefrontContext';
import { ProductStrip } from './FeaturedProductsSection';

const HEADINGS = { featured: 'Featured', newArrivals: 'New arrivals', bestSellers: 'Best sellers' } as const;

/** The highlight rows for given data: one product per row, max 8, a row with fewer than 2 products is hidden. Used by the store page AND the seller's preview. */
export function HighlightRows({ data }: { data: Pick<StorefrontHighlightRows, 'featured' | 'newArrivals' | 'bestSellers'> }) {
  const rows = storeHighlightRows(data);
  if (rows.length === 0) return null;
  return (
    <>
      {rows.map(r => <ProductStrip key={r.key} heading={HEADINGS[r.key]} products={r.products} row={r.key} />)}
    </>
  );
}

/** Buyer store page: the PUBLISHED highlight rows, above "All products". Re-reads when the seller publishes. */
export function StorefrontHighlights() {
  const { store } = useStorefront();
  const [data, setData] = useState<StorefrontHighlightRows | null>(null);

  const load = useCallback(() => {
    apiGetStorefrontHighlights(store.storeId).then(res => setData(res.data)).catch(() => {});
  }, [store.storeId]);

  useEffect(() => { setData(null); load(); }, [load]);
  useLiveRefresh(['store', 'storefront'], load);

  if (!data) return null; // no skeleton: the rows are optional and the catalogue below loads on its own
  return <HighlightRows data={data} />;
}
