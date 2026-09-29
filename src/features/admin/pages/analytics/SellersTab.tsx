import { useState } from 'react';
import { FilterDropdown, Table, MetricCard, type TableColumn } from '@/components/comman/ui';
import { BarChart } from '@/components/comman/charts';
import {
  useAdminAnalyticsTopSellers,
  useAdminAnalyticsSellerPerformance,
  useAdminAnalyticsSellerRegistrationTrends,
} from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams, SellerPerformanceRow, TopSellerRow } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatCurrency, formatNumber, formatBucketLabel } from '@/components/comman/analytics/format';
import { Store } from 'lucide-react';

const RANK_OPTIONS = [
  { value: 'desc', label: 'Top performers' },
  { value: 'asc', label: 'Lowest performers' },
];
const SORT_OPTIONS = [
  { value: 'revenue', label: 'Sort by revenue' },
  { value: 'orders', label: 'Sort by orders' },
];

export function SellersTab({ params }: { params: BaseAnalyticsParams }) {
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [sort, setSort] = useState<'revenue' | 'orders'>('revenue');
  const [page, setPage] = useState(1);

  const topSellers = useAdminAnalyticsTopSellers({ ...params, limit: 10, sort, order });
  const trends = useAdminAnalyticsSellerRegistrationTrends(params);
  const performance = useAdminAnalyticsSellerPerformance({ ...params, page, limit: 10, sort, order });

  const topColumns: TableColumn<TopSellerRow>[] = [
    { key: 'name', header: 'Seller', render: r => <div><p className="font-medium">{r.name}</p><p className="text-[11px] text-slate">{r.email}</p></div> },
    { key: 'orderCount', header: 'Orders', align: 'right' },
    { key: 'unitsSold', header: 'Units Sold', align: 'right' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
  ];

  const performanceColumns: TableColumn<SellerPerformanceRow>[] = [
    { key: 'name', header: 'Seller', render: r => <div><p className="font-medium">{r.name}</p><p className="text-[11px] text-slate">{r.email}</p></div> },
    { key: 'storeCount', header: 'Stores', align: 'right', render: r => `${r.activeStoreCount}/${r.storeCount} active` },
    { key: 'orderCount', header: 'Orders', align: 'right' },
    { key: 'unitsSold', header: 'Units', align: 'right' },
    { key: 'refundRatePercent', header: 'Refund Rate', align: 'right', render: r => `${r.refundRatePercent}%` },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
  ];

  const latestCumulative = trends.data?.series?.length ? trends.data.series[trends.data.series.length - 1].cumulativeSellers : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {trends.loading ? (
            <ChartCardSkeleton />
          ) : trends.error ? (
            <AnalyticsErrorState message={trends.error} onRetry={trends.refetch} />
          ) : (
            <BarChart
              title="Seller Growth & Registration Trends"
              subtitle="New seller signups per period"
              data={(trends.data?.series ?? []).map(p => ({
                label: formatBucketLabel(p.date, trends.data!.granularity),
                newSellers: p.newSellers,
              }))}
              dataKey="newSellers"
              color="#174771"
            />
          )}
        </div>
        <MetricCard label="Seller Accounts (Cumulative)" value={latestCumulative != null ? formatNumber(latestCumulative) : '—'} loading={trends.loading} />
      </div>

      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Top / Lowest Performing Sellers</p>
          <div className="flex items-center gap-2">
            <FilterDropdown options={SORT_OPTIONS} value={sort} onChange={v => setSort(v as 'revenue' | 'orders')} />
            <FilterDropdown options={RANK_OPTIONS} value={order} onChange={v => setOrder(v as 'asc' | 'desc')} />
          </div>
        </div>
        {topSellers.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={topSellers.error} onRetry={topSellers.refetch} /></div>
        ) : (
          <Table
            columns={topColumns}
            data={topSellers.data ?? []}
            keyExtractor={r => r.sellerId}
            loading={topSellers.loading}
            emptyState={{ icon: <Store size={28} className="text-slate/50" />, title: 'No seller data yet' }}
          />
        )}
      </div>

      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Seller Performance</p>
          <p className="text-[12px] text-slate">Full ranking across every seller on the platform.</p>
        </div>
        {performance.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={performance.error} onRetry={performance.refetch} /></div>
        ) : (
          <Table
            columns={performanceColumns}
            data={performance.data?.sellers ?? []}
            keyExtractor={r => r.sellerId}
            loading={performance.loading}
            emptyState={{ icon: <Store size={28} className="text-slate/50" />, title: 'No sellers yet' }}
            pagination={{
              page,
              total: performance.data?.pagination.total ?? 0,
              perPage: 10,
              onChange: setPage,
              label: 'sellers',
            }}
          />
        )}
      </div>
    </div>
  );
}
