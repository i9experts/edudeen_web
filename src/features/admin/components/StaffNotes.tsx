import { useCallback, useEffect, useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { apiStaffNotes, apiAddStaffNote, apiDeleteStaffNote, type StaffNoteRow } from '@/api/services/staff';

const NEEDS: Record<string, string> = { user: 'users.view', seller: 'users.view', store: 'marketplace.view', order: 'orders.view', listing: 'marketplace.view' };

/** Private team notes about a buyer, seller, store, order or listing. Customers never see these. */
export function StaffNotes({ entityType, entityId, className }: { entityType: 'user' | 'seller' | 'store' | 'order' | 'listing'; entityId: string; className?: string }) {
  const { me, can } = useAdminAccess();
  const [rows, setRows] = useState<StaffNoteRow[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const allowed = can(NEEDS[entityType]);

  const load = useCallback(() => {
    apiStaffNotes(entityType, entityId).then(r => setRows(r.data)).catch(e => { setError(e instanceof Error ? e.message : 'Could not load notes.'); setRows([]); });
  }, [entityType, entityId]);
  useEffect(() => { if (allowed) load(); }, [allowed, load]);
  if (!allowed) return null;

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true); setError('');
    try { await apiAddStaffNote(entityType, entityId, text.trim()); setText(''); load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save the note.'); }
    finally { setBusy(false); }
  };
  const del = async (n: StaffNoteRow) => { try { await apiDeleteStaffNote(n._id); load(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete.'); } };

  return (
    <section className={className} aria-label="Team notes">
      <p className="text-[12.5px] font-bold text-carbon m-0 mb-2 flex items-center gap-1.5"><StickyNote size={14} className="text-brand-royal" /> Team notes <span className="font-normal text-slate">— only staff can see these</span></p>
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} maxLength={1000} placeholder="Add a note for the team…" className="flex-1 min-w-0 border border-bone rounded-lg px-3 py-2 text-[13px]" />
        <Button size="sm" variant="primary" loading={busy} onClick={add} disabled={!text.trim()}>Add</Button>
      </div>
      {error && <p role="alert" className="text-[12px] text-error mt-1.5 mb-0">{error}</p>}
      <ul className="list-none m-0 p-0 mt-2 grid gap-1.5">
        {(rows ?? []).map(n => (
          <li key={n._id} className="bg-cream border border-bone rounded-lg px-3 py-2 text-[12.5px] flex gap-2">
            <span className="flex-1 min-w-0"><span className="block whitespace-pre-wrap">{n.text}</span><span className="text-[11px] text-slate">{n.authorName} · {new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
            {(me?.isOwner || n.authorId === me?._id) && <button type="button" aria-label="Delete note" onClick={() => del(n)} className="bg-transparent border-none cursor-pointer text-slate p-1"><Trash2 size={13} /></button>}
          </li>
        ))}
        {rows && rows.length === 0 && <li className="text-[12px] text-slate">No notes yet.</li>}
      </ul>
    </section>
  );
}
