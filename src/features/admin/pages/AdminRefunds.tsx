import { Link } from 'react-router-dom';
import { useUrlPage, useUrlParam } from '@/hooks/useUrlParam';
import { useState } from 'react';
import { Undo2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminRefunds, useAdminRefundActions } from '@/hooks/admin/useAdminRefunds';
import type { RefundApprovalResult, RefundRequestRow, RefundRequestStatus } from '@/api/services/adminRefundRequests';
import { StaffNotes } from '@/features/admin/components/StaffNotes';
import { EntitySearchSelect } from '@/features/admin/components/analytics/EntitySearchSelect';
import { searchStoresByName } from '@/api/services/adminStoreLookup';
import { Button, Modal, Textarea, Table, StatusBadge, SearchInput, FilterDropdown, CopyIconButton, type TableColumn } from '@/components/comman/ui';
import { DateField } from '@/components/comman/ui/DateField';
import { AdminStudioHeader } from '@/features/admin/components/studio';

import { RefundEvidence } from '@/components/refunds/RefundEvidence';

const PER_PAGE = 20;

const ROLE_LABEL: Record<RefundRequestRow['requestedByRole'], string> = {
  user: 'Buyer', seller: 'Seller', admin: 'Admin',
};

const STATUS_OPTIONS: { value: RefundRequestStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function shortId(id: string) {
  return id.length > 10 ? `…${id.slice(-8)}` : id;
}

function IdCell({ id }: { id: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[12px]" title={id}>
      {shortId(id)}
      <CopyIconButton value={id} title="Copy ID" size={12} className="text-slate hover:text-carbon" />
    </span>
  );
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ request, onClose, onDone }: { request: RefundRequestRow; onClose: () => void; onDone: () => void }) {
  const { approve, reject, submitting, error } = useAdminRefundActions();
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<RefundApprovalResult | null>(null);

  const isPending = request.status === 'pending';
  const notesValid = notes.trim().length >= 3 && notes.trim().length <= 500;

  async function handleApprove() {
    const res = await approve(request._id);
    if (res) setResult(res);
  }

  async function handleReject() {
    if (!notesValid) return;
    if (await reject(request._id, notes.trim())) onDone();
  }

  const footer = result ? (
    <Button variant="primary" onClick={onDone}>Done</Button>
  ) : !isPending ? (
    <Button variant="ghost" onClick={onClose}>Close</Button>
  ) : mode === 'approve' ? (
    <>
      <Button variant="ghost" onClick={() => setMode('view')} disabled={submitting}>Back</Button>
      <Button variant="primary" icon={<CheckCircle2 size={14} />} loading={submitting} onClick={handleApprove}>Confirm refund</Button>
    </>
  ) : mode === 'reject' ? (
    <>
      <Button variant="ghost" onClick={() => setMode('view')} disabled={submitting}>Back</Button>
      <Button variant="danger" loading={submitting} disabled={!notesValid} onClick={handleReject}>Confirm reject</Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose}>Close</Button>
      <Button variant="outline" icon={<XCircle size={14} />} onClick={() => setMode('reject')}>Reject</Button>
      <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setMode('approve')}>Approve</Button>
    </>
  );

  return (
    <Modal mobileSheet title="Refund request" width={560} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream border border-bone rounded-[8px] px-3 py-3 text-[12.5px]">
          <div>
            <span className="text-slate">Order</span>
            <p className="font-medium text-carbon">
              <Link to={`/admin/orders?order=${request.orderId}`} target="_blank" className="inline-flex items-center gap-1 text-brand-royal hover:underline">
                {request.orderNumber ?? <IdCell id={request.orderId} />}<ExternalLink size={11} />
              </Link>
            </p>
          </div>
          <div><span className="text-slate">Store</span><p className="font-medium text-carbon">{request.storeName ?? <IdCell id={request.storeId} />}</p></div>
          <div>
            <span className="text-slate">Requested by ({ROLE_LABEL[request.requestedByRole]})</span>
            {request.requester
              ? <><p className="font-medium text-carbon">{request.requester.name}</p><p className="text-[12px] text-slate">{request.requester.email}</p></>
              : <p className="font-medium text-carbon"><IdCell id={request.requestedBy} /></p>}
          </div>
          <div><span className="text-slate">Items</span><p className="font-medium text-carbon">{request.itemIds.length} item{request.itemIds.length !== 1 ? 's' : ''}</p></div>
          <div><span className="text-slate">Submitted</span><p className="font-medium text-carbon">{formatDate(request.createdAt)}</p></div>
          <div>
            <span className="text-slate">Amount</span>
            <p className="font-medium text-carbon">
              {request.buyerRefundAmount != null ? `${request.buyerRefundAmount.toLocaleString()} ${request.buyerRefundCurrency}` : 'Calculated on approval'}
            </p>
          </div>
        </div>

        {!isPending && (
          <div className={`rounded-md px-3 py-2.5 text-[12.5px] flex flex-col gap-0.5 ${request.status === 'approved' ? 'bg-success-bg text-success' : 'bg-error-bg text-error'}`}>
            <p className="font-semibold flex items-center gap-1">
              <StatusBadge status={request.status} size="sm" /> {request.reviewedAt ? `on ${formatDate(request.reviewedAt)}` : ''}
            </p>
            {request.status === 'approved' && request.buyerRefundAmount != null && (
              <p>Buyer refunded {request.buyerRefundAmount.toLocaleString()} {request.buyerRefundCurrency}; seller debited {request.sellerDebitAmount?.toLocaleString()} {request.sellerDebitCurrency}.</p>
            )}
            {request.status === 'approved' && request.stripeRefundId && <p className="text-[12px]">Card refund reference: <span className="font-mono">{request.stripeRefundId}</span></p>}
            {request.status === 'rejected' && request.resolutionNotes && <p>Reason: {request.resolutionNotes}</p>}
          </div>
        )}

        <div>
          <p className="text-[12px] font-semibold text-slate uppercase tracking-[0.08em] mb-1">Reason</p>
          <p className="text-[13px] text-charcoal leading-[1.6] whitespace-pre-wrap">{request.reason}</p>
          <RefundEvidence request={request} />
        </div>

        {mode === 'approve' && !result && (
          <p className="text-[12px] text-charcoal bg-cream border border-bone rounded-md px-2.5 py-2">
            Approving refunds the buyer for exactly these {request.itemIds.length} item{request.itemIds.length !== 1 ? 's' : ''} at the price they paid,
            debits only this seller's balance, and returns the stock. Card payments are refunded to the buyer's card automatically. This can't be undone.
          </p>
        )}

        {mode === 'reject' && (
          <Textarea
            label="Reason for rejecting (shown to the requester)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. The return window for this item has closed"
            rows={3}
            maxLength={500}
          />
        )}

        {result && (
          <div className="text-[12.5px] text-success bg-success-bg rounded-md px-3 py-2.5 flex flex-col gap-0.5">
            <p className="font-semibold flex items-center gap-1"><CheckCircle2 size={13} /> Refund approved</p>
            <p>Buyer refunded {result.buyerRefundAmount.toLocaleString()} {result.buyerRefundCurrency}; seller debited {result.sellerDebitAmount.toLocaleString()} {result.settlementCurrency}.</p>
            {result.stripeRefundId && <p className="text-[12px]">Card refund reference: <span className="font-mono">{result.stripeRefundId}</span></p>}
          </div>
        )}

        {error && <p className="text-[12px] text-error">{error}</p>}

        <StaffNotes entityType="order" entityId={request.orderId} className="pt-3 border-t border-bone" />
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminRefunds() {
  usePageTitle('Refunds');
  const [page, setPage] = useUrlPage();
  const [search, setSearch] = useUrlParam('q');
  const [status, setStatus] = useUrlParam('status', 'pending');
  const [storeId, setStoreId] = useUrlParam('storeId');
  const [from, setFrom] = useUrlParam('from');
  const [to, setTo] = useUrlParam('to');
  const { data, loading, error, refetch } = useAdminRefunds({
    page, limit: PER_PAGE,
    status: (status || undefined) as RefundRequestStatus | undefined,
    storeId: storeId || undefined,
    q: search || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  const [viewing, setViewing] = useState<RefundRequestRow | null>(null);

  const reset = (fn: () => void) => { fn(); setPage(1); };
  const anyFilter = !!(search || storeId || from || to || status !== 'pending');

  const columns: TableColumn<RefundRequestRow>[] = [
    {
      key: 'order', header: 'Order',
      render: r => (
        <Link to={`/admin/orders?order=${r.orderId}`} target="_blank" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-brand-royal hover:underline whitespace-nowrap">
          {r.orderNumber ?? shortId(r.orderId)}<ExternalLink size={11} />
        </Link>
      ),
    },
    { key: 'store', header: 'Store', render: r => <span className="truncate max-w-[160px] inline-block">{r.storeName ?? '—'}</span> },
    {
      key: 'requestedBy', header: 'Requested by',
      render: r => (
        <div>
          <p className="font-medium">{ROLE_LABEL[r.requestedByRole]}</p>
          <p className="text-[12px] text-slate truncate max-w-[180px]">{r.requester?.name ?? shortId(r.requestedBy)}</p>
        </div>
      ),
    },
    { key: 'items', header: 'Items', render: r => <span>{r.itemIds.length}</span> },
    {
      key: 'reason', header: 'Reason',
      render: r => <span className="block max-w-[220px] truncate" title={r.reason}>{r.reason}</span>,
    },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} size="sm" /> },
    { key: 'createdAt', header: 'Submitted', render: r => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: r => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewing(r); }}>{r.status === 'pending' ? 'Review' : 'View'}</Button>,
    },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Refunds"
        subtitle="Refund requests from buyers and sellers. Approving refunds the buyer and debits only that seller's balance."
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-4">
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
            <SearchInput value={search} onChange={v => reset(() => setSearch(v))} placeholder="Order no. or requester name/email" className="flex-1 min-w-[240px] max-w-[380px]" />
            <FilterDropdown placeholder="Any status" options={STATUS_OPTIONS} value={status} onChange={v => reset(() => setStatus(v))} />
            <EntitySearchSelect label="Store" placeholder="Search by store name…" selectedId={storeId} onSelect={opt => reset(() => setStoreId(opt?.id ?? ''))} search={searchStoresByName} />
            <DateField id="refunds-from" label="From" value={from} onChange={v => reset(() => setFrom(v))} />
            <DateField id="refunds-to" label="To" value={to} onChange={v => reset(() => setTo(v))} />
            {anyFilter && (
              <button type="button" onClick={() => reset(() => { setSearch(''); setStatus('pending'); setStoreId(''); setFrom(''); setTo(''); })}
                className="text-[12.5px] font-semibold text-carbon underline underline-offset-4 bg-transparent border-none cursor-pointer">Clear</button>
            )}
            <p className="text-[12px] text-slate ml-auto">
              {status === 'pending' ? 'Oldest first. The refund amount is worked out from the order when you approve.' : 'Newest first.'}
            </p>
          </div>

          {error ? (
            <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
          ) : (
            <Table
              columns={columns}
              data={data?.items ?? []}
              keyExtractor={r => r._id}
              loading={loading}
              onRowClick={setViewing}
              pagination={{ page, total: data?.total ?? 0, perPage: PER_PAGE, onChange: setPage, label: 'requests' }}
              emptyState={{ icon: <Undo2 size={28} className="text-slate" />, title: anyFilter ? 'No refund requests match these filters' : 'No pending refund requests', description: anyFilter ? 'Try a different search or clear the filters.' : 'When a buyer or seller asks for a refund on an order, it will show up here for review.' }}
            />
          )}
        </div>
      </div>

      {viewing && (
        <ReviewModal
          request={viewing}
          onClose={() => setViewing(null)}
          onDone={() => { setViewing(null); refetch(); }}
        />
      )}
    </div>
  );
}
