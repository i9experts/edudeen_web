import { useEffect, useState } from 'react';
import { Undo2, CheckCircle2, XCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminPendingRefunds, useAdminRefundActions } from '@/hooks/admin/useAdminRefunds';
import type { RefundApprovalResult, RefundRequestRow } from '@/api/services/adminRefundRequests';
import { apiAdminSellerFinancialDetails } from '@/api/services/finance/adminFinance';
import { apiGetAdminUserById } from '@/api/services/users/adminUsers';
import { Button, Modal, Textarea, Table, CopyIconButton, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';

const PER_PAGE = 20;

const ROLE_LABEL: Record<RefundRequestRow['requestedByRole'], string> = {
  user: 'Buyer', seller: 'Seller', admin: 'Admin',
};

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

// Store + requester names aren't on the refund request itself (the backend
// stores ids only), so the review modal resolves them via existing admin
// endpoints. Failures just fall back to showing the raw id.
function useRefundParties(request: RefundRequestRow) {
  const [storeName, setStoreName] = useState<string | null>(null);
  const [requester, setRequester] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    let alive = true;
    apiAdminSellerFinancialDetails(request.storeId)
      .then(res => { if (alive) setStoreName(res.data?.store?.name ?? null); })
      .catch(() => {});
    if (request.requestedByRole === 'user' || request.requestedByRole === 'seller') {
      apiGetAdminUserById(request.requestedByRole === 'user' ? 'buyer' : 'seller', request.requestedBy)
        .then(res => { if (alive && res.data) setRequester({ name: res.data.name, email: res.data.email }); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [request.storeId, request.requestedBy, request.requestedByRole]);

  return { storeName, requester };
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ request, onClose, onDone }: { request: RefundRequestRow; onClose: () => void; onDone: () => void }) {
  const { approve, reject, submitting, error } = useAdminRefundActions();
  const { storeName, requester } = useRefundParties(request);
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<RefundApprovalResult | null>(null);

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
      <Button variant="outline" icon={<XCircle size={14} />} onClick={() => setMode('reject')}>Reject</Button>
      <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setMode('approve')}>Approve</Button>
    </>
  );

  return (
    <Modal mobileSheet title="Refund request" width={560} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream border border-bone rounded-[8px] px-3 py-3 text-[12.5px]">
          <div><span className="text-slate">Order</span><p className="font-medium text-carbon"><IdCell id={request.orderId} /></p></div>
          <div><span className="text-slate">Store</span><p className="font-medium text-carbon">{storeName ?? <IdCell id={request.storeId} />}</p></div>
          <div>
            <span className="text-slate">Requested by ({ROLE_LABEL[request.requestedByRole]})</span>
            {requester
              ? <><p className="font-medium text-carbon">{requester.name}</p><p className="text-[11px] text-slate">{requester.email}</p></>
              : <p className="font-medium text-carbon"><IdCell id={request.requestedBy} /></p>}
          </div>
          <div><span className="text-slate">Items</span><p className="font-medium text-carbon">{request.itemIds.length} item{request.itemIds.length !== 1 ? 's' : ''}</p></div>
          <div><span className="text-slate">Submitted</span><p className="font-medium text-carbon">{formatDate(request.createdAt)}</p></div>
          <div>
            <span className="text-slate">Amount</span>
            <p className="font-medium text-carbon">Calculated on approval</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate uppercase tracking-[0.08em] mb-1">Reason</p>
          <p className="text-[13px] text-charcoal leading-[1.6] whitespace-pre-wrap">{request.reason}</p>
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
            {result.stripeRefundId && <p className="text-[11px]">Card refund reference: <span className="font-mono">{result.stripeRefundId}</span></p>}
          </div>
        )}

        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminRefunds() {
  usePageTitle('Refunds');
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useAdminPendingRefunds(page, PER_PAGE);
  const [viewing, setViewing] = useState<RefundRequestRow | null>(null);

  const columns: TableColumn<RefundRequestRow>[] = [
    { key: 'order', header: 'Order', render: r => <IdCell id={r.orderId} /> },
    {
      key: 'requestedBy', header: 'Requested by',
      render: r => (
        <div>
          <p className="font-medium">{ROLE_LABEL[r.requestedByRole]}</p>
          <p className="text-[11px] text-slate font-mono" title={r.requestedBy}>{shortId(r.requestedBy)}</p>
        </div>
      ),
    },
    { key: 'items', header: 'Items', render: r => <span>{r.itemIds.length}</span> },
    {
      key: 'reason', header: 'Reason',
      render: r => <span className="block max-w-[260px] truncate" title={r.reason}>{r.reason}</span>,
    },
    { key: 'createdAt', header: 'Submitted', render: r => <span className="whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: r => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewing(r); }}>Review</Button>,
    },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Refunds"
        subtitle="Pending refund requests from buyers and sellers. Approving refunds the buyer and debits only that seller's balance."
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-4">
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[13px] font-semibold text-carbon">
              Pending requests{data ? <span className="text-slate font-normal"> · {data.total}</span> : null}
            </p>
            <p className="text-[11.5px] text-slate">Oldest first. The refund amount is worked out from the order when you approve.</p>
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
              emptyState={{ icon: <Undo2 size={28} className="text-slate" />, title: 'No pending refund requests', description: 'When a buyer or seller asks for a refund on an order, it will show up here for review.' }}
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
