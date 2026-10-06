import { useState } from 'react';
import { FilterDropdown, Table, Button, Input, Modal, type TableColumn } from '@/components/comman/ui';
import { RefreshCw, Wallet } from 'lucide-react';
import { useAdminPayoutQueue, useAdminPayoutActions, useAdminProcessClearing } from '@/hooks/admin/useAdminFinance';
import { apiAdminGetPayoutDestination, type PayoutRow, type PayoutDestination } from '@/api/services/finance/adminFinance';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';
import { FinanceStatusBadge } from '../../components/finance/FinanceStatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export function FinancePayoutsTab() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const queue = useAdminPayoutQueue({ status: (status || undefined) as never, page, limit: 15 });
  const { approvePayout, rejectPayout, retryPayout, processingId, error } = useAdminPayoutActions();
  const clearing = useAdminProcessClearing();

  const [dest, setDest] = useState<PayoutDestination | null>(null);
  const [destLoadingId, setDestLoadingId] = useState<string | null>(null);
  const [destError, setDestError] = useState('');
  const showDestination = async (id: string) => {
    setDestLoadingId(id); setDestError('');
    try { setDest((await apiAdminGetPayoutDestination(id)).data); }
    catch (err) { setDestError(err instanceof Error ? err.message : 'Could not load the payout details.'); }
    finally { setDestLoadingId(null); }
  };

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleApprove = async (id: string) => {
    if (await approvePayout(id)) queue.refetch();
  };
  const handleRetry = async (id: string) => {
    if (await retryPayout(id)) queue.refetch();
  };
  const confirmReject = async () => {
    if (!rejectingId || !reason) return;
    if (await rejectPayout(rejectingId, reason)) {
      setRejectingId(null);
      setReason('');
      queue.refetch();
    }
  };
  const handleTriggerClearing = async () => {
    await clearing.triggerClearing();
    queue.refetch();
  };

  const columns: TableColumn<PayoutRow>[] = [
    { key: 'storeName', header: 'Store', render: (p) => p.storeName ?? p.storeId },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatMoneyCompact(p.amount, p.currency) },
    { key: 'method', header: 'Method', render: (p) => p.payoutMethodSnapshot?.bankName || p.payoutMethodSnapshot?.type || '—' },
    { key: 'status', header: 'Status', render: (p) => <FinanceStatusBadge status={p.status} /> },
    { key: 'createdAt', header: 'Requested', render: (p) => formatDate(p.createdAt) },
    { key: 'actions', header: '', align: 'right', render: (p) => (
      <div className="flex items-center justify-end gap-2">
        <Button size="xs" variant="ghost" onClick={() => showDestination(p._id)} loading={destLoadingId === p._id}>Pay to</Button>
        {(p.status === 'pending' || p.status === 'processing') && (
          <>
            <Button size="xs" variant="outline" onClick={() => handleApprove(p._id)} loading={processingId === p._id}>Approve</Button>
            <Button size="xs" variant="danger" onClick={() => setRejectingId(p._id)}>Reject</Button>
          </>
        )}
        {p.status === 'failed' && (
          <Button size="xs" variant="outline" onClick={() => handleRetry(p._id)} loading={processingId === p._id}>Retry</Button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
        <div className="flex-1" />
        <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={handleTriggerClearing} loading={clearing.processing}>
          Process Clearing Balances
        </Button>
      </div>

      {clearing.result && (
        <p className="text-[12px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">
          Cleared {clearing.result.processed} transaction(s), {clearing.result.byCurrency.length === 0
            ? 'nothing'
            : clearing.result.byCurrency.map((c) => formatMoneyCompact(c.amount, c.currency)).join(' + ')} moved to available balance.
        </p>
      )}
      {(error || clearing.error || destError) && <p className="text-[12px] text-error">{error || clearing.error || destError}</p>}

      {queue.error ? (
        <AnalyticsErrorState message={queue.error} onRetry={queue.refetch} />
      ) : (
        <Table
          columns={columns}
          data={queue.data?.payouts ?? []}
          keyExtractor={(p) => p._id}
          loading={queue.loading}
          emptyState={{
            icon: <Wallet size={28} className="text-slate/50" />,
            title: 'No payouts yet',
            description: 'Payout requests from sellers will appear here.',
          }}
          pagination={{ page, total: queue.data?.total ?? 0, perPage: 15, onChange: setPage, label: 'payouts' }}
        />
      )}

      {dest && (
        <Modal mobileSheet title="Send this payout to" onClose={() => setDest(null)} footer={<Button variant="ghost" onClick={() => setDest(null)}>Close</Button>}>
          <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-[13px] m-0">
            <dt className="text-slate">Amount</dt><dd className="m-0 font-semibold">{formatMoneyCompact(dest.amount, dest.currency)}</dd>
            <dt className="text-slate">Method</dt><dd className="m-0">{dest.type ?? '—'}</dd>
            <dt className="text-slate">Bank / wallet</dt><dd className="m-0">{dest.bankName ?? '—'}</dd>
            <dt className="text-slate">Account title</dt><dd className="m-0">{dest.accountHolder ?? '—'}</dd>
            <dt className="text-slate">Account no. / IBAN</dt>
            <dd className="m-0 font-mono break-all">{dest.accountNumber ?? (dest.last4 ? `•••• ${dest.last4}` : '—')}</dd>
            {dest.routingNumber && (<><dt className="text-slate">Routing</dt><dd className="m-0 font-mono">{dest.routingNumber}</dd></>)}
            {dest.externalAccountId && (<><dt className="text-slate">Account ID</dt><dd className="m-0 font-mono break-all">{dest.externalAccountId}</dd></>)}
          </dl>
          {dest.needsReentry && (
            <p className="text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2 mt-3 mb-0">
              Only the last 4 digits are on file — this account was added before full numbers were saved. Ask the seller to re-enter it in Finance → Payout methods.
            </p>
          )}
        </Modal>
      )}
      {rejectingId && (
        <Modal mobileSheet
          title="Reject Payout"
          onClose={() => { setRejectingId(null); setReason(''); }}
          footer={
            <>
              <Button variant="ghost" onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</Button>
              <Button variant="danger" onClick={confirmReject} disabled={!reason} loading={processingId === rejectingId}>Reject Payout</Button>
            </>
          }
        >
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this payout being rejected?" />
        </Modal>
      )}
    </div>
  );
}
