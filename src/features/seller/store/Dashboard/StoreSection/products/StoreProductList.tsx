import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Plus,
  RefreshCw, TrendingUp,
  Eye, Pencil, Trash2,
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
  type InventoryProduct,
} from '@/api/services/product';
import { currencySymbol } from '@/utils/currency';
import { ProductCell, ProductStatsGrid } from '../../components/ProductListShared';

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StoreProductList() {
  const navigate    = useNavigate();
  const { storeId, store } = useStoreWorkspace();

  const [products,      setProducts]      = useState<InventoryProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats,         setStats]         = useState<{ totalProducts: number; inStock: number; lowStock: number; outOfStock: number } | null>(null);
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
  const SEARCH_LIMIT = 1000;
  const [refreshKey, setRefreshKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const isSearching = debouncedSearch.trim().length > 0;

  const [sort, setSort] = useState<TableSort | null>(null);

  const handleSortChange = (key: string) => {
    setSort(prev => (prev && prev.key === key)
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // When searching, fetch a much larger page so the search covers the whole
    // catalog rather than just the currently-visible page (no server-side search endpoint exists).
    const [fetchPage, fetchLimit] = isSearching ? [1, SEARCH_LIMIT] : [page, LIMIT];
    apiGetStoreInventory(storeId, fetchPage, fetchLimit)
      .then(res => {
        if (cancelled) return;
        setProducts(res.data.products ?? []);
        setStats(res.data.stats);
        setTotalProducts(res.data.pagination.totalProducts);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, page, refreshKey, isSearching]);

  const goAdd    = () => navigate(`/store/${storeId}/products/add`);
  const goEdit   = (p: InventoryProduct) => navigate(`/store/${storeId}/products/edit/${p.productId}`);
  const goDetail = (p: InventoryProduct) => navigate(`/store/${storeId}/products/detail/${p.productId}`);

  const handlePageChange = (p: number) => {
    setLoading(true);
    setError('');
    setSearch('');
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

  const filtered = isSearching
    ? products.filter(p =>
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : products;

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
      key: 'no', header: '#', width: '48px',
      render: (_, i) => (
        <span className="text-[12px] text-slate font-medium">
          {(page - 1) * LIMIT + i + 1}
        </span>
      ),
    },
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
          {currencySymbol(store?.baseCurrency)}{p.price.toLocaleString()}
        </span>
      ),
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
          {p.reviewNote && <span className="text-[11.5px] text-error leading-snug line-clamp-3" title={p.reviewNote}>{p.reviewNote}</span>}
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
        actions={<Button onClick={goAdd} icon={<Plus size={15} />}>Add Product</Button>}
      />

      <div className="px-4 md:px-8 py-6 flex flex-col gap-5">

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <ProductStatsGrid stats={stats} loading={loading} />

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
              columns={columns}
              data={sorted}
              keyExtractor={p => p.productId}
              sort={sort ?? undefined}
              onSortChange={handleSortChange}
              loading={loading}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              bulkActions={keys => (
                <Button variant="danger" size="xs" onClick={() => setConfirmBulkDelete(true)} icon={<Trash2 size={12} />}>
                  Delete {keys.size} product{keys.size !== 1 ? 's' : ''}
                </Button>
              )}
              emptyState={{
                icon: <ShoppingBag size={30} className="text-brand-orange opacity-55" />,
                title: search ? 'No products match your search' : 'No products yet',
                description: search ? 'Try a different name or SKU.' : 'Add physical items, digital downloads, or services to start selling.',
                action: search ? undefined : { label: 'Add Your First Product', onClick: goAdd, icon: <Plus size={15} /> },
              }}
              pagination={isSearching ? undefined : {
                page,
                total:    totalProducts,
                perPage:  LIMIT,
                onChange: handlePageChange,
                label:    'products',
              }}
            />
          </Card>
        )}

      </div>

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
