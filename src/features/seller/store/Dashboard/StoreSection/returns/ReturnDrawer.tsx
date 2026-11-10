import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertCircle, Check, Circle, Download, RefreshCw, X } from 'lucide-react';
import { Modal, Textarea, Button, SkeletonBox } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetSellerReturnDetail, apiReturnAction, apiReturnFollowUp,
  type SellerReturnDetail, type SellerReturnRow,
} from '@/api/services/orders';
import {
  apiApproveRefundRequest, apiRejectRefundRequest, apiFollowUpRefundRequest,
  FOLLOW_UP_LABEL, REJECT_REASON_MIN, type FollowUpStep,
} from '@/api/services/refundRequests';
import { formatPrice } from '@/utils/formatPrice';
import { safeHttpUrl } from '@/utils/safeRedirect';

const STATUS_STYLE: Record<SellerReturnDetail['status'], string> = {
  open:     'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-success',
  rejected: 'bg-red-50 text-error',
};
const STATUS_TEXT: Record<SellerReturnDetail['status'], string> = { open: 'Open', approved: 'Approved', rejected: 'Rejected' };

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={clsx('inline-block rounded-full px-2.5 py-[3px] text-[12px] font-semibold whitespace-nowrap', className)}>{children}</span>;
}

function fmtWhen(iso: string | null) {
  if (!iso) return 'Date not recorded';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Date not recorded' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ROLE_LABEL: Record<string, string> = { user: 'Buyer', seller: 'Seller', admin: 'Edudeen' };

/** Photo viewer: click a thumbnail to enlarge, Esc / backdrop / X to close. */
function PhotoViewer({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <button type="button" aria-label="Close photo" onClick={onClose} className="absolute top-3 end-3 w-11 h-11 rounded-full bg-white/90 flex items-center justify-center cursor-pointer border-0">
        <X size={18} />
      </button>
      <img src={url} alt="Evidence from the buyer" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  );
}

function Timeline({ items }: { items: SellerReturnDetail['timeline'] }) {
  return (
    <ol className="list-none p-0 m-0 flex flex-col">
      {items.map((t, i) => {
        const last = i === items.length - 1;
        return (
          <li key={`${t.status}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center shrink-0', last ? 'bg-brand-orange text-white' : 'bg-cream text-slate')}>
                {last ? <Check size={12} /> : <Circle size={8} />}
              </span>
              {!last && <span className="w-px flex-1 bg-bone my-1" />}
            </div>
            <div className={clsx('min-w-0', !last && 'pb-3')}>
              <p className="text-[13px] font-semibold text-carbon m-0">{t.label}{t.byRole ? <span className="font-normal text-slate"> · {ROLE_LABEL[t.byRole] ?? t.byRole}</span> : null}</p>
              <p className="text-[12px] text-slate m-0">{fmtWhen(t.at)}</p>
              {t.note && <p className="text-[12px] text-charcoal mt-0.5 mb-0 break-words">{t.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Side sheet for ONE return / refund request: order, item(s), reason, buyer note,
 * photos, status trail, and the actions. Approve / Reject call the EXISTING endpoints
 * (the refund still happens at approval); "item received" / "replacement sent" are
 * tracking-only steps. Opened with "Review" (open requests) or "View" (closed ones).
 */
export function ReturnDrawer({ row, storeId, currency, onClose, onChanged }: {
  row: SellerReturnRow; storeId: string; currency?: string | null; onClose: () => void; onChanged: () => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<SellerReturnDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadKey, setLoadKey] = useState(0);
  const [mode, setMode] = useState<'view' | 'reject' | 'step'>('view');
  const [stepToDo, setStepToDo] = useState<FollowUpStep>('item_received');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);
  const busyRef = useRef(false);

  const load = useCallback(() => { setLoadError(''); setLoadKey(k => k + 1); }, []);
  useEffect(() => {
    let cancelled = false;
    apiGetSellerReturnDetail(storeId, row.source, row.requestId)
      .then(res => { if (!cancelled) setDetail(res.data); })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load this request.'); });
    return () => { cancelled = true; };
  }, [storeId, row.source, row.requestId, loadKey]);

  const cur = currency ?? detail?.currency;
  const rejectNoteOk = note.trim().length >= REJECT_REASON_MIN;

  const run = async (fn: () => Promise<unknown>, done: string, close: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      await fn();
      toast.success(done);
      onChanged();
      if (close) onClose(); else { setMode('view'); setNote(''); load(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete this action.');
    } finally {
      busyRef.current = false; setBusy(false);
    }
  };

  const approve = () => run(async () => {
    if (row.source === 'return') await apiReturnAction(row.orderId, { storeId: row.storeId, itemIds: row.itemIds, action: 'approve' });
    else await apiApproveRefundRequest(row.requestId);
  }, row.source === 'return' ? 'Return approved' : 'Refund approved', true);

  const reject = () => {
    if (!rejectNoteOk) { setError(`Please explain the rejection in at least ${REJECT_REASON_MIN} characters. The buyer will read it.`); return; }
    void run(async () => {
      if (row.source === 'return') await apiReturnAction(row.orderId, { storeId: row.storeId, itemIds: row.itemIds, action: 'reject', rejectReason: note.trim() });
      else await apiRejectRefundRequest(row.requestId, note.trim());
    }, 'Request rejected', true);
  };

  const followUp = () => void run(async () => {
    if (row.source === 'return') await apiReturnFollowUp(row.orderId, { storeId: row.storeId, itemId: row.itemIds[0], step: stepToDo, note: note.trim() || undefined });
    else await apiFollowUpRefundRequest(row.requestId, stepToDo, note);
  }, `Marked: ${FOLLOW_UP_LABEL[stepToDo]}`, false);

  const startStep = (s: FollowUpStep) => { setStepToDo(s); setMode('step'); setNote(''); setError(''); };
  const photos = (detail?.evidenceImages ?? []).map(u => safeHttpUrl(u)).filter((u): u is string => !!u);
  const a = detail?.actions;

  const footer = !detail ? (
    <Button variant="outline" onClick={onClose}>Close</Button>
  ) : mode === 'reject' ? (
    <>
      <Button variant="outline" onClick={() => { setMode('view'); setError(''); }} disabled={busy}>Back</Button>
      <Button variant="danger" onClick={reject} loading={busy}>Confirm reject</Button>
    </>
  ) : mode === 'step' ? (
    <>
      <Button variant="outline" onClick={() => { setMode('view'); setError(''); }} disabled={busy}>Back</Button>
      <Button onClick={followUp} loading={busy}>Save: {FOLLOW_UP_LABEL[stepToDo]}</Button>
    </>
  ) : a?.canReview ? (
    <>
      <Button variant="outline" onClick={onClose} disabled={busy}>Close</Button>
      <Button variant="danger" onClick={() => { setMode('reject'); setError(''); }} disabled={busy}>Reject</Button>
      <Button onClick={approve} loading={busy}>Approve</Button>
    </>
  ) : (
    <>
      <Button variant="outline" onClick={onClose}>Close</Button>
      {a?.canMarkReceived && <Button onClick={() => startStep('item_received')}>Mark item received</Button>}
      {a?.canMarkReplacementSent && <Button variant="outline" onClick={() => startStep('replacement_sent')}>Mark replacement sent</Button>}
    </>
  );

  return (
    <>
      <Modal
        title={`${row.type === 'Return' ? 'Return' : 'Refund request'} — ${row.orderNumber}`}
        onClose={onClose}
        mobileSheet
        fullHeightMobile
        width={520}
        footer={footer}
      >
        {loadError ? (
          <div className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center gap-3" role="alert">
            <AlertCircle size={16} className="text-error shrink-0" />
            <span className="text-[13px] text-error flex-1">{loadError}</span>
            <button type="button" onClick={load} className="flex items-center gap-1 text-[12px] text-error font-semibold cursor-pointer min-h-[44px] px-2 bg-transparent border-0">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : !detail ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <SkeletonBox height={20} width="60%" />
            <SkeletonBox height={64} rounded="10px" />
            <SkeletonBox height={96} rounded="10px" />
            <SkeletonBox height={120} rounded="10px" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill className={STATUS_STYLE[detail.status]}>{STATUS_TEXT[detail.status]}</Pill>
              {detail.followUp && <Pill className="bg-[#EAF1F8] text-[#174771]">{FOLLOW_UP_LABEL[detail.followUp]}</Pill>}
              {detail.refunded && <Pill className="bg-green-50 text-success">Refunded {formatPrice(detail.refundedAmount, cur)}</Pill>}
              <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(detail.orderNumber)}`} className="ms-auto font-bold text-brand-deep-orange text-[13px] hover:underline inline-flex items-center min-h-[44px]">
                Order {detail.orderNumber}
              </Link>
            </div>

            <section aria-label="Items">
              <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.05em] mb-1.5 mt-0">{detail.items.length > 1 ? 'Items' : 'Item'}</p>
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                {detail.items.map(i => (
                  <li key={i.id} className="rounded-[9px] border border-bone px-3 py-2.5">
                    <p className="text-[13px] font-semibold text-carbon m-0 break-words">{i.name}{i.quantity > 1 ? ` × ${i.quantity}` : ''}</p>
                    <p className="text-[12px] text-slate m-0">{formatPrice(i.totalPrice, cur)} · {i.type === 'digital' ? 'Digital' : 'Physical'}</p>
                    {i.type === 'digital' && (
                      <p className="text-[12px] text-charcoal mt-1 mb-0 inline-flex items-center gap-1">
                        <Download size={12} aria-hidden="true" />
                        {(i.downloadCount ?? 0) > 0 ? `Downloaded: yes (${i.downloadCount} ${i.downloadCount === 1 ? 'time' : 'times'})` : 'Downloaded: no'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-[12px] text-slate mt-1.5 mb-0">Customer: {detail.buyer} · Amount: {formatPrice(detail.amount, cur)}</p>
            </section>

            <section aria-label="Reason" className="bg-cream rounded-[9px] px-3 py-2.5">
              <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.05em] mb-1 mt-0">Customer's reason</p>
              <p className="text-[13px] text-charcoal font-medium m-0 break-words">{detail.reasonLabel || '—'}</p>
              {detail.note ? (
                <p className="text-[13px] text-charcoal mt-1.5 mb-0 whitespace-pre-wrap break-words">{detail.note}</p>
              ) : detail.reason && detail.reason !== detail.reasonLabel ? (
                <p className="text-[13px] text-charcoal mt-1.5 mb-0 break-words">{detail.reason}</p>
              ) : null}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((u, i) => (
                    <button key={u} type="button" onClick={() => setZoom(u)} aria-label={`Enlarge photo ${i + 1}`}
                      className="block w-[72px] h-[72px] rounded-[8px] overflow-hidden border border-bone p-0 bg-white cursor-pointer">
                      <img src={u} alt={`Photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {detail.items.some(i => i.type === 'physical') && photos.length === 0 && detail.reasonCode && (
                <p className="text-[12px] text-slate mt-1.5 mb-0">No photos were added.</p>
              )}
            </section>

            {detail.status === 'rejected' && (
              <section aria-label="Rejection reason" className="bg-red-50 rounded-[9px] px-3 py-2.5">
                <p className="text-[12px] font-semibold text-error uppercase tracking-[0.05em] mb-1 mt-0">Why it was rejected</p>
                <p className="text-[13px] text-charcoal m-0 break-words">{detail.rejectReason || 'No reason was recorded.'}</p>
              </section>
            )}

            <section aria-label="Status trail">
              <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.05em] mb-2 mt-0">Status trail</p>
              <Timeline items={detail.timeline} />
              {detail.followUpNote && <p className="text-[12px] text-slate mt-2 mb-0">Note: {detail.followUpNote}</p>}
            </section>

            {mode === 'reject' && (
              <Textarea
                label={`Why is this being rejected? (at least ${REJECT_REASON_MIN} characters, the buyer will read it)`}
                rows={3} maxLength={500} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Explain why this request is being rejected…"
              />
            )}
            {mode === 'step' && (
              <Textarea
                label={`Note for the trail (optional)`}
                rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)}
                placeholder={stepToDo === 'item_received' ? 'e.g. Parcel came back on 12 Nov, condition checked' : 'e.g. New copy sent with TCS, tracking 123'}
              />
            )}
            {mode === 'view' && detail.status === 'approved' && (a?.canMarkReceived || a?.canMarkReplacementSent) && (
              <p className="text-[12px] text-slate m-0">These steps are for your own tracking. The refund was already issued when you approved.</p>
            )}
            {error && <p className="text-[12px] text-error m-0" role="alert">{error}</p>}
          </div>
        )}
      </Modal>
      {zoom && <PhotoViewer url={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}
