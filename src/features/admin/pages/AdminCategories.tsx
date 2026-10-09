import { useEffect, useState } from 'react';
import { Plus, ChevronRight, FolderTree, Tag, ImagePlus, Loader2, ListFilter, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  apiAddCategory, apiAdminGetCategoryTree, apiAdminUpdateCategory, apiAdminDeleteCategory, apiAdminReorderCategories,
  type CategoryNode, type UpdateCategoryPayload,
} from '@/api/services/categories';
import { Toggle } from '@/components/comman/ui/Toggle';
import { useToast } from '@/contexts/ToastContext';
import { AttributeManagerModal } from './AttributeManagerModal';
import { useUpload } from '@/hooks/upload/useUpload';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { AdminStudioHeader } from '@/features/admin/components/studio';

// ── Suggested education subjects ─────────────────────────────────────────────
// The same five subject tabs the buyer homepage shows (Homepage.tsx
// SUBJECT_TABS). Each tab filters by a category whose name matches, so
// creating these main categories makes those tabs filter precisely. A chip only
// prefills the form; nothing is created until the admin clicks "Create".
interface CategorySuggestion { name: string; description: string }

const SUGGESTED_CATEGORIES: CategorySuggestion[] = [
  { name: 'Tarbiyyah',       description: 'Islamic upbringing: Quran, Seerah, duas, salah, akhlaq and Islamic studies resources.' },
  { name: 'Arabic & Urdu',   description: 'Arabic and Urdu language learning: Qaida, Noorani, reading, writing and vocabulary.' },
  { name: 'English',         description: 'English language resources: phonics, grammar, spelling, reading and writing.' },
  { name: 'Maths & Science', description: 'Maths and science resources: numbers, arithmetic, geometry and early STEM.' },
  { name: 'Homeschooling',   description: 'Homeschool curricula, lesson plans, planners and unit studies.' },
];

function missingSuggestions(mainCategories: CategoryNode[]) {
  const existing = new Set(mainCategories.map(c => c.name.trim().toLowerCase()));
  return SUGGESTED_CATEGORIES.filter(s => !existing.has(s.name.toLowerCase()));
}

// ── Add Category modal ───────────────────────────────────────────────────────
// Admins can create either a main category (no parent) or a subcategory under
// an existing main category — never deeper than one level (server-enforced).
function AddCategoryModal({ mainCategories, initial, onClose, onSaved }: {
  mainCategories: CategoryNode[]; initial?: CategorySuggestion | null; onClose: () => void; onSaved: () => void;
}) {
  const [parentId,    setParentId]    = useState('');
  const [name,        setName]        = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const suggestions = missingSuggestions(mainCategories);
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
        {suggestions.length > 0 && (
          <div>
            <p className="text-[12px] font-medium text-charcoal mb-[6px]">Suggested subjects</p>
            <div className="flex flex-wrap gap-[6px]">
              {suggestions.map(s => {
                const selected = !parentId && name.trim().toLowerCase() === s.name.toLowerCase();
                return (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => { setParentId(''); setName(s.name); setDescription(s.description); }}
                    aria-pressed={selected}
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[12px] font-medium border cursor-pointer transition-colors',
                      selected ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-graphite border-bone hover:border-brand-orange',
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] text-slate mt-[6px]">These match the subject tabs on the homepage. Picking one fills in the form; review it, then click Create Category.</p>
          </div>
        )}
        <Select label="Parent Category" value={parentId} onChange={e => setParentId(e.target.value)}>
          <option value="">None — create as a main category</option>
          {mainCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
        <Input label="Name" placeholder="e.g. Islamic Books" value={name} onChange={e => setName(e.target.value)} />
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
              <p className="text-[12px] text-slate leading-[1.4]">
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

// ── Edit Category modal ──────────────────────────────────────────────────────
// Slug and parent are fixed server-side (the slug is a public URL), so only the
// display fields and the active flag can change here.
function EditCategoryModal({ category, onClose, onSaved }: {
  category: CategoryNode; onClose: () => void; onSaved: () => void;
}) {
  const [name,        setName]        = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const [image,       setImage]       = useState(category.image ?? '');
  const [preview,     setPreview]     = useState('');
  const [isActive,    setIsActive]    = useState(category.status !== 'inactive');
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
    const payload: UpdateCategoryPayload = {};
    if (name.trim() !== category.name) payload.name = name.trim();
    if (description.trim() !== (category.description ?? '')) payload.description = description.trim();
    if (image.trim() && image.trim() !== (category.image ?? '')) payload.image = image.trim();
    if (isActive !== (category.status !== 'inactive')) payload.isActive = isActive;
    if (Object.keys(payload).length === 0) { onClose(); return; }
    setError('');
    setSaving(true);
    try {
      await apiAdminUpdateCategory(category._id, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet
      title="Edit Category"
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={imageUploading}>Save Changes</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Name" value={name} maxLength={50} onChange={e => setName(e.target.value)} />
        <Textarea label="Description (optional)" rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} />
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-[6px]">Image</label>
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
            <p className="text-[12px] text-slate leading-[1.4]">
              {imageUploading ? 'Uploading…' : image ? 'Click to replace the image.' : 'PNG, JPG or WebP.'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-charcoal">Active</p>
            <p className="text-[12px] text-slate">Inactive categories are hidden from buyers and sellers but keep their products.</p>
          </div>
          <Toggle label="Category active" checked={isActive} onChange={setIsActive} />
        </div>
        <p className="text-[12px] text-slate">The category's URL (/marketplace/{category.slug}) stays the same when renamed.</p>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Delete Category modal ────────────────────────────────────────────────────
// The server refuses to delete a category that still has subcategories, and
// refuses one still used by products/stores unless they're moved to another
// category at the same level (another main category, or a sibling
// subcategory under the same main category).
function DeleteCategoryModal({ category, siblings, onClose, onDeleted }: {
  category: CategoryNode; siblings: CategoryNode[]; onClose: () => void; onDeleted: (msg: string) => void;
}) {
  const targets = siblings.filter(s => s._id !== category._id && s.status !== 'inactive');
  const [reassignTo, setReassignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isMain = !category.parentId;

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const res = await apiAdminDeleteCategory(category._id, reassignTo || undefined);
      const moved = res.data?.reassigned;
      onDeleted(moved
        ? `Deleted "${category.name}" — moved ${moved.products} product(s)${isMain ? ` and ${moved.stores} store(s)` : ''}.`
        : `Deleted "${category.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal mobileSheet
      title="Delete Category"
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={category.children.length > 0}>Delete Category</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal leading-[1.6]">
          Delete <strong>{category.name}</strong>? It will disappear from the marketplace.
        </p>
        {category.children.length > 0 ? (
          <p className="text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
            This category still has {category.children.length} subcategor{category.children.length === 1 ? 'y' : 'ies'}. Delete those first.
          </p>
        ) : (
          <>
            <Select label="Move its products to" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
              <option value="">Don't move — only delete if nothing uses it</option>
              {targets.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
            <p className="text-[12px] text-slate leading-[1.5]">
              {isMain
                ? 'Products and stores in this main category will be moved to the one you pick.'
                : 'Products in this subcategory will be moved to the sibling subcategory you pick.'}
              {' '}If it's still in use and you don't pick one, the delete is refused.
            </p>
          </>
        )}
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Tree row ──────────────────────────────────────────────────────────────────
interface RowActions {
  onManageAttributes: (node: CategoryNode) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode, siblings: CategoryNode[]) => void;
  onMove: (siblings: CategoryNode[], index: number, dir: -1 | 1) => void;
  reordering: boolean;
}

function CategoryRow({ node, depth, siblings, index, actions }: {
  node: CategoryNode; depth: number; siblings: CategoryNode[]; index: number; actions: RowActions;
}) {
  const { onManageAttributes, onEdit, onDelete, onMove, reordering } = actions;
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const inactive = node.status === 'inactive';
  const arrowCls = 'p-1 rounded-md text-slate hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none';

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
          <span className={clsx(depth === 0 ? 'text-[13px] font-semibold text-charcoal' : 'text-[13px] text-graphite', inactive && 'opacity-60')}>{node.name}</span>
          {inactive && (
            <span className="text-[12px] font-semibold px-1.5 py-[1px] rounded bg-cream border border-bone text-slate ml-1">Inactive</span>
          )}
          {node.createdByRole && (
            <span className="text-[12px] text-slate capitalize ml-1">· added by {node.createdByRole}</span>
          )}
          {!hasChildren && depth === 0 && (
            <span className="text-[12px] text-slate ml-1">· no subcategories</span>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <button type="button" aria-label={`Move ${node.name} up`} title="Move up" className={arrowCls}
            disabled={reordering || index === 0} onClick={() => onMove(siblings, index, -1)}>
            <ArrowUp size={13} />
          </button>
          <button type="button" aria-label={`Move ${node.name} down`} title="Move down" className={arrowCls}
            disabled={reordering || index === siblings.length - 1} onClick={() => onMove(siblings, index, 1)}>
            <ArrowDown size={13} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onManageAttributes(node)}
          className="flex items-center gap-1 text-[12px] font-semibold text-slate hover:text-brand-orange px-2 py-1 rounded-md shrink-0"
        >
          <ListFilter size={12} /> <span className="hidden sm:inline">Attributes</span>
        </button>
        <button
          type="button"
          onClick={() => onEdit(node)}
          className="flex items-center gap-1 text-[12px] font-semibold text-slate hover:text-brand-orange px-2 py-1 rounded-md shrink-0"
        >
          <Pencil size={12} /> <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(node, siblings)}
          className="flex items-center gap-1 text-[12px] font-semibold text-slate hover:text-error px-2 py-1 rounded-md shrink-0"
        >
          <Trash2 size={12} /> <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
      {expanded && node.children.map((child, i) => (
        <CategoryRow key={child._id} node={child} depth={depth + 1} siblings={node.children} index={i} actions={actions} />
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
  const [prefill, setPrefill] = useState<CategorySuggestion | null>(null);
  const [managingAttrsFor, setManagingAttrsFor] = useState<CategoryNode | null>(null);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [deleting, setDeleting] = useState<{ node: CategoryNode; siblings: CategoryNode[] } | null>(null);
  const [reordering, setReordering] = useState(false);
  const toast = useToast();

  // `quiet` refreshes without swapping the tree for skeletons (keeps expanded rows).
  const load = (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    apiAdminGetCategoryTree()
      .then(res => setTree(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load categories.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  // Swap a category with its neighbour, then persist the whole sibling list's
  // order as 0..n-1 so ties left over from older data (all sortOrder 0) resolve.
  async function handleMove(siblings: CategoryNode[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[target]] = [next[target], next[index]];
    setReordering(true);
    try {
      await apiAdminReorderCategories(next.map((c, i) => ({ id: c._id, sortOrder: i })));
      toast.success('Order updated');
      load(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reorder categories.');
    } finally {
      setReordering(false);
    }
  }

  const rowActions: RowActions = {
    onManageAttributes: setManagingAttrsFor,
    onEdit: setEditing,
    onDelete: (node, siblings) => setDeleting({ node, siblings }),
    onMove: handleMove,
    reordering,
  };

  const countAll = (nodes: CategoryNode[]): number =>
    nodes.reduce((acc, n) => acc + 1 + countAll(n.children), 0);

  const totalMain = tree.length;
  const totalSubs = countAll(tree) - totalMain;

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Commerce"
        title="Categories"
        subtitle={`${totalMain} main categories · ${totalSubs} subcategories`}
        actions={<Button icon={<Plus size={14} />} onClick={() => { setPrefill(null); setAdding(true); }}>Add Category</Button>}
      />

      <div className="px-4 sm:px-7 pt-5 pb-8">
        {!loading && !error && missingSuggestions(tree).length > 0 && (
          <div className="bg-white border border-bone rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-semibold text-charcoal mr-1">Suggested subjects:</p>
            {missingSuggestions(tree).map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => { setPrefill(s); setAdding(true); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border border-bone bg-white text-graphite cursor-pointer hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                <Plus size={11} /> {s.name}
              </button>
            ))}
            <p className="basis-full text-[12px] text-slate">The homepage's subject tabs work best when a main category with the same name exists. Nothing is created until you confirm.</p>
          </div>
        )}
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
            tree.map((cat, i) => (
              <CategoryRow key={cat._id} node={cat} depth={0} siblings={tree} index={i} actions={rowActions} />
            ))
          )}
        </div>

        <p className="text-[12px] text-slate mt-4 leading-[1.6] max-w-[640px]">
          Main categories are the curated top-level taxonomy sellers choose from when creating a store.
          Subcategories can be nested one level under a main category — sellers may also add their own
          subcategories from their dashboard.
        </p>
        <p className="text-[12px] text-slate mt-2 leading-[1.6] max-w-[640px] bg-cream border border-bone rounded-lg px-3 py-2">
          Good to know: renaming keeps the category's URL. Use the arrows to change the order buyers see.
          Deleting asks where to move the category's products; inactive categories stay listed here so you can re-enable them.
        </p>
      </div>

      {adding && (
        <AddCategoryModal
          mainCategories={tree.filter(c => c.status !== 'inactive')}
          initial={prefill}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); toast.success('Category created'); load(true); }}
        />
      )}

      {editing && (
        <EditCategoryModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); toast.success('Category updated'); load(true); }}
        />
      )}

      {deleting && (
        <DeleteCategoryModal
          category={deleting.node}
          siblings={deleting.siblings}
          onClose={() => setDeleting(null)}
          onDeleted={msg => { setDeleting(null); toast.success(msg); load(true); }}
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
