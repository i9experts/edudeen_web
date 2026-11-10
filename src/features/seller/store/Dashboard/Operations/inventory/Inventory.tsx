import { useState, useEffect, type ReactNode } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useUrlParam, useUrlPage } from '@/hooks/useUrlParam';
import { formatPrice } from '@/utils/formatPrice';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Plus, Minus, Download,
  AlertCircle, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, Infinity as InfinityIcon,
  Eye, Pencil, Save, ArrowRight, History, Bell,
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
  Button,
  ConfirmActionModal,
} from '@/components/comman/ui';
import {
  apiGetStoreInventory,
  apiBulkUpdateStock,
  apiBulkStatus,
  type InventoryProduct,
  type StockAdjustMode,
} from '@/api/services/product';
import { saveCsv } from '@/api/services/adminExports';
import { useBusyAction } from '@/hooks/useBusyAction';
import { InventoryBulkStockModal, summariseStockResult } from './InventoryBulkStockModal';
import { StockHistoryDrawer, LowStockLimitModal } from './InventoryStockDialogs';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { useLeaveGuard } from '../../StoreSection/products/ProductWizard';
import { useToast } from '@/contexts/ToastContext';

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

type StockState = 'low' | 'out' | 'in' | 'unlimited';
type SortKey = 'name' | 'price' | 'stock' | 'status';
type ListFilters = NonNullable<Parameters<typeof apiGetStoreInventory>[3]>;

const STOCK_STATES: StockState[] = ['low', 'out', 'in', 'unlimited'];
const SORT_KEYS: SortKey[] = ['name', 'price', 'stock', 'status'];
const PAGE_SIZES = [10, 25, 50];
const STATUS_OPTIONS: { value: string; label: string; api: ListFilters['status'] }[] = [
  { value: 'active',   label: 'Active',        api: 'active,scheduled' },
  { value: 'draft',    label: 'Draft',         api: 'draft' },
  { value: 'review',   label: 'In review',     api: 'pending_review' },
  { value: 'changes',  label: 'Needs changes', api: 'rejected' },
  { value: 'inactive', label: 'Inactive',      api: 'inactive' },
];
const STATE_EMPTY: Record<StockState, string> = {
  low: 'No low-stock products',
  out: 'No out-of-stock products',
  in: 'No products with healthy stock',
  unlimited: 'No digital or unlimited-stock products',
};
const SELECT_CLS = 'h-[36px] rounded-[8px] border border-bone bg-white px-2.5 text-[13px] text-charcoal cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50';

/** A stat card that is also a filter button (click again to clear). */
function StatFilterCard({ label, value, icon, active, onClick, loading }: {
  label: string; value: number; icon: ReactNode; active: boolean; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`text-start rounded-xl border px-4 py-3.5 min-h-[44px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 ${active ? 'border-brand-orange bg-brand-pale-orange/60 shadow-sm' : 'border-bone bg-white hover:bg-cream'}`}
    >
      <span className="flex items-center gap-2 text-[12px] text-slate">
        <span className={active ? 'text-brand-orange' : 'text-slate'}>{icon}</span>{label}
      </span>
      {loading
        ? <SkeletonBox height={24} width="50%" rounded="6px" className="mt-2" />
        : <span className="num block text-[22px] font-semibold text-carbon leading-[1.25] mt-1">{value.toLocaleString()}</span>}
    </button>
  );
}

function downloadInventoryCsv(rows: InventoryProduct[], currency: string | undefined, name = 'inventory') {
  const header = ['Name', 'SKU', 'Type', 'Status', `Price (${currency ?? 'USD'})`, 'Stock', 'Stock status', 'All-time sales'];
  const lines = rows.map(p => [
    p.name, p.sku ?? '', p.productType ?? p.type, p.status, p.price,
    typeof p.stock === 'number' ? p.stock : 'Unlimited', p.stockStatus, p.allTimeSales,
  ].map(csvCell).join(','));
  saveCsv([header.map(csvCell).join(','), ...lines].join('\r\n'), `${name}-${new Date().toISOString().slice(0, 10)}.csv`);
}

async function exportInventoryCsv(storeId: string, filters: ListFilters, currency: string | undefined) {
  const rows: InventoryProduct[] = [];
  for (let page = 1; ; page++) {
    const res = await apiGetStoreInventory(storeId, page, EXPORT_PAGE_SIZE, filters);
    rows.push(...(res.data.products ?? []));
    if (page >= (res.data.pagination.totalPages || 1)) break;
  }
  downloadInventoryCsv(rows, currency);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function StoreInventory() {
  usePageTitle('Inventory');
  const navigate    = useNavigate();
  const toast       = useToast();
  const { storeId, store } = useStoreWorkspace();

  const [products,      setProducts]      = useState<InventoryProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats, setStats] = useState<{
    totalProducts: number;
    inStock:       number;
    lowStock:      number;
    outOfStock:    number;
    unlimited?:    number;
  } | null>(null);
  // Filters, sort and page live in the URL so a reload / shared link keeps them.
  const [page,       setPage]       = useUrlPage();
  const [urlQ,       setUrlQ]       = useUrlParam('q');
  const [stockRaw,   setStockRaw]   = useUrlParam('stock');
  const [typeRaw,    setTypeRaw]    = useUrlParam('type');
  const [statusRaw,  setStatusRaw]  = useUrlParam('status');
  const [sortRaw,    setSortRaw]    = useUrlParam('sort', 'stock');
  const [dirRaw,     setDirRaw]     = useUrlParam('dir', 'asc');
  const [limitRaw,   setLimitRaw]   = useUrlParam('limit', '10');
  const stockState = STOCK_STATES.includes(stockRaw as StockState) ? (stockRaw as StockState) : undefined;
  const typeFilter = typeRaw === 'physical' || typeRaw === 'digital' ? typeRaw : undefined;
  const statusOpt  = STATUS_OPTIONS.find(o => o.value === statusRaw);
  const sortKey    = SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : 'stock';
  const sortDir    = dirRaw === 'desc' ? 'desc' : 'asc';
  const LIMIT      = PAGE_SIZES.includes(Number(limitRaw)) ? Number(limitRaw) : 10;

  const [search,     setSearch]     = useState(urlQ);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [exporting,  setExporting]  = useState(false);
  const [exportError, setExportError] = useState('');

  // Inline stock edits: productId -> typed value (only single-variant physical products are editable).
  const [edits,     setEdits]     = useState<Record<string, { typed: string; variantId: string; original: number }>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');
  // What the seller tried to do (page change / new search) while edits were unsaved, waiting for their answer.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Bulk selection = product ids on the CURRENT page only; cleared on page / filter / search change and after an apply.
  const [selected,   setSelected]   = useState<Set<string | number>>(new Set());
  const [stockModal, setStockModal] = useState<StockAdjustMode | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const deactivate = useBusyAction();
  const [exportingSel, setExportingSel] = useState(false);
  // Row-menu dialogs: stock history drawer and the per-product low-stock limit.
  const [historyFor, setHistoryFor] = useState<InventoryProduct | null>(null);
  const [limitFor,   setLimitFor]   = useState<InventoryProduct | null>(null);

  // Server-side name/SKU search (debounced into the URL); a new term restarts at page 1.
  const q = useDebouncedValue(search.trim(), 300);
  const appliedQ = urlQ;
  useEffect(() => {
    if (q === urlQ) return;
    setSelected(new Set());
    setUrlQ(q);
    setPage(1);
    setLoading(true);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const listFilters: ListFilters = {
    q: appliedQ,
    ...(stockState ? { stockState } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(statusOpt ? { status: statusOpt.api } : {}),
  };
  const filterKey = JSON.stringify(listFilters);

  // Stock sold, admin changed a listing...: numbers refresh by themselves (this effect does not show a skeleton on a key bump).
  useLiveRefresh(['catalog', 'orders'], () => setRefreshKey(k => k + 1));

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    // Safety net: whatever happens to the request (hung socket, swallowed promise), the page never
    // shows "Loading…" for more than 25 s - it falls back to the error box with Retry.
    const guard = window.setTimeout(() => {
      if (cancelled) return;
      setError('Loading inventory is taking too long. Please try again.');
      setLoading(false);
    }, 25_000);

    apiGetStoreInventory(storeId, page, LIMIT, { ...listFilters, sortBy: sortKey, order: sortDir })
      .then(res => {
        if (cancelled) return;
        setError('');
        setProducts(res.data.products ?? []);
        // Stats (and the header count) always describe the whole store; the API never filters them by search.
        setStats(res.data.stats);
        setTotalProducts(res.data.pagination.totalProducts);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load inventory.');
      })
      .finally(() => { window.clearTimeout(guard); if (!cancelled) setLoading(false); });

    return () => { cancelled = true; window.clearTimeout(guard); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, page, refreshKey, filterKey, sortKey, sortDir, LIMIT]);

  const goAdd    = ()                     => navigate(`/store/${storeId}/products/add`);
  const goEdit   = (p: InventoryProduct) => navigate(`/store/${storeId}/products/edit/${p.productId}`);
  const goDetail = (p: InventoryProduct) => navigate(`/store/${storeId}/products/detail/${p.productId}`);

  const handlePageChange = (p: number) => guardUnsaved(() => {
    setSelected(new Set());
    setLoading(true);
    setError('');
    setPage(p);
  });

  // Any filter / sort / page-size change: ask about unsaved stock edits, show old rows dimmed, restart at page 1.
  const changeList = (apply: () => void) => guardUnsaved(() => {
    setSelected(new Set());
    setLoading(true);
    setError('');
    apply();
    setPage(1);
  });
  const toggleStockState = (s: StockState) => changeList(() => setStockRaw(stockState === s ? '' : s));
  const clearStockState = () => { if (stockState) changeList(() => setStockRaw('')); };
  const onSort = (key: string) => changeList(() => {
    if (key === sortKey) setDirRaw(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortRaw(key); setDirRaw('asc'); }
  });
  const hasFilters = !!(stockState || typeFilter || statusOpt || appliedQ || search.trim());
  const clearFilters = () => changeList(() => {
    setStockRaw(''); setTypeRaw(''); setStatusRaw(''); setUrlQ(''); setSearch('');
  });

  const handleExport = () => {
    if (!storeId || exporting) return;
    setExporting(true);
    setExportError('');
    exportInventoryCsv(storeId, listFilters, store?.baseCurrency)
      .catch((err: unknown) => setExportError(err instanceof Error ? err.message : 'Export failed.'))
      .finally(() => setExporting(false));
  };

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey(k => k + 1);
  };

  const filtered = products;

  // A live refresh can drop rows from the page: never keep a selection for a product that is no longer shown.
  useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev;
      const shown = new Set<string | number>(products.map(p => p.productId));
      const next = new Set([...prev].filter(k => shown.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  const selectedRows = products.filter(p => selected.has(p.productId));
  const toggleRow = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOnPage = products.length > 0 && products.every(p => selected.has(p.productId));
  const toggleAllOnPage = () => setSelected(allOnPage ? new Set() : new Set(products.map(p => p.productId)));

  const afterBulk = (updatedIds: string[]) => {
    // A product changed in bulk must not keep a stale typed value in the inline editor.
    setEdits(prev => {
      const next = { ...prev };
      for (const id of updatedIds) delete next[id];
      return next;
    });
    setSelected(new Set());
    setRefreshKey(k => k + 1);
  };

  const handleExportSelected = () => {
    if (exportingSel || selectedRows.length === 0) return;
    setExportingSel(true);
    try { downloadInventoryCsv(selectedRows, store?.baseCurrency, 'inventory-selected'); }
    finally { setExportingSel(false); }
  };

  const handleDeactivate = async () => {
    const ids = selectedRows.map(p => p.productId);
    const r = await deactivate.run(() => apiBulkStatus(ids, false));
    if (!r) return;
    const { updated, skipped } = r.data;
    setConfirmDeactivate(false);
    const msg = `${updated.length} deactivated${skipped.length ? `, ${skipped.length} skipped (already inactive, in review or not allowed)` : ''}`;
    if (updated.length) toast.success(msg); else toast.error(msg);
    afterBulk(updated.map(u => u.id));
  };

  // Changed rows only, validated as whole numbers >= 0.
  const pendingEdits = Object.values(edits).filter(e => e.typed !== String(e.original));
  const isBadStock = (typed: string) => !/^\d{1,7}$/.test(typed.trim());
  const invalidEdit = pendingEdits.some(e => isBadStock(e.typed));
  const dirty = pendingEdits.length > 0;
  const { dialog: leaveDialog } = useLeaveGuard(dirty);

  function guardUnsaved(run: () => void) {
    if (dirty) setPendingAction(() => run);
    else run();
  }

  // Discard clears the typed values AND every error (validation is derived from the edits, save error is cleared here).
  const handleDiscard = () => { setEdits({}); setSaveError(''); };

  const handleSaveStock = async () => {
    if (!storeId || saving || pendingEdits.length === 0 || invalidEdit) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await apiBulkUpdateStock(storeId, pendingEdits.map(e => ({
        variantId: e.variantId,
        stock: Number(e.typed.trim()),
      })));
      const skipped = res.data?.skipped?.length ?? 0;
      setEdits({});
      toast.success(skipped ? `Saved. ${skipped} item${skipped === 1 ? ' was' : 's were'} skipped.` : 'Stock saved.');
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save stock.');
    } finally {
      setSaving(false);
    }
  };

  // ── Columns ──────────────────────────────────────────────────────────────────
  const typeBadge = (p: InventoryProduct) => (
    <Badge color={p.type === 'digital' ? 'blue' : 'orange'}>
      {p.type === 'digital' ? 'Digital' : 'Physical'}
    </Badge>
  );

  const stockCell = (p: InventoryProduct) => {
    const editable = p.type !== 'digital' && typeof p.stock === 'number' && !!p.defaultVariantId && (p.variantCount ?? 1) === 1;
    if (!editable) {
      return (
        <span className="text-[13px] text-carbon whitespace-nowrap" title={(p.variantCount ?? 1) > 1 ? 'Has several variants — edit stock per variant in the product.' : undefined}>
          {typeof p.stock === 'number' ? `${p.stock} units` : p.stock}
        </span>
      );
    }
    const typed = edits[p.productId]?.typed;
    const changed = typed !== undefined && typed !== String(p.stock);
    const bad = changed && isBadStock(typed);
    const setTyped = (v: string) =>
      setEdits(prev => ({ ...prev, [p.productId]: { typed: v, variantId: p.defaultVariantId as string, original: p.stock as number } }));
    // -/+ go through the same unsaved-changes bar as typing. A typed value that is not a whole number restarts from the saved stock.
    const step = (delta: number) => {
      const base = typed !== undefined && !isBadStock(typed) ? Number(typed.trim()) : (p.stock as number);
      setTyped(String(Math.min(9_999_999, Math.max(0, base + delta))));
    };
    const current = typed !== undefined && !isBadStock(typed) ? Number(typed.trim()) : (p.stock as number);
    const stepCls = 'size-8 max-md:size-11 shrink-0 inline-flex items-center justify-center rounded-[7px] border border-bone bg-white text-charcoal cursor-pointer hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50';
    return (
      <div className="inline-flex flex-col items-end gap-0.5">
        <div className="inline-flex items-center gap-1">
          <button type="button" className={stepCls} aria-label={`Decrease stock for ${p.name}`} disabled={current <= 0} onClick={() => step(-1)}>
            <Minus size={14} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={typed ?? String(p.stock)}
            aria-label={`Stock for ${p.name}`}
            aria-invalid={bad || undefined}
            onChange={e => setTyped(e.target.value)}
            className={`w-[68px] text-end text-[13px] rounded-[7px] border px-2 py-[5px] max-md:py-[10px] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 ${bad ? 'border-error' : changed ? 'border-brand-orange' : 'border-bone'}`}
          />
          <button type="button" className={stepCls} aria-label={`Increase stock for ${p.name}`} disabled={current >= 9_999_999} onClick={() => step(1)}>
            <Plus size={14} />
          </button>
        </div>
        {bad && <span className="text-[11px] text-error whitespace-nowrap">Whole number, 0 or more</span>}
      </div>
    );
  };

  // Product name opens the seller product detail page. Own cell (the shared ProductCell is used by the Products page too).
  const nameCell = (p: InventoryProduct) => (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-lg shrink-0 bg-brand-pale-orange border border-[#edebe2] overflow-hidden">
        {p.image && <img loading="lazy" decoding="async" src={p.image} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="min-w-0 max-w-[340px]">
        <Link to={`/store/${storeId}/products/detail/${p.productId}`} title={p.name} className="block text-[13px] font-medium text-charcoal mb-[1px] line-clamp-2 break-words hover:underline hover:text-brand-royal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-sm">
          {p.name}
        </Link>
        {p.sku && <p className="text-[12px] text-slate truncate m-0" title={p.sku}>{p.sku}</p>}
      </div>
    </div>
  );

  // Soft hint only: a free listing may be intentional (lead magnet), so nothing is blocked.
  const freeHint = (p: InventoryProduct) => p.status === 'active' && p.price === 0
    ? <span className="block text-[11px] text-amber-700" title="This live listing is priced 0. Fine for a free resource; otherwise set a price.">Free listing?</span>
    : null;

  const statusCell = (p: InventoryProduct) => (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={p.status} />
      {p.status === 'pending_review' && p.reviewReason && <span className="text-[11px] text-slate max-w-[180px]">{p.reviewReason}</span>}
    </div>
  );

  const rowMenu = (p: InventoryProduct) => (
    <ActionMenu
      align="right"
      items={[
        { label: 'View Detail',  onClick: () => goDetail(p), icon: <Eye    size={13} /> },
        { label: 'Edit Product', onClick: () => goEdit(p),   icon: <Pencil size={13} /> },
        // Physical products only: digital ones have unlimited stock, so a limit / history means nothing.
        ...(p.type !== 'digital' ? [
          { label: 'Low-stock limit', onClick: () => setLimitFor(p),   icon: <Bell size={13} /> },
          { label: 'Stock history',   onClick: () => setHistoryFor(p), icon: <History size={13} /> },
        ] : []),
      ]}
    />
  );

  const columns: TableColumn<InventoryProduct>[] = [
    {
      key: 'name', header: 'Product', sortable: true,
      render: p => (
        <div className="min-w-0">
          {nameCell(p)}
          <div className="xl:hidden mt-1">{typeBadge(p)}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', hideBelowXl: true, render: typeBadge },
    {
      key: 'price', header: 'Price', align: 'right', sortable: true,
      render: p => (
        <div className="flex flex-col items-end">
          <span className="font-semibold text-charcoal whitespace-nowrap">{formatPrice(p.price, store?.baseCurrency)}</span>
          {freeHint(p)}
        </div>
      ),
    },
    { key: 'stock', header: 'Stock', align: 'right', sortable: true, render: stockCell },
    {
      key: 'allTimeSales', header: 'Sales', align: 'right', hideBelowXl: true,
      render: p => (
        <span className="text-[13px] text-slate">{p.allTimeSales.toLocaleString()}</span>
      ),
    },
    {
      key: 'status', header: 'Status', sortable: true,
      render: statusCell,
    },
    {
      key: 'actions', header: '', align: 'center', width: '56px', sticky: true,
      render: rowMenu,
    },
  ];

  const productCard = (p: InventoryProduct) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="size-4 mt-3 shrink-0 cursor-pointer accent-brand-orange"
          checked={selected.has(p.productId)}
          onChange={() => toggleRow(p.productId)}
          aria-label={`Select ${p.name}`}
        />
        <div className="min-w-0 flex-1">{nameCell(p)}</div>
        {rowMenu(p)}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {typeBadge(p)}
        {statusCell(p)}
        <span className="font-semibold text-charcoal text-[13px] whitespace-nowrap">{formatPrice(p.price, store?.baseCurrency)}{freeHint(p)}</span>
        <span className="text-[12px] text-slate whitespace-nowrap">{p.allTimeSales.toLocaleString()} sold</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold text-slate uppercase tracking-[0.05em]">Stock</span>
        {stockCell(p)}
      </div>
    </div>
  );

  const firstLoad = loading && products.length === 0;

  return (
    <>
      <StorePageHeader
        title="Inventory"
        subtitle={stats ? `${stats.totalProducts} product${stats.totalProducts !== 1 ? 's' : ''}` : loading ? 'Loading…' : ''}
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
              onClick={() => navigate(`/store/${storeId}/products`)}
              title="Manage products"
              className="flex items-center gap-1.5 bg-brand-orange text-white border-none rounded-[9px] px-2.5 sm:px-4 py-[9px] text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50"
            >
              <span className="hidden sm:inline">Manage products</span> <ArrowRight size={15} className="rtl:rotate-180" />
            </button>
          </>
        }
      />

      <div className={`px-4 lg:px-7 pt-5 flex flex-col gap-5 ${dirty || saveError || selected.size > 0 ? 'pb-28' : 'pb-5'}`}>

        {/* Stats */}
        {/* Stat cards = stock filters (store-wide counts from the server; click again to clear) */}
        <div role="group" aria-label="Filter by stock" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatFilterCard label="Total Products" value={stats?.totalProducts ?? 0} icon={<ShoppingBag size={15} />} active={!stockState} onClick={clearStockState} loading={loading && !stats} />
          <StatFilterCard label="In Stock" value={stats?.inStock ?? 0} icon={<CheckCircle2 size={15} />} active={stockState === 'in'} onClick={() => toggleStockState('in')} loading={loading && !stats} />
          <StatFilterCard label="Low Stock" value={stats?.lowStock ?? 0} icon={<AlertTriangle size={15} />} active={stockState === 'low'} onClick={() => toggleStockState('low')} loading={loading && !stats} />
          <StatFilterCard label="Out of Stock" value={stats?.outOfStock ?? 0} icon={<XCircle size={15} />} active={stockState === 'out'} onClick={() => toggleStockState('out')} loading={loading && !stats} />
          <StatFilterCard label="Digital / Unlimited" value={stats?.unlimited ?? 0} icon={<InfinityIcon size={15} />} active={stockState === 'unlimited'} onClick={() => toggleStockState('unlimited')} loading={loading && !stats} />
        </div>

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
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <select aria-label="Filter by type" value={typeFilter ?? ''} onChange={e => changeList(() => setTypeRaw(e.target.value))} className={SELECT_CLS}>
                  <option value="">All types</option>
                  <option value="physical">Physical</option>
                  <option value="digital">Digital</option>
                </select>
                <select aria-label="Filter by status" value={statusOpt?.value ?? ''} onChange={e => changeList(() => setStatusRaw(e.target.value))} className={SELECT_CLS}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select aria-label="Sort by" value={`${sortKey}:${sortDir}`} onChange={e => { const [k, d] = e.target.value.split(':'); changeList(() => { setSortRaw(k); setDirRaw(d); }); }} className={`${SELECT_CLS} md:hidden`}>
                  <option value="stock:asc">Stock: low to high</option>
                  <option value="stock:desc">Stock: high to low</option>
                  <option value="name:asc">Name: A to Z</option>
                  <option value="name:desc">Name: Z to A</option>
                  <option value="price:asc">Price: low to high</option>
                  <option value="price:desc">Price: high to low</option>
                  <option value="status:asc">Status: A to Z</option>
                  <option value="status:desc">Status: Z to A</option>
                </select>
                <select aria-label="Rows per page" value={LIMIT} onChange={e => changeList(() => setLimitRaw(e.target.value))} className={SELECT_CLS}>
                  {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className="text-[12px] font-semibold text-brand-royal underline cursor-pointer bg-transparent border-none min-h-[36px] px-1">
                    Clear filters
                  </button>
                )}
                <SearchInput
                  value={search}
                  onChange={v => guardUnsaved(() => setSearch(v))}
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

            {firstLoad ? (
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
            ) : !loading && filtered.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag size={30} className="text-brand-orange opacity-55" />}
                title={stockState ? STATE_EMPTY[stockState] : hasFilters ? 'No products match these filters' : 'No products yet'}
                description={
                  hasFilters
                    ? 'Try different filters or search words.'
                    : 'Add your first product to start tracking inventory.'
                }
                action={hasFilters
                  ? { label: 'Clear filters', onClick: clearFilters }
                  : { label: 'Add Your First Product', onClick: goAdd, icon: <Plus size={15} /> }}
              />
            ) : (
              // Old rows stay on screen (slightly dimmed) while a new page/search loads - no skeleton flash.
              <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
                <label className="md:hidden flex items-center gap-2 px-4 pb-2 text-[12px] font-semibold text-slate cursor-pointer min-h-[44px]">
                  <input type="checkbox" className="size-4 accent-brand-orange" checked={allOnPage} onChange={toggleAllOnPage} />
                  Select all on this page
                </label>
                <Table
                  columns={columns}
                  data={filtered}
                  keyExtractor={p => p.productId}
                  selectable
                  selectedKeys={selected}
                  onSelectionChange={setSelected}
                  cardsBelow="md"
                  compact
                  sort={{ key: sortKey, direction: sortDir }}
                  onSortChange={onSort}
                  renderCard={productCard}
                  pagination={{
                    page,
                    total:    totalProducts,
                    perPage:  LIMIT,
                    onChange: handlePageChange,
                    label:    'products',
                  }}
                />
              </div>
            )}
          </Card>
        )}

        {selected.size > 0 && (
          <div role="region" data-chat-avoid aria-label="Bulk actions" className="sticky bottom-3 z-20 rounded-xl border border-bone bg-white shadow-[0_6px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-2 flex-wrap max-sm:max-h-[38vh] max-sm:overflow-y-auto [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            <span role="status" className="text-[13px] font-semibold text-carbon me-1">{selected.size} selected</span>
            <Button variant="outline" size="xs" onClick={() => setStockModal('set')}>Set stock…</Button>
            <Button variant="outline" size="xs" onClick={() => setStockModal('add')}>Add / subtract…</Button>
            <Button variant="outline" size="xs" onClick={() => { deactivate.setError(''); setConfirmDeactivate(true); }}>Deactivate</Button>
            <Button variant="outline" size="xs" icon={<Download size={12} />} onClick={handleExportSelected} disabled={exportingSel}>Export selected</Button>
            <Button variant="ghost" size="xs" onClick={() => setSelected(new Set())}>Clear selection</Button>
          </div>
        )}

        {(dirty || saveError) && (
          <div role="region" aria-label="Unsaved stock changes" data-chat-avoid className={`sticky bottom-3 z-20 rounded-xl border shadow-[0_6px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex flex-wrap items-center gap-3 ${saveError ? 'bg-error-bg border-error-border' : 'bg-white border-bone'}`}>
            <span role={saveError ? 'alert' : 'status'} className={`text-[13px] flex-1 min-w-[160px] ${saveError ? 'text-error' : 'text-charcoal'}`}>
              {saveError
                ? saveError
                : invalidEdit
                  ? 'Stock must be a whole number, 0 or more.'
                  : `${pendingEdits.length} unsaved stock change${pendingEdits.length === 1 ? '' : 's'}`}
            </span>
            <Button variant="outline" size="xs" onClick={handleDiscard} disabled={saving}>Discard</Button>
            <Button size="xs" onClick={handleSaveStock} disabled={saving || invalidEdit || !dirty} icon={saveError ? <RefreshCw size={12} /> : <Save size={12} />}>
              {saving ? 'Saving…' : saveError ? 'Retry' : 'Save changes'}
            </Button>
          </div>
        )}

      </div>

      {leaveDialog}

      {stockModal && storeId && (
        <InventoryBulkStockModal
          storeId={storeId}
          rows={selectedRows}
          initialMode={stockModal}
          onClose={() => setStockModal(null)}
          onDone={r => {
            setStockModal(null);
            const msg = summariseStockResult(r);
            if (r.updated.length) toast.success(msg); else toast.error(msg);
            afterBulk(r.updated.map(u => u.id));
          }}
        />
      )}

      {historyFor && storeId && <StockHistoryDrawer storeId={storeId} product={historyFor} onClose={() => setHistoryFor(null)} />}
      {limitFor && storeId && (
        <LowStockLimitModal
          storeId={storeId}
          product={limitFor}
          onClose={() => setLimitFor(null)}
          onSaved={() => { toast.success('Low-stock limit saved.'); setRefreshKey(k => k + 1); }}
        />
      )}

      {confirmDeactivate && (
        <ConfirmActionModal
          title={`Deactivate ${selectedRows.length} product${selectedRows.length === 1 ? '' : 's'}?`}
          message="They will be hidden from buyers until you activate them again. Products that are in review are not changed."
          confirmLabel={`Deactivate ${selectedRows.length}`}
          danger
          busy={deactivate.busy}
          error={deactivate.error}
          onConfirm={handleDeactivate}
          onClose={() => setConfirmDeactivate(false)}
        />
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Unsaved changes">
          <div className="bg-white rounded-xl p-5 max-w-[380px] w-full shadow-xl">
            <h2 className="font-serif font-normal text-[20px] text-carbon m-0 mb-1.5">Discard unsaved changes?</h2>
            <p className="text-[13px] text-slate m-0 mb-4">You have {pendingEdits.length} stock change{pendingEdits.length === 1 ? '' : 's'} that {pendingEdits.length === 1 ? 'is' : 'are'} not saved yet.</p>
            <div className="flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setPendingAction(null)} className="px-4 py-2 min-h-[44px] rounded-lg text-[14px] font-bold bg-brand-royal text-white border-none cursor-pointer">Keep editing</button>
              <button type="button" onClick={() => { const run = pendingAction; setPendingAction(null); handleDiscard(); run(); }} className="px-4 py-2 min-h-[44px] rounded-lg text-[14px] font-bold text-graphite bg-white border border-bone cursor-pointer">Discard &amp; continue</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
