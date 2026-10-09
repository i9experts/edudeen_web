import { useState } from 'react';
import { Landmark, CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button, Modal, Input, Table, type TableColumn } from '@/components/comman/ui';
import { useAdminPendingVerificationMethods, useAdminVerifyPayoutMethod, useAdminTriggerScheduledPayouts } from '@/hooks/admin/useAdminFinance';
import type { PendingPayoutMethodRow } from '@/api/services/finance/adminFinance';
import { formatDate } from '@/components/comman/analytics/format';

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer', jazzcash: 'JazzCash', easypaisa: 'Easypaisa', paypal: 'PayPal', stripe: 'Stripe',
};

function methodDetail(m: PendingPayoutMethodRow) {
  if (m.type === 'bank_transfer') return `${m.bankName ?? '—'} · ${m.accountHolder ?? '—'} · ••${m.accountLast4 ?? '????'}`;
  if (m.type === 'jazzcash' || m.type === 'easypaisa') return `${m.accountHolder ?? '—'} · ••${m.accountLast4 ?? '????'}`;
  return m.externalAccountId ?? '—';
}

export function FinancePayoutMethodsTab() {
  const { methods, loading, error, refetch } = useAdminPendingVerificationMethods();
  const { verify, submitting, error: verifyError } = useAdminVerifyPayoutMethod();
  const scheduled = useAdminTriggerScheduledPayouts();
  const [rejecting, setRejecting] = useState<PendingPayoutMethodRow | null>(null);
  const [reason, setReason] = useState('');

  async function handleApprove(m: PendingPayoutMethodRow) {
    if (await verify(m.storeId, m._id, true)) refetch();
  }
  async function confirmReject() {
    if (!rejecting || !reason.trim()) return;
    if (await verify(rejecting.storeId, rejecting._id, false, reason.trim())) {
      setRejecting(null);
      setReason('');
      refetch();
    }
  }
  async function handleTriggerScheduled() {
    await scheduled.trigger();
  }

  const columns: TableColumn<PendingPayoutMethodRow>[] = [
    { key: 'storeName', header: 'Store', render: m => <span className="font-medium text-charcoal">{m.storeName}</span> },
    { key: 'type', header: 'Type', render: m => <span className="text-graphite">{METHOD_LABEL[m.type] ?? m.type}</span> },
    {
      key: 'details', header: 'Details',
      render: m => (
        <span className="font-mono">
          {methodDetail(m)}
          {m.accountTitleMismatchFlagged && (
            <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-semibold text-warning bg-warning-bg rounded-full px-2 py-[1px]">
              <AlertTriangle size={9} /> Name mismatch
            </span>
          )}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Submitted', render: m => <span className="text-slate whitespace-nowrap">{formatDate(m.createdAt)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      render: m => (
        <div className="flex items-center justify-end gap-2">
          <Button size="xs" variant="outline" icon={<CheckCircle2 size={12} />} onClick={() => handleApprove(m)} loading={submitting}>Approve</Button>
          <Button size="xs" variant="danger" icon={<XCircle size={12} />} onClick={() => { setRejecting(m); setReason(''); }}>Reject</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-slate flex-1">
          New payout methods start "pending verification" until an admin confirms the details — no automated bank/wallet verification exists.
        </p>
        <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={handleTriggerScheduled} loading={scheduled.processing}>
          Run Scheduled Payouts Now
        </Button>
      </div>

      {scheduled.result && (
        <p className="text-[12px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">
          {scheduled.result.schedulesChecked} schedule(s) checked, {scheduled.result.payoutsCreated} payout(s) created (${scheduled.result.totalAmount.toFixed(2)} total), {scheduled.result.skipped} skipped.
        </p>
      )}
      {(scheduled.error || verifyError) && <p className="text-[12px] text-error">{scheduled.error || verifyError}</p>}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="px-5 py-[14px] border-b border-bone">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Pending Verification</p>
        </div>
        {error ? (
          <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
        ) : (
          <Table
            columns={columns}
            data={methods}
            keyExtractor={m => m._id}
            loading={loading}
            emptyState={{ icon: <Landmark size={28} className="text-slate" />, title: 'Nothing pending', description: 'Newly added seller payout methods needing review will show up here.' }}
          />
        )}
      </div>

      {rejecting && (
        <Modal mobileSheet
          title="Reject Payout Method"
          onClose={() => setRejecting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button variant="danger" disabled={!reason.trim()} loading={submitting} onClick={confirmReject}>Reject</Button>
            </>
          }
        >
          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Account title doesn't match seller's registered name" />
        </Modal>
      )}
    </div>
  );
}
