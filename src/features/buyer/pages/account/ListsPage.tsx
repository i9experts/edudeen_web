import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Globe, Lock, Copy, Trash2, Pencil, Plus } from 'lucide-react';
import { Card, Button, Input, Textarea, Modal, SkeletonBox, EmptyState } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiGetMyLists, apiCreateList, apiUpdateList, apiDeleteList, type SavedListSummary } from '@/api/services/classroom';

const shareUrl = (slug: string) => `${window.location.origin}/lists/${slug}`;

function ListForm({ initial, title, onSave, onClose }: {
  initial?: Partial<SavedListSummary>; title: string;
  onSave: (v: { name: string; description: string; isPublic: boolean }) => Promise<void>; onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave({ name: name.trim(), description: description.trim(), isPublic }); } finally { setBusy(false); } };
  return (
    <Modal title={title} onClose={onClose} width={460} mobileSheet footer={
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="md" loading={busy} disabled={!name.trim()} onClick={save}>Save</Button>
      </div>
    }>
      <div className="px-5 py-4 flex flex-col gap-3">
        <Input label="List name" value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder="e.g. Grade 4 — Term 1" />
        <Textarea label="Description (optional)" rows={2} maxLength={300} value={description} onChange={e => setDescription(e.target.value)} placeholder="What this list is for — parents will see it if you share it." />
        <label className="flex items-start gap-2 text-[13px] text-charcoal cursor-pointer">
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="mt-[3px] accent-brand-orange" />
          <span><b>Anyone with the link can view</b><br /><span className="text-[12px] text-slate">Share it with parents, students or other teachers. Your email is never shown.</span></span>
        </label>
      </div>
    </Modal>
  );
}

/** Account → My Lists: create, rename, share and delete teacher lists. */
export function ListsPage() {
  const toast = useToast();
  const [lists, setLists] = useState<SavedListSummary[] | null>(null);
  const [editing, setEditing] = useState<SavedListSummary | 'new' | null>(null);

  const load = () => apiGetMyLists().then(res => setLists(res.data ?? [])).catch(() => setLists([]));
  useEffect(() => { void load(); }, []);

  const save = async (v: { name: string; description: string; isPublic: boolean }) => {
    try {
      if (editing === 'new') await apiCreateList(v);
      else if (editing) await apiUpdateList(editing._id, v);
      toast.success('List saved');
      setEditing(null);
      await load();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save the list.'); }
  };

  const remove = async (l: SavedListSummary) => {
    if (!window.confirm(`Delete "${l.name}"? The resources stay on Edudeen — only the list goes.`)) return;
    try { await apiDeleteList(l._id); setLists(prev => (prev ?? []).filter(x => x._id !== l._id)); toast.success('List deleted'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
  };

  const copy = async (l: SavedListSummary) => {
    try { await navigator.clipboard.writeText(shareUrl(l.slug)); toast.success('Link copied'); }
    catch { toast.error('Could not copy — open the list and copy the address.'); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-[20px] font-bold text-carbon">My Lists</h1>
          <p className="text-[13px] text-slate">Plan a term, a unit or a class — and share it with parents or colleagues.</p>
        </div>
        <Button variant="primary" size="sm" className="ms-auto" onClick={() => setEditing('new')}><Plus size={14} /> New list</Button>
      </div>

      {lists === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><SkeletonBox height={150} rounded="12px" /><SkeletonBox height={150} rounded="12px" /></div>
      ) : lists.length === 0 ? (
        <Card><EmptyState icon={<ListChecks size={22} />} title="No lists yet" description="Tap the list icon next to “Add to cart” on any resource to start one." action={{ label: 'Create a list', onClick: () => setEditing('new') }} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lists.map(l => (
            <Card key={l._id} padding="none" className="overflow-hidden flex flex-col">
              <Link to={`/lists/${l.slug}`} className="grid grid-cols-4 h-[84px] bg-cream no-underline">
                {[0, 1, 2, 3].map(i => l.covers[i]
                  ? <img key={i} src={l.covers[i]} alt="" className="w-full h-full object-cover border-e border-white last:border-e-0" />
                  : <span key={i} className="border-e border-white last:border-e-0" />)}
              </Link>
              <div className="p-4 flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/lists/${l.slug}`} className="text-[14.5px] font-bold text-carbon no-underline hover:text-brand-orange truncate">{l.name}</Link>
                  {l.isPublic
                    ? <span className="inline-flex items-center gap-1 text-[11px] text-success shrink-0"><Globe size={11} /> Shared</span>
                    : <span className="inline-flex items-center gap-1 text-[11px] text-slate shrink-0"><Lock size={11} /> Private</span>}
                </div>
                <p className="text-[12px] text-slate">{l.itemCount} {l.itemCount === 1 ? 'resource' : 'resources'}{l.description ? ` · ${l.description}` : ''}</p>
                <div className="flex gap-1 mt-auto pt-2">
                  {l.isPublic && <Button variant="ghost" size="xs" onClick={() => copy(l)}><Copy size={12} /> Copy link</Button>}
                  <Button variant="ghost" size="xs" onClick={() => setEditing(l)}><Pencil size={12} /> Edit</Button>
                  <Button variant="ghost" size="xs" className="ms-auto text-error" onClick={() => remove(l)}><Trash2 size={12} /> Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <ListForm title={editing === 'new' ? 'New list' : 'Edit list'} initial={editing === 'new' ? undefined : editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}
