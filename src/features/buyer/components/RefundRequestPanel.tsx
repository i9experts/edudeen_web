import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, Badge, Button, Modal, Select, Textarea, SkeletonBox } from '@/components/comman/ui';
import type { OrderDetail } from '@/api/services/orders';
import {
  apiCreateRefundRequest,
  apiListRefundRequestsForOrder,
  REFUND_REASON_OPTIONS,
  REFUND_MAX_PHOTOS,
  FOLLOW_UP_LABEL,
  type RefundReasonCode,
  type RefundRequest,
  type RefundRequestStatus,
} from '@/api/services/refundRequests';
import { apiUploadPublicFile } from '@/api/upload';
import { RefundEvidence } from '@/components/refunds/RefundEvidence';

const MAX_PHOTOS = REFUND_MAX_PHOTOS;
const NOTE_MIN = 20;
const NOTE_MAX = 1000;
import { formatMoney } from '@/utils/currency';

/**
 * Buyer-side refund requests for ONE order: lists the requests already made
 * against it and lets the buyer request a refund for an eligible item.
 *
 * Eligibility mirrors RefundRequestService.createRequest on the backend
 * (the server re-checks everything; this only hides actions that would fail):
 *   - item not already refunded / cancelled
 *   - digital item: order paid AND the file never downloaded
 *   - physical item: its seller order is delivered or completed
 *   - no pending request already covering the item
 */
export interface RefundRequestPanelProps {
  order: OrderDetail;
  /** Called after a request is created — e.g. to refetch the order. */
  onRequested?: (request: RefundRequest) => void;
  className?: string;
}

export const REASONS = [
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
  isDigital:     boolean;
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
  const [reasonCode, setReasonCode] = useState<RefundReasonCode>('damaged');
  const [note, setNote]         = useState('');
  const [photos, setPhotos]     = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [photoError, setPhotoError] = useState('');
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
          sellerOrderId, itemId, isDigital: raw.type === 'digital', name: raw.name,
          storeName: so.storeName ?? null,
          totalPrice: typeof raw.totalPrice === 'number' ? raw.totalPrice : null,
        });
      }
    }
    return out;
  }, [order.sellerOrders, order.isPaid, requests]);

  const targetItem = eligible.find(e => `${e.sellerOrderId}:${e.itemId}` === selected);
  const isDigital = !!targetItem?.isDigital;
  // 'Digital file is not working' is digital-only; physical-only problems are hidden for digital items.
  const DIGITAL_REASONS: RefundReasonCode[] = ['digital_not_working', 'not_as_described', 'wrong_item', 'wrong_edition_or_class', 'other'];
  const reasonOptions = REFUND_REASON_OPTIONS.filter(o =>
    isDigital ? DIGITAL_REASONS.includes(o.code) : o.code !== 'digital_not_working');

  const openDialog = () => {
    const first = eligible[0];
    setSelected(first ? `${first.sellerOrderId}:${first.itemId}` : '');
    setReasonCode(first?.isDigital ? 'digital_not_working' : 'damaged');
    setNote('');
    setPhotos([]);
    setPhotoError('');
    setSubmitError('');
    setOpen(true);
  };

  const pickItem = (value: string) => {
    setSelected(value);
    const t = eligible.find(e => `${e.sellerOrderId}:${e.itemId}` === value);
    setReasonCode(t?.isDigital ? 'digital_not_working' : 'damaged');
    if (t?.isDigital) setPhotos([]);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setPhotoError('');
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`);
    for (const f of list) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setPhotoError('Only JPG, PNG or WebP photos can be added.'); continue; }
      if (f.size > 8 * 1024 * 1024) { setPhotoError('Each photo must be under 8 MB.'); continue; }
      setUploading(n => n + 1);
      try {
        const res = await apiUploadPublicFile(f);
        setPhotos(p => (p.length < MAX_PHOTOS ? [...p, res.data.url] : p));
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'Photo upload failed. Try again.');
      } finally {
        setUploading(n => n - 1);
      }
    }
  };

  const noteLen = note.trim().length;
  const noteOk = noteLen >= NOTE_MIN && noteLen <= NOTE_MAX;

  const submit = async () => {
    const target = targetItem;
    if (!target) { setSubmitError('Please choose an item.'); return; }
    if (!noteOk) { setSubmitError(`Please describe the problem in ${NOTE_MIN}-${NOTE_MAX} characters.`); return; }
    if (uploading > 0) { setSubmitError('Please wait for the photos to finish uploading.'); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiCreateRefundRequest({
        orderId: order._id,
        sellerOrderId: target.sellerOrderId,
        itemIds: [target.itemId],
        reasonCode,
        note: note.trim(),
        ...(photos.length && !target.isDigital ? { evidenceImages: photos } : {}),
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
                    <Badge color={badge.color} size="sm">
                      {r.status === 'approved' && r.followUp ? FOLLOW_UP_LABEL[r.followUp] : badge.label}
                    </Badge>
                  </div>
                  <p className="text-[12px] text-slate mt-1 break-words">{r.reason}</p>
                  <RefundEvidence request={r} />
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
              <Button variant="primary" onClick={submit} loading={submitting} disabled={submitting || !selected || uploading > 0}>
                Submit request
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Select label="Item" value={selected} onChange={e => pickItem(e.target.value)}>
              {eligible.map(e => (
                <option key={`${e.sellerOrderId}:${e.itemId}`} value={`${e.sellerOrderId}:${e.itemId}`}>
                  {e.name}
                  {e.storeName ? ` — ${e.storeName}` : ''}
                  {e.totalPrice != null ? ` (${formatMoney(e.totalPrice, order.currency)})` : ''}
                </option>
              ))}
            </Select>
            <Select label="Reason" value={reasonCode} onChange={e => setReasonCode(e.target.value as RefundReasonCode)}>
              {reasonOptions.map(o => <option key={o.code} value={o.code}>{o.label}</option>)}
            </Select>
            <div>
              <Textarea
                label="Note"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={4}
                maxLength={NOTE_MAX}
                placeholder="Describe what is wrong so the seller can review your request."
              />
              <p className={`text-[12px] mt-1 ${noteLen > 0 && !noteOk ? 'text-error' : 'text-slate'}`}>{noteLen}/{NOTE_MAX} (at least {NOTE_MIN} characters)</p>
            </div>
            {!isDigital && (
              <div>
                <p className="text-[12px] font-semibold text-charcoal mb-1.5">{`Photos (optional, up to ${MAX_PHOTOS})`}</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {photos.map((u, i) => (
                    <div key={u} className="relative w-[64px] h-[64px] rounded-[8px] overflow-hidden border border-bone">
                      <img src={u} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button type="button" aria-label="Remove photo" onClick={() => setPhotos(p => p.filter(x => x !== u))}
                        className="absolute top-0 end-0 w-6 h-6 bg-black/60 text-white text-[14px] leading-none border-none cursor-pointer">×</button>
                    </div>
                  ))}
                  {uploading > 0 && <span className="w-[64px] h-[64px] rounded-[8px] border border-dashed border-bone flex items-center justify-center text-[12px] text-slate">…</span>}
                  {photos.length + uploading < MAX_PHOTOS && (
                    <label className="w-[64px] h-[64px] rounded-[8px] border border-dashed border-bone flex items-center justify-center text-[12px] text-brand-orange font-semibold cursor-pointer">
                      Add
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only"
                        onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} />
                    </label>
                  )}
                </div>
                {photoError && <p className="text-[12px] text-error mt-1">{photoError}</p>}
              </div>
            )}
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
