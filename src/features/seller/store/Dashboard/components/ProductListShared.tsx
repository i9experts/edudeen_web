import { ShoppingBag, Package, Download, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { MetricCard } from '@/components/comman/ui';
import type { InventoryProduct } from '@/api/services/product';

// Shared by StoreInventory (Operations/inventory/Inventory.tsx) and
// StoreProductList (StoreSection/products/StoreProductList.tsx) — two
// distinct routes/pages that both list a store's products, so they're kept
// separate, but this thumbnail cell and stats grid are byte-identical
// between them and belong in exactly one place.

// ── Product thumbnail cell ────────────────────────────────────────────────────
export function ProductCell({ p }: { p: InventoryProduct }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg shrink-0 bg-brand-pale-orange border border-[#edebe2] flex items-center justify-center overflow-hidden">
        {p.image
          ? <img loading="lazy" decoding="async" src={p.image} alt="" className="w-full h-full object-cover" />
          : p.type === 'digital'
            ? <Download size={14} className="text-brand-orange" />
            : <Package  size={14} className="text-brand-orange" />}
      </div>
      <div>
        <p className="text-[13px] font-medium text-charcoal mb-[1px]">{p.name}</p>
        <p className="text-[12px] text-slate">SKU: {p.sku}</p>
      </div>
    </div>
  );
}

// ── Stats grid ─────────────────────────────────────────────────────────────────
export interface ProductListStats {
  totalProducts: number;
  inStock:       number;
  lowStock:      number;
  outOfStock:    number;
}

export function ProductStatsGrid({ stats, loading }: { stats: ProductListStats | null; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard label="Total Products" value={stats?.totalProducts ?? 0} icon={<ShoppingBag size={16} />} loading={loading && !stats} />
      <MetricCard label="In Stock"       value={stats?.inStock ?? 0}       icon={<CheckCircle2 size={16} />} loading={loading && !stats} />
      <MetricCard label="Low Stock"      value={stats?.lowStock ?? 0}      icon={<AlertTriangle size={16} />} loading={loading && !stats} />
      <MetricCard label="Out of Stock"   value={stats?.outOfStock ?? 0}    icon={<XCircle size={16} />}      loading={loading && !stats} />
    </div>
  );
}
