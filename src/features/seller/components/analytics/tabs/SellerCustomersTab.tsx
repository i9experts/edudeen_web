import { MetricCard, Table, type TableColumn } from '@/components/comman/ui';
import { LineChart } from '@/components/comman/charts';
import { Users, MapPin } from 'lucide-react';
import { useSellerAnalyticsCustomers } from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams, GeoBreakdownRow, TopCustomerRow } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatBucketLabel } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';

export function SellerCustomersTab({ params, currency }: { params: SellerAnalyticsParams; currency?: string | null }) {
  const customers = useSellerAnalyticsCustomers(params);

  if (customers.error) {
    return <AnalyticsErrorState message={customers.error} onRetry={customers.refetch} />;
  }

  const d = customers.data;

  const ltvColumns: TableColumn<TopCustomerRow>[] = [
    { key: 'name', header: 'Customer', render: r => <div><p className="font-medium">{r.name}</p><p className="text-[12px] text-slate">{r.email}</p></div> },
    { key: 'totalOrders', header: 'Total Orders', align: 'right' },
    { key: 'lifetimeValue', header: 'Lifetime Value', align: 'right', render: r => formatMoneyCompact(r.lifetimeValue, currency) },
  ];

  const geoColumns: TableColumn<GeoBreakdownRow>[] = [
    { key: 'state', header: 'State' },
    { key: 'orders', header: 'Orders', align: 'right' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatMoneyCompact(r.revenue, currency) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <MetricCard label="Avg. Lifetime Value" value={d ? formatMoneyCompact(d.averageLifetimeValue, currency) : ''} loading={customers.loading} sub="All-time, per customer" />

      {customers.loading ? (
        <ChartCardSkeleton />
      ) : d ? (
        <LineChart
          title="New vs. Returning Customers"
          data={d.newVsReturning.map(p => ({
            label: formatBucketLabel(p.date, d.granularity),
            newCustomers: p.newCustomers,
            returningCustomers: p.returningCustomers,
          }))}
          lines={[
            { dataKey: 'newCustomers', label: 'New', color: '#174771' },
            { dataKey: 'returningCustomers', label: 'Returning', color: '#2C2A28' },
          ]}
        />
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-bone rounded-[10px]">
          <div className="px-5 pt-4 pb-3">
            <p className="text-[14px] font-bold text-charcoal">Top Customers by Lifetime Value</p>
          </div>
          <Table
            columns={ltvColumns}
            data={d?.topCustomersByLtv ?? []}
            keyExtractor={r => r.userId}
            loading={customers.loading}
            emptyState={{
              icon: <Users size={28} className="text-slate/50" />,
              title: 'No customer activity yet',
              description: 'No non-cancelled orders were placed in this period.',
            }}
          />
        </div>

        <div className="bg-white border border-bone rounded-[10px]">
          <div className="px-5 pt-4 pb-3">
            <p className="text-[14px] font-bold text-charcoal">Geographic Distribution</p>
            <p className="text-[12px] text-slate">Physical orders only — digital orders have no shipping address.</p>
          </div>
          <Table
            columns={geoColumns}
            data={d?.geographicBreakdown ?? []}
            keyExtractor={r => r.state}
            loading={customers.loading}
            emptyState={{
              icon: <MapPin size={28} className="text-slate/50" />,
              title: 'No geographic data',
              description: 'No physical orders with shipping addresses were placed in this period.',
            }}
          />
        </div>
      </div>
    </div>
  );
}
