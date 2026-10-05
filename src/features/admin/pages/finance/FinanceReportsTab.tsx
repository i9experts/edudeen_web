import { useState } from 'react';
import { MetricCard, Table, type TableColumn, StatusBadge, Button } from '@/components/comman/ui';
import { BarChart } from '@/components/comman/charts';
import {
  useAdminRefundReport,
  useAdminSettlementReport,
  useAdminMonthlyReport,
  useAdminTaxReports,
  useAdminReconciliationHistory,
  useAdminFxExposure,
  useAdminRunReconciliation,
} from '@/hooks/admin/useAdminFinance';
import type {
  AdminFinanceParams, RefundByStoreRow, TaxReportRow, ReconciliationRunRow, AdminReconciliationData,
} from '@/api/services/finance/adminFinance';
import { useToast } from '@/contexts/ToastContext';
import { RefreshCw } from 'lucide-react';

/** The Settlement and Refund reports follow the filter bar; the rest are fixed windows. */
const IGNORES_FILTERS = 'Not affected by the date/store/seller filters above.';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton, TableCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatCurrency } from '@/components/comman/analytics/format';
import { formatMoneyCompact, currencySymbol } from '@/utils/currency';
import { Undo2, FileText, ShieldAlert } from 'lucide-react';

export function FinanceReportsTab({ params }: { params: AdminFinanceParams }) {
  const refunds = useAdminRefundReport(params);
  const settlement = useAdminSettlementReport(params);
  const monthly = useAdminMonthlyReport({ months: 6 });
  const taxReports = useAdminTaxReports({});
  const reconciliation = useAdminReconciliationHistory(14);
  const exposure = useAdminFxExposure();
  const runRecon = useAdminRunReconciliation();
  const [lastRun, setLastRun] = useState<AdminReconciliationData | null>(null);
  const toast = useToast();

  async function handleRunReconciliation() {
    const result = await runRecon.run(1);
    if (!result) return;
    setLastRun(result);
    toast.success(result.hasAnyDiscrepancy ? 'Reconciliation finished — drift found' : 'Reconciliation finished — no drift');
    reconciliation.refetch();
  }

  const reconciliationColumns: TableColumn<ReconciliationRunRow>[] = [
    { key: 'runAt', header: 'Run', render: (r) => new Date(r.runAt).toLocaleString() },
    {
      key: 'hasAnyDiscrepancy', header: 'Status', render: (r) => (
        <StatusBadge status={r.hasAnyDiscrepancy ? 'Flagged' : 'Active'} />
      ),
    },
    {
      key: 'results', header: 'Drift', render: (r) => (
        <span className="text-[12px]">
          {r.results.map((c) => `${c.currency}: ${formatMoneyCompact(c.drift, c.currency)}`).join(' · ')}
        </span>
      ),
    },
  ];

  const refundColumns: TableColumn<RefundByStoreRow>[] = [
    { key: 'storeName', header: 'Store' },
    { key: 'currency', header: 'Currency' },
    { key: 'count', header: 'Refunds', align: 'right' },
    { key: 'totalRefunded', header: 'Total Refunded', align: 'right', render: (r) => formatMoneyCompact(r.totalRefunded, r.currency) },
  ];

  const taxColumns: TableColumn<TaxReportRow>[] = [
    { key: 'storeName', header: 'Store' },
    { key: 'period', header: 'Period', render: (r) => `${r.period.toUpperCase()} ${r.year}` },
    { key: 'totalRevenue', header: 'Revenue', align: 'right', render: (r) => formatCurrency(r.totalRevenue) },
    { key: 'netRevenue', header: 'Net', align: 'right', render: (r) => formatCurrency(r.netRevenue) },
    { key: 'estimatedTax', header: 'Est. Tax', align: 'right', render: (r) => formatCurrency(r.estimatedTax) },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Settlement — one block per settlement currency, never blended */}
      {settlement.loading ? (
        <TableCardSkeleton rows={4} />
      ) : settlement.error ? (
        <AnalyticsErrorState message={settlement.error} onRetry={settlement.refetch} />
      ) : settlement.data ? (
        <div className="bg-white border border-bone rounded-xl px-5 py-5 flex flex-col gap-4">
          <div>
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Settlement Report</p>
            <p className="text-[12px] text-slate">Follows the date/store/seller filters above.</p>
          </div>
          {settlement.data.byCurrency.map((c) => (
            <div key={c.currency}>
              <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.06em] mb-2">{c.currency}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <MetricCard label="Gross Sales" value={formatMoneyCompact(c.grossSales, c.currency)} />
                <MetricCard label="Fees Collected" value={formatMoneyCompact(c.platformFeesCollected, c.currency)} />
                <MetricCard label="Refunds Issued" value={formatMoneyCompact(c.refundsIssued, c.currency)} />
                <MetricCard label="Payouts Disbursed" value={formatMoneyCompact(c.payoutsDisbursed, c.currency)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard label="Available Balance Owed" value={formatMoneyCompact(c.outstandingObligation.availableBalance, c.currency)} />
                <MetricCard label="Pending Balance Owed" value={formatMoneyCompact(c.outstandingObligation.pendingBalance, c.currency)} />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate">{settlement.data.note}</p>
        </div>
      ) : null}

      {/* Monthly — one bar chart per settlement currency, never blended */}
      {monthly.loading ? (
        <ChartCardSkeleton />
      ) : monthly.error ? (
        <AnalyticsErrorState message={monthly.error} onRetry={monthly.refetch} />
      ) : (
        [...new Set((monthly.data?.monthly ?? []).flatMap((m) => m.byCurrency.map((c) => c.currency)))].map((currency) => (
          <BarChart
            key={currency}
            title={`Monthly GMV (${currency})`}
            subtitle="Last 6 months · not affected by the filters above"
            data={(monthly.data?.monthly ?? []).map((m) => ({
              label: m.month,
              gmv: m.byCurrency.find((c) => c.currency === currency)?.gmv ?? 0,
            }))}
            dataKey="gmv"
            valuePrefix={currencySymbol(currency)}
          />
        ))
      )}

      {/* FX Exposure — platform's open non-settlement-currency position */}
      {exposure.loading ? (
        <TableCardSkeleton rows={2} />
      ) : exposure.error ? (
        <AnalyticsErrorState message={exposure.error} onRetry={exposure.refetch} />
      ) : exposure.data ? (
        <div className="bg-white border border-bone rounded-xl px-5 py-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">FX Exposure</p>
            <StatusBadge status={exposure.data.breached ? 'Flagged' : 'Active'} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {exposure.data.byCurrency.map((c) => (
              <MetricCard key={c.currency} label={c.currency} value={formatMoneyCompact(c.pendingAmount, c.currency)} sub={`≈ ${formatMoneyCompact(c.pendingUSDEquivalent ?? 0, 'USD')}`} />
            ))}
            <MetricCard label="Total (USD-equivalent)" value={formatMoneyCompact(exposure.data.totalUSDEquivalent, 'USD')} sub={`Threshold ${formatMoneyCompact(exposure.data.threshold, 'USD')}`} />
          </div>
          <p className="text-[11px] text-slate">Pending-settlement balances converted to USD at today's rate — a daily check alerts admins if this crosses the configured threshold. Visibility only, no automatic hedging. {IGNORES_FILTERS}</p>
        </div>
      ) : null}

      {/* Reconciliation — daily buyer-collected vs. ledger comparison */}
      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Reconciliation Runs</p>
            <p className="text-[12px] text-slate">Daily comparison of buyer collections against the finance ledger, per currency. {IGNORES_FILTERS}</p>
          </div>
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} loading={runRecon.running} onClick={handleRunReconciliation}>
            Run reconciliation now
          </Button>
        </div>
        {runRecon.error && <p className="px-5 pb-3 text-[12px] text-error">{runRecon.error}</p>}
        {lastRun && (
          <div className="mx-5 mb-3 bg-cream border border-bone rounded-lg px-3 py-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-semibold text-charcoal m-0">Last {lastRun.windowDays * 24} hours — run just now</p>
              <StatusBadge status={lastRun.hasAnyDiscrepancy ? 'Flagged' : 'Active'} />
            </div>
            {lastRun.byCurrency.length === 0 ? (
              <p className="text-[11.5px] text-slate m-0">No orders or ledger entries in this window.</p>
            ) : lastRun.byCurrency.map(c => (
              <p key={c.currency} className="text-[11.5px] text-slate m-0">
                <span className="font-semibold text-charcoal">{c.currency}</span>: collected {formatMoneyCompact(c.buyerCollected, c.currency)} ({c.orderCount} orders)
                {' '}· ledger {formatMoneyCompact(c.expectedFromLedger, c.currency)} · drift{' '}
                <span className={c.hasDiscrepancy ? 'text-error font-semibold' : ''}>{formatMoneyCompact(c.drift, c.currency)}</span>
              </p>
            ))}
          </div>
        )}
        {reconciliation.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={reconciliation.error} onRetry={reconciliation.refetch} /></div>
        ) : (
          <Table
            columns={reconciliationColumns}
            data={reconciliation.data ?? []}
            keyExtractor={(r) => r._id}
            loading={reconciliation.loading}
            emptyState={{ icon: <ShieldAlert size={28} className="text-slate/50" />, title: 'No reconciliation runs yet', description: 'The daily reconciliation job hasn’t run yet — check back tomorrow.' }}
          />
        )}
      </div>

      {/* Refunds */}
      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Refund Report</p>
          {refunds.data?.note && <p className="text-[12px] text-slate">{refunds.data.note}</p>}
        </div>
        {refunds.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={refunds.error} onRetry={refunds.refetch} /></div>
        ) : (
          <Table
            columns={refundColumns}
            data={refunds.data?.byStore ?? []}
            keyExtractor={(r) => r.storeId}
            loading={refunds.loading}
            emptyState={{ icon: <Undo2 size={28} className="text-slate/50" />, title: 'No refunds', description: 'No refund activity for this period.' }}
          />
        )}
      </div>

      {/* Tax reports */}
      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Tax Reports</p>
          <p className="text-[12px] text-slate">Generated per-store by sellers (Finance → Tax Reports). {IGNORES_FILTERS}</p>
        </div>
        {taxReports.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={taxReports.error} onRetry={taxReports.refetch} /></div>
        ) : (
          <Table
            columns={taxColumns}
            data={taxReports.data ?? []}
            keyExtractor={(r) => r._id}
            loading={taxReports.loading}
            emptyState={{ icon: <FileText size={28} className="text-slate/50" />, title: 'No tax reports', description: 'Sellers haven\u2019t generated any tax reports yet.' }}
          />
        )}
      </div>
    </div>
  );
}
