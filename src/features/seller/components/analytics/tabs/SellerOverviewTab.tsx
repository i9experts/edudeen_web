import { DollarSign, ShoppingCart, RotateCcw, Users } from 'lucide-react';
import { MetricCard, Table, type TableColumn } from '@/components/comman/ui';
import { LineChart, BarChart } from '@/components/comman/charts';
import { useSellerAnalyticsOverview, useSellerAnalyticsRevenueOverTime, useSellerAnalyticsOrdersOverTime } from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatNumber, formatPercent, formatBucketLabel, formatDate } from '@/components/comman/analytics/format';
import { formatMoneyCompact, currencySymbol } from '@/utils/currency';

interface ComparisonRow { metric: string; current: string; previous: string }

export function SellerOverviewTab({ params, compareToPreviousPeriod, currency }: { params: SellerAnalyticsParams; compareToPreviousPeriod: boolean; currency?: string | null }) {
  const overview = useSellerAnalyticsOverview(params);
  const revenue = useSellerAnalyticsRevenueOverTime(params);
  const orders = useSellerAnalyticsOrdersOverTime(params);

  if (overview.error) {
    return <AnalyticsErrorState message={overview.error} onRetry={overview.refetch} />;
  }

  const d = overview.data;
  const loading = overview.loading;

  const metrics = d && [
    {
      label: 'Total Revenue (net)', value: formatMoneyCompact(d.totalRevenue, currency), icon: <DollarSign size={16} />,
      trend: d.totalRevenueChangePercent != null ? formatPercent(d.totalRevenueChangePercent, { signed: true }) : undefined,
      trendUp: (d.totalRevenueChangePercent ?? 0) >= 0,
    },
    { label: 'Gross Revenue', value: formatMoneyCompact(d.grossRevenue, currency), icon: <DollarSign size={16} /> },
    {
      label: 'Total Orders', value: formatNumber(d.totalOrders), icon: <ShoppingCart size={16} />,
      trend: `${d.totalOrdersChange >= 0 ? '+' : ''}${d.totalOrdersChange} vs prev.`, trendUp: d.totalOrdersChange >= 0,
    },
    {
      label: 'Avg. Order Value', value: formatMoneyCompact(d.avgOrderValue, currency), icon: <DollarSign size={16} />,
      trend: d.avgOrderValueChangePercent != null ? formatPercent(d.avgOrderValueChangePercent, { signed: true }) : undefined,
      trendUp: (d.avgOrderValueChangePercent ?? 0) >= 0,
    },
    {
      label: 'Repeat Buyers', value: formatPercent(d.repeatBuyerPercent), icon: <Users size={16} />,
      trend: d.repeatBuyerTrend.charAt(0).toUpperCase() + d.repeatBuyerTrend.slice(1), trendUp: d.repeatBuyerTrend !== 'declining',
      sub: 'Of total customers',
    },
    { label: 'New Customers', value: formatNumber(d.newCustomersCount), icon: <Users size={16} /> },
    { label: 'Returning Customers', value: formatNumber(d.returningCustomersCount), icon: <Users size={16} /> },
    { label: 'Refunds', value: formatMoneyCompact(d.totalRefunds, currency), icon: <RotateCcw size={16} />, sub: `${formatPercent(d.refundRatePercent)} of gross` },
    { label: 'Cancelled Orders', value: formatNumber(d.cancelledOrders), icon: <ShoppingCart size={16} /> },
  ];

  const comparisonColumns: TableColumn<ComparisonRow>[] = [
    { key: 'metric', header: 'Metric' },
    { key: 'previous', header: 'Previous Period', align: 'right' },
    { key: 'current', header: 'Current Period', align: 'right' },
  ];

  const comparisonRows: ComparisonRow[] = d?.previousPeriod ? [
    { metric: 'Gross Revenue', current: formatMoneyCompact(d.grossRevenue, currency), previous: formatMoneyCompact(d.previousPeriod.grossRevenue, currency) },
    { metric: 'Total Revenue (net)', current: formatMoneyCompact(d.totalRevenue, currency), previous: formatMoneyCompact(d.previousPeriod.totalRevenue, currency) },
    { metric: 'Total Orders', current: formatNumber(d.totalOrders), previous: formatNumber(d.previousPeriod.totalOrders) },
    { metric: 'Avg. Order Value', current: formatMoneyCompact(d.avgOrderValue, currency), previous: formatMoneyCompact(d.previousPeriod.avgOrderValue, currency) },
    { metric: 'Repeat Buyers', current: formatPercent(d.repeatBuyerPercent), previous: formatPercent(d.previousPeriod.repeatBuyerPercent) },
    { metric: 'Refunds', current: formatMoneyCompact(d.totalRefunds, currency), previous: formatMoneyCompact(d.previousPeriod.totalRefunds, currency) },
    { metric: 'Cancelled Orders', current: formatNumber(d.cancelledOrders), previous: formatNumber(d.previousPeriod.cancelledOrders) },
  ] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {loading || !metrics
          ? Array.from({ length: 8 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
          : metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {compareToPreviousPeriod && d?.previousPeriod && (
        <div className="bg-white border border-bone rounded-[10px]">
          <div className="px-5 pt-4 pb-3">
            <p className="text-[14px] font-bold text-charcoal">Period Comparison</p>
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
            subtitle="Gross vs. net revenue"
            data={(revenue.data?.series ?? []).map(p => ({
              label: formatBucketLabel(p.date, revenue.data!.granularity),
              gross: p.grossRevenue,
              net: p.netRevenue,
            }))}
            lines={[
              { dataKey: 'gross', label: 'Gross Revenue', color: '#8C8A82' },
              { dataKey: 'net', label: 'Net Revenue', color: '#174771' },
            ]}
            valuePrefix={currencySymbol(currency)}
          />
        )}

        {orders.loading ? (
          <ChartCardSkeleton height={220} />
        ) : orders.error ? (
          <AnalyticsErrorState message={orders.error} onRetry={orders.refetch} />
        ) : (
          <BarChart
            title="Orders Over Time"
            subtitle="Non-cancelled orders"
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
