import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, Eye, Pencil, AlertCircle, Package, DollarSign } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { SellerPageHeader } from '@/components/layouts/SellerLayout';
import { useMyStores } from '@/hooks/store/useMyStores';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  Table,      type TableColumn,
  ActionMenu,
  StatusBadge,
  Badge,
  EmptyState,
  SkeletonBox,
  MetricCard,
} from '@/components/comman/ui';
import type { MyStoreItem } from '@/api/services/store';
import { PageHeader } from '@/components/comman/ui';
import { StudioPanel, StudioTextLink } from '@/features/seller/components/studio/Studio';

// ── Store cell: logo + name ───────────────────────────────────────────────────
function StoreCell({ store }: { store: MyStoreItem }) {
  return (
    <div className="flex items-center gap-[10px]">
      <div className="w-8 h-8 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0 overflow-hidden border border-[#edebe2]">
        {store.logo
          ? <img loading="lazy" decoding="async" src={store.logo} alt={store.name} className="w-full h-full object-cover" />
          : <Store size={15} className="text-brand-orange" />}
      </div>
      <span className="font-bold text-carbon">{store.name}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SellerStoreList() {
  const navigate = useNavigate();
  const { stores, summary, loading, error, refetch } = useMyStores();
  usePageTitle('My Stores');

  const PER_PAGE = 10;
  const [page, setPage] = useState(1);
  const paged = stores.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const columns: TableColumn<MyStoreItem>[] = [
    {
      key: 'no', header: '#', width: '48px',
      render: (_, i) => (
        <span className="text-[12px] text-slate font-medium">
          {(page - 1) * PER_PAGE + i + 1}
        </span>
      ),
    },
    {
      key: 'name', header: 'Store',
      render: s => <StoreCell store={s} />,
    },
    {
      key: 'slug', header: 'URL',
      render: s => <span className="text-slate">/{s.slug}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: s => <StatusBadge status={s.status} />,
    },
    {
      key: 'plan', header: 'Plan',
      render: s => <span className="text-slate">{s.plan ?? 'Starter'}</span>,
    },
    {
      key: 'productCount', header: 'Products', align: 'right',
      render: s => <span className="font-semibold text-charcoal">{s.productCount.toLocaleString()}</span>,
    },
    {
      key: 'totalSalesUSD', header: 'Revenue', align: 'right',
      render: s => <span className="font-semibold text-charcoal">${s.totalSalesUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>,
    },
    {
      key: 'aiCredits', header: 'AI Credits', align: 'right',
      render: s => (
        <span className="font-semibold text-charcoal">
          {s.aiCredits != null ? s.aiCredits : '—'}
        </span>
      ),
    },
    {
      key: 'sellerType', header: 'Type',
      render: s => s.sellerType
        ? <Badge color="orange" className="capitalize">{s.sellerType.replace(/_/g, ' ')}</Badge>
        : <span className="text-slate">—</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'center', width: '150px',
      render: s => (
        <div className="flex items-center justify-center gap-3" onClick={e => e.stopPropagation()}>
        <StudioTextLink ariaLabel={`Open ${s.name}`} onClick={() => navigate(`/store/${s._id}/dashboard`)}>Open</StudioTextLink>
        <ActionMenu
          align="right"
          items={[
            { label: 'View Store', onClick: () => navigate(`/store/${s._id}/dashboard`), icon: <Eye    size={13} /> },
            { label: 'Edit Store', onClick: () => navigate(`/store/${s._id}/settings`),  icon: <Pencil size={13} /> },
          ]}
        />
        </div>
      ),
    },
  ];

  return (
    <>
      <SellerPageHeader
        title="My Stores"
        subtitle="Manage all your stores from one place."
      />

      <div className="px-4 md:px-8 py-8 flex flex-col gap-6">

        <PageHeader
          className="mb-2"
          eyebrow="Edudeen creator studio"
          title="A home for your ideas."
          description="Create thoughtfully. Share confidently. Grow with purpose. Open a store to add products, fulfil orders and see your earnings."
          actions={
            <Button size="md" className="!text-[14px] !font-bold" onClick={() => navigate('/onboard')} icon={<Plus size={15} />}>
              New store
            </Button>
          }
        />

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MetricCard label="Total Stores" value={summary.storeCount} icon={<Store size={16} />} loading={loading} />
          <MetricCard label="Total Products" value={summary.totalProducts.toLocaleString()} icon={<Package size={16} />} loading={loading} />
          <MetricCard
            label="Total Revenue"
            value={`$${summary.totalRevenueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSign size={16} />}
            loading={loading}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={16} className="text-error shrink-0" />
              <span className="text-[13px] text-error">{error}</span>
            </div>
            <Button variant="outline" size="xs" onClick={refetch}>Try again</Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && stores.length === 0 && (
          <EmptyState
            icon={<Store size={30} className="text-brand-orange opacity-55" />}
            title="No stores yet"
            description="Create your first store and start selling digital products, courses, and more."
            action={{ label: 'Create Your First Store', onClick: () => navigate('/onboard'), icon: <Plus size={14} /> }}
          />
        )}

        {/* Table */}
        {(loading || stores.length > 0) && (
          <StudioPanel title="Your stores" sub={loading ? undefined : `${stores.length} store${stores.length === 1 ? '' : 's'} · select a row to open its workspace`} bodyClassName="-mx-5 sm:-mx-[27px] -mb-5 sm:-mb-[26px] border-t border-bone">
            {loading ? (
              <div className="px-5 py-4 flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <SkeletonBox width={20} height={13} />
                    <SkeletonBox width={32} height={32} rounded="8px" />
                    <SkeletonBox width="22%" height={13} />
                    <SkeletonBox width="12%" height={13} className="ml-auto" />
                    <SkeletonBox width={56}  height={22} rounded="999px" />
                    <SkeletonBox width="8%"  height={13} />
                    <SkeletonBox width="6%"  height={13} />
                    <SkeletonBox width={64}  height={22} rounded="999px" />
                    <SkeletonBox width={30}  height={30} rounded="7px" />
                  </div>
                ))}
              </div>
            ) : (
              <Table
                columns={columns}
                data={paged}
                keyExtractor={s => s._id}
                onRowClick={s => navigate(`/store/${s._id}/dashboard`)}
                pagination={{
                  page,
                  total:    stores.length,
                  perPage:  PER_PAGE,
                  onChange: setPage,
                  label:    'stores',
                }}
              />
            )}
          </StudioPanel>
        )}

      </div>
    </>
  );
}
