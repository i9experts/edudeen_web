import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { AxiosRequestConfig } from 'axios';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import {
  apiAddCategory, apiAdminDeleteCategory, apiAdminGetCategoryTree, apiAdminReorderCategories, apiAdminUpdateCategory,
  type CategoryNode,
} from '@/api/services/categories';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';
import { MAX_LEVELS, LEVEL_NAMES, countDescendants, deleteTargets, flattenTree, searchTree } from '@/features/admin/pages/categoryTree';
import { refreshCategoryTree } from '@/hooks/marketplace/useCategoryTree';

type Panel = { kind: 'add' | 'edit'; id: string } | null;

/** Inline editor for the whole category tree (any depth): add, rename/describe, show/hide, reorder, delete. Every write asks for the admin password. */
export default function CategoriesEditorModal({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  const { confirm } = useReauth();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState({ name: '', description: '', active: true });
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const [deleteChildren, setDeleteChildren] = useState(false);
  const [reassignTo, setReassignTo] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setTree((await apiAdminGetCategoryTree()).data ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load categories.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const { visible, autoExpanded } = useMemo(() => searchTree(tree, query), [tree, query]);
  const open = useMemo(() => (visible ? new Set([...expanded, ...autoExpanded]) : expanded), [expanded, autoExpanded, visible]);
  const flat = useMemo(() => flattenTree(tree), [tree]);

  /** Password first; nothing is sent (or changed) when it is wrong or cancelled. */
  const run = async (id: string, fn: (cfg: AxiosRequestConfig) => Promise<unknown>): Promise<boolean> => {
    setError('');
    const token = await confirm();
    if (!token) return false;
    setBusyId(id);
    try { await fn(inlineEditConfig(token)); await load(); void refreshCategoryTree(); onChanged(); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); return false; }
    finally { setBusyId(null); }
  };

  const toggle = (id: string) => setExpanded(() => { const n = new Set(open); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const move = (siblings: CategoryNode[], i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= siblings.length) return;
    const next = [...siblings];
    [next[i], next[t]] = [next[t], next[i]];
    void run(siblings[i]._id, cfg => apiAdminReorderCategories(next.map((c, k) => ({ id: c._id, sortOrder: k })), cfg));
  };

  const startAdd = (parent: CategoryNode | null) => {
    setError(''); setDraft({ name: '', description: '', active: true });
    setPanel({ kind: 'add', id: parent?._id ?? '' });
    if (parent) setExpanded(prev => new Set(prev).add(parent._id));
  };
  const startEdit = (c: CategoryNode) => {
    setError(''); setDraft({ name: c.name, description: c.description ?? '', active: c.status !== 'inactive' });
    setPanel({ kind: 'edit', id: c._id });
  };

  const save = async (node: CategoryNode | null, siblingsCount: number) => {
    const name = draft.name.trim();
    if (!name) { setError('A category needs a name.'); return; }
    if (name.length > 50) { setError('Category name cannot be more than 50 characters.'); return; }
    if (!panel) return;
    const description = draft.description.trim();
    const ok = panel.kind === 'add'
      ? await run('new', async cfg => {
        const res = await apiAddCategory({ name, parentId: node?._id, description: description || undefined, sortOrder: siblingsCount }, cfg);
        if (!draft.active && res.data?._id) await apiAdminUpdateCategory(res.data._id, { isActive: false }, cfg);
      })
      : node ? await run(node._id, cfg => apiAdminUpdateCategory(node._id, {
        ...(name !== node.name ? { name } : {}),
        ...(description !== (node.description ?? '') ? { description } : {}),
        ...(draft.active !== (node.status !== 'inactive') ? { isActive: draft.active } : {}),
      }, cfg)) : false;
    if (ok) setPanel(null);
  };

  const confirmDelete = async () => {
    const c = deleting; if (!c) return;
    const kids = deleteChildren, to = reassignTo;
    setDeleting(null);
    await run(c._id, cfg => apiAdminDeleteCategory(c._id, to || undefined, cfg, kids));
  };

  const renderForm = (node: CategoryNode | null, depth: number, siblingsCount: number) => (
    <div className="border-b border-bone bg-cream/60 px-3 py-3" style={{ paddingInlineStart: 12 + depth * 16 }}>
      <p className="text-[12px] font-semibold text-charcoal mb-2">
        {panel?.kind === 'add' ? (node ? `New ${LEVEL_NAMES[depth]?.toLowerCase() ?? 'subcategory'} under "${node.name}"` : 'New main category') : `Edit "${node?.name}"`}
      </p>
      <div className="flex flex-col gap-2 max-w-[460px]">
        <Input aria-label="Category name" placeholder="Name" value={draft.name} maxLength={50} autoFocus
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') void save(node, siblingsCount); if (e.key === 'Escape') setPanel(null); }} />
        <Textarea aria-label="Description (optional)" rows={2} maxLength={500} placeholder="Description (optional)" value={draft.description}
          onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
        <label className="flex items-center gap-2 text-[12px] text-slate cursor-pointer">
          <input type="checkbox" checked={draft.active} onChange={e => setDraft(d => ({ ...d, active: e.target.checked }))} />
          Visible on the site
        </label>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void save(node, siblingsCount)} loading={busyId === (panel?.kind === 'add' ? 'new' : node?._id)}>{panel?.kind === 'add' ? 'Add' : 'Save'}</Button>
          <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Cancel</Button>
        </div>
      </div>
    </div>
  );

  const renderRow = (node: CategoryNode, depth: number, siblings: CategoryNode[], i: number): React.ReactNode => {
    if (visible && !visible.has(node._id)) return null;
    const kids = node.children ?? [];
    const isOpen = open.has(node._id);
    const hidden = node.status === 'inactive';
    const busy = busyId === node._id;
    return (
      <div key={node._id}>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 py-2 pe-2 border-b border-bone" style={{ paddingInlineStart: 8 + depth * 16 }}>
          <button type="button" className="flex items-center gap-1.5 flex-1 min-w-[140px] text-start bg-transparent border-none p-0 cursor-pointer"
            aria-expanded={kids.length ? isOpen : undefined} onClick={() => kids.length && toggle(node._id)}>
            {kids.length
              ? <ChevronRight size={13} className="text-slate shrink-0 rtl:rotate-180" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }} />
              : <span className="w-[13px] shrink-0" />}
            <span className={clsx('text-[13px]', depth === 0 ? 'font-semibold text-charcoal' : 'text-graphite', hidden && 'opacity-60')}>{node.name}</span>
            {hidden && <span className="text-[12px] px-1.5 rounded bg-cream border border-bone text-slate">Hidden</span>}
            {kids.length > 0 && <span className="text-[12px] text-slate">· {kids.length} sub</span>}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <IconBtn label={`Move ${node.name} up`} disabled={busy || i === 0} onClick={() => move(siblings, i, -1)}><ArrowUp size={14} /></IconBtn>
            <IconBtn label={`Move ${node.name} down`} disabled={busy || i === siblings.length - 1} onClick={() => move(siblings, i, 1)}><ArrowDown size={14} /></IconBtn>
            {depth + 1 < MAX_LEVELS && <IconBtn label={`Add subcategory under ${node.name}`} disabled={busy} onClick={() => startAdd(node)}><Plus size={14} /></IconBtn>}
            <IconBtn label={`Edit ${node.name}`} disabled={busy} onClick={() => startEdit(node)}><Pencil size={14} /></IconBtn>
            <IconBtn label={hidden ? `Show ${node.name} on site` : `Hide ${node.name} from site`} disabled={busy}
              onClick={() => void run(node._id, cfg => apiAdminUpdateCategory(node._id, { isActive: hidden }, cfg))}>
              {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
            </IconBtn>
            <IconBtn label={`Delete ${node.name}`} disabled={busy} onClick={() => { setReassignTo(''); setDeleteChildren(false); setDeleting(node); }}><Trash2 size={14} /></IconBtn>
          </div>
        </div>
        {panel?.kind === 'edit' && panel.id === node._id && renderForm(node, depth, siblings.length)}
        {panel?.kind === 'add' && panel.id === node._id && renderForm(node, depth + 1, kids.length)}
        {isOpen && kids.map((c, k) => renderRow(c, depth + 1, kids, k))}
      </div>
    );
  };

  const descendants = deleting ? countDescendants(deleting) : 0;
  const targets = useMemo(() => (deleting ? deleteTargets(deleting, tree) : []), [deleting, tree]);
  const noMatches = !!visible && visible.size === 0;

  return (
    <>
      <Modal mobileSheet width={680} title="Edit categories" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
        <p className="text-[12px] text-slate mb-3">All levels (up to {MAX_LEVELS}). Every change asks for your password and goes live immediately; hidden categories disappear from the site.</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search categories" placeholder="Search categories..."
              className="w-full ps-9 pe-3 py-[8px] rounded-md border border-bone bg-white text-[13px] text-charcoal outline-none focus:border-brand-orange" />
          </div>
          <Button size="sm" variant="outline" onClick={() => setExpanded(new Set(flat.filter(f => (f.node.children ?? []).length).map(f => f.node._id)))}>Expand all</Button>
          <Button size="sm" variant="outline" onClick={() => setExpanded(new Set())}>Collapse all</Button>
          <Button size="sm" onClick={() => startAdd(null)}><Plus size={14} className="inline align-middle me-1" />Add main category</Button>
        </div>
        {error && <p className="text-[12px] text-error mb-2" role="alert">{error}</p>}
        {panel?.kind === 'add' && panel.id === '' && <div className="border border-bone rounded-xl mb-2 overflow-hidden">{renderForm(null, 0, tree.length)}</div>}
        {loading ? (
          <div className="flex flex-col gap-2"><SkeletonBox className="h-[40px] w-full" /><SkeletonBox className="h-[40px] w-full" /><SkeletonBox className="h-[40px] w-full" /></div>
        ) : error && tree.length === 0 ? (
          <div className="text-center py-4"><Button size="sm" variant="outline" onClick={() => { setLoading(true); void load(); }}>Try again</Button></div>
        ) : tree.length === 0 ? (
          <p className="text-[13px] text-slate py-4 text-center">No categories yet. Use "Add main category".</p>
        ) : noMatches ? (
          <p className="text-[13px] text-slate py-4 text-center">No category matches "{query.trim()}".</p>
        ) : (
          <div className="border border-bone rounded-xl overflow-hidden">{tree.map((c, i) => renderRow(c, 0, tree, i))}</div>
        )}
      </Modal>

      {deleting && (
        <Modal mobileSheet title={`Delete "${deleting.name}"?`} onClose={() => setDeleting(null)}
          footer={<><Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={descendants > 0 && !deleteChildren}>Delete</Button></>}>
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-slate">It is removed from the site.
              {typeof deleting.productCount === 'number' && deleting.productCount > 0 && <> {deleting.productCount} active product{deleting.productCount === 1 ? '' : 's'} use it{descendants > 0 ? ' or its subcategories' : ''}.</>}
              {' '}You will be asked for your password next.</p>
            {descendants > 0 && (
              <label className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2 cursor-pointer">
                <input type="checkbox" className="mt-[2px]" checked={deleteChildren} onChange={e => setDeleteChildren(e.target.checked)} />
                <span>It has {descendants} subcategor{descendants === 1 ? 'y' : 'ies'} below it (including nested ones). Tick to delete them all together with it.</span>
              </label>
            )}
            <Select label="Move its products to" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
              <option value="">Do not move (only works if nothing uses it)</option>
              {targets.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </div>
        </Modal>
      )}
    </>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-md border border-bone bg-white text-charcoal cursor-pointer hover:bg-fog disabled:opacity-40 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}