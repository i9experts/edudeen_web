import { useEffect, useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useMarketplaceStats, useMarketplaceListings, useMarketplaceListingActions } from '@/hooks/admin/useAdminMarketplace';
import type { MarketplaceListingRow, ListingStatus } from '@/api/services/marketplace/adminMarketplace';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { Table, StatusBadge, Button, Modal, SkeletonBox, SearchInput, FilterDropdown, MetricCard, ActionMenu } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatCurrency, formatNumber } from '@/components/comman/analytics/format';
import { Star, StoreIcon, RefreshCw, GraduationCap, Trash2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'flagged', label: 'Flagged' },
];

function flattenCategories(nodes: CategoryNode[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const n of nodes) {
    out.push({ value: n._id, label: n.name });
    if (n.children?.length) out.push(...flattenCategories(n.children));
  }
  return out;
}

export function AdminMarketplace() {
  usePageTitle('Marketplace');
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useMarketplaceStats();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    apiGetCategoryTree().then((res) => setCategories(flattenCategories(res.data))).catch(() => {});
  }, []);

  const query = useMemo(
    () => ({
      search: search || undefined,
      categoryId: categoryId || undefined,
      status: (statusFilter || undefined) as ListingStatus | undefined,
      page,
      limit: 10,
    }),
    [search, categoryId, statusFilter, page],
  );

  const { data, loading, error, refetch } = useMarketplaceListings(query);
  const { setFeatured, removeListing, setStoreBadge, processingId, error: actionError } = useMarketplaceListingActions();
  const [removing, setRemoving] = useState<MarketplaceListingRow | null>(null);

  function refreshAll() { refetchStats(); refetch(); }

  async function toggleFeatured(row: MarketplaceListingRow) {
    const ok = await setFeatured(row.id, !row.isFeatured);
    if (ok) refetch();
  }

  async function toggleEducatorBadge(row: MarketplaceListingRow) {
    const hasBadge = (row.storeBadges ?? []).includes('verified_educator');
    const ok = await setStoreBadge(row.storeId, 'verified_educator', !hasBadge);
    if (ok) refetch();
  }

  async function handleRemove() {
    if (!removing) return;
    const ok = await removeListing(removing.id);
    if (ok) { setRemoving(null); refreshAll(); }
  }

  const columns: TableColumn<MarketplaceListingRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-[12px] font-mono text-slate whitespace-nowrap">{r.id.slice(-8)}</span> },
    { key: 'title', header: 'Title', render: (r) => <p className="text-[13px] font-medium text-graphite max-w-[220px] truncate">{r.title}</p> },
    { key: 'sellerName', header: 'Seller', render: (r) => <span className="text-[13px] text-graphite whitespace-nowrap">{r.sellerName}</span> },
    { key: 'price', header: 'Price', align: 'right', render: (r) => <span className="text-[13px] font-semibold text-charcoal">{formatCurrency(r.price)}</span> },
    { key: 'purchaseCount', header: 'Sales', align: 'right', render: (r) => <span className="text-[13px] text-charcoal">{formatNumber(r.purchaseCount)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
    {
      key: 'isFeatured',
      header: 'Featured',
      align: 'center',
      render: (r) => (r.isFeatured ? <Star size={14} className="text-brand-orange fill-brand-orange inline-block" /> : <span className="text-slate/40">—</span>),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => {
        const hasEducatorBadge = (r.storeBadges ?? []).includes('verified_educator');
        return (
          <div className="flex items-center gap-[6px]">
            <Button
              size="xs"
              variant={r.isFeatured ? 'outline' : 'secondary'}
              icon={<Star size={11} />}
              disabled={processingId === r.id}
              onClick={() => toggleFeatured(r)}
            >
              {r.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
            <ActionMenu
              align="right"
              items={[
                {
                  label: hasEducatorBadge ? 'Unbadge Educator' : 'Verify Educator',
                  icon: <GraduationCap size={13} />,
                  disabled: processingId === r.storeId,
                  onClick: () => toggleEducatorBadge(r),
                },
                { label: 'Remove Listing', icon: <Trash2 size={13} />, danger: true, onClick: () => setRemoving(r) },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Commerce"
        title="Marketplace Management"
        subtitle="Review, feature and manage all marketplace listings."
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={refreshAll}>Refresh</Button>}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}

      {statsError ? (
        <AnalyticsErrorState message={statsError} onRetry={refetchStats} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statsLoading && !stats ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={92} rounded="10px" />)
          ) : stats ? (
            <>
              <MetricCard label="Total Listings" value={formatNumber(stats.totalListings)} />
              <MetricCard label="Active" value={formatNumber(stats.active)} sub="Live on marketplace" />
              <MetricCard label="Flagged" value={formatNumber(stats.flagged)} sub="Pending review" />
              <MetricCard label="GMV This Month" value={formatCurrency(stats.gmvThisMonth)} />
            </>
          ) : null}
        </div>
      )}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search listings or sellers…" className="flex-1 max-w-[300px]" />
          <FilterDropdown placeholder="All Categories" options={categories} value={categoryId} onChange={(v) => { setCategoryId(v); setPage(1); }} />
          <FilterDropdown placeholder="All Statuses" options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
        </div>

        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.items ?? []}
            keyExtractor={(r) => r.id}
            loading={loading}
            emptyState={{ icon: <StoreIcon size={28} className="text-slate/50" />, title: 'No listings match your filters', description: 'Try adjusting your search or clearing filters.' }}
            pagination={{ page, total: data?.total ?? 0, perPage: 10, onChange: setPage, label: 'listings' }}
          />
        )}
      </div>

      {removing && (
        <Modal mobileSheet
          title="Remove Listing"
          onClose={() => setRemoving(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRemove} loading={processingId === removing.id}>Remove Listing</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Remove "<strong>{removing.title}</strong>" from the marketplace? It will be delisted and hidden from buyers immediately.
          </p>
        </Modal>
      )}
      </div>
    </>
  );
}
