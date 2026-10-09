import { useState } from 'react';
import { SearchInput, FilterDropdown, Table, type TableColumn } from '@/components/comman/ui';
import { useAdminSellerBalances } from '@/hooks/admin/useAdminFinance';
import type { SellerBalanceRow, SellerBalancesParams } from '@/api/services/finance/adminFinance';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatMoneyCompact } from '@/utils/currency';
import { Users } from 'lucide-react';
import { SellerFinancialDetailsModal } from '../../components/finance/SellerFinancialDetailsModal';

const SORT_OPTIONS = [
  { value: 'availableBalance', label: 'Sort by available balance' },
  { value: 'pendingBalance', label: 'Sort by pending balance' },
  { value: 'totalRevenue', label: 'Sort by lifetime revenue' },
  { value: 'totalPayouts', label: 'Sort by lifetime payouts' },
];

export function FinanceSellersTab() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<NonNullable<SellerBalancesParams['sort']>>('availableBalance');
  const [page, setPage] = useState(1);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const balances = useAdminSellerBalances({ search: search || undefined, sort, order: 'desc', page, limit: 15 });

  const columns: TableColumn<SellerBalanceRow>[] = [
    { key: 'sellerName', header: 'Seller', render: (r) => (
      <div>
        <p className="font-medium">{r.sellerName}</p>
        <p className="text-[12px] text-slate">{r.storeName}</p>
      </div>
    ) },
    { key: 'availableBalance', header: 'Available', align: 'right', render: (r) => formatMoneyCompact(r.availableBalance, r.currency) },
    { key: 'pendingBalance', header: 'Pending', align: 'right', render: (r) => formatMoneyCompact(r.pendingBalance, r.currency) },
    { key: 'totalRevenue', header: 'Lifetime Revenue', align: 'right', render: (r) => formatMoneyCompact(r.totalRevenue, r.currency) },
    { key: 'totalPayouts', header: 'Lifetime Payouts', align: 'right', render: (r) => formatMoneyCompact(r.totalPayouts, r.currency) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search seller name, email, or store…" />
        <FilterDropdown options={SORT_OPTIONS} value={sort} onChange={(v) => setSort(v as NonNullable<SellerBalancesParams['sort']>)} />
      </div>

      <div className="bg-white border border-bone rounded-xl">
        <div className="px-5 pt-4 pb-3">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Seller Balances</p>
          <p className="text-[12px] text-slate">Click a row to view full financial details, transaction history, and issue a manual payout.</p>
        </div>
        {balances.error ? (
          <div className="px-5 pb-5"><AnalyticsErrorState message={balances.error} onRetry={balances.refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={balances.data?.sellers ?? []}
            keyExtractor={(r) => r.storeId}
            onRowClick={(r) => setSelectedStoreId(r.storeId)}
            loading={balances.loading}
            emptyState={{
              icon: <Users size={28} className="text-slate/50" />,
              title: 'No sellers yet',
              description: 'Seller balances will show up here once stores start selling.',
            }}
            pagination={{
              page,
              total: balances.data?.pagination.total ?? 0,
              perPage: 15,
              onChange: setPage,
              label: 'sellers',
            }}
          />
        )}
      </div>

      {selectedStoreId && (
        <SellerFinancialDetailsModal storeId={selectedStoreId} onClose={() => setSelectedStoreId(null)} />
      )}
    </div>
  );
}
