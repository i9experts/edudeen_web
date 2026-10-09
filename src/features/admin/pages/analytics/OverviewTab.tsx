import { DollarSign, ShoppingCart, Store, Users, UserPlus, RotateCcw } from 'lucide-react';
import { MetricCard, Table, type TableColumn } from '@/components/comman/ui';
import { LineChart, BarChart } from '@/components/comman/charts';
import { useAdminAnalyticsOverview, useAdminAnalyticsRevenueOverTime, useAdminAnalyticsOrdersOverTime } from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatCurrency, formatNumber, formatPercent, formatBucketLabel, formatDate } from '@/components/comman/analytics/format';
import { currencySymbol } from '@/utils/currency';

interface ComparisonRow { metric: string; current: string; previous: string }

/** Must match the number of entries in `metrics` below. */
const METRIC_CARD_COUNT = 12;

export function OverviewTab({ params, compareToPreviousPeriod }: { params: BaseAnalyticsParams; compareToPreviousPeriod: boolean }) {
  const overview = useAdminAnalyticsOverview(params);
  const revenue = useAdminAnalyticsRevenueOverTime(params);
  const orders = useAdminAnalyticsOrdersOverTime(params);

  if (overview.error) {
    return <AnalyticsErrorState message={overview.error} onRetry={overview.refetch} />;
  }

  const d = overview.data;
  const loading = overview.loading;

  // Fed to the matching stat tile below — only when that tile's own series
  // has actually loaded, never a placeholder shape (see MetricCard's own
  // "never fabricate one" note on `sparkline`).
  const revenueSparkline = revenue.data?.series.map(p => p.netRevenue);
  // The platform-wide series sums order subtotals as stored, so it only has a
  // single currency when the API says so — never assume USD.
  const revenueCurrency = revenue.data?.currency;
  const ordersSparkline = orders.data?.series.map(p => p.orderCount);

  const metrics = d && [
    { label: 'Total GMV', value: formatCurrency(d.totalGMV), icon: <DollarSign size={16} /> },
    {
      label: 'Total Revenue (net)', value: formatCurrency(d.totalRevenue), icon: <DollarSign size={16} />,
      trend: d.totalRevenueChangePercent != null ? formatPercent(d.totalRevenueChangePercent, { signed: true }) : undefined,
      trendUp: (d.totalRevenueChangePercent ?? 0) >= 0,
      sparkline: revenueSparkline,
    },
    { label: 'Platform Earnings', value: formatCurrency(d.platformEarnings), icon: <DollarSign size={16} />, sub: d.platformCommission > 0 ? `Commission ${formatCurrency(d.platformCommission)} + Subs ${formatCurrency(d.subscriptionRevenue)}` : `Seller plan fees ${formatCurrency(d.subscriptionRevenue)}` },
    {
      label: 'Total Orders', value: formatNumber(d.totalOrders), icon: <ShoppingCart size={16} />,
      trend: `${d.totalOrdersChange >= 0 ? '+' : ''}${d.totalOrdersChange} vs prev.`, trendUp: d.totalOrdersChange >= 0,
      sparkline: ordersSparkline,
    },
    { label: 'Seller Accounts', value: formatNumber(d.totalSellers), icon: <Users size={16} /> },
    {
      label: 'Sellers Active This Month', value: formatNumber(d.sellersActiveThisMonth), icon: <Users size={16} />,
      trend: `${d.sellersActiveThisMonthChange >= 0 ? '+' : ''}${d.sellersActiveThisMonthChange} vs prev.`, trendUp: d.sellersActiveThisMonthChange >= 0,
    },
    { label: 'Total Stores', value: formatNumber(d.totalStores), icon: <Store size={16} /> },
    { label: 'Active Stores', value: formatNumber(d.activeStores), icon: <Store size={16} /> },
    { label: 'Total Customers', value: formatNumber(d.totalCustomers), icon: <Users size={16} /> },
    { label: 'New Users', value: formatNumber(d.newUsers), icon: <UserPlus size={16} /> },
    { label: 'Refunds', value: formatCurrency(d.totalRefunds), icon: <RotateCcw size={16} />, sub: `${formatPercent(d.refundRatePercent)} of GMV` },
    { label: 'Cancelled Orders', value: formatNumber(d.cancelledOrders), icon: <ShoppingCart size={16} /> },
  ];

  const comparisonColumns: TableColumn<ComparisonRow>[] = [
    { key: 'metric', header: 'Metric' },
    { key: 'previous', header: 'Previous Period', align: 'right' },
    { key: 'current', header: 'Current Period', align: 'right' },
  ];

  const comparisonRows: ComparisonRow[] = d?.previousPeriod ? [
    { metric: 'Total GMV', current: formatCurrency(d.totalGMV), previous: formatCurrency(d.previousPeriod.totalGMV) },
    { metric: 'Total Revenue (net)', current: formatCurrency(d.totalRevenue), previous: formatCurrency(d.previousPeriod.totalRevenue) },
    { metric: 'Total Orders', current: formatNumber(d.totalOrders), previous: formatNumber(d.previousPeriod.totalOrders) },
    { metric: 'Sellers Active This Month', current: formatNumber(d.sellersActiveThisMonth), previous: formatNumber(d.previousPeriod.sellersActiveThisMonth) },
    { metric: 'Refunds', current: formatCurrency(d.totalRefunds), previous: formatCurrency(d.previousPeriod.totalRefunds) },
    { metric: 'Cancelled Orders', current: formatNumber(d.cancelledOrders), previous: formatNumber(d.previousPeriod.cancelledOrders) },
  ] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {loading || !metrics
          ? Array.from({ length: METRIC_CARD_COUNT }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
          : metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {d?.note && (
        <p className="text-[12px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">{d.note}</p>
      )}

      {compareToPreviousPeriod && d?.previousPeriod && (
        <div className="bg-white border border-bone rounded-xl">
          <div className="px-5 pt-4 pb-3">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Period Comparison</p>
            <p className="text-[12px] text-slate">
              {formatDate(d.previousPeriod.period.from)} – {formatDate(d.previousPeriod.period.to)} vs. {formatDate(d.period.from)} – {formatDate(d.period.to)}
            </p>
          </div>
          <Table columns={comparisonColumns} data={comparisonRows} keyExtractor={r => r.metric} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {revenue.loading ? (
          <ChartCardSkeleton height={220} />
        ) : revenue.error ? (
          <AnalyticsErrorState message={revenue.error} onRetry={revenue.refetch} />
        ) : (
          <LineChart
            title="Revenue Over Time"
            subtitle={revenueCurrency
              ? `Gross vs. net, platform-wide (${revenueCurrency})`
              : 'Gross vs. net, platform-wide · each order in its own currency, not converted'}
            data={(revenue.data?.series ?? []).map(p => ({
              label: formatBucketLabel(p.date, revenue.data!.granularity),
              gross: p.grossRevenue,
              net: p.netRevenue,
            }))}
            lines={[
              { dataKey: 'gross', label: 'Gross Revenue', color: '#64727B' },
              { dataKey: 'net', label: 'Net Revenue', color: '#174771' },
            ]}
            valuePrefix={revenueCurrency ? currencySymbol(revenueCurrency) : ''}
          />
        )}

        {orders.loading ? (
          <ChartCardSkeleton height={220} />
        ) : orders.error ? (
          <AnalyticsErrorState message={orders.error} onRetry={orders.refetch} />
        ) : (
          <BarChart
            title="Orders Over Time"
            subtitle="Non-cancelled orders, platform-wide"
            data={(orders.data?.series ?? []).map(p => ({
              label: formatBucketLabel(p.date, orders.data!.granularity),
              orders: p.orderCount,
            }))}
            dataKey="orders"
            color="#174771"
          />
        )}
      </div>
    </div>
  );
}
