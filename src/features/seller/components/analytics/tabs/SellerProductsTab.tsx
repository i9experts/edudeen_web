import { useState } from 'react';
import { FilterDropdown, Table, Badge, type TableColumn } from '@/components/comman/ui';
import { Package } from 'lucide-react';
import {
  useSellerAnalyticsTopProducts,
  useSellerAnalyticsProductPerformance,
  useSellerAnalyticsInventoryInsights,
} from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams, ProductPerformanceRow, TopProductRow } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { TableCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatMoneyCompact } from '@/utils/currency';
import { SellerProductTableCard } from './SellerProductTableCard';

const SORT_OPTIONS = [
  { value: 'revenue', label: 'Sort by revenue' },
  { value: 'units_sold', label: 'Sort by units sold' },
];

export function SellerProductsTab({ params, currency }: { params: SellerAnalyticsParams; currency?: string | null }) {
  const storeId = typeof params.storeId === 'string' ? params.storeId : '';
  const [sort, setSort] = useState<'revenue' | 'units_sold'>('revenue');
  const [page, setPage] = useState(1);

  const topProducts = useSellerAnalyticsTopProducts({ ...params, limit: 10, sort });
  const performance = useSellerAnalyticsProductPerformance({ ...params, page, limit: 10 });
  const inventory = useSellerAnalyticsInventoryInsights(params);

  const topColumns: TableColumn<TopProductRow>[] = [
    { key: 'name', header: 'Product' },
    { key: 'orderCount', header: 'Orders', align: 'right' },
    { key: 'unitsSold', header: 'Units Sold', align: 'right' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatMoneyCompact(r.revenue, currency) },
  ];

  const performanceColumns: TableColumn<ProductPerformanceRow>[] = [
    { key: 'name', header: 'Product', render: r => (
      <div className="flex items-center gap-2">
        <span>{r.name}</span>
        {r.isLowPerformer && <Badge color="yellow" size="sm">Low performer</Badge>}
      </div>
    ) },
    { key: 'unitsSold', header: 'Units Sold', align: 'right' },
    { key: 'currentStock', header: 'Stock', align: 'right' },
    { key: 'refundRatePercent', header: 'Refund Rate', align: 'right', render: r => `${r.refundRatePercent}%` },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatMoneyCompact(r.revenue, currency) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {storeId && <SellerProductTableCard params={params} storeId={storeId} currency={currency} />}
      <div className="bg-white border border-bone rounded-[10px]">
        <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] font-bold text-charcoal">Top Products</p>
          <FilterDropdown options={SORT_OPTIONS} value={sort} onChange={v => setSort(v as 'revenue' | 'units_sold')} />
        </div>
        {topProducts.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={topProducts.error} onRetry={topProducts.refetch} /></div>
        ) : (
          <Table
            columns={topColumns}
            data={topProducts.data ?? []}
            keyExtractor={r => r.productId}
            loading={topProducts.loading}
            emptyState={{ icon: <Package size={28} className="text-slate/50" />, title: 'No product data yet' }}
          />
        )}
      </div>

      <div className="bg-white border border-bone rounded-[10px]">
        <div className="px-5 pt-4 pb-3">
          <p className="text-[14px] font-bold text-charcoal">Product Performance</p>
          <p className="text-[12px] text-slate">Every listed product, ranked by revenue.</p>
        </div>
        {performance.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={performance.error} onRetry={performance.refetch} /></div>
        ) : (
          <Table
            columns={performanceColumns}
            data={performance.data?.products ?? []}
            keyExtractor={r => r.productId}
            loading={performance.loading}
            emptyState={{ icon: <Package size={28} className="text-slate/50" />, title: 'No products yet' }}
            pagination={{
              page,
              total: performance.data?.pagination.total ?? 0,
              perPage: 10,
              onChange: setPage,
              label: 'products',
            }}
          />
        )}
      </div>

      <div className="bg-white border border-bone rounded-[10px] px-5 py-5">
        <p className="text-[14px] font-bold text-charcoal mb-1">Inventory Insights</p>
        {inventory.loading ? (
          <TableCardSkeleton rows={3} />
        ) : inventory.error ? (
          <AnalyticsErrorState message={inventory.error} onRetry={inventory.refetch} />
        ) : inventory.data ? (
          <>
            <p className="text-[12px] text-slate mb-4">{inventory.data.note}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-2">Out of Stock ({inventory.data.outOfStock.length})</p>
                {inventory.data.outOfStock.length === 0 ? (
                  <p className="text-[12px] text-slate">None — nice.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {inventory.data.outOfStock.slice(0, 6).map(p => (
                      <li key={p.productId} className="text-[12px] text-graphite truncate">{p.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-2">Fast Moving</p>
                {inventory.data.fastMoving.length === 0 ? (
                  <p className="text-[12px] text-slate">No fast movers yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {inventory.data.fastMoving.slice(0, 6).map(p => (
                      <li key={p.productId} className="text-[12px] text-graphite truncate">{p.name} — {p.sellThroughRatePercent}% sell-through</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-2">Reorder Suggestions</p>
                {inventory.data.reorderSuggestions.length === 0 ? (
                  <p className="text-[12px] text-slate">Nothing needs reordering.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {inventory.data.reorderSuggestions.slice(0, 6).map(p => (
                      <li key={p.productId} className="text-[12px] text-graphite truncate">{p.name} — ~{p.estimatedWeeksRemaining}w left</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
