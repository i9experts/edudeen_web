import { useState, useEffect, useMemo, useContext } from 'react';
import { Search, Check, Package, FolderTree, Layers } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui';
import { apiGetCategoryTree } from '@/api/services/categories';
import { apiListCollections } from '@/api/services/collections';
import { StoreWorkspaceCtx } from '@/components/layouts/StoreWorkspaceContext';
import { useInventorySearch } from '@/hooks/seller/useInventorySearch';
import { formatMoney } from '@/utils/currency';

export type EntityPickerMode = 'products' | 'categories' | 'collections';

interface PickerRow {
  id:    string;
  label: string;
  sub?:  string;
  image?: string | null;
}

const MODE_LABEL: Record<EntityPickerMode, string> = {
  products:    'Products',
  categories:  'Categories',
  collections: 'Collections',
};
const MODE_ICON: Record<EntityPickerMode, typeof Package> = {
  products: Package, categories: FolderTree, collections: Layers,
};
// Products: the first page loads up-front, then typing searches the whole
// catalog server-side (inventory ?q= name/SKU). Categories/collections are
// small per-store lists and stay filtered client-side.
const PRODUCTS_FETCH_LIMIT = 100;

/**
 * One reusable searchable picker for Products / Categories / Collections —
 * replaces every raw-ID-paste input across the Store Builder (featured
 * products, product catalog filters, nav-link targets, collection product
 * pickers). Products/Collections are always scoped to `storeId`; Categories
 * are scoped to the store's own subcategory tree via `mainCategoryId`
 * (the store's single root category — categories never nest beyond one
 * level in this app, so "the store's own categories" always means that
 * root's direct children).
 */
export function EntityPickerModal({
  open, onClose, mode, storeId, mainCategoryId, multiple, initialSelectedIds, onConfirm, title,
}: {
  open: boolean;
  onClose: () => void;
  mode: EntityPickerMode;
  storeId: string;
  /** Required for `mode === 'categories'` — the store's root category id. */
  mainCategoryId?: string;
  multiple: boolean;
  initialSelectedIds: string[];
  /** `labels` = id → name for every row seen in this session (incl. search results), for chip lists. */
  onConfirm: (ids: string[], labels: Record<string, string>) => void;
  title?: string;
}) {
  const [rows, setRows] = useState<PickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);
  // Optional: the picker may render outside a store workspace.
  const storeCurrency = useContext(StoreWorkspaceCtx)?.store?.baseCurrency;

  const isProducts = mode === 'products';
  const inventory = useInventorySearch(storeId, { limit: PRODUCTS_FETCH_LIMIT, enabled: open && isProducts });
  const { setQuery: setInventoryQuery } = inventory;
  useEffect(() => { if (isProducts) setInventoryQuery(query); }, [isProducts, query, setInventoryQuery]);
  const productRows = useMemo<PickerRow[]>(
    () => inventory.products.map(p => ({ id: p.productId, label: p.name, sub: `${formatMoney(p.price, storeCurrency)}`, image: p.image })),
    [inventory.products, storeCurrency],
  );

  useEffect(() => {
    if (!open) return;
    setSelected(initialSelectedIds);
    setQuery('');
    setLoading(true);
    setError('');

    if (mode === 'products') {
      // Loaded by useInventorySearch above.
      setLoading(false);
    } else if (mode === 'categories') {
      if (!mainCategoryId) { setRows([]); setLoading(false); return; }
      apiGetCategoryTree(mainCategoryId)
        .then(res => setRows((res.data.children ?? []).map(c => ({ id: c._id, label: c.name, sub: c.productCount != null ? `${c.productCount} products` : undefined, image: c.image }))))
        .catch(() => setError('Failed to load categories.'))
        .finally(() => setLoading(false));
    } else {
      apiListCollections(storeId)
        .then(res => setRows(res.data.map(c => ({ id: c._id, label: c.name, sub: c.type === 'automatic' ? 'Automatic' : `${c.productIds.length} products`, image: c.image }))))
        .catch(() => setError('Failed to load collections.'))
        .finally(() => setLoading(false));
    }
  }, [open, mode, storeId, mainCategoryId, JSON.stringify(initialSelectedIds)]);

  const filtered = useMemo(() => {
    if (isProducts) return productRows; // already filtered server-side
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.label.toLowerCase().includes(q));
  }, [isProducts, productRows, rows, query]);
  const [seenLabels, setSeenLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    if (filtered.length) setSeenLabels(prev => ({ ...prev, ...Object.fromEntries(filtered.map(r => [r.id, r.label])) }));
  }, [filtered]);
  const listLoading = isProducts ? inventory.loading && productRows.length === 0 : loading;
  const listError   = isProducts ? inventory.error : error;
  const hasAny      = isProducts ? (productRows.length > 0 || !!query.trim()) : rows.length > 0;

  const toggle = (id: string) => {
    if (multiple) {
      setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setSelected([id]);
    }
  };

  if (!open) return null;

  const Icon = MODE_ICON[mode];

  return (
    <Modal
      title={title ?? `Select ${MODE_LABEL[mode]}`}
      width={520}
      onClose={onClose}
      mobileSheet
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(selected, seenLabels)} disabled={selected.length === 0}>
            {multiple ? `Add ${selected.length ? `(${selected.length})` : ''}` : 'Select'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${MODE_LABEL[mode].toLowerCase()}…`}
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white transition-colors duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto flex flex-col gap-1 -mx-1 px-1">
          {listLoading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={44} rounded="8px" />)
          ) : listError ? (
            <p className="text-[12.5px] text-error py-4 text-center">{listError}</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate">
              <Icon size={22} />
              <p className="text-[12.5px]">{isProducts && inventory.loading ? 'Searching…' : !hasAny ? `No ${MODE_LABEL[mode].toLowerCase()} yet.` : 'No matches.'}</p>
            </div>
          ) : (
            filtered.map(row => {
              const isSelected = selected.includes(row.id);
              return (
                <button
                  key={row.id} type="button" onClick={() => toggle(row.id)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left border cursor-pointer transition-colors ${isSelected ? 'border-brand-orange bg-brand-pale-orange' : 'border-transparent hover:bg-cream'}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-cream border border-bone shrink-0 overflow-hidden flex items-center justify-center">
                    {row.image ? <img src={row.image} alt="" className="w-full h-full object-cover" /> : <Icon size={15} className="text-slate" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-charcoal truncate">{row.label}</p>
                    {row.sub && <p className="text-[12px] text-slate truncate">{row.sub}</p>}
                  </div>
                  {isSelected && <Check size={16} className="text-brand-orange shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
