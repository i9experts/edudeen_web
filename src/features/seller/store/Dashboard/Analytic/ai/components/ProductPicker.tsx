import { useEffect, useState } from 'react';
import { Select } from '@/components/comman/ui/Input';
import { useStoreProductPicker } from '@/hooks/seller/useStoreProductPicker';

interface ProductPickerProps {
  storeId: string;
  value: string;
  onChange: (productId: string) => void;
  allowNone?: boolean;
  noneLabel?: string;
}

export function ProductPicker({ storeId, value, onChange, allowNone = true, noneLabel = '— No product (freeform) —' }: ProductPickerProps) {
  const { products, loading, query, setQuery, total } = useStoreProductPicker(storeId);
  // Keep the chosen product's label even when a later search no longer returns it.
  const [picked, setPicked] = useState<{ productId: string; name: string } | null>(null);
  useEffect(() => {
    const hit = products.find(p => p.productId === value);
    if (hit) setPicked({ productId: hit.productId, name: hit.name });
    else if (!value) setPicked(null);
  }, [products, value]);

  const options = picked && value === picked.productId && !products.some(p => p.productId === picked.productId)
    ? [picked, ...products]
    : products;
  // Only offer search once the catalog is bigger than the first page.
  const showSearch = !!query || total > products.length;

  return (
    <div className="flex flex-col gap-1.5">
      {showSearch && (
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search products by name or SKU…"
          className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white"
        />
      )}
      <Select value={value} disabled={loading && products.length === 0} onChange={e => onChange(e.target.value)}>
        {allowNone && <option value="">{noneLabel}</option>}
        {options.map(p => (
          <option key={p.productId} value={p.productId}>{p.name}</option>
        ))}
        {!loading && query && products.length === 0 && <option disabled value="__none">No products match “{query}”</option>}
      </Select>
    </div>
  );
}
