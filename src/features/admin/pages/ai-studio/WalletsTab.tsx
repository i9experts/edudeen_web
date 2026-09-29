import { useState } from 'react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Select, Textarea } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useAdminAiWallets, useAdminAiWalletLedger, useAdjustAdminAiWallet } from '@/hooks/admin/useAdminAiStudio';
import type { AdminWalletRow } from '@/api/services/adminAiStudio';
import { Wallet } from 'lucide-react';

export function WalletsTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useAdminAiWallets({ page, limit: 20 });
  const [selected, setSelected] = useState<AdminWalletRow | null>(null);

  const columns: TableColumn<AdminWalletRow>[] = [
    { key: 'store', header: 'Store', render: r => r.storeName ?? r.storeId },
    { key: 'balance', header: 'Balance', align: 'right', render: r => <span className="font-semibold text-charcoal">{r.balance}</span> },
    { key: 'monthlyAllowance', header: 'Monthly Allowance', align: 'right' },
    { key: 'lastResetAt', header: 'Last Reset', render: r => r.lastResetAt ? new Date(r.lastResetAt).toLocaleDateString() : '—' },
    {
      key: 'actions', header: '', align: 'right',
      render: r => <Button variant="outline" size="xs" onClick={() => setSelected(r)}>Manage</Button>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none">
        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.items ?? []}
            keyExtractor={r => r._id}
            loading={loading}
            emptyState={{ icon: <Wallet size={28} className="text-slate/50" />, title: 'No AI credit wallets yet' }}
            pagination={data ? {
              page: data.page, total: data.total, perPage: data.limit, onChange: setPage, label: 'wallets',
            } : undefined}
          />
        )}
      </Card>

      {selected && <WalletDetailModal wallet={selected} onClose={() => setSelected(null)} onAdjusted={refetch} />}
    </div>
  );
}

function WalletDetailModal({ wallet, onClose, onAdjusted }: {
  wallet: AdminWalletRow; onClose: () => void; onAdjusted: () => void;
}) {
  const { data: ledger, loading: ledgerLoading, refetch: refetchLedger } = useAdminAiWalletLedger(wallet.storeId);
  const { adjustWallet, submitting, error } = useAdjustAdminAiWallet();

  const [direction, setDirection] = useState<'grant' | 'deduct'>('grant');
  const [amount, setAmount] = useState(100);
  const [reason, setReason] = useState('');

  const handleAdjust = async () => {
    if (!reason.trim()) return;
    const ok = await adjustWallet(wallet.storeId, { direction, amount, reason });
    if (ok) {
      setReason('');
      refetchLedger();
      onAdjusted();
    }
  };

  return (
    <Modal title={`Wallet — ${wallet.storeName ?? wallet.storeId}`} onClose={onClose} width={600} mobileSheet>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div><span className="text-slate">Balance: </span><span className="text-carbon font-semibold">{ledger?.balance ?? wallet.balance}</span></div>
          <div><span className="text-slate">Monthly Allowance: </span><span className="text-carbon font-semibold">{ledger?.monthlyAllowance ?? wallet.monthlyAllowance}</span></div>
        </div>

        <div className="border border-bone rounded-lg p-3">
          <p className="text-[12px] font-semibold text-carbon mb-3">Manual Adjustment</p>
          {error && <p className="text-[12px] text-error mb-2">{error}</p>}
          <div className="flex flex-wrap gap-2 mb-3">
            <Field label="Direction" className="mb-0 w-[130px]">
              <Select value={direction} onChange={e => setDirection(e.target.value as 'grant' | 'deduct')}>
                <option value="grant">Grant</option>
                <option value="deduct">Deduct</option>
              </Select>
            </Field>
            <Field label="Amount" className="mb-0 w-[120px]">
              <Input type="number" min={1} value={amount} onChange={e => setAmount(Math.max(1, Number(e.target.value) || 1))} />
            </Field>
          </div>
          <Field label="Reason" className="mb-3">
            <Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for this adjustment" />
          </Field>
          <Button variant="primary" size="sm" loading={submitting} disabled={!reason.trim()} onClick={handleAdjust}>
            Apply Adjustment
          </Button>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-carbon mb-2">Ledger History</p>
          {ledgerLoading ? (
            <p className="text-[12px] text-slate">Loading…</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto">
              {(ledger?.ledger ?? []).map((entry, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-bone last:border-b-0 text-[12px]">
                  <div className="min-w-0">
                    <p className="text-carbon truncate">{entry.reason}</p>
                    <p className="text-[10px] text-slate">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={entry.amount >= 0 ? 'text-success font-semibold shrink-0' : 'text-error font-semibold shrink-0'}>
                    {entry.amount >= 0 ? '+' : ''}{entry.amount}
                  </span>
                </div>
              ))}
              {(ledger?.ledger ?? []).length === 0 && <p className="text-[12px] text-slate py-3 text-center">No ledger entries yet.</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
