import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Info, RefreshCw, Receipt } from 'lucide-react';
import { MetricCard, Button } from '@/components/comman/ui';
import { formatMoney } from '@/utils/currency';
import {
  apiGetMonthlyStatement, type MonthlyStatement,
} from '@/api/services/finance';
import {
  StudioPanel, StudioWorkflow, StudioPill, StudioTable, StudioEyebrow,
} from '@/features/seller/components/studio/Studio';

// ── Month helpers (YYYY-MM, local time) ──────────────────────────────────────
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function fmtDate(iso: string | null | undefined, withYear = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}
/** Accepts either a percentage (10) or a fraction (0.1). */
function formatCommissionRate(rate: number | null | undefined) {
  if (rate == null || Number.isNaN(rate)) return '—';
  const pct = rate > 0 && rate <= 1 ? rate * 100 : rate;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}
function titleCase(s: string | null | undefined) {
  if (!s) return '—';
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const TX_TONE: Record<string, 'green' | 'amber' | 'gray' | 'blue' | 'red'> = {
  sale: 'green', payout: 'blue', fee: 'amber', commission: 'amber', refund: 'red', adjustment: 'gray',
};
const PAYOUT_TONE: Record<string, 'green' | 'amber' | 'gray' | 'blue' | 'red'> = {
  pending: 'amber', processing: 'blue', completed: 'green', paid: 'green', failed: 'red', rejected: 'red',
};

const HOW_YOU_GET_PAID = [
  { tag: 'Checkout',   title: 'Buyers pay Edudeen',        body: 'Card and online payments are collected securely by Edudeen on your behalf when a buyer checks out.' },
  { tag: 'Fees',       title: 'Only card fees come off',    body: 'Edudeen takes no commission — only the card processing fee and any refunds are taken out of each sale.' },
  { tag: 'Payout',     title: 'Net earnings paid monthly',  body: 'Card sales become payable after a 14-day clearing hold. What remains is paid to your payout method on the 1st of the following month, after admin approval.' },
];

interface Props {
  storeId: string;
  /** Wallet currencies the seller holds (from the finance dashboard), if known. */
  currencies: string[];
  /** Fallback currency — the store's base currency. */
  defaultCurrency?: string | null;
}

export function EarningsStatement({ storeId, currencies, defaultCurrency }: Props) {
  const thisMonth = monthKey(new Date());
  const [month, setMonth] = useState(thisMonth);
  const currencyOptions = currencies.length ? currencies : (defaultCurrency ? [defaultCurrency] : []);
  const [currency, setCurrency] = useState<string | undefined>(currencyOptions[0]);
  const [statement, setStatement] = useState<MonthlyStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ kind: 'unavailable' | 'failed'; message: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Pick a currency once the wallet list arrives (it may load after mount).
  const firstCurrency = currencyOptions[0];
  useEffect(() => {
    if (!currency && firstCurrency) setCurrency(firstCurrency);
  }, [currency, firstCurrency]);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiGetMonthlyStatement(storeId, month, currency)
      .then(res => {
        if (cancelled) return;
        if (!res || typeof res !== 'object' || typeof res.grossSales !== 'number') {
          setStatement(null);
          setError({ kind: 'unavailable', message: '' });
          return;
        }
        setStatement(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        setStatement(null);
        setError(
          status === 404 || status === 501
            ? { kind: 'unavailable', message: '' }
            : { kind: 'failed', message: err instanceof Error ? err.message : 'Failed to load your statement.' },
        );
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, month, currency, reloadKey]);

  const cur = statement?.currency ?? currency ?? defaultCurrency ?? undefined;
  const money = (n: number | null | undefined) => formatMoney(Number(n ?? 0), cur);
  const canGoNext = month < thisMonth;

  return (
    <div className="flex flex-col gap-6">

      {/* Month picker + currency */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <StudioEyebrow className="mb-1.5">Monthly statement</StudioEyebrow>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth(m => shiftMonth(m, -1))}
              aria-label="Previous month"
              className="size-9 rounded-lg border border-bone bg-white flex items-center justify-center text-brand-orange hover:bg-cream cursor-pointer transition-colors"
            >
              <ChevronLeft size={17} />
            </button>
            <h2 aria-live="polite" className="font-serif font-normal text-[24px] sm:text-[28px] text-carbon min-w-[190px] text-center leading-tight">
              {monthLabel(month)}
            </h2>
            <button
              type="button"
              onClick={() => canGoNext && setMonth(m => shiftMonth(m, 1))}
              disabled={!canGoNext}
              aria-label="Next month"
              className="size-9 rounded-lg border border-bone bg-white flex items-center justify-center text-brand-orange hover:bg-cream cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={17} />
            </button>
            {month !== thisMonth && (
              <button
                type="button"
                onClick={() => setMonth(thisMonth)}
                className="ml-1 bg-transparent border-0 border-b-2 border-current px-0 pb-[2px] text-[13px] font-bold text-brand-orange cursor-pointer"
              >
                This month
              </button>
            )}
          </div>
        </div>

        {currencyOptions.length > 1 && (
          <div role="group" aria-label="Wallet currency" className="flex gap-2">
            {currencyOptions.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={c === currency}
                className={clsx(
                  'px-4 py-[8px] rounded-lg text-[13px] font-bold cursor-pointer border transition-colors',
                  c === currency ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-brand-orange border-bone hover:bg-cream',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[0, 1, 2, 3].map(i => <MetricCard key={i} label="" value="" loading />)}
        </div>
      ) : error ? (
        error.kind === 'unavailable' ? (
          <div className="bg-cream border border-bone rounded-xl px-6 py-10 text-center">
            <div className="size-12 rounded-full bg-white border border-bone flex items-center justify-center mx-auto mb-4">
              <Receipt size={20} className="text-brand-orange" />
            </div>
            <p className="font-serif text-[21px] text-carbon mb-2">Monthly statements are almost here.</p>
            <p className="text-[13.5px] text-slate max-w-[480px] mx-auto leading-relaxed">
              We're finishing the monthly earnings statement for your store. Until it's ready, your balances,
              transactions and payouts are all on the Overview tab.
            </p>
            <div className="mt-5">
              <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={reload}>Check again</Button>
            </div>
          </div>
        ) : (
          <div role="alert" className="bg-error-bg border border-error-border rounded-xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[13px] text-error">{error.message}</p>
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={reload}>Try again</Button>
          </div>
        )
      ) : statement && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              label="Gross sales"
              value={money(statement.grossSales)}
              sub={`${statement.orderCount} order${statement.orderCount === 1 ? '' : 's'} in ${monthLabel(statement.month || month)}`}
            />
            <MetricCard
              label={`Platform commission (${formatCommissionRate(statement.commissionRate)})`}
              value={money(statement.commission)}
              sub="Deducted from your sales"
            />
            <MetricCard
              label="Net earnings"
              value={money(statement.netEarnings)}
              sub="After card fees and refunds"
            />
            <MetricCard
              label="Next payout date"
              value={fmtDate(statement.nextPayoutDate, false)}
              sub={statement.payoutFrequency ? `${titleCase(statement.payoutFrequency)} payouts, after approval` : 'Paid after admin approval'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">
            {/* Breakdown */}
            <StudioPanel title="Where your money went" sub={`Statement for ${monthLabel(statement.month || month)} · ${cur ?? ''}`}>
              <dl className="flex flex-col">
                {([
                  ['Gross sales', statement.grossSales, 'plus'],
                  [`Platform commission (${formatCommissionRate(statement.commissionRate)})`, statement.commission, 'minus'],
                  ['Payment processing fees', statement.processingFees, 'minus'],
                  ['Refunds', statement.refunds, 'minus'],
                  ['Commission owed on cash-on-delivery orders', statement.codCommissionOwed, 'minus'],
                ] as const).map(([label, value, sign]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-[12px] border-b border-bone">
                    <dt className="text-[13.5px] text-graphite">{label}</dt>
                    <dd className={clsx('text-[14px] whitespace-nowrap', sign === 'minus' && Number(value) > 0 ? 'text-error' : 'text-carbon')}>
                      {sign === 'minus' && Number(value) > 0 ? '− ' : ''}{money(Math.abs(Number(value ?? 0)))}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 pt-[14px]">
                  <dt className="text-[14px] font-bold text-carbon">Net earnings</dt>
                  <dd className="font-serif text-[24px] text-carbon whitespace-nowrap">{money(statement.netEarnings)}</dd>
                </div>
              </dl>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-lg bg-cream border border-bone px-4 py-3">
                  <p className="text-[12px] text-slate mb-1">Available balance</p>
                  <p className="font-serif text-[20px] text-carbon">{money(statement.availableBalance)}</p>
                </div>
                <div className="rounded-lg bg-cream border border-bone px-4 py-3">
                  <p className="text-[12px] text-slate mb-1">Pending (clearing)</p>
                  <p className="font-serif text-[20px] text-carbon">{money(statement.pendingBalance)}</p>
                </div>
              </div>
            </StudioPanel>

            {/* Payout status */}
            <StudioPanel title="Payout status">
              {statement.payout ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-serif text-[26px] text-carbon">{money(statement.payout.amount)}</p>
                    <StudioPill tone={PAYOUT_TONE[statement.payout.status] ?? 'gray'}>{titleCase(statement.payout.status)}</StudioPill>
                  </div>
                  <dl className="flex flex-col gap-2 text-[13px]">
                    <div className="flex justify-between gap-3"><dt className="text-slate">Created</dt><dd className="text-carbon">{fmtDate(statement.payout.createdAt)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate">Processed</dt><dd className="text-carbon">{fmtDate(statement.payout.processedAt)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate">Reference</dt><dd className="text-carbon font-mono text-[12px] truncate max-w-[160px]">{statement.payout.id}</dd></div>
                  </dl>
                </div>
              ) : (
                <div>
                  <p className="text-[13.5px] text-graphite leading-relaxed">
                    No payout has been created for this month yet.
                    {statement.nextPayoutDate && <> Your next payout is scheduled for <span className="font-bold text-carbon">{fmtDate(statement.nextPayoutDate)}</span>, once an admin approves it.</>}
                  </p>
                </div>
              )}
            </StudioPanel>
          </div>

          {/* Statement table */}
          <StudioPanel
            title="Statement"
            sub={`${statement.transactions?.length ?? 0} transaction${(statement.transactions?.length ?? 0) === 1 ? '' : 's'} in ${monthLabel(statement.month || month)}`}
          >
            {(statement.transactions?.length ?? 0) === 0 ? (
              <p className="text-[13.5px] text-slate py-6 text-center bg-cream rounded-lg border border-bone">
                No transactions in this month.
              </p>
            ) : (
              <StudioTable
                caption={`Transactions for ${monthLabel(statement.month || month)}`}
                head={[
                  { label: 'Date' },
                  { label: 'Description' },
                  { label: 'Type' },
                  { label: 'Status', className: 'hidden sm:table-cell' },
                  { label: 'Amount', align: 'right' },
                ]}
              >
                {statement.transactions.map(t => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-slate">{fmtDate(t.createdAt)}</td>
                    <td>
                      <span className="block">{t.description || '—'}</span>
                      {t.referenceId && <span className="block text-[11.5px] text-slate mt-0.5 font-mono truncate max-w-[260px]">Ref {t.referenceId}</span>}
                    </td>
                    <td><StudioPill tone={TX_TONE[t.type] ?? 'gray'}>{titleCase(t.type)}</StudioPill></td>
                    <td className="hidden sm:table-cell text-slate">{titleCase(t.status)}</td>
                    <td className={clsx('text-right whitespace-nowrap font-bold', t.amount >= 0 ? 'text-success' : 'text-error')}>
                      {t.amount >= 0 ? '+' : '−'}{money(Math.abs(t.amount))}
                    </td>
                  </tr>
                ))}
              </StudioTable>
            )}
          </StudioPanel>
        </>
      )}

      {/* How you get paid — always visible, even before the statement loads */}
      <StudioPanel title="How you get paid">
        <StudioWorkflow steps={HOW_YOU_GET_PAID} />
        <div className="mt-6 flex gap-3 rounded-lg bg-[#faf0d4]/60 border border-[#f0e2b0] px-4 py-3">
          <Info size={17} className="text-[#755600] shrink-0 mt-[2px]" />
          <p className="text-[13.5px] text-carbon leading-relaxed">
            <span className="font-bold">Cash-on-delivery orders:</span> you collect and keep the cash from the buyer.
            The platform commission on those orders shows as a negative balance and is deducted from your next payout instead.
          </p>
        </div>
      </StudioPanel>
    </div>
  );
}
