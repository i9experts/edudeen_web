import { useState } from 'react';
import { FilterDropdown, Table, type TableColumn } from '@/components/comman/ui';
import { useAdminPlatformTransactions } from '@/hooks/admin/useAdminFinance';
import type { AdminFinanceParams, TransactionRow } from '@/api/services/finance/adminFinance';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';
import { Receipt } from 'lucide-react';
import { FinanceStatusBadge } from '../../components/finance/FinanceStatusBadge';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'sale', label: 'Sale' },
  { value: 'payout', label: 'Payout' },
  { value: 'fee', label: 'Fee' },
  { value: 'refund', label: 'Refund' },
  { value: 'adjustment', label: 'Adjustment' },
];

export function FinanceTransactionsTab({ params }: { params: AdminFinanceParams }) {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const transactions = useAdminPlatformTransactions({ ...params, type: (type || undefined) as never, page, limit: 20 });

  const columns: TableColumn<TransactionRow>[] = [
    { key: 'storeName', header: 'Store', render: (t) => t.storeName ?? t.storeId },
    { key: 'description', header: 'Description' },
    { key: 'type', header: 'Type' },
    { key: 'amount', header: 'Amount', align: 'right', render: (t) => `${t.amount >= 0 ? '+' : ''}${formatMoneyCompact(t.amount, t.currency)}` },
    { key: 'status', header: 'Status', render: (t) => <FinanceStatusBadge status={t.status} /> },
    { key: 'createdAt', header: 'Date', render: (t) => formatDate(t.createdAt) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <FilterDropdown options={TYPE_OPTIONS} value={type} onChange={(v) => { setType(v); setPage(1); }} />
      </div>

      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Platform Transactions</p>
          <p className="text-[12px] text-slate">Every ledger entry across every store.</p>
        </div>
        {transactions.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={transactions.error} onRetry={transactions.refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={transactions.data?.transactions ?? []}
            keyExtractor={(t) => t._id}
            loading={transactions.loading}
            emptyState={{
              icon: <Receipt size={28} className="text-slate/50" />,
              title: 'No transactions yet',
              description: 'Platform transactions will show up here once activity starts.',
            }}
            pagination={{ page, total: transactions.data?.total ?? 0, perPage: 20, onChange: setPage, label: 'transactions' }}
          />
        )}
      </div>
    </div>
  );
}
