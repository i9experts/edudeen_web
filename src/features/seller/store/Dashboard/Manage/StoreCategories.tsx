import { useState } from 'react';
import { FolderTree, Tag, Plus } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { useStoreSubcategories } from '@/hooks/store/useStoreSubcategories';
import { apiAddCategory } from '@/api/services/categories';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox, ImageUpload } from '@/components/comman/ui';

// A store's main category is fixed at creation (assertValidRootCategory on
// the backend) — sellers can never change it or see other main categories
// here. The only action available is adding subcategories under it.
function AddSubcategoryModal({ mainCategoryId, onClose, onCreated }: {
  mainCategoryId: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  async function submit() {
    if (!name.trim()) { setError('Name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiAddCategory({ name: name.trim(), parentId: mainCategoryId, description: description.trim() || undefined, image: image.trim() || undefined });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subcategory.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add Subcategory"
      width={460}
      onClose={onClose}
      mobileSheet
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[12px] font-medium text-charcoal block mb-1.5">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ceramics"
            className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white transition-colors duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
        </div>
        <div>
          <label className="text-[12px] font-medium text-charcoal block mb-1.5">Description (optional)</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white resize-y transition-colors duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50" />
        </div>
        <div>
          <label className="text-[12px] font-medium text-charcoal block mb-1.5">Image (optional)</label>
          <ImageUpload value={image ? [image] : []} onChange={urls => setImage(urls[0] ?? '')} maxFiles={1} />
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export default function StoreCategories() {
  const { store } = useStoreWorkspace();
  const { mainCategory, subcategories, loading, refetch } = useStoreSubcategories(store?.categoryId);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <StorePageHeader
        title="Categories"
        subtitle="Your store's main category and its subcategories."
      />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5 max-w-[640px]">

        {/* Main category */}
        <div className="bg-white border border-bone rounded-[10px] px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-pale-orange flex items-center justify-center shrink-0">
            <FolderTree size={19} style={{ color: '#D97757' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-0.5">Main Category</p>
            {!store ? (
              <div className="animate-pulse w-32 h-4 rounded bg-bone" />
            ) : (
              <p className="text-[15px] font-bold text-carbon truncate">{mainCategory?.name ?? '—'}</p>
            )}
          </div>
        </div>
        <p className="text-[12px] text-slate -mt-3">
          Set once when your store was created. To change it, contact Edudeen support.
        </p>

        {/* Subcategories */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-charcoal">Subcategories</p>
              <p className="text-[11px] text-slate mt-0.5">Used to tag your products more precisely.</p>
            </div>
            <Button icon={<Plus size={13} />} size="sm" onClick={() => setAdding(true)} disabled={!store?.categoryId} className="shrink-0">
              Add Subcategory
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-5 py-3 border-b border-[#f0eee6] last:border-b-0">
                  <SkeletonBox width={13} height={13} rounded="3px" />
                  <SkeletonBox height={13} width={120 + (i % 3) * 30} rounded="4px" />
                </div>
              ))}
            </div>
          ) : subcategories.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-slate">No subcategories yet.</p>
          ) : (
            <div className="flex flex-col">
              {subcategories.map(sub => (
                <div key={sub._id} className="flex items-center gap-2.5 px-5 py-3 border-b border-[#f0eee6] last:border-b-0 transition-colors duration-150 hover:bg-cream">
                  <Tag size={13} className="text-slate shrink-0" />
                  <span className="text-[13px] font-medium text-carbon flex-1 truncate">{sub.name}</span>
                  {sub.description && <span className="hidden sm:inline text-[11px] text-slate truncate max-w-[220px]">{sub.description}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {adding && store?.categoryId && (
        <AddSubcategoryModal
          mainCategoryId={store.categoryId}
          onClose={() => setAdding(false)}
          onCreated={() => { setAdding(false); refetch(); }}
        />
      )}
    </>
  );
}
