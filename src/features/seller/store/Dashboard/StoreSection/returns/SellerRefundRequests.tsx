import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Check, X, Loader2 } from 'lucide-react';
import { Button, Modal, Textarea } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetSellerRefundRequests, apiApproveRefundRequest, apiRejectRefundRequest, type RefundRequest,
} from '@/api/services/refundRequests';

const TONE: Record<RefundRequest['status'], string> = {
  pending: 'bg-amber-50 text-amber-700', approved: 'bg-green-50 text-success', rejected: 'bg-red-50 text-error',
};
const PAGE = 10;

/**
 * Item-level refund requests from buyers (filed from their order page). The
 * seller approves — which refunds the buyer for those items — or rejects with
 * a note the buyer sees. Separate from whole-order returns above.
 */
export function SellerRefundRequests({ storeId }: { storeId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<RefundRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<RefundRequest | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(() => {
    setError('');
    apiGetSellerRefundRequests(storeId, page, PAGE)
      .then(res => { setRows(res.data.items ?? []); setTotal(res.data.total ?? 0); })
      .catch(err => { setError(err instanceof Error ? err.message : 'Could not load refund requests.'); setRows([]); });
  }, [storeId, page]);
  useEffect(() => { load(); }, [load]);

  const approve = async (r: RefundRequest) => {
    if (!window.confirm('Approve this refund? The buyer is refunded for these items.')) return;
    setBusy(r._id);
    try { await apiApproveRefundRequest(r._id); toast.success('Refund approved'); load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not approve.'); }
    finally { setBusy(null); }
  };

  const reject = async () => {
    if (!rejecting) return;
    setBusy(rejecting._id);
    try { await apiRejectRefundRequest(rejecting._id, notes.trim()); toast.success('Refund request rejected'); setRejecting(null); setNotes(''); load(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not reject.'); }
    finally { setBusy(null); }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <section className="bg-white border border-bone rounded-xl">
      <div className="px-4 md:px-5 py-3 border-b border-bone flex items-center gap-2">
        <p className="text-[14px] font-bold text-carbon m-0">Item refund requests</p>
        {total > 0 && <span className="text-[12px] text-slate">{total}</span>}
      </div>
      {error && <p className="px-5 py-3 text-[13px] text-error m-0" role="alert">{error}</p>}
      {rows === null ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate" size={18} /></div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-slate m-0">No refund requests. Buyers can ask for a refund on a single item from their order page.</p>
      ) : (
        <ul className="list-none p-0 m-0 divide-y divide-bone">
          {rows.map(r => (
            <li key={r._id} className="px-4 md:px-5 py-3 flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] text-slate">Order …{r.orderId.slice(-6)}</span>
                  <span className={clsx('rounded-full px-2 py-[2px] text-[12px] font-semibold capitalize', TONE[r.status])}>{r.status}</span>
                  <span className="text-[12px] text-slate">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[13px] text-carbon mt-1 mb-0">{r.reason}</p>
                <p className="text-[12px] text-slate mt-0.5 mb-0">{r.itemIds.length} item{r.itemIds.length === 1 ? '' : 's'}{r.buyerRefundAmount != null ? ` · refunded ${r.buyerRefundCurrency ?? ''} ${r.buyerRefundAmount.toLocaleString()}` : ''}{r.resolutionNotes ? ` · ${r.resolutionNotes}` : ''}</p>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" loading={busy === r._id} onClick={() => approve(r)}><Check size={13} /> Approve</Button>
                  <Button variant="ghost" size="sm" disabled={busy === r._id} onClick={() => setRejecting(r)}><X size={13} /> Reject</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="px-5 py-3 border-t border-bone flex items-center justify-end gap-2 text-[12.5px]">
          <Button variant="ghost" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-slate">{page} / {pages}</span>
          <Button variant="ghost" size="xs" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
      {rejecting && (
        <Modal title="Reject refund request" onClose={() => setRejecting(null)} width={440} footer={<>
          <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="danger" loading={busy === rejecting._id} onClick={reject}>Reject</Button>
        </>}>
          <div className="px-5 py-4">
            <Textarea label="Note for the buyer (optional)" rows={3} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Why the refund can't be given" />
          </div>
        </Modal>
      )}
    </section>
  );
}
