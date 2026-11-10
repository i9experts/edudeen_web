import { useState, useEffect, useRef } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { formatPrice } from '@/utils/formatPrice';
import { useNavigate } from 'react-router-dom';
import { useUrlParam } from '@/hooks/useUrlParam';
import { useSellerCategories } from '@/hooks/store/useSellerCategories';
import type { CategoryNode } from '@/api/services/categories';
import {
  SlidersHorizontal,
  ShoppingBag, Plus,
  RefreshCw,
  Eye, Pencil, Trash2, ArrowRight, Crown, Flame, UploadCloud, Users, Copy, Power, Wrench,
} from 'lucide-react';
import { DeliveryFormatBadge } from '@/components/comman/ui/DeliveryFormatBadge';
import { courseSummaryText } from '@/utils/deliveryFormat';
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
  apiDuplicateProduct,
  apiSetProductVisibility,
  apiBulkOffers,
  apiBulkStatus,
  apiBulkPrice,
  apiBulkUpdateStock,
  type BulkStatusResult,
  type BulkOfferAction,
  type BulkOffersResult,
  type InventoryProduct,
} from '@/api/services/product';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import { ProductCell } from '../../components/ProductListShared';
import { useToast } from '@/contexts/ToastContext';
import { InlineEditCell } from './InlineEditCell';
import { BulkPriceModal } from './BulkPriceModal';

const OFFER_TITLES: Record<BulkOfferAction, string> = {
  premium_on: 'Add to Premium offer',
  premium_off: 'Remove from Premium offer',
  campaign_add: 'Add to a platform sale',
  campaign_remove: 'Remove from a platform sale',
};

// Status tabs. `api` = what the inventory API gets; `counts` = statuses summed for the tab badge.
const STATUS_TABS: { key: string; label: string; api?: 'active,scheduled' | 'pending_review' | 'rejected' | 'draft' | 'inactive'; counts: string[] }[] = [
  { key: 'all',      label: 'All',           counts: ['draft', 'pending_review', 'active', 'scheduled', 'inactive', 'rejected'] },
  { key: 'active',   label: 'Active',        api: 'active,scheduled', counts: ['active', 'scheduled'] },
  { key: 'review',   label: 'In review',     api: 'pending_review',   counts: ['pending_review'] },
  { key: 'changes',  label: 'Needs changes', api: 'rejected',         counts: ['rejected'] },
  { key: 'draft',    label: 'Draft',         api: 'draft',            counts: ['draft'] },
  { key: 'inactive', label: 'Inactive',      api: 'inactive',         counts: ['inactive'] },
];
// URL value -> tab (old dashboard links use the raw status names). Anything else = All.
const STATUS_ALIASES: Record<string, string> = {
  active: 'active', review: 'review', changes: 'changes', draft: 'draft', inactive: 'inactive',
  pending_review: 'review', rejected: 'changes',
};
const TYPE_FILTERS = [
  { value: 'physical', label: 'Physical' },
  { value: 'download', label: 'File download' },
  { value: 'course',   label: 'Online course' },
];
function flattenCategories(nodes: CategoryNode[], depth = 0): { id: string; label: string }[] {
  return nodes.flatMap(n => [
    { id: n._id, label: `${depth ? `${'— '.repeat(depth)}` : ''}${n.name}` },
    ...flattenCategories(n.children ?? [], depth + 1),
  ]);
}

const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'views', label: 'Most views (30 days)' },
  { value: 'sales', label: 'Most sales (30 days)' },
];

/** Listing quality badge: green >= 80, amber 60-79, red < 60. Tooltip lists what is missing. */
function QualityBadge({ p }: { p: InventoryProduct }) {
  if (typeof p.qualityScore !== 'number') return null;
  const s = p.qualityScore;
  const color = s >= 80 ? 'green' : s >= 60 ? 'yellow' : 'red';
  const missing = p.qualityMissing ?? [];
  const tip = missing.length ? `To improve this listing:\n- ${missing.join('\n- ')}` : 'Nothing missing - this listing is complete.';
  return (
    <span title={tip} aria-label={`Listing quality ${s} out of 100. ${missing.length ? `Missing: ${missing.join(', ')}` : 'Nothing missing.'}`} className="cursor-help">
      <Badge color={color}>Quality {s}</Badge>
    </span>
  );
}

/** Views · Sales · Conv% for the last 30 days. A dash = no data yet (never a fake 0). */
function Last30({ p }: { p: InventoryProduct }) {
  const dash = '—';
  return (
    <div className="flex flex-col items-end gap-0.5 text-[12px] text-slate whitespace-nowrap">
      <span title="Product page views, last 30 days">Views <span className="font-semibold text-charcoal">{p.views30d == null ? dash : p.views30d}</span></span>
      <span title="Orders, last 30 days">Sales <span className="font-semibold text-charcoal">{p.sales30d ?? 0}</span></span>
      {!p.conversionLocked && (
        <span title="Paid orders / views, last 30 days">Conv <span className="font-semibold text-charcoal">{p.conversionPct == null ? dash : `${p.conversionPct}%`}</span></span>
      )}
    </div>
  );
}

const SELECT_CLS ='px-3 py-[7px] rounded-lg text-[13px] border border-bone bg-white text-charcoal';
function TypeSelect({ value, onChange, full }: { value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <select aria-label="Product type" value={value} onChange={e => onChange(e.target.value)} className={`${SELECT_CLS} ${full ? 'w-full' : ''}`}>
      <option value="">All types</option>
      {TYPE_FILTERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
    </select>
  );
}
function SortSelect({ value, onChange, full }: { value: string; onChange: (v: string) => void; full?: boolean }) {
  return (
    <select aria-label="Sort products" value={value} onChange={e => onChange(e.target.value)} className={`${SELECT_CLS} ${full ? 'w-full' : ''}`}>
      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function CategorySelect({ value, options, loading, error, onRetry, onChange, full }: {
  value: string; options: { id: string; label: string }[]; loading: boolean; error: boolean;
  onRetry: () => void; onChange: (v: string) => void; full?: boolean;
}) {
  if (error) return <button type="button" onClick={onRetry} className="text-[12.5px] text-error underline bg-transparent border-0 cursor-pointer">Categories failed to load. Retry</button>;
  return (
    <select aria-label="Category" value={value} disabled={loading} onChange={e => onChange(e.target.value)} className={`${SELECT_CLS} max-w-[220px] ${full ? 'w-full max-w-none' : ''}`}>
      <option value="">{loading ? 'Loading…' : 'All categories'}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

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

  // Filters live in the URL (reload/back keep them): ?status=active|review|changes|draft|inactive, ?type=, ?category=.
  // Dashboard 'Action required' links still use ?status=pending_review | rejected - mapped below.
  const [rawStatus, setRawStatus] = useUrlParam('status');
  const [rawType, setRawType] = useUrlParam('type');
  const [rawCategory, setRawCategory] = useUrlParam('category');
  const [rawSort, setRawSort] = useUrlParam('sort');
  const [rawQuality, setRawQuality] = useUrlParam('quality');
  const serverSort: 'views' | 'sales' | undefined = rawSort === 'views' ? 'views' : rawSort === 'sales' ? 'sales' : undefined;
  const lowQuality = rawQuality === 'low';
  const statusTab = STATUS_ALIASES[rawStatus] ?? 'all';
  const typeF = TYPE_FILTERS.some(t => t.value === rawType) ? rawType : '';
  const categoryF = /^[a-f0-9]{24}$/i.test(rawCategory) ? rawCategory : '';
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [storeTotal, setStoreTotal] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { categories, loading: catsLoading, error: catsError, refetch: refetchCats } = useSellerCategories();
  const categoryOptions = flattenCategories(categories);
  const apiFilters = (() => {
    const tab = STATUS_TABS.find(t => t.key === statusTab);
    return {
      status: tab?.api,
      type: typeF === 'physical' ? 'physical' as const : typeF ? 'digital' as const : undefined,
      deliveryFormat: typeF === 'download' ? 'download' as const : typeF === 'course' ? 'course' as const : undefined,
      categoryId: categoryF || undefined,
      sort: serverSort,
      quality: lowQuality ? 'low' as const : undefined,
    };
  })();
  const filtersActive = !!(debouncedSearch || typeF || categoryF || lowQuality);
  const anyActive = filtersActive || statusTab !== 'all';
  const setStatusTab = (key: string) => { setPage(1); setSelectedKeys(new Set()); setRawStatus(key === 'all' ? '' : key); };
  const clearFilters = () => { setSearch(''); setDebouncedSearch(''); setPage(1); setRawType(''); setRawCategory(''); setRawQuality(''); };

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

  // Admin approved / removed a listing, an order changed stock, a sale started: the list updates quietly.
  const quietRef = useRef(false);
  useLiveRefresh(['catalog', 'orders', 'campaigns'], () => { quietRef.current = true; setRefreshKey(k => k + 1); });

  useEffect(() => {
    let cancelled = false;
    const quiet = quietRef.current;
    quietRef.current = false;
    if (!quiet) setLoading(true);
    apiGetStoreInventory(storeId, page, LIMIT, { q: debouncedSearch, ...apiFilters })
      .then(res => {
        if (cancelled) return;
        setError('');
        setProducts(res.data.products ?? []);
        // Matches for the current tab + filters; the store-wide numbers come from stats.
        setTotalProducts(res.data.pagination.totalProducts);
        setStoreTotal(res.data.stats?.totalProducts ?? 0);
        setStatusCounts(res.data.stats?.statusCounts ?? {});
      })
      .catch((err: unknown) => {
        if (!cancelled && !quiet) setError(err instanceof Error ? err.message : 'Failed to load products.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, page, refreshKey, debouncedSearch, statusTab, typeF, categoryF, serverSort, lowQuality]);

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

  const toast = useToast();
  const busyRef = useRef(false); // one duplicate/visibility call at a time (double-click guard)
  const handleDuplicate = async (p: InventoryProduct) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const r = await apiDuplicateProduct(p.productId);
      toast.success('Draft copy created. Finish it and publish when ready.');
      navigate(`/store/${storeId}/products/edit/${r.data.productId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not duplicate this product.');
    } finally { busyRef.current = false; }
  };
  const handleVisibility = async (p: InventoryProduct, active: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const r = await apiSetProductVisibility(p.productId, active);
      toast.success(r.message || (active ? 'Product activated.' : 'Product deactivated.'));
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not change this product.');
    } finally { busyRef.current = false; }
  };
  const viewOnStore = (p: InventoryProduct) => {
    if (p.slug) window.open(`/product/${p.slug}`, '_blank', 'noopener');
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

  const toggleRow = (id: string) => setSelectedKeys(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const priceText = (p: InventoryProduct) => p.price === 0 ? 'Free' : formatPrice(p.price, store?.baseCurrency);
  const stockText = (p: InventoryProduct) => {
    if (p.deliveryFormat === 'course') return courseSummaryText(p.courseSummary) || 'Online course';
    return typeof p.stock === 'number' ? `${p.stock} units` : p.stock;
  };

  // ── Inline price / stock (single-variant products only; everything else links to Edit) ──
  const singleVariant = (p: InventoryProduct) => p.deliveryFormat !== 'course' && p.variantCount === 1 && !!p.defaultVariantId;
  const patchRow = (id: string, patch: Partial<InventoryProduct>) => setProducts(list => list.map(x => x.productId === id ? { ...x, ...patch } : x));
  const savePrice = async (p: InventoryProduct, next: number) => {
    try {
      await apiBulkPrice({ ids: [p.productId], mode: 'set', value: next });
      patchRow(p.productId, { price: next });
      toast.success('Price updated.');
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not change the price.');
      throw err;
    }
  };
  const saveStock = async (p: InventoryProduct, next: number) => {
    try {
      const r = await apiBulkUpdateStock(storeId, [{ variantId: p.defaultVariantId as string, stock: next }]);
      if (r.data.skipped?.length) throw new Error(r.data.skipped[0].reason === 'unlimited_stock' ? 'This product has unlimited stock.' : 'Could not find this product.');
      patchRow(p.productId, { stock: next });
      toast.success('Stock updated.');
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not change the stock.');
      throw err;
    }
  };
  const priceCell = (p: InventoryProduct) => (
    <InlineEditCell
      kind="price" label="Price" value={p.price} currency={store?.baseCurrency}
      display={<span className="font-semibold text-charcoal whitespace-nowrap">{priceText(p)}</span>}
      editable={singleVariant(p)}
      lockedHint={p.deliveryFormat === 'course' ? 'Change the price in the course builder' : (p.variantCount ?? 0) > 1 ? `${p.variantCount} variants - change prices on the Edit page` : undefined}
      onLockedClick={() => goEdit(p)}
      onSave={n => savePrice(p, n)}
    />
  );
  const stockCell = (p: InventoryProduct) => (
    <InlineEditCell
      kind="stock" label="Stock" value={typeof p.stock === 'number' ? p.stock : 0}
      display={<span className="text-[13px] text-carbon">{stockText(p)}</span>}
      editable={p.type === 'physical' && typeof p.stock === 'number' && singleVariant(p)}
      lockedHint={p.deliveryFormat === 'course' ? undefined : p.type === 'physical' && (p.variantCount ?? 0) > 1 ? `${p.variantCount} variants - change stock in Inventory` : undefined}
      onLockedClick={p.type === 'physical' && (p.variantCount ?? 0) > 1 ? () => goEdit(p) : undefined}
      onSave={n => saveStock(p, n)}
    />
  );

  // ── Bulk Activate / Deactivate / Change price ──
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statusReport, setStatusReport] = useState<(BulkStatusResult & { active: boolean }) | null>(null);
  const [priceIds, setPriceIds] = useState<string[] | null>(null);
  const runBulkStatus = async (active: boolean) => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      const r = await apiBulkStatus(Array.from(selectedKeys).map(String), active);
      setStatusReport({ ...r.data, active });
      setSelectedKeys(new Set());
      setRefreshKey(k => k + 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not change these products.');
    } finally { setBulkBusy(false); }
  };
  const typeBadge = (p: InventoryProduct) => p.type === 'digital'
    ? <DeliveryFormatBadge format={p.deliveryFormat} />
    : <Badge color="orange">Physical</Badge>;
  const offerChip = (p: InventoryProduct) => {
    const ids = p.campaignIds ?? [];
    if (ids.length > 0) {
      const names = ids.map(id => campaignNameById.get(id) ?? 'Ended sale');
      return <Badge color="orange">Sale: {names[0]}{names.length > 1 ? ` +${names.length - 1}` : ''}</Badge>;
    }
    const pct = p.premiumOptOut ? 0 : (p.premiumDiscountPercent ?? storePremiumPct);
    return pct > 0 ? <Badge color="blue">Premium {pct}%</Badge> : null;
  };
  const statusCell = (p: InventoryProduct) => p.pausedByPlan ? (
    <span title="Hidden from buyers because your plan ended. Choose a plan and it goes live again automatically.">
      <Badge color="yellow">Paused - plan ended</Badge>
    </span>
  ) : p.status === 'pending_review' ? (
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
  ) : <StatusBadge status={p.status} />;
  const rowActions = (p: InventoryProduct, big = false) => {
    const hasPremium = !p.premiumOptOut && (p.premiumDiscountPercent ?? storePremiumPct) > 0;
    const hasSale = (p.campaignIds ?? []).length > 0;
    const isLive = p.status === 'active' || p.status === 'scheduled';
    const canActivate = p.status === 'inactive' && !p.pausedByPlan;
    const fix = p.status === 'rejected';
    return (
    <div className={big ? 'flex items-center justify-end gap-2' : 'flex items-center justify-center gap-1'}>
      <Button variant={fix ? 'primary' : big ? 'outline' : 'ghost'} size="xs" className={big ? 'min-h-[44px] min-w-[44px]' : ''} onClick={() => goEdit(p)} icon={fix ? <Wrench size={12} /> : <Pencil size={12} />}>{fix ? 'Fix now' : 'Edit'}</Button>
      <ActionMenu
        align="right"
        items={[
          ...(p.status === 'active' && p.slug ? [{ label: 'View on store', onClick: () => viewOnStore(p), icon: <Eye size={13} /> }] : []),
          { label: 'Product details', onClick: () => goDetail(p), icon: <Eye size={13} /> },
          ...(p.deliveryFormat === 'course' ? [
            { label: 'Edit / build course', onClick: () => navigate(`/store/${storeId}/products/${p.productId}/course`), icon: <Pencil size={13} /> },
            { label: 'Students & progress', onClick: () => navigate(`/store/${storeId}/products/${p.productId}/course/students`), icon: <Users size={13} /> },
          ] : [
            { label: 'Duplicate', onClick: () => handleDuplicate(p), icon: <Copy size={13} /> },
          ]),
          ...(isLive ? [{ label: 'Deactivate', onClick: () => handleVisibility(p, false), icon: <Power size={13} /> }] : []),
          ...(canActivate ? [{ label: 'Activate', onClick: () => handleVisibility(p, true), icon: <Power size={13} /> }] : []),
          ...(hasPremium
            ? [{ label: 'Remove from Premium offer', onClick: () => openOffer('premium_off', [p.productId]), icon: <Crown size={13} /> }]
            : [{ label: 'Add to Premium offer…', onClick: () => openOffer('premium_on', [p.productId]), icon: <Crown size={13} /> }]),
          ...(hasSale
            ? [{ label: 'Remove from platform sale…', onClick: () => openOffer('campaign_remove', [p.productId]), icon: <Flame size={13} /> }]
            : [{ label: 'Add to platform sale…', onClick: () => openOffer('campaign_add', [p.productId]), icon: <Flame size={13} /> }]),
          { label: 'Delete Product', onClick: () => { setDeleteError(''); setDeleteTarget(p); }, icon: <Trash2 size={13} />, danger: true },
        ]}
      />
    </div>
    );
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: TableColumn<InventoryProduct>[] = [
    {
      key: 'name', header: 'Product', sortable: true,
      render: p => (
        <div className="flex flex-col items-start gap-1 min-w-0">
          <ProductCell p={p} fluid />
          <span className="ms-[46px] flex flex-wrap items-center gap-1">{typeBadge(p)}<QualityBadge p={p} /></span>
        </div>
      ),
    },
    {
      key: 'price', header: 'Price', align: 'right', sortable: true,
      render: p => (
        <div className="flex flex-col items-end gap-1">
          {priceCell(p)}
          {offerChip(p)}
          <div className="xl:hidden mt-1"><Last30 p={p} /></div>
        </div>
      ),
    },
    {
      key: 'stock', header: 'Stock', align: 'right', sortable: true,
      render: p => stockCell(p),
    },
    {
      key: 'views30d', header: 'Last 30 days', align: 'right', hideBelowXl: true,
      render: p => <Last30 p={p} />,
    },
    {
      key: 'status', header: 'Status',
      render: p => statusCell(p),
    },
    {
      key: 'actions', header: '', align: 'center', width: '110px', sticky: true,
      render: p => rowActions(p),
    },
  ];

  const productCard = (p: InventoryProduct) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          className="size-4 mt-3 shrink-0 cursor-pointer accent-brand-orange"
          checked={selectedKeys.has(p.productId)}
          onChange={() => toggleRow(p.productId)}
          aria-label={`Select ${p.name}`}
        />
        <div className="min-w-0 flex-1"><ProductCell p={p} fluid /></div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[14px] font-bold text-charcoal">{priceCell(p)}</span>
          {offerChip(p)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {typeBadge(p)}
        <QualityBadge p={p} />
        <span className="text-[12px] text-slate">{stockCell(p)}</span>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-slate flex-wrap">
        <span>Views <b className="text-charcoal">{p.views30d == null ? '—' : p.views30d}</b></span>
        <span>Sales <b className="text-charcoal">{p.sales30d ?? 0}</b></span>
        {!p.conversionLocked && <span>Conv <b className="text-charcoal">{p.conversionPct == null ? '—' : `${p.conversionPct}%`}</b></span>}
        <span className="text-slate/80">last 30 days</span>
      </div>
      <div>{statusCell(p)}</div>
      {rowActions(p, true)}
    </div>
  );

  return (
    <>
      <StorePageHeader
        title="Products"
        subtitle={loading && !storeTotal ? 'Loading…' : anyActive
          ? `${totalProducts} of ${storeTotal} product${storeTotal !== 1 ? 's' : ''}`
          : `${storeTotal || totalProducts} product${(storeTotal || totalProducts) !== 1 ? 's' : ''}`}
        actions={<div className="flex items-center gap-2"><Button variant="outline" onClick={() => navigate(`/store/${storeId}/products/bulk`)} icon={<UploadCloud size={15} />} aria-label="Bulk upload"><span className="max-sm:sr-only">Bulk upload</span></Button><Button onClick={goAdd} icon={<Plus size={15} />}>Add<span className="max-sm:hidden"> one product</span><span className="sm:hidden"> product</span></Button></div>}
      />

      <div className={`px-4 md:px-8 py-6 flex flex-col gap-5 ${selectedKeys.size > 0 ? 'pb-28' : ''}`}>

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
              <div role="tablist" aria-label="Product status" className="basis-full order-last flex gap-1 overflow-x-auto [scrollbar-width:none] -mx-1 px-1">
                {STATUS_TABS.map(t => {
                  const n = t.counts.reduce((s, k) => s + (statusCounts[k] ?? 0), 0);
                  const on = statusTab === t.key;
                  return (
                    <button
                      key={t.key} type="button" role="tab" aria-selected={on}
                      onClick={() => setStatusTab(t.key)}
                      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold cursor-pointer ${on ? 'bg-carbon text-white border-carbon' : 'bg-white text-charcoal border-bone hover:bg-cream'}`}
                    >
                      {t.label} <span className={on ? 'opacity-80' : 'text-slate'}>{n}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or SKU…"
                  className="w-[180px] sm:w-[220px]"
                />
                <div className="hidden md:flex items-center gap-2">
                  <SortSelect value={serverSort ?? ''} onChange={v => { setPage(1); setRawSort(v); }} />
                  <button
                    type="button" aria-pressed={lowQuality}
                    onClick={() => { setPage(1); setRawQuality(lowQuality ? '' : 'low'); }}
                    className={`rounded-full border px-3 py-[6px] text-[12.5px] font-semibold cursor-pointer ${lowQuality ? 'bg-carbon text-white border-carbon' : 'bg-white text-charcoal border-bone hover:bg-cream'}`}
                  >Low quality (&lt;60)</button>
                  <TypeSelect value={typeF} onChange={v => { setPage(1); setRawType(v); }} />
                  <CategorySelect value={categoryF} options={categoryOptions} loading={catsLoading} error={catsError} onRetry={refetchCats} onChange={v => { setPage(1); setRawCategory(v); }} />
                </div>
                <Button variant="outline" size="xs" className="md:hidden" onClick={() => setFiltersOpen(true)} icon={<SlidersHorizontal size={12} />}>
                  Filters{typeF || categoryF || lowQuality || serverSort ? ` (${(typeF ? 1 : 0) + (categoryF ? 1 : 0) + (lowQuality ? 1 : 0) + (serverSort ? 1 : 0)})` : ''}
                </Button>
                {anyActive && (
                  <button type="button" className="font-semibold underline bg-transparent border-0 p-0 cursor-pointer text-brand-royal text-[12.5px]" onClick={() => { clearFilters(); setStatusTab('all'); }}>Clear filters</button>
                )}
                <Button variant="outline" size="xs" onClick={handleRetry} icon={<RefreshCw size={11} />}>Refresh</Button>
              </div>
            </div>

            <Table
              cardsBelow="md"
              compact
              renderCard={productCard}
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
                title: anyActive ? 'No products match' : 'No products yet',
                description: anyActive ? 'Try a different search, tab or filter.' : 'Add physical items, digital downloads, or services to start selling.',
                action: anyActive
                  ? { label: 'Clear search & filters', onClick: () => { clearFilters(); setStatusTab('all'); } }
                  : { label: 'Add Your First Product', onClick: goAdd, icon: <Plus size={15} /> },
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
          <div role="region" data-chat-avoid aria-label="Bulk actions" className="sticky bottom-3 z-20 rounded-xl border border-bone bg-white shadow-[0_6px_24px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-2 flex-wrap max-sm:max-h-[38vh] max-sm:overflow-y-auto [&>*]:shrink-0 [&>*]:whitespace-nowrap">
            <span className="text-[13px] font-semibold text-carbon me-1">{selectedKeys.size} selected</span>
            <Button variant="outline" size="xs" icon={<Power size={12} />} loading={bulkBusy} onClick={() => runBulkStatus(true)}>Activate</Button>
            <Button variant="outline" size="xs" icon={<Power size={12} />} loading={bulkBusy} onClick={() => runBulkStatus(false)}>Deactivate</Button>
            <Button variant="outline" size="xs" onClick={() => setPriceIds(Array.from(selectedKeys).map(String))}>Change price…</Button>
            <Button variant="outline" size="xs" icon={<Crown size={12} />} onClick={() => openOffer('premium_on', Array.from(selectedKeys).map(String))}>Add to Premium offer (%)</Button>
            <Button variant="outline" size="xs" onClick={() => openOffer('premium_off', Array.from(selectedKeys).map(String))}>Remove from Premium offer</Button>
            <Button variant="outline" size="xs" icon={<Flame size={12} />} onClick={() => openOffer('campaign_add', Array.from(selectedKeys).map(String))}>Add to platform sale…</Button>
            <Button variant="outline" size="xs" onClick={() => openOffer('campaign_remove', Array.from(selectedKeys).map(String))}>Remove from platform sale…</Button>
            <Button variant="ghost" size="xs" onClick={() => setSelectedKeys(new Set())}>Clear selection</Button>
            <Button variant="danger" size="xs" className="ms-auto" onClick={() => setConfirmBulkDelete(true)} icon={<Trash2 size={12} />}>Delete</Button>
          </div>
        )}
      </div>

      {filtersOpen && (
        <Modal title="Filters" mobileSheet onClose={() => setFiltersOpen(false)} footer={
          <>
            <Button variant="ghost" onClick={() => { setPage(1); setRawType(''); setRawCategory(''); setRawQuality(''); setRawSort(''); }}>Clear</Button>
            <Button onClick={() => setFiltersOpen(false)}>Done</Button>
          </>
        }>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-charcoal">Sort by
              <SortSelect value={serverSort ?? ''} onChange={v => { setPage(1); setRawSort(v); }} full />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-semibold text-charcoal min-h-[44px]">
              <input type="checkbox" className="size-4 accent-brand-orange" checked={lowQuality} onChange={e => { setPage(1); setRawQuality(e.target.checked ? 'low' : ''); }} />
              Low quality listings only (score under 60)
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-charcoal">Type
              <TypeSelect value={typeF} onChange={v => { setPage(1); setRawType(v); }} full />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-charcoal">Category
              <CategorySelect value={categoryF} options={categoryOptions} loading={catsLoading} error={catsError} onRetry={refetchCats} onChange={v => { setPage(1); setRawCategory(v); }} full />
            </label>
          </div>
        </Modal>
      )}

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

      {priceIds && (
        <BulkPriceModal
          ids={priceIds}
          currency={store?.baseCurrency}
          onClose={() => setPriceIds(null)}
          onApplied={msg => { setPriceIds(null); setSelectedKeys(new Set()); setRefreshKey(k => k + 1); toast.success(msg); }}
        />
      )}

      {statusReport && (
        <Modal title={statusReport.active ? 'Activate products' : 'Deactivate products'} onClose={() => setStatusReport(null)} footer={<Button onClick={() => setStatusReport(null)}>Done</Button>}>
          <p className="text-[13px] text-charcoal m-0">
            {statusReport.updated.length} product{statusReport.updated.length !== 1 ? 's' : ''} {statusReport.active ? 'activated' : 'deactivated'}
            {statusReport.skipped.length ? `, ${statusReport.skipped.length} skipped` : ''}.
            {statusReport.updated.some(u => u.status === 'pending_review') && ' Some were sent to Edudeen for review before they go live.'}
          </p>
          {statusReport.skipped.length > 0 && (
            <ul className="list-none p-0 mt-3 mb-0 flex flex-col gap-2 max-h-[260px] overflow-auto">
              {statusReport.skipped.map(s => (
                <li key={s.id} className="text-[12.5px] rounded-lg border border-bone bg-cream/60 px-3 py-2">
                  <span className="font-semibold text-charcoal">{s.name}</span>
                  <span className="block text-slate">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
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
            {(deleteTarget.allTimeSales ?? 0) > 0 && <span className="block mt-2">It has {deleteTarget.allTimeSales} past sale(s). Those orders keep their history, but buyers can no longer open this listing. Consider Deactivate instead.</span>}
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
