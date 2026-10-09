import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, Badge, Button, Modal, Select, Textarea, SkeletonBox } from '@/components/comman/ui';
import type { OrderDetail } from '@/api/services/orders';
import {
  apiCreateRefundRequest,
  apiListRefundRequestsForOrder,
  type RefundRequest,
  type RefundRequestStatus,
} from '@/api/services/refundRequests';
import { formatMoney } from '@/utils/currency';

/**
 * Buyer-side refund requests for ONE order: lists the requests already made
 * against it and lets the buyer request a refund for an eligible item.
 *
 * Eligibility mirrors RefundRequestService.createRequest on the backend
 * (the server re-checks everything; this only hides actions that would fail):
 *   - item not already refunded / cancelled
 *   - digital item: order paid AND the file never downloaded
 *   - physical/educational item: its seller order is delivered or completed
 *   - no pending request already covering the item
 */
export interface RefundRequestPanelProps {
  order: OrderDetail;
  /** Called after a request is created — e.g. to refetch the order. */
  onRequested?: (request: RefundRequest) => void;
  className?: string;
}

const REASONS = [
  'Item arrived damaged or defective',
  'Item not as described',
  'Wrong item received',
  'Missing parts or pages',
  'File is broken or will not open',
  'Purchased by mistake',
  'Other',
];

const STATUS_BADGE: Record<RefundRequestStatus, { color: 'orange' | 'green' | 'red'; label: string }> = {
  pending:  { color: 'orange', label: 'Pending review' },
  approved: { color: 'green',  label: 'Approved' },
  rejected: { color: 'red',    label: 'Rejected' },
};

// The order-detail endpoint returns the raw order document, so line items
// carry `_id` (+ `downloadCount`); the shaped list type uses `itemId`.
type RawItem = {
  _id?: string; itemId?: string; name: string; type?: string; status?: string;
  totalPrice?: number; downloadCount?: number;
};

interface EligibleItem {
  sellerOrderId: string;
  itemId:        string;
  name:          string;
  storeName:     string | null;
  totalPrice:    number | null;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RefundRequestPanel({ order, onRequested, className }: RefundRequestPanelProps) {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');

  const [open, setOpen]         = useState(false);
  const [selected, setSelected] = useState('');      // `${sellerOrderId}:${itemId}`
  const [reason, setReason]     = useState(REASONS[0]);
  const [note, setNote]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    apiListRefundRequestsForOrder(order._id)
      .then(res => setRequests(res.data ?? []))
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load refund requests.'))
      .finally(() => setLoading(false));
  }, [order._id]);

  useEffect(() => { load(); }, [load]);

  // Item lookup (id → name) for rendering existing requests.
  const itemNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const so of order.sellerOrders ?? []) {
      for (const raw of (so.items ?? []) as unknown as RawItem[]) {
        const id = String(raw._id ?? raw.itemId ?? '');
        if (id) m.set(id, raw.name);
      }
    }
    return m;
  }, [order.sellerOrders]);

  const eligible = useMemo<EligibleItem[]>(() => {
    const pendingItemIds = new Set(
      requests.filter(r => r.status === 'pending').flatMap(r => r.itemIds.map(String)),
    );
    const out: EligibleItem[] = [];
    for (const so of order.sellerOrders ?? []) {
      const sellerOrderId = so._id ? String(so._id) : '';
      if (!sellerOrderId) continue;
      const delivered = so.status === 'delivered' || so.status === 'completed';
      for (const raw of (so.items ?? []) as unknown as RawItem[]) {
        const itemId = String(raw._id ?? raw.itemId ?? '');
        if (!itemId || pendingItemIds.has(itemId)) continue;
        if (raw.status === 'refunded' || raw.status === 'cancelled') continue;
        if (raw.type === 'digital') {
          if (!order.isPaid || (raw.downloadCount ?? 0) > 0) continue;
        } else if (!delivered) {
          continue;
        }
        out.push({
          sellerOrderId, itemId, name: raw.name,
          storeName: so.storeName ?? null,
          totalPrice: typeof raw.totalPrice === 'number' ? raw.totalPrice : null,
        });
      }
    }
    return out;
  }, [order.sellerOrders, order.isPaid, requests]);

  const openDialog = () => {
    setSelected(eligible[0] ? `${eligible[0].sellerOrderId}:${eligible[0].itemId}` : '');
    setReason(REASONS[0]);
    setNote('');
    setSubmitError('');
    setOpen(true);
  };

  const submit = async () => {
    const target = eligible.find(e => `${e.sellerOrderId}:${e.itemId}` === selected);
    if (!target) { setSubmitError('Please choose an item.'); return; }
    const fullReason = (note.trim() ? `${reason} — ${note.trim()}` : reason).slice(0, 500);
    if (fullReason.trim().length < 3) { setSubmitError('Please describe the problem.'); return; }
    if (reason === 'Other' && !note.trim()) { setSubmitError('Please add a short note explaining the problem.'); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiCreateRefundRequest({
        orderId: order._id,
        sellerOrderId: target.sellerOrderId,
        itemIds: [target.itemId],
        reason: fullReason,
      });
      setOpen(false);
      onRequested?.(res.data);
      load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit the refund request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Nothing to show: no history and nothing refundable.
  if (!loading && !loadError && requests.length === 0 && eligible.length === 0) return null;

  return (
    <Card padding="none" className={className}>
      <div className="px-5 py-4 border-b border-bone flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
          <RotateCcw size={14} className="text-brand-orange" />
        </div>
        <p className="text-[13px] font-bold text-charcoal flex-1">Refunds</p>
        {!loading && eligible.length > 0 && (
          <Button variant="outline" size="sm" onClick={openDialog}>Request a refund</Button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => <SkeletonBox key={i} height={48} rounded="10px" />)}
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-2 text-[12px] text-error">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="flex-1">{loadError}</span>
            <button type="button" onClick={load} className="text-[12px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:underline">Retry</button>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-[12px] text-slate leading-relaxed">
            Something wrong with an item? You can request a refund for delivered items, or for digital resources you haven't downloaded yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {requests.map(r => {
              const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
              const names = r.itemIds.map(id => itemNames.get(String(id)) ?? 'Item').join(', ');
              return (
                <li key={r._id} className="rounded-[10px] border border-bone px-4 py-3">
                  <div className="flex items-start gap-2">
                    <p className="text-[12.5px] font-semibold text-charcoal flex-1 min-w-0 truncate">{names}</p>
                    <Badge color={badge.color} size="sm">{badge.label}</Badge>
                  </div>
                  <p className="text-[12px] text-slate mt-1 break-words">{r.reason}</p>
                  <p className="text-[12px] text-slate mt-1">
                    Requested {fmtDate(r.createdAt)}
                    {r.reviewedAt ? ` · Reviewed ${fmtDate(r.reviewedAt)}` : ''}
                  </p>
                  {r.status === 'approved' && r.buyerRefundAmount != null && (
                    <p className="text-[12px] text-success font-medium mt-1">
                      Refunded {formatMoney(r.buyerRefundAmount, r.buyerRefundCurrency ?? order.currency)}
                    </p>
                  )}
                  {r.status === 'rejected' && r.resolutionNotes && (
                    <p className="text-[12px] text-error mt-1 break-words">Reason: {r.resolutionNotes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {open && (
        <Modal
          title="Request a refund"
          onClose={() => { if (!submitting) setOpen(false); }}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button variant="primary" onClick={submit} loading={submitting} disabled={submitting || !selected}>
                Submit request
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Select label="Item" value={selected} onChange={e => setSelected(e.target.value)}>
              {eligible.map(e => (
                <option key={`${e.sellerOrderId}:${e.itemId}`} value={`${e.sellerOrderId}:${e.itemId}`}>
                  {e.name}
                  {e.storeName ? ` — ${e.storeName}` : ''}
                  {e.totalPrice != null ? ` (${formatMoney(e.totalPrice, order.currency)})` : ''}
                </option>
              ))}
            </Select>
            <Select label="Reason" value={reason} onChange={e => setReason(e.target.value)}>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Textarea
              label={reason === 'Other' ? 'Note' : 'Note (optional)'}
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder="Add any details that will help the seller review your request."
            />
            <p className="text-[12px] text-slate leading-relaxed">
              Each request is reviewed before any refund is issued. You'll see the outcome — and the refunded amount, if approved — on this order.
            </p>
            {submitError && <p className="text-[12px] text-error">{submitError}</p>}
          </div>
        </Modal>
      )}
    </Card>
  );
}
