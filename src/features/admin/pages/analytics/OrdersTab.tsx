import { MetricCard } from '@/components/comman/ui';
import { LineChart, DonutChart } from '@/components/comman/charts';
import { useAdminAnalyticsOrdersOverTime, useAdminAnalyticsOrderStatusBreakdown } from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatCurrency, formatBucketLabel, formatNumber, formatPercent } from '@/components/comman/analytics/format';

export function OrdersTab({ params }: { params: BaseAnalyticsParams }) {
  const ordersOverTime = useAdminAnalyticsOrdersOverTime(params);
  const statusBreakdown = useAdminAnalyticsOrderStatusBreakdown(params);

  const s = statusBreakdown.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Orders" value={s ? formatNumber(s.totalOrders) : ''} loading={statusBreakdown.loading} />
        <MetricCard label="Avg. Order Value" value={s ? formatCurrency(s.avgOrderValue) : ''} loading={statusBreakdown.loading} />
        <MetricCard label="Cancellation Rate" value={s ? formatPercent(s.cancellationRatePercent) : ''} loading={statusBreakdown.loading} sub={s ? `${s.cancelledOrders.toLocaleString()} cancelled orders` : undefined} />
        <MetricCard label="Refund Rate" value={s ? formatPercent(s.refundRatePercent) : ''} loading={statusBreakdown.loading} sub={s ? `${s.refundedOrders.toLocaleString()} refunded orders` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {ordersOverTime.loading ? (
            <ChartCardSkeleton />
          ) : ordersOverTime.error ? (
            <AnalyticsErrorState message={ordersOverTime.error} onRetry={ordersOverTime.refetch} />
          ) : (
            <LineChart
              title="Orders Over Time"
              subtitle="Completed, cancelled & refunded, platform-wide"
              data={(ordersOverTime.data?.series ?? []).map(p => ({
                label: formatBucketLabel(p.date, ordersOverTime.data!.granularity),
                orders: p.orderCount,
                cancelled: p.cancelledOrdersCount,
                refunded: p.refundedOrdersCount,
              }))}
              lines={[
                { dataKey: 'orders', label: 'Orders', color: '#174771' },
                { dataKey: 'cancelled', label: 'Cancelled', color: '#C0392B' },
                { dataKey: 'refunded', label: 'Refunded', color: '#2156A8' },
              ]}
            />
          )}
        </div>

        {statusBreakdown.loading ? (
          <ChartCardSkeleton height={200} />
        ) : statusBreakdown.error ? (
          <AnalyticsErrorState message={statusBreakdown.error} onRetry={statusBreakdown.refetch} />
        ) : s ? (
          <DonutChart
            title="Order Status Breakdown"
            centerLabel="Orders"
            data={Object.entries(s.statusCounts ?? {}).map(([status, count]) => ({
              label: status.charAt(0).toUpperCase() + status.slice(1),
              value: count,
            }))}
          />
        ) : null}
      </div>
    </div>
  );
}
