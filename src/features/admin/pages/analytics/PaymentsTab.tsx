import { MetricCard, Table, type TableColumn } from '@/components/comman/ui';
import { DonutChart } from '@/components/comman/charts';
import { useAdminAnalyticsPaymentBreakdown } from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams, PaymentMethodRow } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatCurrency } from '@/components/comman/analytics/format';
import { CreditCard } from 'lucide-react';

export function PaymentsTab({ params }: { params: BaseAnalyticsParams }) {
  const payments = useAdminAnalyticsPaymentBreakdown(params);
  const d = payments.data;

  if (payments.error) {
    return <AnalyticsErrorState message={payments.error} onRetry={payments.refetch} />;
  }

  const methodColumns: TableColumn<PaymentMethodRow>[] = [
    { key: 'label', header: 'Method' },
    { key: 'orderCount', header: 'Orders', align: 'right' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatCurrency(r.revenue) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="Successful Payments" value={d ? d.successfulPayments.count.toLocaleString() : ''} loading={payments.loading} sub={d ? formatCurrency(d.successfulPayments.amount) : undefined} />
        <MetricCard label="Failed Payments" value={d ? d.failedPayments.count.toLocaleString() : ''} loading={payments.loading} sub={d ? formatCurrency(d.failedPayments.amount) : undefined} />
        <MetricCard label="Pending Payments" value={d ? d.pendingPayments.count.toLocaleString() : ''} loading={payments.loading} sub={d ? formatCurrency(d.pendingPayments.amount) : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {payments.loading ? (
          <ChartCardSkeleton height={200} />
        ) : d ? (
          <DonutChart
            title="Revenue by Payment Method"
            data={(d.methodBreakdown ?? []).map(m => ({ label: m.label, value: m.revenue }))}
          />
        ) : null}

        <div className="bg-white border border-bone rounded-xl">
          <div className="px-5 pt-4 pb-3">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Payment Method Breakdown</p>
          </div>
          <Table
            columns={methodColumns}
            data={d?.methodBreakdown ?? []}
            keyExtractor={r => r.paymentType}
            loading={payments.loading}
            emptyState={{ icon: <CreditCard size={28} className="text-slate/50" />, title: 'No payment data yet' }}
          />
        </div>
      </div>

      {d?.note && (
        <p className="text-[11px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">{d.note}</p>
      )}
    </div>
  );
}
