import { useInventorySearch } from '@/hooks/seller/useInventorySearch';

/** Lightweight product list for AI Studio's product-picker dropdowns — reuses the existing inventory endpoint.
 *  First page loads up-front; `setQuery` searches the whole catalog server-side (name/SKU). */
export function useStoreProductPicker(storeId: string) {
  const { products, loading, error, query, setQuery, total } = useInventorySearch(storeId, { limit: 100 });
  return { products, loading, error, query, setQuery, total };
}
