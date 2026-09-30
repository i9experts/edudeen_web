import { useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, CloudOff, RefreshCw, Send, Wallet } from 'lucide-react';
import { Badge, Button, Input, MetricCard, Modal, Select, Table, type TableColumn } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatNumber } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';
import { useAdminMonthlySettlement, useAdminRunMonthlySettlement } from '@/hooks/admin/useAdminFinance';
import type { MonthlySettlementRow, MonthlySettlementPayoutMethod } from '@/api/services/finance/adminFinance';
import { FinanceStatusBadge } from '../../components/finance/FinanceStatusBadge';
import { PayoutSettingsCard } from '../../components/finance/PayoutSettingsCard';
import { StudioPanel, StudioInfoGrid, textLinkClass } from '../../components/studio';

const CURRENCIES = ['PKR', 'USD'] as const;

function toMonthValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  const [y, m] = value.split('-').map(Number);
  if (!y || !m) return value;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

const METHOD_TYPE_LABEL: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  paypal: 'PayPal',
  stripe: 'Stripe',
};

function methodLabel(m: MonthlySettlementPayoutMethod) {
  const name = m.bankName || METHOD_TYPE_LABEL[m.type] || m.type;
  return m.last4 ? `${name} ••${m.last4}` : name;
}

function MethodStatusPill({ status }: { status: string }) {
  if (status === 'active' || status === 'verified') return <Badge color="green" size="sm">Verified</Badge>;
  if (status === 'pending_verification' || status === 'pending') return <Badge color="yellow" size="sm">Pending verification</Badge>;
  if (status === 'rejected') return <Badge color="red" size="sm">Rejected</Badge>;
  return <Badge color="gray" size="sm">{status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Badge>;
}

const SKIP_REASON_LABEL: Record<string, string> = {
  below_minimum: 'Amount owed is below the minimum payout',
  no_active_default_payout_method: 'No active default payout method',
  payout_already_pending: 'A payout is already waiting for approval',
};

/** Previous calendar month in UTC — the same default the backend's run uses. */
function previousUtcMonth(d: Date) {
  const y = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
  const m = d.getUTCMonth() === 0 ? 12 : d.getUTCMonth();
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Monthly settlement — the once-a-month seller payout run. Lists what every
 * seller earned in the chosen month after Edudeen's commission and lets an
 * admin create the payouts in one go. Creating them does not send money: each
 * payout lands in the existing Payouts approval queue (the "Payouts" tab).
 */
export function FinanceMonthlySettlementTab({ onOpenPayouts }: { onOpenPayouts: () => void }) {
  const now = new Date();
  const currentMonth = toMonthValue(now);
  const [month, setMonth] = useState(() => previousUtcMonth(now));
  const [currency, setCurrency] = useState<string>('PKR');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const settlement = useAdminMonthlySettlement({ month, currency });
  const runner = useAdminRunMonthlySettlement();
  const data = settlement.data;
  const notDeployed = settlement.errorStatus === 404;

  const money = (n: number | null | undefined) => formatMoneyCompact(n ?? 0, data?.currency ?? currency);

  const storeNames = useMemo(() => {
    const map = new Map<string, string>();
    (data?.rows ?? []).forEach(r => map.set(r.storeId, r.storeName));
    return map;
  }, [data]);

  const handleRun = async () => {
    const res = await runner.run({ currency, month });
    setConfirmOpen(false);
    if (res) settlement.refetch();
  };

  const columns: TableColumn<MonthlySettlementRow>[] = [
    { key: 'store', header: 'Store', render: r => <span className="font-medium text-carbon">{r.storeName || r.storeId}</span> },
    { key: 'seller', header: 'Seller', render: r => r.sellerName || '—' },
    { key: 'gross', header: 'Gross', align: 'right', render: r => money(r.grossSales) },
    { key: 'commission', header: 'Commission', align: 'right', render: r => <span className="text-slate">−{money(r.commission)}</span> },
    { key: 'net', header: 'Net owed', align: 'right', render: r => <span className="font-semibold text-carbon">{money(r.net)}</span> },
    { key: 'available', header: 'Available', align: 'right', render: r => (
      <span className="inline-flex flex-col items-end">
        <span>{money(r.availableBalance)}</span>
        {r.pendingBalance > 0 && <span className="text-[11px] text-slate">+{money(r.pendingBalance)} clearing</span>}
      </span>
    ) },
    { key: 'method', header: 'Payout method', render: r => r.payoutMethod ? (
      <span className="inline-flex flex-col items-end sm:items-start gap-1">
        <span className="text-[12.5px] text-carbon">{methodLabel(r.payoutMethod)}</span>
        <MethodStatusPill status={r.payoutMethod.status} />
      </span>
    ) : <Badge color="red" size="sm">No payout method</Badge> },
    { key: 'payout', header: 'Payout', render: r => r.payout ? (
      <span className="inline-flex flex-col items-end sm:items-start gap-1">
        <FinanceStatusBadge status={r.payout.status} />
        <span className="text-[11px] text-slate">{money(r.payout.amount)}</span>
      </span>
    ) : <Badge color="gray" size="sm">Not created</Badge> },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Intro + controls */}
      <StudioPanel
        title="Monthly settlement"
        description="Pay every seller once a month, after Edudeen's commission."
        actions={
          <Button
            variant="primary"
            icon={<Send size={14} />}
            onClick={() => setConfirmOpen(true)}
            disabled={settlement.loading || !!settlement.error || !data}
          >
            Create this month's payouts
          </Button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-[200px]">
            <Input
              type="month"
              label="Month"
              value={month}
              max={currentMonth}
              onChange={e => { if (e.target.value) setMonth(e.target.value); }}
            />
          </div>
          <div className="w-full sm:w-[140px]">
            <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={() => settlement.refetch()} loading={settlement.loading}>
            Refresh
          </Button>
          <div className="flex-1" />
          <button type="button" onClick={onOpenPayouts} className={textLinkClass}>
            Open the payouts approval queue
          </button>
        </div>
      </StudioPanel>

      {/* Run result */}
      {runner.result && (
        <div role="status" className="bg-[#eaf3e3] border border-[#cfe3c0] rounded-xl px-5 py-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-[#3b6720] shrink-0 mt-[1px]" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-carbon">
                {formatNumber(runner.result.created)} payout{runner.result.created === 1 ? '' : 's'} created
                {runner.result.skipped > 0 && `, ${formatNumber(runner.result.skipped)} skipped`}
                {' '}— {money(runner.result.totalAmount)} in total.
              </p>
              <p className="text-[13px] text-graphite mt-1">
                They're now waiting in the payouts approval queue{runner.result.month ? ` (labelled ${monthLabel(runner.result.month)})` : ''}.
                Send each transfer yourself, then approve it to mark it completed.
              </p>
            </div>
            <button type="button" onClick={onOpenPayouts} className={textLinkClass}>Review payouts</button>
          </div>
          {runner.result.details.some(d => d.result !== 'created') && (
            <details className="text-[12.5px] text-graphite">
              <summary className="cursor-pointer font-semibold text-carbon">Why some sellers were skipped</summary>
              <ul className="mt-2 flex flex-col gap-1 pl-4 list-disc">
                {runner.result.details.filter(d => d.result !== 'created').map(d => (
                  <li key={`${d.storeId}-${d.currency}`}>
                    <span className="font-medium text-carbon">{storeNames.get(d.storeId) ?? d.storeId}</span>
                    {d.currency ? ` (${d.currency})` : ''}
                    {' '}— {d.reason ? (SKIP_REASON_LABEL[d.reason] ?? d.reason) : 'Skipped'}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {runner.error && <p role="alert" className="text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-4 py-3">{runner.error}</p>}

      {notDeployed ? (
        <StudioPanel>
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <span className="size-11 rounded-full bg-brand-pale-orange text-brand-orange flex items-center justify-center"><CloudOff size={20} /></span>
            <p className="font-serif text-[21px] text-carbon">Monthly settlement is almost ready</p>
            <p className="text-[13.5px] text-slate max-w-[460px]">
              The server doesn't offer monthly settlement yet — it's being rolled out. Individual payouts still work from the Payouts tab in the meantime.
            </p>
            <div className="flex items-center gap-4 mt-1">
              <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => settlement.refetch()}>Try again</Button>
              <button type="button" onClick={onOpenPayouts} className={textLinkClass}>Go to Payouts</button>
            </div>
          </div>
        </StudioPanel>
      ) : settlement.error ? (
        <AnalyticsErrorState message={settlement.error} onRetry={settlement.refetch} />
      ) : (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {settlement.loading || !data ? (
              Array.from({ length: 4 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
            ) : (
              <>
                <MetricCard label="Gross sales" value={money(data.totals.grossSales)} sub={monthLabel(data.month || month)} />
                <MetricCard label="Edudeen commission" value={money(data.totals.commission)} />
                <MetricCard label="Owed to sellers" value={money(data.totals.netOwedToSellers)} />
                <MetricCard
                  label="Sellers"
                  value={formatNumber(data.totals.sellers)}
                  sub={`${formatNumber(data.totals.payoutsCreated)} payout${data.totals.payoutsCreated === 1 ? '' : 's'} already created`}
                />
              </>
            )}
          </div>

          {/* Per-seller table */}
          <StudioPanel
            title={`Sellers for ${monthLabel(month)}`}
            description={`What each seller earned in ${currency}, what Edudeen keeps, and whether they can be paid.`}
            bodyClassName="-mx-5 sm:mx-0 border-y sm:border border-bone sm:rounded-lg overflow-hidden"
          >
            <Table
              columns={columns}
              data={data?.rows ?? []}
              keyExtractor={r => r.storeId}
              loading={settlement.loading}
              emptyState={{
                icon: <Wallet size={28} className="text-slate/50" />,
                title: 'Nothing to settle for this month',
                description: `No seller had ${currency} sales in ${monthLabel(month)}. Try another month or currency.`,
              }}
            />
          </StudioPanel>
        </>
      )}

      {/* Payout minimums / frequency (PUT /api/admin/platform-config/payout) */}
      <PayoutSettingsCard />

      {/* How it works */}
      <StudioPanel title="How monthly payouts work">
        <StudioInfoGrid
          items={[
            { title: 'Buyers pay Edudeen', body: 'Card and online payments are collected by Edudeen on the seller’s behalf and held until the month closes.' },
            { title: 'Commission is kept', body: 'Edudeen’s commission is taken from each sale. What remains is the net amount owed to the seller.' },
            { title: 'Net paid monthly', body: 'Once a month one payout per seller is created in the Payouts queue. The team sends the money to the seller’s payout method, then approves the payout to mark it completed.' },
          ]}
        />
        <p className="mt-5 pt-5 border-t border-bone text-[13px] text-graphite leading-relaxed">
          <span className="font-semibold text-carbon">Cash on delivery:</span> the seller keeps the cash they collect, so Edudeen's commission on those orders is deducted from their next payout instead.
        </p>
      </StudioPanel>

      {confirmOpen && (
        <Modal
          title="Create this month's payouts?"
          onClose={() => { if (!runner.running) setConfirmOpen(false); }}
          width={480}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={runner.running}>Cancel</Button>
              <Button variant="primary" icon={<CalendarCheck size={14} />} onClick={handleRun} loading={runner.running}>
                Create payouts
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-[13px] text-graphite leading-relaxed">
            <p>
              Edudeen will create one <span className="font-semibold text-carbon">{currency}</span> payout for every seller who is owed money
              {data ? <> — about <span className="font-semibold text-carbon">{money(data.totals.netOwedToSellers)}</span> across {formatNumber(data.totals.sellers)} seller{data.totals.sellers === 1 ? '' : 's'}</> : null}.
            </p>
            <p>
              <span className="font-semibold text-carbon">No money moves automatically.</span> Each payout goes to the existing Payouts approval queue.
              Approving a payout only marks it as completed — you still need to send the money to the seller yourself (bank transfer, JazzCash, etc.) before approving it.
            </p>
            <p className="text-slate">The payouts will be labelled {monthLabel(month)}.</p>
            <p className="text-slate">Sellers are skipped when they're owed less than the minimum payout, have no active default payout method, or already have a payout waiting for approval — the result lists each one and why.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
