import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { apiUpdateStore, type StoreFaq } from '@/api/services/store';
import { Toggle } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import type { StoreReturnPolicy } from '@/utils/sellerTrust';
import { useSettingsSection } from './settingsDirty';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';
const iconBtn = 'size-11 sm:size-9 inline-flex items-center justify-center rounded-lg border border-bone bg-white text-slate hover:text-carbon disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

const MAX_FAQS = 8;
const Q_MAX = 150;
const A_MAX = 500;
const SHIP_MAX = 500;

/**
 * "Policies & FAQ": the seller's return notes (physical + digital), shipping note and FAQ in ONE card / ONE save.
 * Kept in this file (anchor #returns) so the return notes have a single editor. Text only: it never changes the
 * platform refund rules or real shipping rates.
 */
export function ReturnPolicyCard({ storeId, policy, shippingNote, faqs, refetch }: {
  storeId: string;
  policy: StoreReturnPolicy | null | undefined;
  shippingNote?: string | null;
  faqs?: StoreFaq[] | null;
  refetch: () => void;
}) {
  const [accepted, setAccepted] = useState(policy?.returnsAccepted ?? true);
  const [days, setDays] = useState(String(policy?.windowDays || 7));
  const [note, setNote] = useState(policy?.note ?? '');
  const [digitalNote, setDigitalNote] = useState(policy?.digitalNote ?? '');
  const [shipNote, setShipNote] = useState(shippingNote ?? '');
  const [rows, setRows] = useState<StoreFaq[]>(faqs ?? []);

  const faqKey = JSON.stringify(faqs ?? []);
  useEffect(() => {
    setAccepted(policy?.returnsAccepted ?? true);
    setDays(String(policy?.windowDays || 7));
    setNote(policy?.note ?? '');
    setDigitalNote(policy?.digitalNote ?? '');
  }, [policy?.returnsAccepted, policy?.windowDays, policy?.note, policy?.digitalNote]);
  useEffect(() => { setShipNote(shippingNote ?? ''); }, [shippingNote]);
  useEffect(() => { setRows(JSON.parse(faqKey) as StoreFaq[]); }, [faqKey]);

  const n = Number(days);
  const daysError = accepted && (!Number.isInteger(n) || n < 1 || n > 90) ? 'Enter a whole number from 1 to 90.' : null;
  const noteError = note.length > 300 ? 'Keep the note to 300 characters.' : null;
  const digitalNoteError = digitalNote.length > 300 ? 'Keep the note to 300 characters.' : null;
  const shipError = shipNote.length > SHIP_MAX ? `Keep the shipping note to ${SHIP_MAX} characters.` : null;
  // A row is half-filled when exactly one of question / answer has text; fully blank rows are dropped on save.
  const rowError = (r: StoreFaq) => {
    const q = r.q.trim(); const a = r.a.trim();
    if (!q && !a) return null;
    if (!q) return 'Add the question.';
    if (!a) return 'Add the answer.';
    if (q.length > Q_MAX) return `Question: at most ${Q_MAX} characters.`;
    if (a.length > A_MAX) return `Answer: at most ${A_MAX} characters.`;
    return null;
  };
  const faqInvalid = rows.some(r => rowError(r));
  const blocked = !!(daysError || noteError || digitalNoteError || shipError || faqInvalid);

  const setRow = (i: number, patch: Partial<StoreFaq>) => setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => setRows(rs => {
    const j = i + d;
    if (j < 0 || j >= rs.length) return rs;
    const next = rs.slice(); [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  // What would be saved, compared with what the store has now: the card is "dirty" only when they differ.
  const snap = (acc: boolean, d: string, nt: string, dn: string, sn: string, fq: StoreFaq[]) => JSON.stringify({
    acc, d: acc ? d.trim() : '', nt: nt.trim(), dn: dn.trim(), sn: sn.trim(),
    fq: fq.filter(r => r.q.trim() || r.a.trim()).map(r => ({ q: r.q.trim(), a: r.a.trim() })),
  });
  const dirty = snap(accepted, days, note, digitalNote, shipNote, rows)
    !== snap(policy?.returnsAccepted ?? true, String(policy?.windowDays || 7), policy?.note ?? '', policy?.digitalNote ?? '', shippingNote ?? '', faqs ?? []);

  useSettingsSection('policies', {
    label: 'Policies & FAQ',
    dirty,
    blocked: blocked ? 'Fix the highlighted fields in Policies & FAQ first.' : null,
    discard: () => {
      setAccepted(policy?.returnsAccepted ?? true);
      setDays(String(policy?.windowDays || 7));
      setNote(policy?.note ?? '');
      setDigitalNote(policy?.digitalNote ?? '');
      setShipNote(shippingNote ?? '');
      setRows(JSON.parse(faqKey) as StoreFaq[]);
    },
    save: async () => {
      await apiUpdateStore({
        storeId,
        returnPolicy: { returnsAccepted: accepted, windowDays: accepted ? n : 0, note: note.trim() || null, digitalNote: digitalNote.trim() || null },
        shippingNote: shipNote.trim() || null,
        faqs: rows.filter(r => r.q.trim() || r.a.trim()).map(r => ({ q: r.q.trim(), a: r.a.trim() })),
      });
      refetch();
    },
  });

  return (
    <div id="returns" className="rounded-xl border border-bone bg-white p-5 scroll-mt-24">
      <p className="text-[13.5px] font-semibold text-charcoal mb-1">Policies &amp; FAQ</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-4">
        Shown to buyers on your store page. Digital downloads can be refunded only before they are downloaded, whatever you set here.
        Buyers still send a request that you review; this is your stated policy, and Edudeen's buyer protection always applies.
      </p>

      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-2">Returns</p>
      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream mb-4">
        <p className="text-[13px] font-medium text-charcoal">I accept returns on physical items</p>
        <Toggle label="Accept returns" checked={accepted} onChange={setAccepted} />
      </div>
      {accepted && (
        <div className="mb-4">
          <label htmlFor="return-window" className="text-[12px] font-semibold text-charcoal block mb-1.5">Return window (days after delivery)</label>
          <input id="return-window" type="number" min={1} max={90} step={1} value={days} onChange={e => setDays(e.target.value)} className={inputCls} />
          {daysError && <p className="text-[12px] text-red-600 mt-1">{daysError}</p>}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="return-note" className="text-[12px] font-semibold text-charcoal block mb-1.5">Note for buyers of physical items (optional)</label>
        <textarea id="return-note" rows={3} maxLength={300} value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="e.g. Items must be unused and in original packaging." />
        <p className="text-[12px] text-slate mt-1">{note.length}/300</p>
        {noteError && <p className="text-[12px] text-red-600 mt-1">{noteError}</p>}
      </div>
      <div className="mb-5">
        <label htmlFor="return-digital-note" className="text-[12px] font-semibold text-charcoal block mb-1.5">Note for buyers of digital downloads (optional)</label>
        <textarea id="return-digital-note" rows={3} maxLength={300} value={digitalNote} onChange={e => setDigitalNote(e.target.value)} className={inputCls} placeholder="e.g. Write to us if a file will not open and we will fix or replace it." />
        <p className="text-[12px] text-slate mt-1">{digitalNote.length}/300 · Text only: the refund rule for digital files does not change.</p>
        {digitalNoteError && <p className="text-[12px] text-red-600 mt-1">{digitalNoteError}</p>}
      </div>

      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-2">Shipping</p>
      <div className="mb-5">
        <label htmlFor="shipping-note" className="text-[12px] font-semibold text-charcoal block mb-1.5">Shipping note (optional)</label>
        <textarea id="shipping-note" rows={3} maxLength={SHIP_MAX} value={shipNote} onChange={e => setShipNote(e.target.value)} className={inputCls} placeholder="e.g. Orders are packed Monday to Saturday and sent with TCS." />
        <p className="text-[12px] text-slate mt-1">{shipNote.length}/{SHIP_MAX} · Text only: delivery charges and times are set on the Shipping page.</p>
        {shipError && <p className="text-[12px] text-red-600 mt-1">{shipError}</p>}
      </div>

      <p id="sp-faq" className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-2 scroll-mt-24">FAQ</p>
      <p className="text-[12px] text-slate mb-3">Up to {MAX_FAQS} questions buyers often ask. Order them with the arrows.</p>
      <div className="flex flex-col gap-3 mb-3">
        {rows.map((r, i) => {
          const err = rowError(r);
          return (
            <div key={i} className="rounded-lg border border-bone p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[12px] font-semibold text-slate">Question {i + 1}</span>
                <div className="flex items-center gap-1.5">
                  <button type="button" className={iconBtn} aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button type="button" className={iconBtn} aria-label={`Move question ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                  <button type="button" className={iconBtn} aria-label={`Delete question ${i + 1}`} onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))}><Trash2 size={14} /></button>
                </div>
              </div>
              <input aria-label={`Question ${i + 1}`} className={inputCls} maxLength={Q_MAX} value={r.q} onChange={e => setRow(i, { q: e.target.value })} placeholder="Question" />
              <p className="text-[12px] text-slate mt-1 mb-2">{r.q.length}/{Q_MAX}</p>
              <textarea aria-label={`Answer ${i + 1}`} rows={3} className={inputCls} maxLength={A_MAX} value={r.a} onChange={e => setRow(i, { a: e.target.value })} placeholder="Answer" />
              <p className="text-[12px] text-slate mt-1">{r.a.length}/{A_MAX}</p>
              {err && <p role="alert" className="text-[12px] text-red-600 mt-1">{err}</p>}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-[12.5px] text-slate">No FAQ yet. Nothing is shown on your store page until you add one.</p>}
      </div>
      <Button size="sm" variant="outline" disabled={rows.length >= MAX_FAQS} onClick={() => setRows(rs => [...rs, { q: '', a: '' }])}>
        <Plus size={13} className="inline align-middle me-1" /> Add question
      </Button>
      <span className="text-[12px] text-slate ms-2">{rows.length}/{MAX_FAQS}</span>
    </div>
  );
}
