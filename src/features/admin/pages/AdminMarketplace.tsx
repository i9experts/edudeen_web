import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '@/utils/currency';
import { useSearchParams } from 'react-router-dom';
import { ListingReviewModal } from '@/features/admin/components/ListingReviewModal';
import { apiGetListingReviewCount, apiApproveListing, apiRejectListing } from '@/api/services/marketplace/adminMarketplace';
import { ExportCsvButton } from '@/features/admin/components/ExportCsvButton';
import { BulkDecisionModal } from '@/features/admin/components/BulkDecisionModal';
import { useBulkRunner } from '@/hooks/admin/useBulkRunner';
import { useBusyAction } from '@/hooks/useBusyAction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useMarketplaceStats, useMarketplaceListings, useMarketplaceListingActions } from '@/hooks/admin/useAdminMarketplace';
import type { MarketplaceListingRow, ListingStatus } from '@/api/services/marketplace/adminMarketplace';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { Table, StatusBadge, Button, Modal, SkeletonBox, SearchInput, FilterDropdown, MetricCard, ActionMenu, Textarea, ConfirmActionModal } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatCurrency, formatNumber } from '@/components/comman/analytics/format';
import { Star, StoreIcon, RefreshCw, GraduationCap, Trash2, ClipboardCheck, ShieldCheck, Truck, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending_review', label: 'Waiting for review' },
  { value: 'rejected', label: 'Sent back to seller' },
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
  // ?status=pending_review (sidebar badge) opens straight on the review queue.
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  // Cards on this page link with ?status= — follow the URL when it changes.
  useEffect(() => { setStatusFilter(searchParams.get('status') ?? ''); }, [searchParams]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const loadPending = () => { apiGetListingReviewCount().then(r => setPendingCount(r.data?.pending ?? 0)).catch(() => {}); };
  useEffect(loadPending, []);
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
  const { setFeatured, setTest, removeListing, setStoreBadge, setFulfillmentMode, processingId, error: actionError } = useMarketplaceListingActions();
  const [removing, setRemoving] = useState<MarketplaceListingRow | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  function refreshAll() { refetchStats(); refetch(); loadPending(); }

  // Bulk publish: each approval is its own atomic call, so one failure never blocks the rest.
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const bulk = useBusyAction();
  const bulkBusy = bulk.busy;
  const [confirmRows, setConfirmRows] = useState<MarketplaceListingRow[] | null>(null);
  const [bulkMsg, setBulkMsg] = useState('');
  useEffect(() => { setSelected(new Set()); }, [page, statusFilter, search, categoryId]);

  // Step 1: ask. Step 2 (publishSelected) runs only after the admin confirms.
  function approveSelected() {
    const rows = (data?.items ?? []).filter(r => selected.has(r.id) && (r.status === 'pending_review' || r.status === 'rejected' || r.hasPendingEdit));
    if (rows.length === 0) { setBulkMsg('Select listings that are waiting for review.'); return; }
    setBulkMsg(''); setConfirmRows(rows);
  }

  async function publishSelected(rows: MarketplaceListingRow[]) {
    await bulk.run(async () => {
      let ok = 0; const failed: string[] = [];
      for (const r of rows) {
        try { await apiApproveListing(r.id); ok++; }
        catch { failed.push(r.title); }
      }
      setConfirmRows(null); setSelected(new Set());
      setBulkMsg(`${ok} published${failed.length ? `, ${failed.length} failed: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}` : ''}.`);
      refreshAll();
    });
  }

  // Bulk "send back to seller": one reject call per listing (same atomic call as the review modal), with one shared reason.
  const [rejectRows, setRejectRows] = useState<MarketplaceListingRow[] | null>(null);
  const bulkReject = useBulkRunner<MarketplaceListingRow>(r => r.title);
  function rejectSelected() {
    const rows = (data?.items ?? []).filter(r => selected.has(r.id) && r.status === 'pending_review');
    if (rows.length === 0) { setBulkMsg('Select listings that are waiting for review.'); return; }
    setBulkMsg(''); setRejectRows(rows);
  }
  async function sendBackSelected(reason: string) {
    const rows = rejectRows;
    if (!rows) return;
    const res = await bulkReject.run(rows, r => apiRejectListing(r.id, reason), 'sent back');
    setRejectRows(null); setSelected(new Set());
    if (res) refreshAll();
  }

  async function toggleFeatured(row: MarketplaceListingRow) {
    const ok = await setFeatured(row.id, !row.isFeatured);
    if (ok) refetch();
  }

  async function toggleTest(row: MarketplaceListingRow) {
    const ok = await setTest(row.id, !row.isTest);
    if (ok) refetch();
  }

  async function toggleEducatorBadge(row: MarketplaceListingRow) {
    const hasBadge = (row.storeBadges ?? []).includes('verified_educator');
    const ok = await setStoreBadge(row.storeId, 'verified_educator', !hasBadge);
    if (ok) refetch();
  }

  async function toggleFulfillment(row: MarketplaceListingRow) {
    const ok = await setFulfillmentMode(row.storeId, row.storeFulfillmentMode === 'platform' ? 'seller' : 'platform');
    if (ok) refetch();
  }

  async function handleRemove() {
    if (!removing) return;
    if (removeReason.trim().length < 3) return;
    const ok = await removeListing(removing.id, removeReason.trim());
    if (ok) { setRemoving(null); setRemoveReason(''); refreshAll(); }
  }

  const columns: TableColumn<MarketplaceListingRow>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="text-[12px] font-mono text-slate whitespace-nowrap">{r.id.slice(-8)}</span> },
    { key: 'title', header: 'Title', render: (r) => <p className="text-[13px] font-medium text-graphite max-w-[220px] truncate">{r.title}{r.flags?.includes('contact_info') && <span className="ms-2 align-middle rounded-full bg-error-bg border border-error-border px-[7px] py-[1px] text-[12px] font-bold text-error" title={(r.contactMatches ?? []).join(' | ')}>Contains contact info</span>}{r.hasPendingEdit && <span className="ms-2 align-middle rounded-full bg-info-bg border border-info/30 px-[7px] py-[1px] text-[12px] font-bold text-info">Update review</span>}{r.isTest && <span className="ms-2 align-middle rounded-full bg-[#fff6d6] border border-[#f1d98a] px-[7px] py-[1px] text-[12px] font-bold text-[#8a6100]" title="Hidden from the public">Test</span>}</p> },
    { key: 'sellerName', header: 'Seller', render: (r) => <span className="text-[13px] text-graphite whitespace-nowrap">{r.sellerName}</span> },
    { key: 'price', header: 'Price', align: 'right', render: (r) => <span className="text-[13px] font-semibold text-charcoal">{r.price == null ? '—' : formatMoney(r.price, r.currency)}</span> },
    { key: 'purchaseCount', header: 'Sales', align: 'right', render: (r) => <span className="text-[13px] text-charcoal">{formatNumber(r.purchaseCount)}</span> },
    { key: 'status', header: 'Status', render: (r) => r.hasPendingEdit
      ? <div className="flex flex-col items-start gap-1"><StatusBadge status="pending_review" size="sm" /><span className="text-[12px] font-bold text-info whitespace-nowrap">Seller updated a live listing</span></div>
      : <StatusBadge status={r.status} size="sm" /> },
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
            {(r.status === 'pending_review' || r.status === 'rejected' || r.hasPendingEdit) ? (
              <Button size="xs" variant="primary" icon={<ClipboardCheck size={11} />} onClick={() => setReviewing(r.id)}>{r.hasPendingEdit ? 'Review update' : 'Review'}</Button>
            ) : (
            <Button
              size="xs"
              variant={r.isFeatured ? 'outline' : 'secondary'}
              icon={<Star size={11} />}
              disabled={processingId === r.id}
              onClick={() => toggleFeatured(r)}
            >
              {r.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
            )}
            <ActionMenu
              align="right"
              items={[
                {
                  label: hasEducatorBadge ? 'Unbadge Educator' : 'Verify Educator',
                  icon: <GraduationCap size={13} />,
                  disabled: processingId === r.storeId,
                  onClick: () => toggleEducatorBadge(r),
                },
                {
                  label: r.storeFulfillmentMode === 'platform' ? 'Seller ships orders (stop Edudeen shipping)' : 'Edudeen ships this store’s orders',
                  icon: <Truck size={13} />,
                  disabled: processingId === r.storeId,
                  onClick: () => toggleFulfillment(r),
                },
                // Active listings are not in the review queue, so the trust-badge editor (inside the review modal) is reached from here.
                ...(r.status === 'pending_review' || r.status === 'rejected' ? [] : [{ label: 'Edit badges', icon: <ShieldCheck size={13} />, onClick: () => setReviewing(r.id) }]),
                { label: r.isTest ? 'Unmark as test (show to the public)' : 'Mark as test (hide from the public)', icon: <FlaskConical size={13} />, disabled: processingId === r.id, onClick: () => toggleTest(r) },
                { label: 'Remove Listing', icon: <Trash2 size={13} />, danger: true, onClick: () => { setRemoveReason(''); setRemoving(r); } },
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
        actions={<div className="flex items-center gap-2 flex-wrap justify-end">
          <ExportCsvButton kind="listings" params={{ status: statusFilter === 'flagged' ? '' : statusFilter, search }} />
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={refreshAll}>Refresh</Button>
        </div>}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {pendingCount > 0 && statusFilter !== 'pending_review' && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-info/30 bg-info-bg px-4 py-3">
          <p className="text-[13px] text-carbon"><b>{pendingCount} new listing{pendingCount > 1 ? 's' : ''}</b> waiting for review before going live.</p>
          <Button size="sm" variant="primary" icon={<ClipboardCheck size={13} />} onClick={() => { setStatusFilter('pending_review'); setPage(1); }}>Review now</Button>
        </div>
      )}
      {confirmRows && (
        <ConfirmActionModal
          title={`Publish ${confirmRows.length} listing${confirmRows.length === 1 ? '' : 's'}?`}
          message="These listings become visible to buyers right away and the sellers are told."
          details={[
            { label: 'Listings', value: String(confirmRows.length) },
            { label: 'Titles', value: confirmRows.slice(0, 5).map(r => r.title).join(', ') + (confirmRows.length > 5 ? `, +${confirmRows.length - 5} more` : '') },
          ]}
          confirmLabel="Publish"
          busy={bulkBusy}
          error={bulk.error}
          onConfirm={() => { void publishSelected(confirmRows); }}
          onClose={() => { if (!bulkBusy) setConfirmRows(null); }}
        />
      )}
      {rejectRows && (
        <BulkDecisionModal
          title={`Send back ${rejectRows.length} listing${rejectRows.length === 1 ? '' : 's'} to the seller?`}
          message="The sellers are told their listing was not approved, with your reason, and can fix and resubmit it."
          items={rejectRows.map(r => r.title)}
          requireReason
          reasonLabel="Reason (required, every seller sees it)"
          confirmLabel="Send back all"
          danger
          busy={bulkReject.busy}
          progress={bulkReject.progress}
          onConfirm={reason => { void sendBackSelected(reason); }}
          onClose={() => setRejectRows(null)}
        />
      )}
      {bulkReject.message && <div role="status" className="bg-info-bg border border-info/30 rounded-lg px-4 py-2.5 text-[12.5px] text-carbon">{bulkReject.message}</div>}
      {bulkMsg && <div role="status" className="bg-info-bg border border-info/30 rounded-lg px-4 py-2.5 text-[12.5px] text-carbon">{bulkMsg}</div>}
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}

      {statsError ? (
        <AnalyticsErrorState message={statsError} onRetry={refetchStats} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {statsLoading && !stats ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={92} rounded="10px" />)
          ) : stats ? (
            <>
              <MetricCard to="/admin/marketplace" label="Total Listings" value={formatNumber(stats.totalListings)} />
              <MetricCard to="/admin/marketplace?status=active" label="Active" value={formatNumber(stats.active)} sub="Live on marketplace" />
              <MetricCard to="/admin/marketplace?status=pending_review" label="Waiting for Review" value={formatNumber(pendingCount)} sub="New listings not live yet" />
              <MetricCard to="/admin/moderation" label="Flagged" value={formatNumber(stats.flagged)} sub="Open reports on listings" />
              <MetricCard to="/admin/orders" label="GMV This Month" value={gmvLabel(stats)} />
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
            selectable
            selectedKeys={selected}
            onSelectionChange={setSelected}
            bulkActions={() => (
              <>
                <Button size="xs" variant="primary" icon={<CheckCircle2 size={11} />} onClick={approveSelected} loading={bulkBusy} disabled={bulkReject.busy}>Approve &amp; publish selected</Button>
                <Button size="xs" variant="outline" icon={<XCircle size={11} />} onClick={rejectSelected} disabled={bulkBusy || bulkReject.busy}>Send back selected</Button>
              </>
            )}
            loading={loading}
            emptyState={{ icon: <StoreIcon size={28} className="text-slate/50" />, title: 'No listings match your filters', description: 'Try adjusting your search or clearing filters.' }}
            pagination={{ page, total: data?.total ?? 0, perPage: 10, onChange: setPage, label: 'listings' }}
          />
        )}
      </div>

      {reviewing && (
        <ListingReviewModal
          listingId={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); refreshAll(); }}
        />
      )}

      {removing && (
        <Modal mobileSheet
          title="Remove Listing"
          onClose={() => setRemoving(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRemove} loading={processingId === removing.id} disabled={removeReason.trim().length < 3}>Remove Listing</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Remove "<strong>{removing.title}</strong>" from the marketplace? It will be delisted, hidden from buyers immediately and taken out of carts and wishlists. The seller is told why.
          </p>
          <Textarea id="remove-reason" label="Reason (required, the seller sees it)" rows={3} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} />

        </Modal>
      )}
      </div>
    </>
  );
}

/** One figure per currency (PKR and USD are never added together). */
function gmvLabel(stats: { gmvThisMonth: number; gmvByCurrency?: { currency: string; gmv: number }[] }): string {
  const rows = (stats.gmvByCurrency ?? []).filter((r) => r.gmv > 0);
  if (rows.length === 0) return formatCurrency(stats.gmvThisMonth);
  return rows.map((r) => (r.currency === 'USD' ? formatCurrency(r.gmv) : `${r.currency} ${Math.round(r.gmv).toLocaleString('en-US')}`)).join(' · ');
}
