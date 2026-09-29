import { useEffect, useState } from 'react';
import { FilterDropdown, Table, Badge, EmptyState, type TableColumn } from '@/components/comman/ui';
import { DonutChart } from '@/components/comman/charts';
import { PackageX, Package } from 'lucide-react';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import {
  useAdminAnalyticsTopProducts,
  useAdminAnalyticsTopCategories,
  useAdminAnalyticsProductPerformance,
  useAdminAnalyticsInventoryInsights,
} from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams, ProductPerformanceRow, TopProductRow } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton, TableCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatCurrency } from '@/components/comman/analytics/format';

const SORT_OPTIONS = [
  { value: 'revenue', label: 'Sort by revenue' },
  { value: 'units_sold', label: 'Sort by units sold' },
];

function flattenCategories(nodes: CategoryNode[], depth = 0): { value: string; label: string }[] {
  return nodes.flatMap(n => [
    { value: n._id, label: `${'— '.repeat(depth)}${n.name}` },
    ...flattenCategories(n.children ?? [], depth + 1),
  ]);
}

export function ProductsTab({ params }: { params: BaseAnalyticsParams }) {
  const [sort, setSort] = useState<'revenue' | 'units_sold'>('revenue');
  const [categoryId, setCategoryId] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGetCategoryTree()
      .then(res => setCategoryOptions(flattenCategories(res.data)))
      .catch(() => setCategoryOptions([]));
  }, []);

  const topProducts = useAdminAnalyticsTopProducts({ ...params, limit: 10, sort, categoryId: categoryId || undefined });
  const topCategories = useAdminAnalyticsTopCategories({ ...params, limit: 8, sort });
  const performance = useAdminAnalyticsProductPerformance({ ...params, page, limit: 10, categoryId: categoryId || undefined });
  const inventory = useAdminAnalyticsInventoryInsights(params);

  const productColumns: TableColumn<TopProductRow>[] = [
    { key: 'name', header: 'Product' },
    { key: 'orderCount', header: 'Orders', align: 'right' },
    { key: 'unitsSold', header: 'Units Sold', align: 'right' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
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
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FilterDropdown
          options={[{ value: '', label: 'All categories' }, ...categoryOptions]}
          value={categoryId}
          onChange={setCategoryId}
        />
        <FilterDropdown options={SORT_OPTIONS} value={sort} onChange={v => setSort(v as 'revenue' | 'units_sold')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-bone rounded-xl">
          <div className="px-5 pt-4 pb-3">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Top Products</p>
          </div>
          {topProducts.error ? (
            <div className="px-5 pb-5"><AnalyticsErrorState message={topProducts.error} onRetry={topProducts.refetch} /></div>
          ) : (
            <Table
              columns={productColumns}
              data={topProducts.data ?? []}
              keyExtractor={r => r.productId}
              loading={topProducts.loading}
              emptyState={{ icon: <Package size={28} className="text-slate/50" />, title: 'No product data yet' }}
            />
          )}
        </div>

        {topCategories.loading ? (
          <ChartCardSkeleton height={200} />
        ) : topCategories.error ? (
          <AnalyticsErrorState message={topCategories.error} onRetry={topCategories.refetch} />
        ) : (
          <DonutChart
            title="Top Categories"
            data={(topCategories.data ?? []).map(c => ({ label: c.name, value: sort === 'units_sold' ? c.unitsSold : c.revenue }))}
          />
        )}
      </div>

      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Product Performance</p>
          <p className="text-[12px] text-slate">Every listed product platform-wide, ranked by revenue.</p>
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

      <div className="bg-white border border-bone rounded-xl px-5 py-5">
        <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-1">Inventory Insights</p>
        {inventory.loading ? (
          <TableCardSkeleton rows={3} />
        ) : inventory.error ? (
          <AnalyticsErrorState message={inventory.error} onRetry={inventory.refetch} />
        ) : inventory.data ? (
          <>
            <p className="text-[12px] text-slate mb-4">{inventory.data.note}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-2">Out of Stock ({inventory.data.outOfStockCount})</p>
                {(inventory.data.outOfStock ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate">None — nice.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {(inventory.data.outOfStock ?? []).slice(0, 6).map(p => (
                      <li key={p.productId} className="text-[12px] text-graphite truncate">{p.name}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-2">Fast Moving</p>
                {(inventory.data.fastMoving ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate">No fast movers yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {(inventory.data.fastMoving ?? []).slice(0, 6).map(p => (
                      <li key={p.productId} className="text-[12px] text-graphite truncate">{p.name} — {p.sellThroughRatePercent}% sell-through</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-2">Reorder Suggestions</p>
                {(inventory.data.reorderSuggestions ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate">Nothing needs reordering.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {(inventory.data.reorderSuggestions ?? []).slice(0, 6).map(p => (
                      <li key={p.productId} className="text-[12px] text-graphite truncate">{p.name} — ~{p.estimatedWeeksRemaining}w left</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyState icon={<PackageX size={28} className="text-slate" />} title="No inventory data" />
        )}
      </div>
    </div>
  );
}
