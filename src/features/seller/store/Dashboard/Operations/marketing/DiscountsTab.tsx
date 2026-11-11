import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox } from '@/components/comman/ui';
import { currencySymbol } from '@/utils/currency';
import { apiCreateDiscount, apiGetDiscounts, apiUpdateDiscount, apiDeleteDiscount, type AutomaticDiscount, type DiscountType as AutoDiscountType, type DiscountTarget } from '@/api/services/discounts';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { INPUT_CLS } from './marketingShared';
import { useMarketingProductSearch } from './useMarketingProductSearch';
import { PromotionStatsRow } from './PromotionStatsContext';

export function DiscountsTab() {
  const { store, storeId } = useStoreWorkspace();
  const { productSearch, inventory, productNames, productSearchInput, productSearchEmpty } = useMarketingProductSearch(storeId);
  const emptyDiscountForm = {
    name: '', discountType: 'percentage' as AutoDiscountType, value: '',
    target: 'store' as DiscountTarget, categoryIds: [] as string[], productIds: [] as string[],
    minOrderAmount: '', startsAt: '', endsAt: '',
  };
  const [discounts, setDiscounts] = useState<AutomaticDiscount[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [discountsError, setDiscountsError] = useState('');
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountBusyId, setDiscountBusyId] = useState<string | null>(null);


  useEffect(() => {
    if (!storeId) return;
    setDiscountsLoading(true);
    setDiscountsError('');
    // Products for the "specific products" target come from productSearch above.
    Promise.all([apiGetDiscounts(storeId), apiGetCategoryTree()])
      .then(([discRes, catRes]) => {
        setDiscounts(discRes.data ?? []);
        setCategoryTree(catRes.data ?? []);
      })
      .catch(err => setDiscountsError(err instanceof Error ? err.message : 'Failed to load discounts.'))
      .finally(() => setDiscountsLoading(false));
  }, [storeId]);

  function flattenCategories(nodes: CategoryNode[], depth = 0): { _id: string; name: string; depth: number }[] {
    return nodes.flatMap(n => [{ _id: n._id, name: n.name, depth }, ...flattenCategories(n.children ?? [], depth + 1)]);
  }
  const flatCategories = flattenCategories(categoryTree);

  async function handleCreateDiscount() {
    if (!discountForm.name || !discountForm.value) return;
    if (discountForm.target === 'category' && discountForm.categoryIds.length === 0) return;
    if (discountForm.target === 'products' && discountForm.productIds.length === 0) return;
    setDiscountSaving(true);
    setDiscountsError('');
    try {
      const res = await apiCreateDiscount(storeId, {
        name: discountForm.name,
        discountType: discountForm.discountType,
        discountValue: Number(discountForm.value),
        target: discountForm.target,
        categoryIds: discountForm.target === 'category' ? discountForm.categoryIds : undefined,
        productIds: discountForm.target === 'products' ? discountForm.productIds : undefined,
        minOrderAmount: discountForm.minOrderAmount ? Number(discountForm.minOrderAmount) : undefined,
        startsAt: discountForm.startsAt || undefined,
        endsAt: discountForm.endsAt || undefined,
      });
      setDiscounts(prev => [res.data, ...prev]);
      setDiscountForm(emptyDiscountForm);
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : 'Failed to create discount.');
    } finally {
      setDiscountSaving(false);
    }
  }

  async function toggleDiscount(d: AutomaticDiscount) {
    setDiscountBusyId(d._id);
    try {
      const res = await apiUpdateDiscount(storeId, d._id, { isActive: !d.isActive });
      setDiscounts(prev => prev.map(x => x._id === d._id ? res.data : x));
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : 'Failed to update discount.');
    } finally {
      setDiscountBusyId(null);
    }
  }

  async function removeDiscount(d: AutomaticDiscount) {
    setDiscountBusyId(d._id);
    try {
      await apiDeleteDiscount(storeId, d._id);
      setDiscounts(prev => prev.filter(x => x._id !== d._id));
    } catch (err) {
      setDiscountsError(err instanceof Error ? err.message : 'Failed to delete discount.');
    } finally {
      setDiscountBusyId(null);
    }
  }

  return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[15px] font-bold text-carbon">Automatic Discounts</p>
          <p className="text-xs text-slate">No code needed — these apply automatically at checkout to whichever items they target. Only the single best-value discount applies per order.</p>
        </div>
        {discountsError && <p className="text-xs text-error">{discountsError}</p>}

        {discountsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} width="100%" height={110} rounded="10px" />)}
          </div>
        ) : discounts.length === 0 ? (
          <EmptyState icon={<Percent size={28} className="text-brand-orange opacity-55" />} title="No automatic discounts yet" description="Create one using the form below." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {discounts.map(d => (
              <div key={d._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-bold text-carbon">{d.name}</p>
                  <span className="px-2.5 py-[3px] rounded-[5px] text-[12px] font-semibold" style={{ background: d.isActive ? '#E3F4EA' : '#F0EEE6', color: d.isActive ? '#1E7A3C' : '#5A5852' }}>
                    {d.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-brand-deep-orange mb-1">
                  {d.discountType === 'percentage' ? `${d.discountValue}% off` : `${currencySymbol(d.currency ?? store?.baseCurrency)}${d.discountValue} off`}
                </p>
                <p className="text-xs text-slate mb-3 capitalize">
                  {d.target === 'store' ? 'Entire store' : d.target === 'category' ? `${d.categoryIds.length} categor${d.categoryIds.length === 1 ? 'y' : 'ies'}` : `${d.productIds.length} product${d.productIds.length === 1 ? '' : 's'}`}
                  {d.endsAt && ` · ends ${new Date(d.endsAt).toLocaleDateString()}`}
                </p>
                <PromotionStatsRow kind="discount" id={d._id} />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => toggleDiscount(d)} disabled={discountBusyId === d._id} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer hover:bg-cream disabled:opacity-50">{d.isActive ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => removeDiscount(d)} disabled={discountBusyId === d._id} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-error cursor-pointer hover:bg-error hover:text-white hover:border-error disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
          <p className="text-sm font-bold text-carbon mb-4">Create Automatic Discount</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-3.5">
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Name</label>
              <input value={discountForm.name} onChange={e => setDiscountForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Summer Sale" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Discount Type</label>
              <select value={discountForm.discountType} onChange={e => setDiscountForm(f => ({ ...f, discountType: e.target.value as AutoDiscountType }))} className={`${INPUT_CLS} cursor-pointer`}>
                <option value="percentage">Percentage Off</option>
                <option value="fixed">Fixed Amount Off</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Value</label>
              <input value={discountForm.value} onChange={e => setDiscountForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 15" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Applies To</label>
              <select value={discountForm.target} onChange={e => setDiscountForm(f => ({ ...f, target: e.target.value as DiscountTarget, categoryIds: [], productIds: [] }))} className={`${INPUT_CLS} cursor-pointer`}>
                <option value="store">Entire Store</option>
                <option value="category">Specific Categories</option>
                <option value="products">Specific Products</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Minimum Order ({currencySymbol(store?.baseCurrency)})</label>
              <input value={discountForm.minOrderAmount} onChange={e => setDiscountForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="Optional" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Starts</label>
              <input type="date" value={discountForm.startsAt} onChange={e => setDiscountForm(f => ({ ...f, startsAt: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Ends</label>
              <input type="date" value={discountForm.endsAt} onChange={e => setDiscountForm(f => ({ ...f, endsAt: e.target.value }))} className={INPUT_CLS} />
            </div>
          </div>

          {discountForm.target === 'category' && (
            <div className="mb-3.5">
              <label className="text-xs font-medium text-graphite mb-[5px] block">Categories</label>
              <div className="max-h-40 overflow-y-auto border border-bone rounded-lg p-2.5 flex flex-col gap-1.5">
                {flatCategories.map(c => (
                  <label key={c._id} className="flex items-center gap-2 text-xs text-graphite cursor-pointer" style={{ paddingLeft: c.depth * 14 }}>
                    <input
                      type="checkbox"
                      checked={discountForm.categoryIds.includes(c._id)}
                      onChange={e => setDiscountForm(f => ({ ...f, categoryIds: e.target.checked ? [...f.categoryIds, c._id] : f.categoryIds.filter(id => id !== c._id) }))}
                      className="accent-brand-orange"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {discountForm.target === 'products' && (
            <div className="mb-3.5">
              <label className="text-xs font-medium text-graphite mb-[5px] block">Products</label>
              {productSearchInput}
              {discountForm.productIds.length > 0 && (
                <p className="text-[12px] text-slate mb-1.5 truncate">
                  Selected: {discountForm.productIds.map(id => productNames[id] ?? id).join(', ')}
                </p>
              )}
              <div className="max-h-40 overflow-y-auto border border-bone rounded-lg p-2.5 flex flex-col gap-1.5">
                {productSearch.loading && inventory.length === 0 && <p className="text-xs text-slate">Loading products…</p>}
                {productSearchEmpty}
                {inventory.map(p => (
                  <label key={p.productId} className="flex items-center gap-2 text-xs text-graphite cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discountForm.productIds.includes(p.productId)}
                      onChange={e => setDiscountForm(f => ({ ...f, productIds: e.target.checked ? [...f.productIds, p.productId] : f.productIds.filter(id => id !== p.productId) }))}
                      className="accent-brand-orange"
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCreateDiscount}
            disabled={discountSaving || !discountForm.name || !discountForm.value}
            className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer hover:bg-brand-deep-orange disabled:opacity-50"
          >
            {discountSaving ? 'Creating…' : 'Create Discount'}
          </button>
        </div>
      </div>
  );
}
