import { useCallback, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import {
  apiCreateQuickReply, apiDeleteQuickReply, apiListQuickReplies, apiUpdateQuickReply, type QuickReply,
} from '@/api/services/messaging';
import { Button, ConfirmActionModal, Input, Modal, Select, Textarea } from '@/components/comman/ui';
import {
  QUICK_REPLY_BODY_MAX, QUICK_REPLY_CATEGORIES, QUICK_REPLY_MAX, QUICK_REPLY_TITLE_MAX, QUICK_REPLY_VARIABLES,
} from '@/utils/quickReplies';

const errText = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

// ── Data: one list per store, re-read after every change ─────────────────────
export function useQuickReplies(storeId: string | undefined) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!storeId) return;
    const mine = ++seq.current;
    setLoading(true); setError('');
    try {
      const r = await apiListQuickReplies(storeId);
      if (mine === seq.current) { setReplies(r.replies ?? []); setLoaded(true); }
    } catch (e) {
      if (mine === seq.current) setError(errText(e, 'Could not load quick replies.'));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [storeId]);

  // Seller composer only: with no storeId (buyers) nothing is ever requested.
  useEffect(() => { setReplies([]); setLoaded(false); void load(); }, [load]);

  return { replies, loading, error, loaded, reload: load };
}

// ── Picker popover (above the composer) ──────────────────────────────────────
export function QuickReplyList({
  items, loading, error, loaded, activeIndex, onPick, onRetry, onManage, onHover,
  searchValue, onSearch, searchRef, onKeyDown,
}: {
  items: QuickReply[]; loading: boolean; error: string; loaded: boolean; activeIndex: number;
  onPick: (r: QuickReply) => void; onRetry: () => void; onManage: () => void; onHover: (i: number) => void;
  /** Button mode shows its own search box; "/" mode searches with the composer text (no box). */
  searchValue?: string; onSearch?: (v: string) => void; searchRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      role="dialog" aria-label="Quick replies" data-no-edge-scroll
      className="absolute bottom-full start-0 end-0 mb-2 z-30 rounded-2xl border border-[#eeece4] bg-white shadow-xl overflow-hidden"
    >
      {onSearch && (
        <div className="flex items-center gap-2 px-3 border-b border-[#eeece4]">
          <Search size={14} className="text-slate shrink-0" aria-hidden />
          <input
            ref={searchRef} value={searchValue ?? ''} onChange={e => onSearch(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search quick replies" aria-label="Search quick replies"
            className="flex-1 min-w-0 h-11 bg-transparent border-none outline-none text-[14px] text-charcoal"
          />
        </div>
      )}
      <div className="max-h-[260px] overflow-y-auto">
        {loading && !loaded ? (
          <p className="m-0 px-4 py-4 text-[13px] text-slate">Loading…</p>
        ) : error && !loaded ? (
          <div className="px-4 py-4 text-[13px]">
            <p role="alert" className="m-0 mb-2 text-error font-medium">{error}</p>
            <button type="button" onClick={onRetry} className="cursor-pointer bg-transparent border-none p-0 text-brand-orange font-semibold">Retry</button>
          </div>
        ) : items.length === 0 ? (
          <p className="m-0 px-4 py-4 text-[13px] text-slate">{loaded && !searchValue && !onSearch ? 'No quick replies match.' : 'No quick replies yet.'}</p>
        ) : (
          <ul ref={listRef} role="listbox" className="m-0 p-1 list-none">
            {items.map((r, i) => (
              <li
                key={r._id} role="option" aria-selected={i === activeIndex}
                onMouseEnter={() => onHover(i)}
                onMouseDown={e => { e.preventDefault(); onPick(r); }}
                className={clsx('min-h-[44px] px-3 py-2 rounded-xl cursor-pointer', i === activeIndex ? 'bg-cream' : 'bg-transparent')}
              >
                <p className="m-0 text-[13px] font-semibold text-charcoal truncate">{r.title}</p>
                <p className="m-0 text-[12px] text-slate truncate">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button" onMouseDown={e => e.preventDefault()} onClick={onManage}
        className="w-full min-h-[44px] border-0 border-t border-[#eeece4] bg-white text-[13px] font-semibold text-brand-orange cursor-pointer"
      >
        Manage quick replies
      </button>
    </div>
  );
}

// ── Manage screen ────────────────────────────────────────────────────────────
type Draft = { id: string | null; title: string; body: string; category: string };

export function QuickRepliesManager({
  storeId, replies, loading, error, loaded, onReload, onClose,
}: {
  storeId: string; replies: QuickReply[]; loading: boolean; error: string; loaded: boolean; onReload: () => Promise<void> | void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [toDelete, setToDelete] = useState<QuickReply | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const full = replies.length >= QUICK_REPLY_MAX;
  const titleErr = draft && draft.title.trim().length === 0 ? 'Title is required' : '';
  const bodyErr = draft && draft.body.trim().length === 0 ? 'Message is required' : '';

  const save = async () => {
    if (!draft || savingRef.current || titleErr || bodyErr) return;
    savingRef.current = true; setSaving(true); setFormError('');
    try {
      const input = { title: draft.title.trim(), body: draft.body.trim(), category: draft.category };
      if (draft.id) await apiUpdateQuickReply(storeId, draft.id, input);
      else await apiCreateQuickReply(storeId, input);
      await onReload();
      setDraft(null);
    } catch (e) {
      setFormError(errText(e, 'Could not save. Try again.'));
    } finally {
      savingRef.current = false; setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true); setDeleteError('');
    try {
      await apiDeleteQuickReply(storeId, toDelete._id);
      await onReload();
      setToDelete(null);
    } catch (e) {
      setDeleteError(errText(e, 'Could not delete. Try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const addVariable = (v: string) => {
    setDraft(d => {
      if (!d) return d;
      const el = bodyRef.current;
      const at = el?.selectionStart ?? d.body.length;
      const next = (d.body.slice(0, at) + v + d.body.slice(el?.selectionEnd ?? at)).slice(0, QUICK_REPLY_BODY_MAX);
      return { ...d, body: next };
    });
    bodyRef.current?.focus();
  };

  const form = draft && (
    <div className="flex flex-col gap-3">
      <div>
        <Input
          label="Title" value={draft.title} maxLength={QUICK_REPLY_TITLE_MAX} error={titleErr}
          onChange={e => { setDraft({ ...draft, title: e.target.value }); setFormError(''); }}
        />
        <p className="m-0 mt-1 text-[12px] text-slate text-end">{draft.title.length}/{QUICK_REPLY_TITLE_MAX}</p>
      </div>
      <Select label="Category" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>
        {QUICK_REPLY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </Select>
      <div>
        <Textarea
          ref={bodyRef} label="Message" rows={6} value={draft.body} maxLength={QUICK_REPLY_BODY_MAX} error={bodyErr}
          onChange={e => { setDraft({ ...draft, body: e.target.value }); setFormError(''); }}
        />
        <p className="m-0 mt-1 text-[12px] text-slate text-end">{draft.body.length}/{QUICK_REPLY_BODY_MAX}</p>
      </div>
      <div>
        <p className="m-0 mb-1.5 text-[12px] text-slate">Variables are filled in when you use the reply. Tap to add:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_REPLY_VARIABLES.map(v => (
            <button
              key={v} type="button" onClick={() => addVariable(v)}
              className="min-h-[44px] px-3 rounded-full border border-[#eeece4] bg-cream text-[12.5px] font-mono text-charcoal cursor-pointer"
            >{v}</button>
          ))}
        </div>
        <p className="m-0 mt-1.5 text-[12px] text-slate">{'{buyer_name}'} = the buyer's name · {'{store_name}'} = your store name</p>
      </div>
      {formError && <p role="alert" className="m-0 text-[12.5px] text-error font-medium">{formError}</p>}
    </div>
  );

  const groups = QUICK_REPLY_CATEGORIES
    .map(c => ({ ...c, items: replies.filter(r => r.category === c.value) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      <Modal
        title={draft ? (draft.id ? 'Edit quick reply' : 'New quick reply') : 'Quick replies'}
        onClose={() => { if (!saving) onClose(); }}
        width={560} mobileSheet fullHeightMobile
        footer={draft ? (
          <>
            <Button variant="ghost" onClick={() => { setDraft(null); setFormError(''); }} disabled={saving}>Back</Button>
            <Button variant="primary" onClick={() => void save()} loading={saving} disabled={saving || !!titleErr || !!bodyErr}>Save</Button>
          </>
        ) : (
          <>
            <span className="me-auto text-[12.5px] text-slate tabular-nums" aria-live="polite">{replies.length}/{QUICK_REPLY_MAX}</span>
            <Button
              variant="primary" onClick={() => setDraft({ id: null, title: '', body: '', category: 'general' })}
              disabled={full || (!loaded && loading)} title={full ? 'Maximum 50 quick replies' : undefined}
            ><Plus size={14} aria-hidden /> New reply</Button>
          </>
        )}
      >
        {draft ? form : (
          <div className="flex flex-col gap-4">
            {full && <p className="m-0 text-[12.5px] text-slate">Maximum 50 quick replies. Delete one to add another.</p>}
            {loading && !loaded ? (
              <p className="m-0 text-[13px] text-slate">Loading…</p>
            ) : error && !loaded ? (
              <div>
                <p role="alert" className="m-0 mb-2 text-[13px] text-error font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void onReload()}>Retry</Button>
              </div>
            ) : groups.length === 0 ? (
              <p className="m-0 text-[13px] text-slate">No quick replies yet. Add one to answer common questions in one tap.</p>
            ) : groups.map(g => (
              <section key={g.value} aria-label={g.label}>
                <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-slate">{g.label}</h3>
                <ul className="m-0 p-0 list-none flex flex-col gap-2">
                  {g.items.map(r => (
                    <li key={r._id} className="flex items-start gap-2 rounded-xl border border-[#eeece4] p-3">
                      <div className="flex-1 min-w-0">
                        <p className="m-0 text-[13px] font-semibold text-charcoal break-words">{r.title}</p>
                        <p className="m-0 mt-0.5 text-[12.5px] text-slate line-clamp-2 break-words">{r.body}</p>
                      </div>
                      <button
                        type="button" aria-label={`Edit ${r.title}`} onClick={() => setDraft({ id: r._id, title: r.title, body: r.body, category: r.category })}
                        className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full bg-transparent border-none text-slate hover:bg-cream cursor-pointer"
                      ><Pencil size={15} /></button>
                      <button
                        type="button" aria-label={`Delete ${r.title}`} onClick={() => { setDeleteError(''); setToDelete(r); }}
                        className="w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full bg-transparent border-none text-error hover:bg-cream cursor-pointer"
                      ><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Modal>
      {toDelete && (
        <ConfirmActionModal
          title="Delete this quick reply?" message={`"${toDelete.title}" will be removed. It will not come back.`}
          confirmLabel="Delete" danger busy={deleting} error={deleteError}
          onConfirm={() => void confirmDelete()} onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}
