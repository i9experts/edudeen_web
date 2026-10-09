import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { ImageUpload } from '@/components/comman/ui';
import { EntityPickerModal } from '@/features/seller/dashboard/storemodule/builder/EntityPickerModal';
import { apiGetStoreInventory } from '@/api/services/product';
import { apiGetCategoryById } from '@/api/services/categories';
import {
  apiCreateCollection, apiUpdateCollection, apiUpdateCollectionProducts,
  type CollectionData,
} from '@/api/services/collections';

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

/** Create/edit modal for a `Collection` — a named, curated product grouping
 *  (manual: hand-picked, ordered product list; automatic: a category/tag
 *  rule resolved fresh at read time). Manual product selection reuses
 *  `EntityPickerModal` (products mode); automatic's category rule reuses it
 *  too (categories mode, single-select). */
export function CollectionFormModal({ storeId, mainCategoryId, collection, onClose, onSaved }: {
  storeId: string;
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

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    if (!name.trim()) { setError('Name is required.'); return; }
    if (type === 'manual' && productIds.length === 0) { setError('Add at least one product, or switch to Automatic.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        image: image || undefined,
        type,
        productIds: type === 'manual' ? productIds : undefined,
        rules: type === 'automatic' ? {
          categoryId: categoryId ?? undefined,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          matchType,
        } : undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to save collection.');
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
        footer={
          <>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{isEdit ? 'Save Changes' : 'Create Collection'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-medium text-charcoal block mb-1.5">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Arrivals"
              className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
            {name && <p className="text-[12px] text-slate mt-1">/{slugify(name)}</p>}
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
                <Button size="sm" variant="outline" onClick={() => setShowProductPicker(true)}>Add Products</Button>
              </div>
              {productIds.length === 0 ? (
                <p className="text-[12px] text-slate py-3 text-center border border-dashed border-bone rounded-lg">No products added yet.</p>
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
                <label className="text-[12px] font-medium text-charcoal block mb-1.5">Category (optional)</label>
                {categoryId ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-2 text-[13px] border border-bone rounded-lg bg-cream text-charcoal truncate">{categoryLabel || categoryId}</span>
                    <Button size="sm" variant="outline" onClick={() => { setCategoryId(null); setCategoryLabel(''); }}>Clear</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setShowCategoryPicker(true)} disabled={!mainCategoryId}>Choose Category</Button>
                )}
              </div>
              <div>
                <label className="text-[12px] font-medium text-charcoal block mb-1.5">Tags (comma-separated, optional)</label>
                <input value={tags} onChange={e => setTags(e.target.value)} placeholder="sale, summer"
                  className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
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
            </div>
          )}

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

          {error && <p className="text-[12px] text-error">{error}</p>}
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
