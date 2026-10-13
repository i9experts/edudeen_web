import { useEffect, useMemo, useState } from 'react';
import { Plus, ChevronRight, FolderTree, Tag, ImagePlus, Loader2, ListFilter, Pencil, Trash2, ArrowUp, ArrowDown, Search } from 'lucide-react';
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
import { MAX_LEVELS, LEVEL_NAMES, flattenTree, countDescendants, deleteTargets, searchTree } from './categoryTree';

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
// Admins can create a main category (no parent) or a subcategory under any
// category, up to 4 levels deep (server-enforced).
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
          {flattenTree(mainCategories).filter(f => f.depth + 1 < MAX_LEVELS).map(({ node, depth }) => (
            <option key={node._id} value={node._id}>{'\u2003'.repeat(depth)}{node.name}</option>
          ))}
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
// Works at any depth. The server refuses to delete a category that still has
// subcategories unless the admin confirms deleting them together, and refuses one
// still used by products/stores unless they're moved: a main category's products go
// to another main category; a subcategory's go to any other category inside the
// same main category (or to the main category itself = "no subcategory").
function DeleteCategoryModal({ category, roots, onClose, onDeleted }: {
  category: CategoryNode; roots: CategoryNode[]; onClose: () => void; onDeleted: (msg: string) => void;
}) {
  const isMain = !category.parentId;
  const descendants = countDescendants(category);
  const [deleteChildren, setDeleteChildren] = useState(false);
  const [reassignTo, setReassignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const targets = useMemo(() => deleteTargets(category, roots), [category, roots]);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const res = await apiAdminDeleteCategory(category._id, reassignTo || undefined, undefined, deleteChildren);
      const moved = res.data?.reassigned;
      const kids = res.data?.deletedChildren ?? 0;
      onDeleted(`Deleted "${category.name}"${kids ? ` and ${kids} subcategor${kids === 1 ? 'y' : 'ies'}` : ''}${moved
        ? ` — moved ${moved.products} product(s)${isMain ? ` and ${moved.stores} store(s)` : ''}`
        : ''}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal mobileSheet
      title="Delete Category"
      width={500}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={descendants > 0 && !deleteChildren}>Delete Category</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal leading-[1.6]">
          Delete <strong>{category.name}</strong>? It will disappear from the marketplace.
          {typeof category.productCount === 'number' && category.productCount > 0 && (
            <> {category.productCount} active product{category.productCount === 1 ? '' : 's'} currently use it{descendants > 0 ? ' or its subcategories' : ''}.</>
          )}
        </p>
        {descendants > 0 && (
          <label className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2 cursor-pointer">
            <input type="checkbox" className="mt-[2px]" checked={deleteChildren} onChange={e => setDeleteChildren(e.target.checked)} />
            <span>
              This category has {descendants} subcategor{descendants === 1 ? 'y' : 'ies'} below it (including nested ones).
              Tick to delete them all together with it — otherwise delete or move them first.
            </span>
          </label>
        )}
        <Select label="Move products to" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
          <option value="">Don't move — only delete if nothing uses it</option>
          {targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
        <p className="text-[12px] text-slate leading-[1.5]">
          {isMain
            ? 'Products and stores in this main category move to the main category you pick.'
            : 'Products filed under this category (or anything below it) move to the category you pick inside the same main category.'}
          {' '}If something still uses it and you don't pick one, the delete is refused.
        </p>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Inline "add subcategory" form ────────────────────────────────────────────
function InlineAddForm({ parent, depth, onCancel, onSaved }: {
  parent: CategoryNode; depth: number; onCancel: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [preview, setPreview] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { upload: uploadImage, uploading } = useUpload('public');

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    uploadImage(file).then(d => setImage(d.url)).catch(() => setPreview(''));
  };

  async function submit() {
    if (!name.trim()) { setError('Enter a name.'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await apiAddCategory({
        name: name.trim(),
        parentId: parent._id,
        description: description.trim() || undefined,
        image: image || undefined,
        sortOrder: parent.children.length,
      });
      if (!active && res.data?._id) await apiAdminUpdateCategory(res.data._id, { isActive: false });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subcategory.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-bone bg-cream/60 px-4 py-3" style={{ paddingLeft: 16 + (depth + 1) * 24 }}>
      <p className="text-[12px] font-semibold text-charcoal mb-2">New {LEVEL_NAMES[depth + 1]?.toLowerCase() ?? 'subcategory'} under “{parent.name}”</p>
      <div className="flex flex-col gap-3 max-w-[520px]">
        <Input aria-label="Subcategory name" placeholder="Name, e.g. Quran Stories" value={name} maxLength={50} autoFocus
          onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void submit(); if (e.key === 'Escape') onCancel(); }} />
        <Textarea aria-label="Description (optional)" rows={2} maxLength={500} placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="flex flex-wrap items-center gap-4">
          <label className={clsx('flex items-center gap-2 text-[12px] text-slate', uploading ? 'cursor-wait' : 'cursor-pointer hover:text-brand-orange')}>
            <span className="size-[40px] rounded-lg bg-white border-2 border-dashed border-bone flex items-center justify-center overflow-hidden">
              {uploading ? <Loader2 size={16} className="animate-spin text-brand-orange" />
                : preview || image ? <img src={preview || image} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={16} />}
            </span>
            Image (optional)
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pickImage} disabled={uploading} />
          </label>
          <div className="flex items-center gap-2">
            <Toggle label="Active" checked={active} onChange={setActive} size="sm" />
            <span className="text-[12px] text-slate">{active ? 'Active' : 'Inactive (hidden)'}</span>
          </div>
        </div>
        {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} loading={saving} disabled={uploading}>Add</Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Tree row ──────────────────────────────────────────────────────────────────
interface RowActions {
  onManageAttributes: (node: CategoryNode) => void;
  onEdit: (node: CategoryNode) => void;
  onDelete: (node: CategoryNode) => void;
  onMove: (siblings: CategoryNode[], index: number, dir: -1 | 1) => void;
  onToggleExpand: (id: string) => void;
  onStartAdd: (id: string) => void;
  onAdded: (parentId: string) => void;
  reordering: boolean;
  expanded: Set<string>;
  addingTo: string | null;
  /** null = no search; otherwise only these ids are rendered. */
  visible: Set<string> | null;
}

function CategoryRow({ node, depth, siblings, index, actions }: {
  node: CategoryNode; depth: number; siblings: CategoryNode[]; index: number; actions: RowActions;
}) {
  const { onManageAttributes, onEdit, onDelete, onMove, onToggleExpand, onStartAdd, onAdded, reordering, expanded, addingTo, visible } = actions;
  if (visible && !visible.has(node._id)) return null;
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node._id);
  const inactive = node.status === 'inactive';
  const canAddChild = depth + 1 < MAX_LEVELS;
  const arrowCls = 'p-1 rounded-md text-slate hover:text-brand-orange disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none';
  const btnCls = 'flex items-center gap-1 text-[12px] font-semibold text-slate px-2 py-1 rounded-md shrink-0 cursor-pointer bg-transparent border-none';

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-[10px] border-b border-bone hover:bg-cream transition-colors duration-150"
        style={{ paddingLeft: 16 + depth * 24 }}
      >
        <button type="button" className="flex items-center gap-2 flex-1 min-w-[160px] text-start bg-transparent border-none p-0 cursor-pointer"
          aria-expanded={hasChildren ? isOpen : undefined} onClick={() => hasChildren && onToggleExpand(node._id)}>
          {hasChildren ? (
            <ChevronRight size={13} className="text-slate shrink-0 transition-transform duration-150 rtl:rotate-180" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }} />
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
          {hasChildren && <span className="text-[12px] text-slate ml-1">· {node.children.length} sub</span>}
          {typeof node.productCount === 'number' && node.productCount > 0 && (
            <span className="text-[12px] text-slate ml-1">· {node.productCount} product{node.productCount === 1 ? '' : 's'}</span>
          )}
        </button>
        <div className="flex flex-wrap items-center shrink-0">
          <button type="button" aria-label={`Move ${node.name} up`} title="Move up" className={arrowCls}
            disabled={reordering || index === 0} onClick={() => onMove(siblings, index, -1)}>
            <ArrowUp size={13} />
          </button>
          <button type="button" aria-label={`Move ${node.name} down`} title="Move down" className={arrowCls}
            disabled={reordering || index === siblings.length - 1} onClick={() => onMove(siblings, index, 1)}>
            <ArrowDown size={13} />
          </button>
          {canAddChild ? (
            <button type="button" onClick={() => onStartAdd(node._id)} aria-label={`Add subcategory under ${node.name}`} title="Add subcategory"
              className={clsx(btnCls, 'hover:text-brand-orange')}>
              <Plus size={12} /> <span className="hidden sm:inline">Add sub</span>
            </button>
          ) : null}
          <button type="button" onClick={() => onManageAttributes(node)} aria-label={`Attributes of ${node.name}`} title="Attributes" className={clsx(btnCls, 'hover:text-brand-orange')}>
            <ListFilter size={12} /> <span className="hidden sm:inline">Attributes</span>
          </button>
          <button type="button" onClick={() => onEdit(node)} aria-label={`Edit ${node.name}`} title="Edit" className={clsx(btnCls, 'hover:text-brand-orange')}>
            <Pencil size={12} /> <span className="hidden sm:inline">Edit</span>
          </button>
          <button type="button" onClick={() => onDelete(node)} aria-label={`Delete ${node.name}`} title="Delete" className={clsx(btnCls, 'hover:text-error')}>
            <Trash2 size={12} /> <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>
      {addingTo === node._id && (
        <InlineAddForm parent={node} depth={depth} onCancel={() => onStartAdd('')} onSaved={() => onAdded(node._id)} />
      )}
      {isOpen && node.children.map((child, i) => (
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
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const [reordering, setReordering] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [query, setQuery] = useState('');
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

  const flat = useMemo(() => flattenTree(tree), [tree]);

  // Search: keep a matching node, every ancestor of it (so the path shows) and everything below it.
  const { visible, autoExpanded } = useMemo(() => searchTree(tree, query), [tree, query]);

  const effectiveExpanded = useMemo(() => (visible ? new Set([...expanded, ...autoExpanded]) : expanded), [expanded, autoExpanded, visible]);

  const rowActions: RowActions = {
    onManageAttributes: setManagingAttrsFor,
    onEdit: setEditing,
    onDelete: setDeleting,
    onMove: handleMove,
    onToggleExpand: id => setExpanded(() => {
      const next = new Set(effectiveExpanded);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    }),
    onStartAdd: id => {
      setAddingTo(id || null);
      if (id) setExpanded(prev => new Set(prev).add(id));
    },
    onAdded: parentId => { setAddingTo(null); setExpanded(prev => new Set(prev).add(parentId)); toast.success('Subcategory created'); load(true); },
    reordering,
    expanded: effectiveExpanded,
    addingTo,
    visible,
  };

  const totalMain = tree.length;
  const totalSubs = flat.length - totalMain;
  const expandable = flat.filter(f => f.node.children.length > 0).map(f => f.node._id);
  const noMatches = !!visible && visible.size === 0;

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Commerce"
        title="Categories"
        subtitle={`${totalMain} main categories · ${totalSubs} subcategories (up to ${MAX_LEVELS} levels)`}
        actions={<Button icon={<Plus size={14} />} onClick={() => { setPrefill(null); setAdding(true); }}>Add main category</Button>}
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

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px] max-w-[360px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
            <input
              type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search categories" placeholder="Search categories…"
              className="w-full ps-9 pe-3 py-[9px] rounded-md border border-bone bg-white text-[13px] text-charcoal outline-none placeholder:text-slate focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => setExpanded(new Set(expandable))} disabled={!expandable.length}>Expand all</Button>
          <Button size="sm" variant="outline" onClick={() => setExpanded(new Set())} disabled={!expanded.size}>Collapse all</Button>
        </div>

        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          {loading ? (
            <div className="px-4 py-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} className="h-6 w-full" />)}
            </div>
          ) : error ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[13px] text-error mb-3">{error}</p>
              <Button size="sm" variant="outline" onClick={() => load()}>Try again</Button>
            </div>
          ) : tree.length === 0 ? (
            <EmptyState
              icon={<FolderTree size={28} className="text-slate" />}
              title="No categories yet"
              description="Create the first main category to get started."
              action={{ label: 'Add main category', icon: <Plus size={14} />, onClick: () => { setPrefill(null); setAdding(true); } }}
            />
          ) : noMatches ? (
            <p className="px-4 py-8 text-center text-[13px] text-slate">No category matches “{query.trim()}”.</p>
          ) : (
            tree.map((cat, i) => (
              <CategoryRow key={cat._id} node={cat} depth={0} siblings={tree} index={i} actions={rowActions} />
            ))
          )}
        </div>

        <p className="text-[12px] text-slate mt-4 leading-[1.6] max-w-[640px]">
          Main categories are the curated top-level taxonomy sellers choose from. Every row has <strong>Add sub</strong> to nest
          a subcategory under it — up to {MAX_LEVELS} levels (main &gt; sub &gt; sub-sub &gt; sub-sub-sub). Sellers pick
          the deepest level that fits their product.
        </p>
        <p className="text-[12px] text-slate mt-2 leading-[1.6] max-w-[640px] bg-cream border border-bone rounded-lg px-3 py-2">
          Good to know: renaming keeps the category's URL. Use the arrows to change the order buyers see among siblings.
          Deleting asks where to move the products; a category with subcategories needs your confirmation to delete them together.
          Inactive categories stay listed here so you can re-enable them.
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
          category={deleting}
          roots={tree}
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
