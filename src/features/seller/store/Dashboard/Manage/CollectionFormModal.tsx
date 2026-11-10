import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { ImageUpload } from '@/components/comman/ui';
import { EntityPickerModal } from '@/features/seller/dashboard/storemodule/builder/EntityPickerModal';
import { apiGetStoreInventory } from '@/api/services/product';
import { apiGetCategoryById } from '@/api/services/categories';
import { collectionNameError, cleanCollectionName, COLLECTION_NAME_MAX } from '@/utils/collectionName';
import {
  apiCreateCollection, apiUpdateCollection, apiUpdateCollectionProducts,
  type CollectionData, type CollectionSort,
} from '@/api/services/collections';
import { isoToPktWall, pktWallToIso } from '@/utils/pkTime';
import {
  SORT_LABELS, SmartRulesFields, CollectionPreviewPanel, emptySmart, smartRuleErrors, smartToPayload, useCollectionPreview,
  type SmartRulesForm,
} from './CollectionSmartParts';

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

/** Create/edit modal for a `Collection` — a named, curated product grouping
 *  (manual: hand-picked, ordered product list; automatic: a category/tag
 *  rule resolved fresh at read time). Manual product selection reuses
 *  `EntityPickerModal` (products mode); automatic's category rule reuses it
 *  too (categories mode, single-select). */
export function CollectionFormModal({ storeId, mainCategoryId, currency, collection, otherNames = [], onClose, onSaved }: {
  storeId: string;
  /** Store currency code, shown beside the price rules. */
  currency?: string;
  /** Names of the store's OTHER collections, for the instant duplicate check (the API checks again). */
  otherNames?: string[];
  mainCategoryId?: string;
  collection?: CollectionData | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!collection;
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [image, setImage] = useState(collection?.image ?? '');
  const [type, setType] = useState<'manual' | 'automatic'>(collection?.type ?? 'manual');
  const [status, setStatus] = useState<'active' | 'draft'>(collection?.status ?? 'active');
  const [productIds, setProductIds] = useState<string[]>(collection?.productIds ?? []);
  const [productLabels, setProductLabels] = useState<Record<string, string>>({});
  const [categoryId, setCategoryId] = useState<string | null>(collection?.rules?.categoryId ?? null);
  const [categoryLabel, setCategoryLabel] = useState<string>('');
  const [tags, setTags] = useState<string>((collection?.rules?.tags ?? []).join(', '));
  const [matchType, setMatchType] = useState<'all' | 'any'>(collection?.rules?.matchType ?? 'any');
  const [smart, setSmart] = useState<SmartRulesForm>(() => emptySmart(collection?.rules));
  const [sortBy, setSortBy] = useState<CollectionSort>((collection?.sortBy as CollectionSort | null) ?? 'manual');
  const [startAt, setStartAt] = useState(isoToPktWall(collection?.startAt));
  const [endAt, setEndAt] = useState(isoToPktWall(collection?.endAt));
  const [nameUr, setNameUr] = useState(collection?.nameUr ?? '');
  const [descriptionUr, setDescriptionUr] = useState(collection?.descriptionUr ?? '');
  const [zeroWarn, setZeroWarn] = useState(false);

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const toast = useToast();

  // Field rules (name limits mirror the API; manual needs products, automatic needs a rule).
  const nameErrorText = !cleanCollectionName(name) ? 'Name is required' : collectionNameError(name, otherNames);
  const productsErr = type === 'manual' && productIds.length === 0 ? 'Add at least one product, or switch to Automatic.' : '';
  const hasTags = tags.split(',').some(t => t.trim());
  const smartErrors = smartRuleErrors(smart);
  const smartHasErr = Object.keys(smartErrors).length > 0;
  const smartFilled = Object.values(smartToPayload(smart)).some(v => v !== null && v !== false);
  const ruleErr = type === 'automatic' && !categoryId && !hasTags && !smartFilled ? 'Choose a category, add a tag, or set a smart rule.' : '';
  const showName = (submitted || nameTouched) && !!nameErrorText;
  const startIso = pktWallToIso(startAt);
  const endIso = pktWallToIso(endAt);
  const scheduleErr = startIso && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime() ? 'End must be after the start' : '';

  const rulesPayload = type === 'automatic' ? {
    categoryId: categoryId ?? undefined,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    matchType,
    ...smartToPayload(smart),
  } : undefined;

  // Live preview: only asked while the form is valid (same API evaluator as the store tab + the count).
  const previewBody = useMemo(() => {
    if (smartHasErr || ruleErr) return null;
    if (type === 'manual') return productIds.length ? { type: 'manual' as const, productIds, sortBy } : null;
    return { type: 'automatic' as const, rules: rulesPayload, sortBy };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, productIds, sortBy, smartHasErr, ruleErr, categoryId, tags, matchType, smart]);
  const preview = useCollectionPreview(storeId, previewBody);
  useEffect(() => { setZeroWarn(false); }, [previewBody]);

  // Resolves id → name for the chip list: the first inventory page covers an
  // existing collection's saved `productIds` in the common case; anything
  // the (server-searchable) picker adds brings its own label via onConfirm.
  useEffect(() => {
    if (type !== 'manual') return;
    apiGetStoreInventory(storeId, 1, 100)
      .then(res => {
        const map: Record<string, string> = {};
        res.data.products.forEach(p => { map[p.productId] = p.name; });
        setProductLabels(prev => ({ ...map, ...prev }));
      })
      .catch(() => {});
  }, [storeId, type]);

  useEffect(() => {
    if (!categoryId) { setCategoryLabel(''); return; }
    apiGetCategoryById(categoryId).then(res => setCategoryLabel(res.data.category.name)).catch(() => {});
  }, [categoryId]);

  const handleSave = async () => {
    if (saving) return;
    setSubmitted(true);
    const firstBad = nameErrorText ? 'coll-name' : productsErr ? 'coll-products-btn' : ruleErr ? (mainCategoryId ? 'coll-category-btn' : 'coll-tags')
      : smartHasErr ? 'coll-smart' : scheduleErr ? 'coll-start' : '';
    if (firstBad) {
      // No request: jump to the first invalid field.
      requestAnimationFrame(() => {
        const el = document.getElementById(firstBad);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        (el as HTMLElement | null)?.focus({ preventScroll: true });
      });
      return;
    }
    // Warn once before saving a collection that would show nothing.
    if (status === 'active' && preview.data?.count === 0 && !zeroWarn) { setZeroWarn(true); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: cleanCollectionName(name),
        description: description.trim() || undefined,
        image: image || undefined,
        type,
        productIds: type === 'manual' ? productIds : undefined,
        rules: rulesPayload,
        sortBy,
        startAt: startIso,
        endAt: endIso,
        nameUr: nameUr.trim() || null,
        descriptionUr: descriptionUr.trim() || null,
      };
      let saved: CollectionData;
      if (isEdit) {
        const res = await apiUpdateCollection(storeId, collection!._id, { ...payload, status });
        saved = res.data;
        if (type === 'manual') {
          const prodRes = await apiUpdateCollectionProducts(storeId, saved._id, productIds);
          saved = prodRes.data;
        }
      } else {
        const res = await apiCreateCollection(storeId, payload);
        saved = res.data;
        if (status === 'draft') await apiUpdateCollection(storeId, saved._id, { status: 'draft' });
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to save collection.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        title={isEdit ? 'Edit Collection' : 'New Collection'}
        width={560}
        onClose={onClose}
        mobileSheet
        fullHeightMobile
        footer={
          <div className="flex items-center gap-2 w-full flex-wrap justify-end">
            {zeroWarn && <p role="alert" className="text-[12.5px] text-amber-700 me-auto basis-full sm:basis-auto">0 products match right now. Save anyway?</p>}
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={saving}>{zeroWarn ? 'Save anyway' : isEdit ? 'Save Changes' : 'Create Collection'}</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="coll-name" className="text-[12px] font-medium text-charcoal block mb-1.5">Name</label>
            <input id="coll-name" value={name} onChange={e => { setName(e.target.value); setError(''); }} onBlur={() => setNameTouched(true)} placeholder="e.g. New Arrivals" maxLength={COLLECTION_NAME_MAX + 10}
              aria-invalid={showName || undefined} aria-describedby={showName ? 'coll-name-err' : undefined}
              className={`w-full px-3 py-2 text-[13px] border rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40 ${showName ? 'border-error' : 'border-bone focus:border-brand-orange/50'}`} />
            {showName
              ? <p id="coll-name-err" role="alert" className="text-[12px] text-error mt-1">{nameErrorText}</p>
              : name && <p className="text-[12px] text-slate mt-1">/{slugify(name)}</p>}
          </div>

          <div>
            <label className="text-[12px] font-medium text-charcoal block mb-1.5">Description (optional)</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white resize-y focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
          </div>

          <div>
            <label className="text-[12px] font-medium text-charcoal block mb-1.5">Image (optional)</label>
            <ImageUpload value={image ? [image] : []} onChange={urls => setImage(urls[0] ?? '')} maxFiles={1} />
          </div>

          <div>
            <label className="text-[12px] font-medium text-charcoal block mb-1.5">Type</label>
            <div className="flex gap-2">
              {(['manual', 'automatic'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-[12.5px] font-semibold border cursor-pointer transition-colors ${type === t ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-charcoal hover:bg-cream'}`}>
                  {t === 'manual' ? 'Manual — hand-pick products' : 'Automatic — by rule'}
                </button>
              ))}
            </div>
          </div>

          {type === 'manual' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-medium text-charcoal">Products ({productIds.length})</label>
                <Button id="coll-products-btn" size="sm" variant="outline" onClick={() => setShowProductPicker(true)}
                  aria-invalid={(submitted && !!productsErr) || undefined} aria-describedby={submitted && productsErr ? 'coll-products-err' : undefined}>Add Products</Button>
              </div>
              {productIds.length === 0 ? (
                submitted && productsErr
                  ? <p id="coll-products-err" role="alert" className="text-[12px] text-error py-3 text-center border border-dashed border-error rounded-lg">{productsErr}</p>
                  : <p className="text-[12px] text-slate py-3 text-center border border-dashed border-bone rounded-lg">No products added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {productIds.map(id => (
                    <span key={id} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium bg-cream border border-bone text-charcoal">
                      {productLabels[id] ?? id}
                      <button aria-label="Close" type="button" onClick={() => setProductIds(prev => prev.filter(p => p !== id))} className="bg-transparent border-none cursor-pointer text-slate hover:text-error p-0 flex items-center">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[12px] font-medium text-charcoal block mb-1.5">Category (or add tags below)</label>
                {categoryId ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-2 text-[13px] border border-bone rounded-lg bg-cream text-charcoal truncate">{categoryLabel || categoryId}</span>
                    <Button size="sm" variant="outline" onClick={() => { setCategoryId(null); setCategoryLabel(''); }}>Clear</Button>
                  </div>
                ) : (
                  <Button id="coll-category-btn" size="sm" variant="outline" onClick={() => setShowCategoryPicker(true)} disabled={!mainCategoryId}
                    aria-invalid={(submitted && !!ruleErr) || undefined}>Choose Category</Button>
                )}
              </div>
              <div>
                <label htmlFor="coll-tags" className="text-[12px] font-medium text-charcoal block mb-1.5">Tags (comma-separated)</label>
                <input id="coll-tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. ramadan, grade-3, qaida"
                  aria-invalid={(submitted && !!ruleErr) || undefined} aria-describedby={submitted && ruleErr ? 'coll-rule-err' : undefined}
                  className={`w-full px-3 py-2 text-[13px] border rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40 ${submitted && ruleErr ? 'border-error' : 'border-bone focus:border-brand-orange/50'}`} />
                {submitted && ruleErr && <p id="coll-rule-err" role="alert" className="text-[12px] text-error mt-1">{ruleErr}</p>}
              </div>
              <div>
                <label className="text-[12px] font-medium text-charcoal block mb-1.5">Match</label>
                <div className="flex gap-2">
                  {(['any', 'all'] as const).map(m => (
                    <button key={m} type="button" onClick={() => setMatchType(m)}
                      className={`flex-1 px-3 py-2 rounded-lg text-[12.5px] font-semibold border cursor-pointer transition-colors ${matchType === m ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-charcoal hover:bg-cream'}`}>
                      Match {m === 'any' ? 'ANY' : 'ALL'} of the above
                    </button>
                  ))}
                </div>
              </div>
              <div id="coll-smart" tabIndex={-1}>
                <SmartRulesFields value={smart} onChange={patch => setSmart(prev => ({ ...prev, ...patch }))} errors={smartErrors} currency={currency} />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="coll-sort" className="text-[12px] font-medium text-charcoal block mb-1.5">Order inside the collection</label>
            <select id="coll-sort" value={sortBy} onChange={e => setSortBy(e.target.value as CollectionSort)}
              className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40">
              {(Object.keys(SORT_LABELS) as CollectionSort[]).map(k => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
            </select>
          </div>

          <div>
            <p className="text-[12px] font-medium text-charcoal mb-1.5">Show on my store (optional schedule, Pakistan time)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor="coll-start" className="text-[12px] text-slate block mb-1">From</label>
                <input id="coll-start" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40" />
              </div>
              <div className="min-w-0">
                <label htmlFor="coll-end" className="text-[12px] text-slate block mb-1">Until</label>
                <input id="coll-end" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} aria-invalid={!!scheduleErr || undefined}
                  className={`w-full min-w-0 px-3 py-2 text-[13px] border rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40 ${scheduleErr ? 'border-error' : 'border-bone'}`} />
              </div>
            </div>
            {scheduleErr && <p role="alert" className="text-[12px] text-error mt-1">{scheduleErr}</p>}
            <p className="text-[12px] text-slate mt-1">Outside these dates the collection is hidden from your store. Leave both empty to always show it.</p>
          </div>

          <details className="rounded-lg border border-bone px-3 py-2" open={!!(nameUr || descriptionUr)}>
            <summary className="text-[12.5px] font-semibold text-charcoal cursor-pointer">Urdu name &amp; description (optional)</summary>
            <p className="text-[12px] text-slate mt-1.5">Shown to buyers who browse in Urdu. Otherwise the English text is used.</p>
            <input aria-label="Urdu name" dir="rtl" lang="ur" value={nameUr} maxLength={100} onChange={e => setNameUr(e.target.value)} placeholder="نام"
              className="mt-2 w-full min-w-0 px-3 py-2 text-[14px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40" />
            <textarea aria-label="Urdu description" dir="rtl" lang="ur" rows={2} value={descriptionUr} maxLength={500} onChange={e => setDescriptionUr(e.target.value)} placeholder="تفصیل"
              className="mt-2 w-full min-w-0 px-3 py-2 text-[14px] border border-bone rounded-lg outline-none text-charcoal bg-white resize-y focus:ring-2 focus:ring-brand-orange/40" />
          </details>

          <CollectionPreviewPanel preview={preview} />

          <div>
            <label className="text-[12px] font-medium text-charcoal block mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['active', 'draft'] as const).map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-[12.5px] font-semibold border cursor-pointer capitalize transition-colors ${status === s ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange' : 'border-bone bg-white text-charcoal hover:bg-cream'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
        </div>
      </Modal>

      {showProductPicker && (
        <EntityPickerModal
          open={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          mode="products"
          storeId={storeId}
          multiple
          initialSelectedIds={productIds}
          onConfirm={(ids, labels) => { setProductLabels(prev => ({ ...prev, ...labels })); setProductIds(ids); setShowProductPicker(false); }}
        />
      )}
      {showCategoryPicker && (
        <EntityPickerModal
          open={showCategoryPicker}
          onClose={() => setShowCategoryPicker(false)}
          mode="categories"
          storeId={storeId}
          mainCategoryId={mainCategoryId}
          multiple={false}
          initialSelectedIds={categoryId ? [categoryId] : []}
          onConfirm={(ids) => { setCategoryId(ids[0] ?? null); setShowCategoryPicker(false); }}
        />
      )}
    </>
  );
}
