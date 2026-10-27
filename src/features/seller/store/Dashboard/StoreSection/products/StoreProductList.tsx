import { useState, useEffect } from 'react';
import { formatPrice } from '@/utils/formatPrice';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Plus,
  RefreshCw, TrendingUp,
  Eye, Pencil, Trash2, ArrowRight, Crown, Flame, UploadCloud,
} from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  Table,      type TableColumn, type TableSort,
  Badge,      StatusBadge,
  Card,
  SearchInput,
  ActionMenu,
  Modal,
  Button,
  InlineError,
} from '@/components/comman/ui';
import {
  apiGetStoreInventory,
  apiDeleteProduct,
  apiBulkOffers,
  type BulkOfferAction,
  type BulkOffersResult,
  type InventoryProduct,
} from '@/api/services/product';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import { ProductCell } from '../../components/ProductListShared';

const OFFER_TITLES: Record<BulkOfferAction, string> = {
  premium_on: 'Add to Premium offer',
  premium_off: 'Remove from Premium offer',
  campaign_add: 'Add to a platform sale',
  campaign_remove: 'Remove from a platform sale',
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StoreProductList() {
  const navigate    = useNavigate();
  const { storeId, store } = useStoreWorkspace();

  const [products,      setProducts]      = useState<InventoryProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [deleteTarget,  setDeleteTarget]  = useState<InventoryProduct | null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');
  const [selectedKeys,  setSelectedKeys]  = useState<Set<string | number>>(new Set());
  const [bulkDeleting,  setBulkDeleting]  = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const LIMIT = 10;
  const [refreshKey, setRefreshKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [sort, setSort] = useState<TableSort | null>(null);

  const handleSortChange = (key: string) => {
    setSort(prev => (prev && prev.key === key)
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  useEffect(() => {
    if (search.trim() === debouncedSearch) return;
    const id = setTimeout(() => {
      // Server-side name/SKU search (?q=); a new term restarts at page 1.
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetStoreInventory(storeId, page, LIMIT, { q: debouncedSearch })
      .then(res => {
        if (cancelled) return;
        setProducts(res.data.products ?? []);
        // Stats cards describe the whole store, not just search matches.
        setTotalProducts(res.data.pagination.totalProducts);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, page, refreshKey, debouncedSearch]);

  const goAdd    = () => navigate(`/store/${storeId}/products/add`);
  const goEdit   = (p: InventoryProduct) => navigate(`/store/${storeId}/products/edit/${p.productId}`);
  const goDetail = (p: InventoryProduct) => navigate(`/store/${storeId}/products/detail/${p.productId}`);

  const handlePageChange = (p: number) => {
    setLoading(true);
    setError('');
    setPage(p);
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiDeleteProduct(deleteTarget.productId);
      setDeleteTarget(null);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Offers (Premium member discount / Edudeen platform sale) ──
  const { campaigns } = useStoreCampaigns(storeId);
  const storePremiumPct = store?.premiumDiscount?.enabled ? store.premiumDiscount.percent : 0;
  const [offerDialog,   setOfferDialog]   = useState<{ action: BulkOfferAction; ids: string[] } | null>(null);
  const [offerPercent,  setOfferPercent]  = useState('10');
  const [offerCampaign, setOfferCampaign] = useState('');
  const [offerBusy,     setOfferBusy]     = useState(false);
  const [offerError,    setOfferError]    = useState('');
  const [offerResult,   setOfferResult]   = useState<BulkOffersResult | null>(null);
  const nameById = new Map(products.map(p => [p.productId, p.name]));
  const campaignNameById = new Map(campaigns.map(c => [c._id, c.name]));
  const openOffer = (action: BulkOfferAction, ids: string[]) => { setOfferError(''); setOfferCampaign(''); setOfferDialog({ action, ids }); };
  // Sales to pick from: the running/upcoming ones; when removing, also the ones the chosen products are in (even if ended).
  const campaignOptions = (() => {
    const out = campaigns.map(c => ({ id: c._id, label: c.name }));
    if (offerDialog?.action === 'campaign_remove') {
      for (const p of products) if (offerDialog.ids.includes(p.productId)) for (const id of p.campaignIds ?? []) {
        if (!out.some(o => o.id === id)) out.push({ id, label: 'Ended sale' });
      }
    }
    return out;
  })();
  const submitOffer = async () => {
    if (!offerDialog) return;
    const { action, ids } = offerDialog;
    const percent = Number(offerPercent);
    if (action === 'premium_on' && !(Number.isFinite(percent) && percent >= 1 && percent <= 50)) { setOfferError('Enter a percent from 1 to 50.'); return; }
    if ((action === 'campaign_add' || action === 'campaign_remove') && !offerCampaign) { setOfferError('Choose a sale.'); return; }
    setOfferBusy(true); setOfferError('');
    try {
      const res = await apiBulkOffers({
        storeId, productIds: ids, action,
        ...(action === 'premium_on' ? { percent } : {}),
        ...(action === 'campaign_add' || action === 'campaign_remove' ? { campaignId: offerCampaign } : {}),
      });
      setOfferDialog(null);
      setOfferResult(res.data);
      setSelectedKeys(new Set());
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      setOfferError(err instanceof Error ? err.message : 'Could not update the offers.');
    } finally {
      setOfferBusy(false);
    }
  };
  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    setDeleteError('');
    try {
      await Promise.all(Array.from(selectedKeys).map(id => apiDeleteProduct(String(id))));
      setSelectedKeys(new Set());
      setConfirmBulkDelete(false);
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete one or more products.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = products;

  const sorted = sort
    ? [...filtered].sort((a, b) => {
        const av = a[sort.key as keyof InventoryProduct];
        const bv = b[sort.key as keyof InventoryProduct];
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));
        return sort.direction === 'asc' ? cmp : -cmp;
      })
    : filtered;

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: TableColumn<InventoryProduct>[] = [
    {
      key: 'name', header: 'Product', sortable: true,
      render: p => <ProductCell p={p} />,
    },
    {
      key: 'type', header: 'Type',
      render: p => (
        <Badge color={p.type === 'digital' ? 'blue' : 'orange'}>
          {p.type === 'digital' ? (p.productType === 'educational' ? 'Educational' : 'Digital') : 'Physical'}
        </Badge>
      ),
    },
    {
      key: 'price', header: 'Price', align: 'right', sortable: true,
      render: p => (
        <span className="font-semibold text-charcoal">
          {formatPrice(p.price, store?.baseCurrency)}
        </span>
      ),
    },
    {
      key: 'offer', header: 'Offer',
      render: p => {
        const ids = p.campaignIds ?? [];
        if (ids.length > 0) {
          const names = ids.map(id => campaignNameById.get(id) ?? 'Ended sale');
          return <Badge color="orange">Sale: {names[0]}{names.length > 1 ? ` +${names.length - 1}` : ''}</Badge>;
        }
        const pct = p.premiumOptOut ? 0 : (p.premiumDiscountPercent ?? storePremiumPct);
        return pct > 0 ? <Badge color="blue">Premium {pct}%</Badge> : <span className="text-slate">-</span>;
      },
    },
    {
      key: 'stock', header: 'Stock', align: 'right', sortable: true,
      render: p => (
        <span className="text-[13px] text-carbon">
          {typeof p.stock === 'number' ? `${p.stock} units` : p.stock}
        </span>
      ),
    },
    {
      key: 'allTimeSales', header: 'Sales', align: 'right', sortable: true,
      render: p => (
        <div className="flex items-center justify-end gap-1 text-[12px] text-slate">
          <TrendingUp size={12} className="text-success shrink-0" />
          {p.allTimeSales}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: p => p.status === 'pending_review' ? (
        <span title="Edudeen checks new listings before they go live — usually within a day.">
          <Badge color="blue">In review</Badge>
        </span>
      ) : p.status === 'rejected' ? (
        <div className="flex flex-col items-start gap-1 max-w-[220px]">
          <Badge color="red">Needs changes</Badge>
          {p.reviewNote && <span className="text-[12px] text-error leading-snug line-clamp-3" title={p.reviewNote}>{p.reviewNote}</span>}
        </div>
      ) : p.hasPendingEdit ? (
        <div className="flex flex-col items-start gap-1 max-w-[220px]">
          <StatusBadge status={p.status} />
          <span title="Your changes are waiting for Edudeen's approval. The live listing keeps its previous content until then.">
            <Badge color="yellow">Update pending approval</Badge>
          </span>
        </div>
      ) : p.editRejection ? (
        <div className="flex flex-col items-start gap-1 max-w-[220px]">
          <StatusBadge status={p.status} />
          <Badge color="red">Update not approved</Badge>
          <span className="text-[12px] text-error leading-snug line-clamp-3" title={p.editRejection}>{p.editRejection}</span>
        </div>
      ) : <StatusBadge status={p.status} />,
    },
    {
      key: 'actions', header: 'Actions', align: 'center', width: '110px',
      render: p => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="xs" onClick={() => goEdit(p)} icon={<Pencil size={12} />}>Edit</Button>
          <ActionMenu
            align="right"
            items={[
              { label: 'View Detail',    onClick: () => goDetail(p),                icon: <Eye    size={13} /> },
              ...(p.deliveryFormat === 'course' ? [{ label: 'Edit / build course', onClick: () => navigate(`/store/${storeId}/products/${p.productId}/course`), icon: <Pencil size={13} /> }] : []),
              { label: 'Add to Premium offer…',        onClick: () => openOffer('premium_on', [p.productId]),        icon: <Crown size={13} /> },
              { label: 'Remove from Premium offer',    onClick: () => openOffer('premium_off', [p.productId]),       icon: <Crown size={13} /> },
              { label: 'Add to platform sale…',        onClick: () => openOffer('campaign_add', [p.productId]),      icon: <Flame size={13} /> },
              { label: 'Remove from platform sale…',   onClick: () => openOffer('campaign_remove', [p.productId]),   icon: <Flame size={13} /> },
              { label: 'Delete Product', onClick: () => { setDeleteError(''); setDeleteTarget(p); }, icon: <Trash2 size={13} />, danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <StorePageHeader
        title="Products"
        subtitle={loading ? 'Loading…' : `${totalProducts} product${totalProducts !== 1 ? 's' : ''}`}
        actions={<div className="flex items-center gap-2"><Button variant="outline" onClick={() => navigate(`/store/${storeId}/products/bulk`)} icon={<UploadCloud size={15} />} aria-label="Bulk upload"><span className="max-sm:sr-only">Bulk upload</span></Button><Button onClick={goAdd} icon={<Plus size={15} />}>Add<span className="max-sm:hidden"> one product</span><span className="sm:hidden"> product</span></Button></div>}
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* Stock KPIs live on the Inventory page (single source) - just link there. */}
        <button
          onClick={() => navigate(`/store/${storeId}/inventory`)}
          className="self-start inline-flex items-center gap-1.5 bg-transparent border-none p-0 text-[13px] font-semibold text-brand-orange cursor-pointer hover:underline"
        >
          Manage stock levels in Inventory <ArrowRight size={13} className="rtl:rotate-180" />
        </button>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && <InlineError message={error} onRetry={handleRetry} />}

        {/* ── Table card ─────────────────────────────────────────────── */}
        {!error && (
          <Card padding="none">
            {/* Toolbar */}
            <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-serif font-normal text-[21px] text-carbon shrink-0">Your product shelf</h2>
              <div className="flex items-center gap-2 ml-auto">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or SKU…"
                  className="w-[180px] sm:w-[220px]"
                />
                <Button variant="outline" size="xs" onClick={handleRetry} icon={<RefreshCw size={11} />}>Refresh</Button>
              </div>
            </div>

            <Table
              cardsBelow="lg"
              columns={columns}
              data={sorted}
              keyExtractor={p => p.productId}
              sort={sort ?? undefined}
              onSortChange={handleSortChange}
              loading={loading}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              emptyState={{
                icon: <ShoppingBag size={30} className="text-brand-orange opacity-55" />,
                title: search ? 'No products match your search' : 'No products yet',
                description: search ? 'Try a different name or SKU.' : 'Add physical items, digital downloads, or services to start selling.',
                action: search ? undefined : { label: 'Add Your First Product', onClick: goAdd, icon: <Plus size={15} /> },
              }}
              pagination={{
                page,
                total:    totalProducts,
                perPage:  LIMIT,
                onChange: handlePageChange,
                label:    'products',
              }}
            />
          </Card>
        )}

        {/* Sticky bulk bar: Premium offer / platform sale for the selected products (current page / filter) */}
        {selectedKeys.size > 0 && (
          <div role="region" data-chat-avoid aria-label="Bulk actions" className="sticky bottom-3 z-20 rounded-xl border border-bone bg-white shadow-[0_6px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-2 sm:flex-wrap max-sm:overflow-x-auto [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            <span className="text-[13px] font-semibold text-carbon me-1">{selectedKeys.size} selected</span>
            <Button variant="outline" size="xs" icon={<Crown size={12} />} onClick={() => openOffer('premium_on', Array.from(selectedKeys).map(String))}>Add to Premium offer (%)</Button>
            <Button variant="outline" size="xs" onClick={() => openOffer('premium_off', Array.from(selectedKeys).map(String))}>Remove from Premium offer</Button>
            <Button variant="outline" size="xs" icon={<Flame size={12} />} onClick={() => openOffer('campaign_add', Array.from(selectedKeys).map(String))}>Add to platform sale…</Button>
            <Button variant="outline" size="xs" onClick={() => openOffer('campaign_remove', Array.from(selectedKeys).map(String))}>Remove from platform sale…</Button>
            <Button variant="ghost" size="xs" onClick={() => setSelectedKeys(new Set())}>Clear selection</Button>
            <Button variant="danger" size="xs" className="ms-auto" onClick={() => setConfirmBulkDelete(true)} icon={<Trash2 size={12} />}>Delete</Button>
          </div>
        )}
      </div>

      {offerDialog && (
        <Modal
          title={OFFER_TITLES[offerDialog.action]}
          onClose={() => { if (!offerBusy) setOfferDialog(null); }}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOfferDialog(null)} disabled={offerBusy}>Cancel</Button>
              <Button onClick={submitOffer} loading={offerBusy}>Apply to {offerDialog.ids.length} product{offerDialog.ids.length !== 1 ? 's' : ''}</Button>
            </>
          }
        >
          {offerDialog.action === 'premium_on' && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-slate m-0">Premium members get this % off. These products leave any platform sale they are in (a product has one offer or the other). Products whose normal sale is too close to this % are skipped.</p>
              <label htmlFor="bulk-premium-pct" className="text-[12px] font-semibold text-charcoal">Discount for Premium members (%)</label>
              <input id="bulk-premium-pct" type="number" min={1} max={50} step="any" inputMode="decimal" value={offerPercent} onChange={e => setOfferPercent(e.target.value)} placeholder="e.g. 10" className="w-[160px] px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none" />
            </div>
          )}
          {offerDialog.action === 'premium_off' && (
            <p className="text-[13px] text-slate m-0">These products stop offering the Premium member discount{storePremiumPct > 0 ? ` (your store default of ${storePremiumPct}% will not apply to them either)` : ''}.</p>
          )}
          {(offerDialog.action === 'campaign_add' || offerDialog.action === 'campaign_remove') && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-slate m-0">
                {offerDialog.action === 'campaign_add'
                  ? 'These products join the sale and leave the Premium offer (a product has one offer or the other). Your own sale prices on them are hidden while it runs.'
                  : 'These products leave the sale.'}
              </p>
              <label htmlFor="bulk-campaign" className="text-[12px] font-semibold text-charcoal">Platform sale</label>
              <select id="bulk-campaign" value={offerCampaign} onChange={e => setOfferCampaign(e.target.value)} className="w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-white text-charcoal">
                <option value="">Choose a sale…</option>
                {campaignOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {campaignOptions.length === 0 && <p className="text-[12px] text-slate m-0">No sale is running or about to start.</p>}
            </div>
          )}
          {offerError && <p className="text-[12px] text-error mt-3">{offerError}</p>}
        </Modal>
      )}

      {offerResult && (
        <Modal title="Offers updated" onClose={() => setOfferResult(null)} footer={<Button onClick={() => setOfferResult(null)}>Done</Button>}>
          <p className="text-[13px] text-charcoal m-0">{offerResult.updated.length} product{offerResult.updated.length !== 1 ? 's' : ''} updated{offerResult.skipped.length ? `, ${offerResult.skipped.length} skipped` : ''}.</p>
          {offerResult.skipped.length > 0 && (
            <ul className="list-none p-0 mt-3 mb-0 flex flex-col gap-2 max-h-[260px] overflow-auto">
              {offerResult.skipped.map(s => (
                <li key={s.id} className="text-[12.5px] rounded-lg border border-bone bg-cream/60 px-3 py-2">
                  <span className="font-semibold text-charcoal">{nameById.get(s.id) ?? s.id}</span>
                  <span className="block text-slate">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
      {deleteTarget && (
        <Modal title="Delete this product?" onClose={() => setDeleteTarget(null)} footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm} loading={deleting}>Delete Product</Button>
          </>
        }>
          <p className="text-[13px] text-slate">
            <span className="font-semibold text-charcoal">{deleteTarget.name}</span> will be removed from your store and the marketplace. This can't be undone.
          </p>
          {deleteError && (
            <p className="text-[12px] text-error mt-3">{deleteError}</p>
          )}
        </Modal>
      )}

      {confirmBulkDelete && (
        <Modal title={`Delete ${selectedKeys.size} product${selectedKeys.size !== 1 ? 's' : ''}?`} onClose={() => setConfirmBulkDelete(false)} footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmBulkDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkDeleteConfirm} loading={bulkDeleting}>Delete</Button>
          </>
        }>
          <p className="text-[13px] text-slate">
            These products will be removed from your store and the marketplace. This can't be undone.
          </p>
          {deleteError && (
            <p className="text-[12px] text-error mt-3">{deleteError}</p>
          )}
        </Modal>
      )}
    </>
  );
}
