import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button, Table, MetricCard, type TableColumn } from '@/components/comman/ui';
import {
  apiGetSellerReturnsAll,
  type SellerReturnRow, type SellerReturnsAllStats,
} from '@/api/services/orders';
import { FOLLOW_UP_LABEL } from '@/api/services/refundRequests';
import { ReturnDrawer } from './ReturnDrawer';
import { formatPrice } from '@/utils/formatPrice';
import { returnSummary } from '@/utils/sellerTrust';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';

const PER_PAGE = 10;
const HOUR = 3_600_000;

const STATUS_OPTIONS = [
  { value: '',         label: 'All status' },
  { value: 'open',     label: 'Open' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'item_received',    label: FOLLOW_UP_LABEL.item_received },
  { value: 'replacement_sent', label: FOLLOW_UP_LABEL.replacement_sent },
];

const STATUS_STYLE: Record<SellerReturnRow['status'], string> = {
  open:     'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-success',
  rejected: 'bg-red-50 text-error',
};

/** 'Overdue 3h' / '9h left' / '1d 4h left'. Tone: red overdue, amber under 12 h, neutral otherwise. Display only: nothing happens automatically. */
function respondInfo(r: SellerReturnRow, now: number): { text: string; tone: 'red' | 'amber' | 'plain' } | null {
  if (r.status !== 'open' || !r.respondBy) return null;
  const diff = new Date(r.respondBy).getTime() - now;
  const span = (ms: number) => {
    const h = Math.max(1, Math.floor(ms / HOUR));
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
  };
  if (diff < 0) return { text: `Overdue ${span(-diff)}`, tone: 'red' };
  if (diff < 12 * HOUR) return { text: `${Math.max(1, Math.ceil(diff / 60_000)) < 60 ? `${Math.max(1, Math.ceil(diff / 60_000))}m` : span(diff)} left`, tone: 'amber' };
  return { text: `${span(diff)} left`, tone: 'plain' };
}

function RespondBy({ row, now }: { row: SellerReturnRow; now: number }) {
  const info = respondInfo(row, now);
  if (!info) {
    const label = row.status === 'approved' && row.followUp ? FOLLOW_UP_LABEL[row.followUp] : row.status === 'open' ? 'Open' : row.status === 'approved' ? 'Approved' : 'Rejected';
    return <span className={clsx('inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap', STATUS_STYLE[row.status])}>{label}</span>;
  }
  return (
    <span className={clsx('inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap',
      info.tone === 'red' ? 'bg-red-50 text-error' : info.tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-cream text-graphite')}>
      {info.text}
    </span>
  );
}

function TypeBadge({ type }: { type: SellerReturnRow['type'] }) {
  return (
    <span className={clsx('inline-block rounded-[5px] px-2 py-[2px] text-[12px] font-semibold whitespace-nowrap', type === 'Return' ? 'bg-[#EAF1F8] text-[#174771]' : 'bg-cream text-graphite')}>
      {type}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StoreReturnList() {
  usePageTitle('Returns');
  const { storeId, store } = useStoreWorkspace();
  const currency = store?.baseCurrency;

  const [rows, setRows]       = useState<SellerReturnRow[] | null>(null); // null = first load
  const [stats, setStats]     = useState<SellerReturnsAllStats | null>(null);
  const [total, setTotal]     = useState(0);
  const [error, setError]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch]   = useState('');
  // Dashboard 'Action required' link uses ?status=requested (= open).
  const [status, setStatus]   = useState(() => {
    const s = new URLSearchParams(window.location.search).get('status') ?? '';
    const mapped = s === 'requested' ? 'open' : s;
    return STATUS_OPTIONS.some(o => o.value === mapped) ? mapped : '';
  });
  const [page, setPage]       = useState(1);
  const [reviewing, setReviewing] = useState<SellerReturnRow | null>(null);
  const [now, setNow]         = useState(() => Date.now());

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);

  const q = useDebouncedValue(search.trim(), 300);
  useEffect(() => { setPage(1); }, [q, status]);

  const refetch = useCallback(() => { setError(''); setRefreshKey(k => k + 1); }, []);
  useLiveRefresh(['returns', 'refunds', 'orders'], () => setRefreshKey(k => k + 1));

  // Old rows stay on screen while a new filter/page loads (no skeleton flash after the first load).
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetSellerReturnsAll(storeId, { status: status || undefined, q: q || undefined, page })
      .then(res => {
        if (cancelled) return;
        setRows(res.data.items ?? []);
        setStats(res.data.stats);
        setTotal(res.data.pagination?.total ?? 0);
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load returns.');
        setRows(prev => prev ?? []);
      });
    return () => { cancelled = true; };
  }, [storeId, status, q, page, refreshKey]);

  const firstLoad = rows === null;
  const settingsLink = `/store/${storeId}/settings#returns`;

  const columns: TableColumn<SellerReturnRow>[] = [
    {
      key: 'item', header: 'Request',
      render: r => (
        <div className="min-w-[160px] max-w-[240px]">
          <div className="flex items-center gap-2 mb-[2px]"><TypeBadge type={r.type} /></div>
          <p className="text-[13px] font-medium text-carbon m-0 truncate">{r.item}</p>
          <p className="text-[12px] text-slate m-0 truncate">{r.buyer}</p>
        </div>
      ),
    },
    {
      key: 'orderNumber', header: 'Order',
      render: r => (
        <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(r.orderNumber)}`} className="font-bold text-brand-deep-orange whitespace-nowrap hover:underline inline-flex items-center min-h-[44px]">
          {r.orderNumber}
        </Link>
      ),
    },
    { key: 'reason', header: 'Reason', hideBelowXl: true, render: r => <span className="text-slate max-w-[200px] truncate block">{r.reasonLabel || r.reason || '—'}</span> },
    { key: 'amount', header: 'Amount', hideBelowXl: true, render: r => <span className="font-semibold text-carbon whitespace-nowrap">{formatPrice(r.amount, currency)}</span> },
    { key: 'respondBy', header: 'Respond by', render: r => <RespondBy row={r} now={now} /> },
    {
      key: 'actions', header: 'Actions', sticky: true,
      render: r => (
        <Button variant={r.status === 'open' ? 'outline' : 'ghost'} size="sm" className="min-h-[44px]" onClick={() => setReviewing(r)}>
          {r.status === 'open' ? 'Review' : 'View'}
        </Button>
      ),
    },
  ];

  const renderCard = (r: SellerReturnRow) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <TypeBadge type={r.type} />
          <p className="text-[13px] font-medium text-carbon mt-1 mb-0 truncate">{r.item}</p>
          <p className="text-[12px] text-slate m-0">{r.buyer} · {formatPrice(r.amount, currency)}</p>
        </div>
        <RespondBy row={r} now={now} />
      </div>
      {(r.reasonLabel || r.reason) && <p className="text-[12px] text-slate m-0 line-clamp-2">{r.reasonLabel || r.reason}</p>}
      <div className="flex items-center justify-between gap-2">
        <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(r.orderNumber)}`} className="font-bold text-brand-deep-orange text-[13px] hover:underline inline-flex items-center min-h-[44px]">{r.orderNumber}</Link>
        <Button variant={r.status === 'open' ? 'outline' : 'ghost'} size="sm" className="min-h-[44px]" onClick={() => setReviewing(r)}>{r.status === 'open' ? 'Review' : 'View'}</Button>
      </div>
    </div>
  );

  const ratePct = stats?.returnRate30d.pct;
  const filtered = !!(q || status);

  return (
    <>
      <StorePageHeader
        title="Returns & Refunds"
        subtitle="Review return and refund requests from your buyers. Aim to respond within 48 hours."
      />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Open requests" value={stats?.open ?? 0} loading={firstLoad && !error} />
          <MetricCard label="Overdue" value={stats?.overdue ?? 0} loading={firstLoad && !error}
            info="Open requests older than 48 hours. This is a reminder only: nothing is approved or rejected for you." />
          <MetricCard
            label="Return rate (30d)"
            value={ratePct == null ? 'Not enough data' : `${ratePct}%`}
            sub={stats ? (ratePct == null ? `Needs 10 shipped orders (${stats.returnRate30d.orders} so far)` : `${stats.returnRate30d.returns} of ${stats.returnRate30d.orders} orders`) : undefined}
            loading={firstLoad && !error}
          />
          <MetricCard label="Refunded (30d)" value={stats ? formatPrice(stats.refunded30d, currency) : '—'} loading={firstLoad && !error} />
        </div>

        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-[18px]">
          <p className="text-[14px] font-semibold text-carbon mb-1.5 mt-0">Return policy summary</p>
          <p className="text-[13px] text-slate leading-[1.6] m-0">
            Physical: {returnSummary(store?.returnPolicy, false).line}. Digital: {returnSummary(store?.returnPolicy, true).detail[0]}
          </p>
          {store?.returnPolicy?.note?.trim() && (
            <p className="text-[12px] text-slate mt-1.5 mb-0">Your note: {store.returnPolicy.note.trim()}</p>
          )}
          <p className="text-[12px] text-slate mt-1.5 mb-0">
            Change your policy in <Link to={settingsLink} className="text-brand-orange font-semibold hover:underline">Store Settings</Link>.
          </p>
        </div>

        {error && (
          <div className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center gap-3" role="alert">
            <AlertCircle size={16} className="text-error shrink-0" />
            <span className="text-[13px] text-error flex-1">{error}</span>
            <button type="button" onClick={refetch} className="flex items-center gap-1 text-[12px] text-error font-semibold cursor-pointer min-h-[44px] px-2">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
            <div className="flex items-center gap-1.5 border border-bone rounded-lg px-3 bg-white focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange/50 min-h-[44px] flex-1 sm:flex-none">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8C8A82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                aria-label="Search returns"
                placeholder="Search order, item or customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-none outline-none text-[13px] py-2 w-full sm:w-[240px] text-charcoal bg-transparent"
              />
            </div>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-[13px] px-3 min-h-[44px] rounded-lg border border-bone bg-white text-charcoal outline-none cursor-pointer focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <Table
            columns={columns}
            data={rows ?? []}
            keyExtractor={r => `${r.source}:${r.requestId}`}
            loading={firstLoad && !error}
            cardsBelow="md"
            renderCard={renderCard}
            emptyState={{
              title: filtered ? 'No requests match your filters.' : 'No return or refund requests yet.',
              description: filtered ? undefined : 'When a buyer asks for a return or refund, it appears here.',
            }}
            pagination={{ page, total, perPage: PER_PAGE, onChange: setPage, label: 'requests' }}
          />
        </div>
      </div>

      {reviewing && <ReturnDrawer row={reviewing} storeId={storeId} currency={currency} onClose={() => setReviewing(null)} onChanged={refetch} />}
    </>
  );
}
