import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { AxiosRequestConfig } from 'axios';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Select } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import {
  apiAddCategory, apiAdminDeleteCategory, apiAdminGetCategoryTree, apiAdminReorderCategories, apiAdminUpdateCategory,
  type CategoryNode,
} from '@/api/services/categories';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

/** Inline editor for the main (subject) categories: rename, show/hide, reorder, add, delete. Every write asks for the admin password. */
export default function CategoriesEditorModal({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  const { confirm } = useReauth();
  const [rows, setRows] = useState<CategoryNode[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<CategoryNode | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const list = [...((await apiAdminGetCategoryTree()).data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
      setRows(list);
      setNames(Object.fromEntries(list.map(c => [c._id, c.name])));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load categories.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (id: string, fn: (cfg: AxiosRequestConfig) => Promise<unknown>): Promise<boolean> => {
    setError('');
    const token = await confirm();
    if (!token) return false; // password not confirmed - nothing changed
    setBusyId(id);
    try { await fn(inlineEditConfig(token)); await load(); onChanged(); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); return false; }
    finally { setBusyId(null); }
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...rows];
    const t = i + dir;
    if (t < 0 || t >= next.length) return;
    [next[i], next[t]] = [next[t], next[i]];
    void run(next[i]._id, cfg => apiAdminReorderCategories(next.map((c, k) => ({ id: c._id, sortOrder: k })), cfg));
  };

  const rename = (c: CategoryNode) => {
    const name = (names[c._id] ?? '').trim();
    if (!name) { setError('A category needs a name.'); return; }
    if (name.length > 50) { setError('Category name cannot be more than 50 characters.'); return; }
    void run(c._id, cfg => apiAdminUpdateCategory(c._id, { name }, cfg));
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) { setError('Enter a name for the new category.'); return; }
    if (await run('new', cfg => apiAddCategory({ name, sortOrder: rows.length }, cfg))) setNewName('');
  };

  const confirmDelete = async () => {
    const c = deleting; if (!c) return;
    setDeleting(null);
    await run(c._id, cfg => apiAdminDeleteCategory(c._id, reassignTo || undefined, cfg));
    setReassignTo('');
  };

  return (
    <>
      <Modal mobileSheet width={620} title="Edit categories" onClose={onClose} footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
        <p className="text-[12px] text-slate mb-3">Main categories only (sub-categories are managed in Admin → Categories). Every change asks for your password and goes live immediately; hidden categories disappear from the site.</p>
        {error && <p className="text-[12px] text-error mb-2" role="alert">{error}</p>}
        {loading ? (
          <div className="flex flex-col gap-2"><SkeletonBox className="h-[44px] w-full" /><SkeletonBox className="h-[44px] w-full" /></div>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-slate py-4 text-center">No categories yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {rows.map((c, i) => {
              const busy = busyId === c._id;
              const hidden = c.status === 'inactive';
              const dirty = (names[c._id] ?? '').trim() !== c.name;
              return (
                <li key={c._id} className="flex items-center gap-2 rounded-xl border border-bone p-2">
                  <div className="min-w-0 flex-1">
                    <Input aria-label={`Name of ${c.name}`} value={names[c._id] ?? ''} maxLength={50} disabled={busy}
                      onChange={e => setNames(n => ({ ...n, [c._id]: e.target.value }))} />
                  </div>
                  {dirty && <Button size="sm" onClick={() => rename(c)} loading={busy}>Rename</Button>}
                  <IconBtn label="Move up" disabled={busy || i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></IconBtn>
                  <IconBtn label="Move down" disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></IconBtn>
                  <IconBtn label={hidden ? 'Show on site' : 'Hide from site'} disabled={busy}
                    onClick={() => void run(c._id, cfg => apiAdminUpdateCategory(c._id, { isActive: hidden }, cfg))}>
                    {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </IconBtn>
                  <IconBtn label="Delete" disabled={busy} onClick={() => { setReassignTo(''); setDeleting(c); }}><Trash2 size={14} /></IconBtn>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-end gap-2 mt-4">
          <div className="flex-1"><Input label="Add a category" value={newName} maxLength={50} placeholder="e.g. Science" onChange={e => setNewName(e.target.value)} /></div>
          <Button onClick={add} loading={busyId === 'new'}><Plus size={14} className="inline align-middle me-1" />Add</Button>
        </div>
      </Modal>

      {deleting && (
        <Modal title={`Delete "${deleting.name}"?`} onClose={() => setDeleting(null)}
          footer={<><Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button><Button onClick={confirmDelete}>Delete</Button></>}>
          <p className="text-[13px] text-slate mb-3">It is removed from the site. If products still use it, pick a category to move them to. You will be asked for your password next.</p>
          <Select label="Move its products to" value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
            <option value="">Do not move (only works if nothing uses it)</option>
            {rows.filter(r => r._id !== deleting._id).map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </Select>
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
