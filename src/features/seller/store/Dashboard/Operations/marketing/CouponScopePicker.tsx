import { useMemo } from 'react';
import { Button } from '@/components/comman/ui';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';
import { useSellerCategories } from '@/hooks/store/useSellerCategories';
import type { CategoryNode } from '@/api/services/categories';
import { INPUT_CLS } from './marketingShared';

function flatten(nodes: CategoryNode[], depth = 0, out: { id: string; name: string; depth: number }[] = []) {
  for (const n of nodes) {
    out.push({ id: n._id, name: n.name, depth });
    if (n.children?.length) flatten(n.children, depth + 1, out);
  }
  return out;
}

/** Product or category multi-picker for a scoped coupon. Loads its own data only when shown. */
export function CouponScopePicker({ storeId, kind, value, onChange, error }: {
  storeId: string;
  kind: 'products' | 'categories';
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <div>
      {kind === 'products'
        ? <ProductList storeId={storeId} value={value} toggle={toggle} />
        : <CategoryList value={value} toggle={toggle} />}
      <p className="text-[11.5px] text-slate mt-1">{value.length} selected</p>
      {error && <p className="text-[11.5px] text-error mt-1" role="alert">{error}</p>}
    </div>
  );
}

function ProductList({ storeId, value, toggle }: { storeId: string; value: string[]; toggle: (id: string) => void }) {
  const { query, setQuery, products, loading, error, retry } = useInventorySearch(storeId, { limit: 30 });
  return (
    <div className="flex flex-col gap-2">
      <input aria-label="Search your products" placeholder="Search your products" value={query} onChange={e => setQuery(e.target.value)} className={INPUT_CLS} />
      <div className="max-h-52 overflow-y-auto border border-bone rounded-[8px] divide-y divide-bone">
        {loading && products.length === 0 ? <p className="p-3 text-xs text-slate">Loading…</p>
          : error ? <div className="p-3 flex items-center gap-3"><p className="text-xs text-error">{error}</p><Button variant="ghost" size="sm" onClick={retry}>Retry</Button></div>
          : products.length === 0 ? <p className="p-3 text-xs text-slate">No products found.</p>
          : products.map(p => (
            <label key={p.productId} className="flex items-center gap-3 px-3 min-h-11 cursor-pointer text-[13px] text-carbon">
              <input type="checkbox" checked={value.includes(p.productId)} onChange={() => toggle(p.productId)} className="size-4" />
              <span className="min-w-0 truncate">{p.name}</span>
            </label>
          ))}
      </div>
    </div>
  );
}

function CategoryList({ value, toggle }: { value: string[]; toggle: (id: string) => void }) {
  const { categories, loading, error, refetch } = useSellerCategories();
  const rows = useMemo(() => flatten(categories), [categories]);
  return (
    <div className="max-h-52 overflow-y-auto border border-bone rounded-[8px] divide-y divide-bone">
      {loading ? <p className="p-3 text-xs text-slate">Loading…</p>
        : error ? <div className="p-3 flex items-center gap-3"><p className="text-xs text-error">Couldn't load categories</p><Button variant="ghost" size="sm" onClick={refetch}>Retry</Button></div>
        : rows.length === 0 ? <p className="p-3 text-xs text-slate">No categories available.</p>
        : rows.map(r => (
          <label key={r.id} className="flex items-center gap-3 px-3 min-h-11 cursor-pointer text-[13px] text-carbon" style={{ paddingInlineStart: 12 + r.depth * 16 }}>
            <input type="checkbox" checked={value.includes(r.id)} onChange={() => toggle(r.id)} className="size-4" />
            <span className="min-w-0 truncate">{r.name}</span>
          </label>
        ))}
    </div>
  );
}
