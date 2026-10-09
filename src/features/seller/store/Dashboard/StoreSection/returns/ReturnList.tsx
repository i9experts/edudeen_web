import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Modal, Textarea, Button, Table, type TableColumn } from '@/components/comman/ui';
import {
  apiGetSellerReturns, apiReturnAction,
  type SellerReturnItem, type ReturnStatus,
} from '@/api/services/orders';
import { currencySymbol, formatMoney } from '@/utils/currency';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { SellerRefundRequests } from './SellerRefundRequests';

// Fixed server-side page size of GET /orders/returns.
const RETURNS_PER_PAGE = 10;

const statusStyle: Record<string, { bg: string; color: string }> = {
  requested:          { bg: '#FFF4DC', color: '#B36200' },
  partial_requested:  { bg: '#FFF4DC', color: '#B36200' },
  approved:           { bg: '#E3F4EA', color: '#1E7A3C' },
  rejected:           { bg: '#FDECEA', color: '#C0392B' },
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'All Status' },
  { value: 'requested', label: 'Requested'  },
  { value: 'approved',  label: 'Approved'   },
  { value: 'rejected',  label: 'Rejected'   },
];

// ── Approve/Reject modal ─────────────────────────────────────────────────────
function ReturnActionModal({
  item, onClose, onDone, currency,
}: {
  item: SellerReturnItem;
  onClose: () => void;
  onDone: () => void;
  currency?: string | null;
}) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (chosen: 'approve' | 'reject') => {
    if (chosen === 'reject' && !rejectReason.trim()) { setAction('reject'); setError('Please provide a rejection reason.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiReturnAction(item.orderId, {
        storeId: item.storeId,
        itemIds: [item.itemId],
        action: chosen,
        rejectReason: chosen === 'reject' ? rejectReason.trim() : undefined,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process return.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Review Return — ${item.orderNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {action === 'reject' ? (
            <Button variant="danger" onClick={() => submit('reject')} loading={saving}>Confirm Reject</Button>
          ) : (
            <>
              <Button variant="danger" onClick={() => setAction('reject')} disabled={saving}>Reject</Button>
              <Button onClick={() => submit('approve')} loading={saving}>Approve</Button>
            </>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] font-semibold text-charcoal">{item.productName}</p>
          <p className="text-[12px] text-slate mt-[2px]">Customer: {item.customer.name}</p>
          <p className="text-[12px] text-slate">Amount: {currencySymbol(currency)}{item.amount.toLocaleString()}</p>
        </div>
        <div className="bg-cream rounded-[9px] px-3 py-[10px]">
          <p className="text-[11px] font-semibold text-slate uppercase tracking-[0.05em] mb-1">Customer's Reason</p>
          <p className="text-[13px] text-charcoal">{item.returnReason}</p>
        </div>
        {action === 'reject' && (
          <Textarea
            label="Rejection reason"
            rows={3}
            placeholder="Explain why this return is being rejected…"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
          />
        )}
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function StoreReturnList() {
  usePageTitle('Returns');
  const { storeId, store } = useStoreWorkspace();

  const [returns, setReturns] = useState<SellerReturnItem[]>([]);
  const [stats, setStats]     = useState<{ openRequests: number; returnRate: string; totalRefunded: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [reviewing, setReviewing] = useState<SellerReturnItem | null>(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);

  const refetch = useCallback(() => { setError(''); setRefreshKey(k => k + 1); }, []);

  // Search runs server-side (?q=), debounced; a new term or status restarts at page 1.
  const q = useDebouncedValue(search.trim(), 300);
  useEffect(() => { setPage(1); }, [q, status]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setLoading(true);
    apiGetSellerReturns({ storeId, status: status || undefined, page, q: q || undefined })
      .then(res => {
        if (cancelled) return;
        setReturns(res.data.returns ?? []);
        setStats(res.data.stats);
        setTotal(res.data.pagination?.total ?? 0);
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load returns.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, status, refreshKey, page, q]);

  const columns: TableColumn<SellerReturnItem>[] = [
    { key: 'orderNumber', header: 'Order', render: r => <span className="font-bold text-brand-deep-orange whitespace-nowrap">{r.orderNumber}</span> },
    { key: 'customer', header: 'Customer', render: r => <span className="text-graphite whitespace-nowrap">{r.customer.name}</span> },
    { key: 'productName', header: 'Product', render: r => <span className="text-graphite max-w-[180px] truncate block">{r.productName}</span> },
    { key: 'returnReason', header: 'Reason', render: r => <span className="text-slate max-w-[180px] truncate block">{r.returnReason}</span> },
    { key: 'amount', header: 'Amount', render: r => <span className="font-semibold text-carbon whitespace-nowrap">{currencySymbol(store?.baseCurrency)}{r.amount.toLocaleString()}</span> },
    {
      key: 'returnStatus', header: 'Status',
      render: r => {
        const st = statusStyle[r.returnStatus] ?? { bg: '#F0EEE6', color: '#5A5852' };
        return (
          <span className="inline-block px-[10px] py-[3px] rounded-[5px] text-[12px] font-semibold whitespace-nowrap capitalize" style={{ background: st.bg, color: st.color }}>
            {r.returnStatus.replace('_', ' ')}
          </span>
        );
      },
    },
    { key: 'returnRequestedAt', header: 'Requested', render: r => <span className="text-xs text-slate whitespace-nowrap">{new Date(r.returnRequestedAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</span> },
    {
      key: 'actions', header: 'Actions',
      render: r => (
        <button
          onClick={() => setReviewing(r)}
          disabled={r.returnStatus !== 'requested' && r.returnStatus !== ('partial_requested' as ReturnStatus)}
          className="px-[14px] py-1 bg-white border border-bone rounded-[6px] text-xs text-graphite cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
        >
          Review
        </button>
      ),
    },
  ];

  return (
    <>
      <StorePageHeader
        title="Returns & Refunds"
        subtitle="Process return requests, issue refunds, and send replacements."
      />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">

        {/* ── Metrics row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Open Requests',  value: stats?.openRequests ?? 0 },
            { label: 'Return Rate',    value: stats?.returnRate ?? '—' },
            { label: 'Total Refunded (30d)', value: stats ? `${formatMoney(stats.totalRefunded, store?.baseCurrency)}` : '—' },
          ].map(m => (
            <div key={m.label} className="bg-white border border-bone rounded-[10px] px-5 py-4">
              <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{m.label}</p>
              <p className="text-[28px] font-bold text-carbon leading-[1.15]">{loading ? '—' : m.value}</p>
            </div>
          ))}
        </div>

        <SellerRefundRequests storeId={storeId} />

        {/* ── Return Policy Summary ── */}
        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-[18px]">
          <p className="text-[14px] font-semibold text-carbon mb-1.5">Return Policy Summary</p>
          <p className="text-[13px] text-slate leading-[1.6]">
            Physical: 30-day returns in original condition. Digital: Non-refundable unless defective. Damaged items: replacement or full refund.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center gap-3">
            <AlertCircle size={16} className="text-error shrink-0" />
            <span className="text-[13px] text-error flex-1">{error}</span>
            <button onClick={refetch} className="flex items-center gap-1 text-[12px] text-error font-semibold cursor-pointer">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* ── Table card ── */}
        {!error && (
          <div className="bg-white border border-bone rounded-[10px] overflow-hidden">

            {/* Filters */}
            <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
              <div className="flex items-center gap-1.5 border border-bone rounded-lg px-3 bg-white transition-colors duration-150 focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange/50">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8C8A82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  placeholder="Search order or customer..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border-none outline-none text-[13px] py-2 w-[220px] text-charcoal"
                />
              </div>

              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="text-[13px] px-3 py-2 rounded-lg border border-bone bg-white text-charcoal outline-none cursor-pointer transition-colors duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <button onClick={refetch} className="flex items-center gap-1 text-[12px] text-slate cursor-pointer border border-bone rounded-[6px] px-2 py-[7px] transition-colors duration-150 hover:bg-bone shrink-0 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                <RefreshCw size={11} /> Refresh
              </button>
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={returns}
              keyExtractor={r => r.itemId}
              loading={loading}
              emptyState={{ title: q || status ? 'No return requests match your filters.' : 'No return requests yet.' }}
              pagination={{ page, total, perPage: RETURNS_PER_PAGE, onChange: setPage, label: 'return requests' }}
            />
          </div>
        )}
      </div>

      {reviewing && (
        <ReturnActionModal item={reviewing} onClose={() => setReviewing(null)} onDone={refetch} currency={store?.baseCurrency} />
      )}
    </>
  );
}
