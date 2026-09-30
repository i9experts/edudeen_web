import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { ImageUpload } from '@/components/comman/ui';
import { apiAddCategory, type Category } from '@/api/services/categories';

const selCls = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white outline-none cursor-pointer disabled:opacity-60';

interface Props {
  mainCategoryName: string;
  mainCategoryId:   string;
  subcategories:    Category[];
  loading:          boolean;
  value:            string;
  onChange:         (id: string) => void;
  onCreated:        (newId: string) => void;
  refetch:          () => void;
}

// Category always comes from the store's own main category — sellers never
// pick or see any other main category here (server: store.categoryId is
// fixed at store creation and drives every product's categoryId).
export function SubcategoryField({ mainCategoryName, mainCategoryId, subcategories, loading, value, onChange, onCreated, refetch }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-[12px] font-semibold text-graphite block mb-1.5">Category</label>
        <div className="px-3 py-2 text-[13px] rounded-lg bg-cream border border-bone text-charcoal">
          {mainCategoryName || '—'}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-graphite">Subcategory</label>
          <button type="button" onClick={() => setModalOpen(true)} disabled={!mainCategoryId}
            className="text-[11px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus size={11} /> Add Subcategory
          </button>
        </div>
        <select value={value} onChange={e => onChange(e.target.value)} disabled={loading} className={selCls}>
          <option value="">{loading ? 'Loading…' : 'No subcategory'}</option>
          {subcategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
      </div>

      {modalOpen && (
        <AddSubcategoryModal
          mainCategoryId={mainCategoryId}
          onClose={() => setModalOpen(false)}
          onCreated={id => { setModalOpen(false); refetch(); onCreated(id); }}
        />
      )}
    </div>
  );
}

function AddSubcategoryModal({ mainCategoryId, onClose, onCreated }: {
  mainCategoryId: string; onClose: () => void; onCreated: (id: string) => void;
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
      const res = await apiAddCategory({ name: name.trim(), parentId: mainCategoryId, description: description.trim() || undefined, image: image.trim() || undefined });
      onCreated(res.data._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subcategory.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add Subcategory"
      width={440}
      onClose={onClose}
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
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Workbooks"
            className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white" />
        </div>
        <div>
          <label className="text-[12px] font-medium text-charcoal block mb-1.5">Description (optional)</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white resize-y" />
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
