import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { MetricCard, Button, Table, Badge, SkeletonBox, type TableColumn } from '@/components/comman/ui';
import type { BadgeColor } from '@/types';
import { formatPrice } from '@/utils/formatPrice';
import {
  apiGetEarningsStatement, apiDownloadEarningsStatement,
  type EarningsStatementPage, type StatementLine,
} from '@/api/services/finance';

// ── Month helpers (YYYY-MM; the API groups months in UTC) ────────────────────
function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(Date.UTC(y, m - 1 + delta, 1)));
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function fmtDate(iso: string | null | undefined, withYear = true) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}
function titleCase(s: string | null | undefined) {
  if (!s) return '—';
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const STATUS_COLOR: Record<StatementLine['status'], BadgeColor> = {
  clearing: 'yellow', available: 'green', paid_out: 'gray', cod_debit: 'blue', refunded: 'red',
};
const PAYOUT_COLOR: Record<string, BadgeColor> = { pending: 'yellow', processing: 'blue', completed: 'green', failed: 'red' };

/** "+12%" / "0%" / "-8%" badge. Hidden when both months are 0 or the previous month has nothing to compare with. */
function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  if (!(current > 0 || previous > 0) || !(previous > 0)) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const tone = pct > 0 ? 'text-success bg-success-bg' : pct < 0 ? 'text-error bg-error-bg' : 'text-slate bg-cream';
  return (
    <span className={clsx('inline-flex items-center text-[12px] font-semibold px-2 py-[2px] rounded-full', tone)}>
      {pct > 0 ? '+' : ''}{pct}% vs last month
    </span>
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  storeId: string;
  /** The wallet currency every amount below is shown in (parent renders a skeleton until it is known). */
  currency: string;
  /** Same next-payout date as the hero (one source for the whole page). */
  nextPayoutDate: string | null;
  /** Open orders still to ship (from the summary), for the "no earnings yet" message. */
  toShip: number;
}

export function EarningsStatement({ storeId, currency, nextPayoutDate, toShip }: Props) {
  const thisMonth = monthKey(new Date());
  const [month, setMonth] = useState(thisMonth);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<EarningsStatementPage | null>(null);
  const [prevGross, setPrevGross] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const quietRef = useRef(false);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  useLiveRefresh(['finance', 'orders'], () => { quietRef.current = true; setReloadKey(k => k + 1); }, !!storeId);

  // Switching month or wallet starts again from page 1.
  useEffect(() => { setPage(1); }, [month, currency]);

  useEffect(() => {
    if (!storeId || !currency) return;
    let cancelled = false;
    const quiet = quietRef.current;
    quietRef.current = false;
    if (!quiet) { setLoading(true); setError(''); }
    apiGetEarningsStatement(storeId, { month, currency, page, limit: 25 })
      .then(res => { if (!cancelled) setData(res); })
      .catch((err: unknown) => {
        if (cancelled || quiet) return;
        setData(null);
        setError(err instanceof Error ? err.message : 'Failed to load your statement.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, month, currency, page, reloadKey]);

  // Previous month's paid sales, only to draw the "vs last month" badge.
  useEffect(() => {
    if (!storeId || !currency) return;
    let cancelled = false;
    setPrevGross(null);
    apiGetEarningsStatement(storeId, { month: shiftMonth(month, -1), currency, page: 1, limit: 1 })
      .then(res => { if (!cancelled) setPrevGross(res.totals.gross); })
      .catch(() => { /* badge simply stays hidden */ });
    return () => { cancelled = true; };
  }, [storeId, month, currency, reloadKey]);

  async function download(format: 'csv' | 'pdf') {
    setDownloading(format); setDownloadError('');
    try {
      const out = await apiDownloadEarningsStatement(storeId, { month, currency, format });
      const name = `earnings-${month}-${currency}.${format}`;
      saveBlob(out instanceof Blob ? out : new Blob([out], { type: 'text/csv' }), name);
    } catch (err) {
      setDownloadError(err instanceof Error && err.message ? err.message : 'Could not download the statement. Please try again.');
    } finally {
      setDownloading(null);
    }
  }

  const money = (n: number | null | undefined) => formatPrice(Number(n ?? 0), currency);
  const canGoNext = month < thisMonth;
  const anyProcessing = (data?.rows ?? []).some(r => r.processingFee > 0);

  const orderLink = (l: StatementLine) => l.orderId && l.orderNumber
    ? <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(l.orderNumber)}`} className="text-brand-royal font-semibold no-underline hover:underline">{l.orderNumber}</Link>
    : <span className="text-slate">—</span>;
  const kindLabel = (l: StatementLine) => l.kind === 'cod' ? 'COD (cash collected by you)' : l.kind === 'sale' ? 'Sale' : 'Other';
  const statusBadge = (l: StatementLine) => <Badge color={STATUS_COLOR[l.status]} size="sm">{l.statusText}</Badge>;
  const signed = (n: number) => (n < 0 ? '−' : '') + money(Math.abs(n));

  const columns: TableColumn<StatementLine>[] = [
    { key: 'date', header: 'Date', render: l => <span className="text-slate whitespace-nowrap">{fmtDate(l.date)}</span> },
    { key: 'order', header: 'Order', render: orderLink },
    { key: 'kind', header: 'Type', hideBelowXl: true, render: l => <span className="text-graphite text-[12.5px]">{kindLabel(l)}</span> },
    { key: 'gross', header: 'Gross', render: l => <span className="whitespace-nowrap">{money(l.gross)}</span> },
    { key: 'fee', header: 'Platform fee', render: l => <span className="whitespace-nowrap text-graphite">{l.platformFee ? `− ${money(l.platformFee)}` : money(0)}</span> },
    ...(anyProcessing ? [{ key: 'proc', header: 'Processing fee', hideBelowXl: true, render: (l: StatementLine) => <span className="whitespace-nowrap text-graphite">{l.processingFee ? `− ${money(l.processingFee)}` : money(0)}</span> } as TableColumn<StatementLine>] : []),
    { key: 'refund', header: 'Refund', hideBelowXl: true, render: l => <span className="whitespace-nowrap text-graphite">{l.refund ? `− ${money(l.refund)}` : money(0)}</span> },
    { key: 'net', header: 'Net', render: l => <span className={clsx('font-semibold whitespace-nowrap', l.net < 0 ? 'text-error' : 'text-carbon')}>{signed(l.net)}</span> },
    { key: 'status', header: 'Status', render: statusBadge },
  ];

  return (
    <section aria-labelledby="statement-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-1.5">Monthly statement</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label="Previous month"
              className="size-9 rounded-lg border border-bone bg-white flex items-center justify-center text-brand-orange hover:bg-cream cursor-pointer transition-colors">
              <ChevronLeft size={17} />
            </button>
            <h2 id="statement-heading" aria-live="polite" className="font-serif font-normal text-[22px] sm:text-[26px] text-carbon min-w-[170px] text-center leading-tight">
              {monthLabel(month)}
            </h2>
            <button type="button" onClick={() => canGoNext && setMonth(m => shiftMonth(m, 1))} disabled={!canGoNext} aria-label="Next month"
              className="size-9 rounded-lg border border-bone bg-white flex items-center justify-center text-brand-orange hover:bg-cream cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <ChevronRight size={17} />
            </button>
            {month !== thisMonth && (
              <button type="button" onClick={() => setMonth(thisMonth)} className="ml-1 bg-transparent border-0 border-b-2 border-current px-0 pb-[2px] text-[13px] font-bold text-brand-orange cursor-pointer">
                This month
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" icon={<Download size={12} />} loading={downloading === 'csv'} disabled={!!downloading || !data || data.total === 0} onClick={() => download('csv')}>Statement CSV</Button>
          <Button size="sm" variant="outline" icon={<Download size={12} />} loading={downloading === 'pdf'} disabled={!!downloading || !data || data.total === 0} onClick={() => download('pdf')}>Statement PDF</Button>
        </div>
      </div>
      {downloadError && <p role="alert" className="text-[12.5px] text-error">{downloadError}</p>}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-busy="true">
          {[0, 1, 2, 3].map(i => <MetricCard key={i} label="" value="" loading />)}
        </div>
      ) : error && !data ? (
        <div role="alert" className="bg-error-bg border border-error-border rounded-xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] text-error">{error}</p>
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={reload}>Try again</Button>
        </div>
      ) : data && (
        <>
          <div className={clsx('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', loading && 'opacity-70')}>
            <div className="flex flex-col gap-1.5 min-w-0">
              <MetricCard label="Paid sales" value={money(data.totals.gross)} sub={`${data.totals.orderCount} order${data.totals.orderCount === 1 ? '' : 's'} in ${monthLabel(month)}`} />
              {prevGross !== null && <div><GrowthBadge current={data.totals.gross} previous={prevGross} /></div>}
            </div>
            <MetricCard label="Platform fee" value={money(data.totals.platformFee)} sub={data.totals.processingFee > 0 ? `+ ${money(data.totals.processingFee)} card processing` : 'Deducted from your sales'} />
            <MetricCard label="Net earnings" value={money(data.totals.net)} sub="After fees and refunds" />
            <MetricCard label="Next payout date" value={nextPayoutDate ? fmtDate(nextPayoutDate, false) : '—'} sub={nextPayoutDate ? 'Monthly, after admin approval' : 'No payout due yet'} />
          </div>

          {data.payout && (
            <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-bone rounded-xl px-4 py-3 text-[13px]">
              <span className="text-graphite">Payout for this month: <span className="font-semibold text-carbon">{money(data.payout.amount)}</span></span>
              <span className="flex items-center gap-2 text-slate">
                <Badge color={PAYOUT_COLOR[data.payout.status] ?? 'gray'} size="sm">{titleCase(data.payout.status)}</Badge>
                {data.payout.processedAt ? `Paid ${fmtDate(data.payout.processedAt)}` : `Created ${fmtDate(data.payout.createdAt)}`}
              </span>
            </div>
          )}
          {data.truncated && <p className="text-[12.5px] text-slate">This month has a very large number of ledger rows; the statement shows the newest ones only.</p>}

          {data.total === 0 ? (
            <div className="bg-cream border border-bone rounded-xl px-6 py-8 text-center">
              {toShip > 0 ? (
                <>
                  <p className="font-serif text-[19px] text-carbon mb-1.5">You have {toShip} order{toShip === 1 ? '' : 's'} to ship</p>
                  <p className="text-[13.5px] text-slate mb-4">Earnings appear here after delivery.</p>
                  <Link to={`/store/${storeId}/orders?tab=needs_action`} className="text-[13px] font-bold text-brand-orange no-underline hover:underline">View orders to ship →</Link>
                </>
              ) : (
                <p className="text-[13.5px] text-slate">No earnings in {monthLabel(month)}.</p>
              )}
            </div>
          ) : (
            <div className={clsx('bg-white border border-bone rounded-xl overflow-hidden', loading && 'opacity-70')}>
              <Table
                columns={columns}
                data={data.rows}
                keyExtractor={l => `${l.orderId ?? 'x'}-${l.date}`}
                compact
                cardsBelow="md"
                renderCard={l => (
                  <div className="flex flex-col gap-1.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{orderLink(l)}</span>
                      {statusBadge(l)}
                    </div>
                    <div className="flex items-center justify-between text-slate text-[12px]"><span>{fmtDate(l.date)}</span><span>{kindLabel(l)}</span></div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px]">
                      <dt className="text-slate">Gross</dt><dd className="text-right">{money(l.gross)}</dd>
                      <dt className="text-slate">Platform fee</dt><dd className="text-right">{l.platformFee ? `− ${money(l.platformFee)}` : money(0)}</dd>
                      {l.processingFee > 0 && (<><dt className="text-slate">Processing fee</dt><dd className="text-right">− {money(l.processingFee)}</dd></>)}
                      {l.refund > 0 && (<><dt className="text-slate">Refund</dt><dd className="text-right">− {money(l.refund)}</dd></>)}
                      <dt className="font-semibold text-carbon">Net</dt><dd className={clsx('text-right font-semibold', l.net < 0 && 'text-error')}>{signed(l.net)}</dd>
                    </dl>
                  </div>
                )}
                pagination={{ page: data.page, total: data.total, perPage: data.limit, onChange: setPage, label: 'orders' }}
              />
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-bone bg-cream text-[13px]">
                <span className="font-semibold text-carbon">Month total (all {data.total} lines)</span>
                <span className={clsx('font-serif text-[18px]', data.totals.net < 0 ? 'text-error' : 'text-carbon')}>{signed(data.totals.net)}</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function StatementSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <SkeletonBox height={44} width={260} rounded="8px" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <MetricCard key={i} label="" value="" loading />)}
      </div>
    </div>
  );
}
