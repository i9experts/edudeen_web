import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Plus, Download,
  AlertCircle, RefreshCw,
  AlertTriangle,
  Eye, Pencil,
} from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import {
  Table,      type TableColumn,
  Badge,      StatusBadge,
  EmptyState,
  Card,
  SearchInput,
  SkeletonBox,
  ActionMenu,
} from '@/components/comman/ui';
import {
  apiGetStoreInventory,
  apiGetLowStockSummary,
  type InventoryProduct,
  type LowStockSummaryData,
} from '@/api/services/product';
import { usePageTitle } from '@/hooks/usePageTitle';
import { currencySymbol } from '@/utils/currency';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { ProductCell, ProductStatsGrid } from '../../components/ProductListShared';

// ── CSV export ────────────────────────────────────────────────────────────────
// The analytics "products" export is a sales report, not a stock list, so the
// inventory CSV is built here from the inventory endpoint itself (all pages).
const EXPORT_PAGE_SIZE = 100;

function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection (= + - @ at the start of a cell).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

async function exportInventoryCsv(storeId: string, q: string, currency: string | undefined) {
  const rows: InventoryProduct[] = [];
  for (let page = 1; ; page++) {
    const res = await apiGetStoreInventory(storeId, page, EXPORT_PAGE_SIZE, { q });
    rows.push(...(res.data.products ?? []));
    if (page >= (res.data.pagination.totalPages || 1)) break;
  }
  const header = ['Name', 'SKU', 'Type', 'Status', `Price (${currency ?? 'USD'})`, 'Stock', 'Stock status', 'All-time sales'];
  const lines = rows.map(p => [
    p.name, p.sku ?? '', p.productType ?? p.type, p.status, p.price,
    typeof p.stock === 'number' ? p.stock : 'Unlimited', p.stockStatus, p.allTimeSales,
  ].map(csvCell).join(','));
  const blob = new Blob([`﻿${[header.map(csvCell).join(','), ...lines].join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StoreInventory() {
  usePageTitle('Inventory');
  const navigate    = useNavigate();
  const { storeId, store } = useStoreWorkspace();

  const [products,      setProducts]      = useState<InventoryProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats, setStats] = useState<{
    totalProducts: number;
    inStock:       number;
    lowStock:      number;
    outOfStock:    number;
  } | null>(null);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lowStock,   setLowStock]   = useState<LowStockSummaryData | null>(null);

  const [exporting,  setExporting]  = useState(false);
  const [exportError, setExportError] = useState('');

  const LIMIT = 10;

  // Server-side name/SKU search; a new term restarts at page 1.
  const q = useDebouncedValue(search.trim(), 300);
  const [appliedQ, setAppliedQ] = useState('');
  if (q !== appliedQ) {
    setAppliedQ(q);
    setPage(1);
    setLoading(true);
    setError('');
  }

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;

    apiGetStoreInventory(storeId, page, LIMIT, { q: appliedQ })
      .then(res => {
        if (cancelled) return;
        setProducts(res.data.products ?? []);
        // Stats cards describe the whole store, not just search matches.
        if (!appliedQ) setStats(res.data.stats);
        setTotalProducts(res.data.pagination.totalProducts);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load inventory.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [storeId, page, refreshKey, appliedQ]);

  // Low-stock detail list — independent of pagination, only re-runs on store/refresh.
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetLowStockSummary(storeId)
      .then(res => { if (!cancelled) setLowStock(res.data); })
      .catch(() => { /* non-critical widget — stats card above already covers the count */ });
    return () => { cancelled = true; };
  }, [storeId, refreshKey]);

  const goAdd    = ()                     => navigate(`/store/${storeId}/products/add`);
  const goEdit   = (p: InventoryProduct) => navigate(`/store/${storeId}/products/edit/${p.productId}`);
  const goDetail = (p: InventoryProduct) => navigate(`/store/${storeId}/products/detail/${p.productId}`);

  const handlePageChange = (p: number) => {
    setLoading(true);
    setError('');
    setPage(p);
  };

  const handleExport = () => {
    if (!storeId || exporting) return;
    setExporting(true);
    setExportError('');
    exportInventoryCsv(storeId, appliedQ, store?.baseCurrency)
      .catch((err: unknown) => setExportError(err instanceof Error ? err.message : 'Export failed.'))
      .finally(() => setExporting(false));
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  const filtered = products;

  // ── Columns ──────────────────────────────────────────────────────────────────
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
      key: 'name', header: 'Product',
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
      key: 'price', header: 'Price', align: 'right',
      render: p => (
        <span className="font-semibold text-charcoal">{currencySymbol(store?.baseCurrency)}{p.price.toLocaleString()}</span>
      ),
    },
    {
      key: 'stock', header: 'Stock', align: 'right',
      render: p => (
        <span className="text-[13px] text-carbon">
          {typeof p.stock === 'number' ? `${p.stock} units` : p.stock}
        </span>
      ),
    },
    {
      key: 'allTimeSales', header: 'Sales', align: 'right',
      render: p => (
        <span className="text-[13px] text-slate">{p.allTimeSales.toLocaleString()}</span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: p => <StatusBadge status={p.status} />,
    },
    {
      key: 'actions', header: '', align: 'center', width: '60px',
      render: p => (
        <ActionMenu
          align="right"
          items={[
            { label: 'View Detail',  onClick: () => goDetail(p), icon: <Eye    size={13} /> },
            { label: 'Edit Product', onClick: () => goEdit(p),   icon: <Pencil size={13} /> },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <StorePageHeader
        title="Inventory"
        subtitle={loading ? 'Loading…' : `${totalProducts} product${totalProducts !== 1 ? 's' : ''}`}
        actions={
          <>
            <button
              title={appliedQ ? 'Export matching products (CSV)' : 'Export all products (CSV)'}
              onClick={handleExport}
              disabled={exporting || (!loading && totalProducts === 0)}
              className="flex items-center gap-1.5 bg-white text-graphite border border-bone rounded-[9px] px-2.5 sm:px-4 py-[9px] text-[13px] font-medium cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} className="sm:hidden" />
              <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
            </button>
            <button
              onClick={goAdd}
              title="Add Product"
              className="flex items-center gap-1.5 bg-brand-orange text-white border-none rounded-[9px] px-2.5 sm:px-4 py-[9px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50"
            >
              <Plus size={15} /> <span className="hidden sm:inline">Add Product</span>
            </button>
          </>
        }
      />

      <div className="px-4 lg:px-7 py-5 flex flex-col gap-5">

        {/* Stats */}
        <ProductStatsGrid stats={stats} loading={loading} />

        {/* Low stock detail */}
        {!!lowStock?.count && (
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-[#f3f2ec]">
              <AlertTriangle size={14} className="text-warning shrink-0" />
              <p className="text-[13px] font-bold text-charcoal">
                {lowStock.count} product{lowStock.count !== 1 ? 's' : ''} running low
              </p>
              <span className="text-[12px] text-slate ml-1">(≤ {lowStock.threshold} units left)</span>
            </div>
            <div className="px-5 py-3 flex flex-col divide-y divide-[#f3f2ec]">
              {(lowStock.items ?? []).slice(0, 5).map(item => (
                <button
                  key={item.productId}
                  onClick={() => navigate(`/store/${storeId}/products/edit/${item.productId}`)}
                  className="flex items-center justify-between gap-3 py-2 bg-transparent border-none text-left cursor-pointer group"
                >
                  <span className="text-[13px] text-charcoal group-hover:text-brand-orange transition-colors">{item.name}</span>
                  <Badge color="orange">{item.stock} left</Badge>
                </button>
              ))}
              {(lowStock.items ?? []).length > 5 && (
                <p className="text-[12px] text-slate pt-2">+ {(lowStock.items ?? []).length - 5} more</p>
              )}
            </div>
          </Card>
        )}

        {exportError && (
          <div role="alert" className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center gap-3">
            <AlertCircle size={16} className="text-error shrink-0" />
            <span className="text-[13px] text-error flex-1">Couldn’t export inventory: {exportError}</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-center gap-3">
            <AlertCircle size={16} className="text-error shrink-0" />
            <span className="text-[13px] text-error flex-1">{error}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 text-[12px] text-error font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-sm"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Table */}
        {!error && (
          <Card padding="none">
            <div className="px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[14px] font-bold text-charcoal shrink-0">All Products</p>
              <div className="flex items-center gap-2 sm:ml-auto">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or SKU…"
                  className="w-full sm:w-[220px]"
                />
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 text-[12px] text-slate cursor-pointer border border-bone rounded-[6px] px-2 py-[6px] transition-colors duration-150 hover:bg-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 shrink-0"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="px-5 pb-5 flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <SkeletonBox width={36} height={36} rounded="8px" />
                    <SkeletonBox width="35%" height={13} />
                    <SkeletonBox width="8%"  height={22} rounded="999px" className="ml-auto" />
                    <SkeletonBox width="10%" height={13} />
                    <SkeletonBox width="10%" height={13} />
                    <SkeletonBox width="6%"  height={13} />
                    <SkeletonBox width={56}  height={22} rounded="999px" />
                    <SkeletonBox width={28}  height={28} rounded="7px" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag size={30} className="text-brand-orange opacity-55" />}
                title={search ? 'No products match your search' : 'No products yet'}
                description={
                  search
                    ? 'Try a different name or SKU.'
                    : 'Add your first product to start tracking inventory.'
                }
                action={search ? undefined : { label: 'Add Your First Product', onClick: goAdd, icon: <Plus size={15} /> }}
              />
            ) : (
              <Table
                columns={columns}
                data={filtered}
                keyExtractor={p => p.productId}
                pagination={{
                  page,
                  total:    totalProducts,
                  perPage:  LIMIT,
                  onChange: handlePageChange,
                  label:    'products',
                }}
              />
            )}
          </Card>
        )}

      </div>
    </>
  );
}
