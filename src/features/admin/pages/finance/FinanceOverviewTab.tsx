import { DollarSign, Wallet, Clock, RotateCcw, ShoppingCart, Percent } from 'lucide-react';
import { MetricCard } from '@/components/comman/ui';
import { LineChart } from '@/components/comman/charts';
import { useAdminFinanceOverview, useAdminFinanceRevenueOverTime } from '@/hooks/admin/useAdminFinance';
import type { AdminFinanceParams, PayoutStatus } from '@/api/services/finance/adminFinance';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatNumber, formatBucketLabel } from '@/components/comman/analytics/format';
import { formatMoneyCompact, currencySymbol } from '@/utils/currency';

const PAYOUT_STATUSES: PayoutStatus[] = ['pending', 'processing', 'completed', 'failed'];

export function FinanceOverviewTab({ params }: { params: AdminFinanceParams }) {
  const overview = useAdminFinanceOverview(params);
  const revenue = useAdminFinanceRevenueOverTime(params);

  const d = overview.data;
  const loading = overview.loading;

  return (
    <div className="flex flex-col gap-4">
      {/* Each section fails independently — an overview-metrics error no
          longer blanks the whole tab, including the separately-fetched
          revenue chart below. */}
      {overview.error ? (
        <AnalyticsErrorState message={overview.error} onRetry={overview.refetch} />
      ) : loading || !d ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)}
        </div>
      ) : (
        d.byCurrency.map((c) => (
          <div key={c.currency} className="flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.06em]">{c.currency}</p>

            {/* Hero row — the two numbers an admin actually opens this page
                to check first (total volume, platform's own take). Everything
                else is supporting context, not a competing headline. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MetricCard label="GMV" value={formatMoneyCompact(c.gmv, c.currency)} icon={<DollarSign size={18} />} />
              <MetricCard label="Platform Earnings" value={formatMoneyCompact(c.platformEarnings, c.currency)} icon={<Percent size={18} />} sub={`Commission ${formatMoneyCompact(c.platformCommission, c.currency)} + Subs ${formatMoneyCompact(c.subscriptionRevenue, c.currency)}`} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Net Revenue" value={formatMoneyCompact(c.netRevenue, c.currency)} icon={<DollarSign size={16} />} />
              <MetricCard label="Refunds" value={formatMoneyCompact(c.refunds, c.currency)} icon={<RotateCcw size={16} />} />
              <MetricCard label="Available (owed)" value={formatMoneyCompact(c.sellerBalances.totalAvailable, c.currency)} icon={<Wallet size={16} />} />
              <MetricCard label="Pending (owed)" value={formatMoneyCompact(c.sellerBalances.totalPending, c.currency)} icon={<Clock size={16} />} sub="In clearing window" />
              <MetricCard label="Total Orders" value={formatNumber(c.totalOrders)} icon={<ShoppingCart size={16} />} />
              <MetricCard label="Processing Fees" value={formatMoneyCompact(c.paymentProcessingFees, c.currency)} icon={<DollarSign size={16} />} />
            </div>
          </div>
        ))
      )}

      {d && (
        <p className="text-[11px] text-slate">{formatNumber(d.sellersWithBalance)} sellers with a balance on file.</p>
      )}

      {d && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PAYOUT_STATUSES.map((status) => (
            <div key={status} className="bg-white border border-bone rounded-[10px] px-4 py-3">
              <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{status} payouts</p>
              <p className="text-[20px] font-bold text-charcoal">{d.payoutQueue[status].count}</p>
              {/* Never a blended sum — one line per currency actually present */}
              {d.payoutQueue[status].byCurrency.map((c) => (
                <p key={c.currency} className="text-[12px] text-slate">{formatMoneyCompact(c.amount, c.currency)}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {d?.note && (
        <p className="text-[11px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">{d.note}</p>
      )}

      {revenue.loading ? (
        <ChartCardSkeleton />
      ) : revenue.error ? (
        <AnalyticsErrorState message={revenue.error} onRetry={revenue.refetch} />
      ) : (
        // One chart per settlement currency present in the series — a
        // single chart can't correctly show a "$" prefix for a USD line and
        // a "Rs" prefix for a PKR line at the same time.
        [...new Set((revenue.data?.series ?? []).flatMap((p) => p.byCurrency.map((c) => c.currency)))].map((currency) => (
          <LineChart
            key={currency}
            title={`Platform Revenue (${currency})`}
            subtitle="Gross vs. net, from the finance ledger"
            data={(revenue.data?.series ?? []).map((p) => {
              const row = p.byCurrency.find((c) => c.currency === currency);
              return {
                label: formatBucketLabel(p.date, revenue.data!.granularity),
                gross: row?.grossRevenue ?? 0,
                net: row?.netRevenue ?? 0,
              };
            })}
            lines={[
              { dataKey: 'gross', label: 'Gross Revenue', color: '#8C8A82' },
              { dataKey: 'net', label: 'Net Revenue', color: '#174771' },
            ]}
            valuePrefix={currencySymbol(currency)}
          />
        ))
      )}
    </div>
  );
}
