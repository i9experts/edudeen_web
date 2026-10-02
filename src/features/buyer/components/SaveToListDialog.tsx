import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Lock, Globe, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal, Button, Input } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiGetMyLists, apiCreateList, apiAddToList, apiRemoveFromList, type SavedListSummary } from '@/api/services/classroom';

/**
 * "Save to list" picker — tick the teacher lists a resource belongs in, or
 * start a new one. Changes save immediately; there's no separate Save step.
 */
export function SaveToListDialog({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const toast = useToast();
  const [lists, setLists] = useState<SavedListSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiGetMyLists().then(res => setLists(res.data ?? [])).catch(() => setLists([]));
  }, []);

  const toggle = async (list: SavedListSummary) => {
    const has = list.productIds.includes(productId);
    setBusy(list._id);
    try {
      if (has) await apiRemoveFromList(list._id, productId);
      else await apiAddToList(list._id, productId);
      setLists(prev => (prev ?? []).map(l => l._id !== list._id ? l : {
        ...l,
        productIds: has ? l.productIds.filter(id => id !== productId) : [...l.productIds, productId],
        itemCount: l.itemCount + (has ? -1 : 1),
      }));
      toast.success(has ? `Removed from ${list.name}` : `Saved to ${list.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the list.');
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      await apiCreateList({ name: trimmed, productId });
      const res = await apiGetMyLists();
      setLists(res.data ?? []);
      setName('');
      toast.success(`Saved to ${trimmed}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the list.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title="Save to a list" onClose={onClose} width={420} mobileSheet>
      <div className="px-5 py-4 flex flex-col gap-4">
        <p className="text-[12.5px] text-slate -mt-1 line-clamp-1">{productName}</p>
        {lists === null ? (
          <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate" /></div>
        ) : lists.length === 0 ? (
          <p className="text-[13px] text-graphite">Lists help you plan a term, a unit or a class — and share it with parents or colleagues. Name your first one below.</p>
        ) : (
          <ul className="list-none p-0 m-0 flex flex-col gap-1 max-h-[300px] overflow-y-auto">
            {lists.map(l => {
              const has = l.productIds.includes(productId);
              return (
                <li key={l._id}>
                  <button
                    type="button"
                    onClick={() => toggle(l)}
                    disabled={busy === l._id}
                    aria-pressed={has}
                    className={clsx(
                      'w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-start cursor-pointer transition-colors bg-white',
                      has ? 'border-brand-orange bg-brand-pale-orange/40' : 'border-bone hover:border-brand-orange/40',
                    )}
                  >
                    <span className={clsx('size-5 rounded-md border flex items-center justify-center shrink-0', has ? 'bg-brand-orange border-brand-orange text-white' : 'border-bone')}>
                      {busy === l._id ? <Loader2 size={12} className="animate-spin text-slate" /> : has && <Check size={13} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-carbon truncate">{l.name}</span>
                      <span className="block text-[11.5px] text-slate">{l.itemCount} {l.itemCount === 1 ? 'resource' : 'resources'}</span>
                    </span>
                    {l.isPublic ? <Globe size={13} className="text-slate shrink-0" aria-label="Shared" /> : <Lock size={13} className="text-slate shrink-0" aria-label="Private" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <form className="flex gap-2 items-end" onSubmit={e => { e.preventDefault(); void create(); }}>
          <Input label="New list" placeholder="e.g. Grade 4 — Term 1" value={name} maxLength={80} onChange={e => setName(e.target.value)} />
          <Button type="submit" variant="secondary" size="md" loading={creating} disabled={!name.trim()} className="shrink-0">
            <Plus size={14} /> Create
          </Button>
        </form>
        <Link to="/account/lists" onClick={onClose} className="text-[12.5px] font-semibold text-brand-orange no-underline self-start">Manage my lists</Link>
      </div>
    </Modal>
  );
}
