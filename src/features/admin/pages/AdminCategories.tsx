import { useEffect, useState } from 'react';
import { Plus, ChevronRight, FolderTree, Tag, ImagePlus, Loader2, ListFilter } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { apiGetCategoryTree, apiAddCategory, type CategoryNode } from '@/api/services/categories';
import { AttributeManagerModal } from './AttributeManagerModal';
import { useUpload } from '@/hooks/upload/useUpload';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { AdminStudioHeader } from '@/features/admin/components/studio';

// ── Add Category modal ───────────────────────────────────────────────────────
// Admins can create either a main category (no parent) or a subcategory under
// an existing main category — never deeper than one level (server-enforced).
function AddCategoryModal({ mainCategories, onClose, onSaved }: {
  mainCategories: CategoryNode[]; onClose: () => void; onSaved: () => void;
}) {
  const [parentId,    setParentId]    = useState('');
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [image,       setImage]       = useState('');
  const [preview,     setPreview]     = useState('');
  const [sortOrder,   setSortOrder]   = useState('0');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const { upload: uploadImage, uploading: imageUploading } = useUpload('public');

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadImage(file)
      .then(data => setImage(data.url))
      .catch(() => setPreview(''));
  };

  async function submit() {
    if (!name.trim()) { setError('Category name is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await apiAddCategory({
        name: name.trim(),
        parentId: parentId || undefined,
        description: description.trim() || undefined,
        image: image.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet
      title="Add Category"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Create Category</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label="Parent Category" value={parentId} onChange={e => setParentId(e.target.value)}>
          <option value="">None — create as a main category</option>
          {mainCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
        <Input label="Name" placeholder="e.g. Electronics" value={name} onChange={e => setName(e.target.value)} />
        <Textarea label="Description (optional)" rows={3} placeholder="Describe this category…" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-[6px]">Image (optional)</label>
            <div className="flex items-center gap-3">
              <label className={clsx(
                'size-[52px] rounded-lg bg-cream border-2 border-dashed border-bone flex items-center justify-center shrink-0 overflow-hidden transition-colors',
                imageUploading ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-brand-orange',
              )}>
                {imageUploading
                  ? <Loader2 size={18} className="text-brand-orange animate-spin" />
                  : preview || image
                    ? <img loading="lazy" decoding="async" src={preview || image} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus size={18} className="text-slate" />}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageFile} disabled={imageUploading} />
              </label>
              <p className="text-[11px] text-slate leading-[1.4]">
                {imageUploading ? 'Uploading…' : image ? 'Image uploaded — click to replace.' : 'PNG, JPG or WebP.'}
              </p>
            </div>
          </div>
          <Input label="Sort Order" type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Tree row ──────────────────────────────────────────────────────────────────
function CategoryRow({ node, depth, onManageAttributes }: {
  node: CategoryNode; depth: number; onManageAttributes: (node: CategoryNode) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-[10px] border-b border-bone hover:bg-cream transition-colors duration-150"
        style={{ paddingLeft: 16 + depth * 24 }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" onClick={() => hasChildren && setExpanded(e => !e)}>
          {hasChildren ? (
            <ChevronRight size={13} className="text-slate shrink-0 transition-transform duration-150" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} />
          ) : (
            <span className="w-[13px] shrink-0" />
          )}
          {depth === 0
            ? <FolderTree size={14} className="text-brand-orange shrink-0" />
            : <Tag size={12} className="text-slate shrink-0" />}
          <span className={depth === 0 ? 'text-[13px] font-semibold text-charcoal' : 'text-[13px] text-graphite'}>{node.name}</span>
          {node.createdByRole && (
            <span className="text-[10px] text-slate capitalize ml-1">· added by {node.createdByRole}</span>
          )}
          {!hasChildren && depth === 0 && (
            <span className="text-[11px] text-slate ml-1">· no subcategories</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onManageAttributes(node)}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate hover:text-brand-orange px-2 py-1 rounded-md shrink-0"
        >
          <ListFilter size={12} /> Attributes
        </button>
      </div>
      {expanded && node.children.map(child => (
        <CategoryRow key={child._id} node={child} depth={depth + 1} onManageAttributes={onManageAttributes} />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminCategories() {
  usePageTitle('Categories');
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [managingAttrsFor, setManagingAttrsFor] = useState<CategoryNode | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    apiGetCategoryTree()
      .then(res => setTree(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load categories.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const countAll = (nodes: CategoryNode[]): number =>
    nodes.reduce((acc, n) => acc + 1 + countAll(n.children), 0);

  const totalMain = tree.length;
  const totalSubs = countAll(tree) - totalMain;

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Commerce"
        title="Categories"
        subtitle={`${totalMain} main categories · ${totalSubs} subcategories`}
        actions={<Button icon={<Plus size={14} />} onClick={() => setAdding(true)}>Add Category</Button>}
      />

      <div className="px-4 sm:px-7 pt-5 pb-8">
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          {loading ? (
            <div className="px-4 py-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} className="h-6 w-full" />)}
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
          ) : tree.length === 0 ? (
            <EmptyState
              icon={<FolderTree size={28} className="text-slate" />}
              title="No categories yet"
              description="Create the first main category to get started."
            />
          ) : (
            tree.map(cat => (
              <CategoryRow key={cat._id} node={cat} depth={0} onManageAttributes={setManagingAttrsFor} />
            ))
          )}
        </div>

        <p className="text-[12px] text-slate mt-4 leading-[1.6] max-w-[640px]">
          Main categories are the curated top-level taxonomy sellers choose from when creating a store.
          Subcategories can be nested one level under a main category — sellers may also add their own
          subcategories from their dashboard. Editing and deleting categories isn't supported yet.
        </p>
      </div>

      {adding && (
        <AddCategoryModal
          mainCategories={tree}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      )}

      {managingAttrsFor && (
        <AttributeManagerModal
          categoryId={managingAttrsFor._id}
          categoryName={managingAttrsFor.name}
          onClose={() => setManagingAttrsFor(null)}
        />
      )}
    </div>
  );
}
