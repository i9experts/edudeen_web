import { useState } from 'react';
import { Modal, Button, Input, Table, type TableColumn } from '@/components/comman/ui';
import { useAdminSellerFinancialDetails, useAdminSellerTransactions, useAdminManualPayout } from '@/hooks/admin/useAdminFinance';
import type { PayoutRow, TransactionRow } from '@/api/services/finance/adminFinance';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { TableCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatDate } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';
import { FinanceStatusBadge } from './FinanceStatusBadge';

interface SellerFinancialDetailsModalProps {
  storeId: string;
  onClose: () => void;
}

export function SellerFinancialDetailsModal({ storeId, onClose }: SellerFinancialDetailsModalProps) {
  const details = useAdminSellerFinancialDetails(storeId);
  const [page, setPage] = useState(1);
  const transactions = useAdminSellerTransactions(storeId, { page, limit: 10 });
  const { createManualPayout, submitting, error: manualError } = useAdminManualPayout();

  const [showManualForm, setShowManualForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const d = details.data;

  const submitManualPayout = async () => {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) return;
    const ok = await createManualPayout(storeId, { amount: parsed, notes: notes || undefined });
    if (ok) {
      setShowManualForm(false);
      setAmount('');
      setNotes('');
      details.refetch();
      transactions.refetch();
    }
  };

  const payoutColumns: TableColumn<PayoutRow>[] = [
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatMoneyCompact(p.amount, p.currency) },
    { key: 'status', header: 'Status', render: (p) => <FinanceStatusBadge status={p.status} /> },
    { key: 'createdAt', header: 'Requested', render: (p) => formatDate(p.createdAt) },
  ];

  const txColumns: TableColumn<TransactionRow>[] = [
    { key: 'description', header: 'Description' },
    { key: 'type', header: 'Type' },
    { key: 'amount', header: 'Amount', align: 'right', render: (t) => `${t.amount >= 0 ? '+' : ''}${formatMoneyCompact(t.amount, t.currency)}` },
    { key: 'status', header: 'Status', render: (t) => <FinanceStatusBadge status={t.status} /> },
    { key: 'createdAt', header: 'Date', render: (t) => formatDate(t.createdAt) },
  ];

  return (
    <Modal title={d ? `${d.store.name} — Finance` : 'Seller Finance'} onClose={onClose} width={760}>
      {details.loading ? (
        <TableCardSkeleton />
      ) : details.error ? (
        <AnalyticsErrorState message={details.error} onRetry={details.refetch} />
      ) : d ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-cream rounded-lg px-3 py-2">
              <p className="text-[12px] text-slate uppercase tracking-[0.05em]">Available</p>
              <p className="text-[16px] font-bold text-charcoal">{formatMoneyCompact(d.balance.availableBalance, d.balance.currency)}</p>
            </div>
            <div className="bg-cream rounded-lg px-3 py-2">
              <p className="text-[12px] text-slate uppercase tracking-[0.05em]">Pending</p>
              <p className="text-[16px] font-bold text-charcoal">{formatMoneyCompact(d.balance.pendingBalance, d.balance.currency)}</p>
            </div>
            <div className="bg-cream rounded-lg px-3 py-2">
              <p className="text-[12px] text-slate uppercase tracking-[0.05em]">Lifetime Revenue</p>
              <p className="text-[16px] font-bold text-charcoal">{formatMoneyCompact(d.balance.totalRevenue, d.balance.currency)}</p>
            </div>
            <div className="bg-cream rounded-lg px-3 py-2">
              <p className="text-[12px] text-slate uppercase tracking-[0.05em]">Lifetime Payouts</p>
              <p className="text-[16px] font-bold text-charcoal">{formatMoneyCompact(d.balance.totalPayouts, d.balance.currency)}</p>
            </div>
          </div>

          {d.seller && (
            <p className="text-[12px] text-slate">{d.seller.name} — {d.seller.email}</p>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-charcoal">Recent Payouts</p>
            <Button size="sm" variant="outline" onClick={() => setShowManualForm((o) => !o)}>
              {showManualForm ? 'Cancel' : 'Issue Manual Payout'}
            </Button>
          </div>

          {showManualForm && (
            <div className="border border-bone rounded-lg p-3 flex flex-col gap-2">
              <Input
                label={`Amount (available: ${formatMoneyCompact(d.balance.availableBalance, d.balance.currency)})`}
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for this manual payout…" />
              {manualError && <p className="text-[12px] text-error">{manualError}</p>}
              <Button size="sm" onClick={submitManualPayout} loading={submitting} disabled={!amount || Number(amount) <= 0}>
                Confirm Payout
              </Button>
            </div>
          )}

          <Table columns={payoutColumns} data={d.recentPayouts ?? []} keyExtractor={(p) => p._id} />

          <p className="text-[13px] font-bold text-charcoal">Transactions</p>
          {transactions.loading ? (
            <TableCardSkeleton />
          ) : transactions.error ? (
            <AnalyticsErrorState message={transactions.error} onRetry={transactions.refetch} />
          ) : (
            <Table
              columns={txColumns}
              data={transactions.data?.transactions ?? []}
              keyExtractor={(t) => t._id}
              pagination={{ page, total: transactions.data?.total ?? 0, perPage: 10, onChange: setPage, label: 'transactions' }}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
}
