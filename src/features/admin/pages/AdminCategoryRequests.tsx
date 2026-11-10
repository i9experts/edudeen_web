import { useCallback, useEffect, useState } from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import {
  apiAdminGetCategoryRequests, apiAdminDecideCategoryRequest,
  type CategoryRequest, type CategoryRequestStatus,
} from '@/api/services/categories';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Textarea } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useToast } from '@/contexts/ToastContext';
import { useBusyAction } from '@/hooks/useBusyAction';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

const FILTERS: { key: CategoryRequestStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' },
];

function DecisionModal({ request, decision, onClose, onDone }: {
  request: CategoryRequest; decision: 'approved' | 'rejected'; onClose: () => void; onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const save = useBusyAction();
  const reject = decision === 'rejected';
  const tooShort = reject && note.trim().length < 10;
  const submit = async () => {
    if (tooShort) return;
    const r = await save.run(() => apiAdminDecideCategoryRequest(request._id, decision, note.trim() || undefined));
    if (r) onDone();
  };
  return (
    <Modal
      title={reject ? 'Reject request' : 'Mark request approved'}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={save.busy}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={save.busy || tooShort}>{save.busy ? 'Saving…' : reject ? 'Reject' : 'Mark approved'}</Button>
        </>
      }
    >
      <p className="m-0 mb-1 text-[13px] font-semibold text-charcoal">{request.name}</p>
      <p className="m-0 mb-3 text-[12px] text-slate">
        {reject
          ? 'The seller is notified with your reason.'
          : 'This does not create the category. Add it first below (Add sub on the right main category), then mark the request approved. The seller is notified.'}
      </p>
      <Textarea
        label={reject ? 'Reason for the seller (at least 10 characters)' : 'Note for the seller (optional)'}
        rows={3} value={note} maxLength={500}
        onChange={e => { setNote(e.target.value); save.setError(''); }}
        error={reject && note.length > 0 && tooShort ? 'Write at least 10 characters.' : undefined}
      />
      {save.error && <p role="alert" className="mt-2 mb-0 text-[12px] text-error">{save.error}</p>}
    </Modal>
  );
}

/** Admin: seller category requests. Approving only records the decision; the admin creates the category with the normal tools. */
export function AdminCategoryRequests() {
  const toast = useToast();
  const [status, setStatus] = useState<CategoryRequestStatus>('pending');
  const [rows, setRows] = useState<CategoryRequest[] | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState<{ r: CategoryRequest; d: 'approved' | 'rejected' } | null>(null);

  const load = useCallback(() => {
    setError('');
    apiAdminGetCategoryRequests(status)
      .then(res => { setRows(res.data); setPending(res.pendingCount); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load requests.'));
  }, [status]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useLiveRefresh(['categories'], load);

  return (
    <section className="bg-white border border-bone rounded-xl mb-4 overflow-hidden" aria-label="Seller category requests">
      <div className="px-4 py-3 border-b border-bone flex flex-wrap items-center gap-2">
        <p className="m-0 text-[13px] font-bold text-charcoal flex-1 min-w-[160px]">
          Seller requests {pending > 0 && <span className="ms-1 rounded-full bg-brand-orange/15 text-brand-orange px-2 py-0.5 text-[12px]">{pending} pending</span>}
        </p>
        <div className="flex gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key} type="button" aria-pressed={status === f.key} onClick={() => setStatus(f.key)}
              className={`min-h-[36px] px-3 rounded-full text-[12px] font-medium border cursor-pointer ${status === f.key ? 'bg-carbon text-white border-carbon' : 'bg-white text-graphite border-bone'}`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {error ? (
        <div role="alert" className="m-4 flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
        </div>
      ) : rows === null ? (
        <div className="p-4 flex flex-col gap-3" aria-busy="true">{Array.from({ length: 2 }).map((_, i) => <SkeletonBox key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] text-slate flex flex-col items-center gap-2"><Inbox size={22} /> No {status} requests.</div>
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-bone">
          {rows.map(r => (
            <li key={r._id} className="px-4 py-3 flex flex-col gap-1.5">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] font-semibold text-carbon break-words">
                    {r.name} <span className="font-normal text-slate">· {r.type === 'main_change' ? 'Main category change' : 'Subcategory'}</span>
                  </p>
                  <p className="m-0 text-[12px] text-slate">
                    {r.storeName ?? 'Store'}{r.mainCategoryName ? ` · under ${r.mainCategoryName}` : ''} · {new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setDeciding({ r, d: 'rejected' })}>Reject</Button>
                    <Button size="sm" onClick={() => setDeciding({ r, d: 'approved' })}>Mark approved</Button>
                  </div>
                )}
              </div>
              <p className="m-0 text-[12px] text-graphite break-words"><strong>Why:</strong> {r.reason}</p>
              <p className="m-0 text-[12px] text-graphite break-words"><strong>Example:</strong> {r.exampleProduct}</p>
              {r.adminNote && <p className="m-0 text-[12px] text-slate break-words">Note: {r.adminNote}</p>}
            </li>
          ))}
        </ul>
      )}

      {deciding && (
        <DecisionModal
          request={deciding.r} decision={deciding.d}
          onClose={() => setDeciding(null)}
          onDone={() => { toast.success(deciding.d === 'approved' ? 'Request marked approved. Seller notified.' : 'Request rejected. Seller notified.'); setDeciding(null); load(); }}
        />
      )}
    </section>
  );
}
