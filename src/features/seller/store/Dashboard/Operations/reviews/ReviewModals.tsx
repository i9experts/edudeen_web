import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Sparkles, Check } from 'lucide-react';
import { Modal, Button, SkeletonBox, Badge } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetRequestableOrders, apiRequestReview, apiReportReview, apiSaveReplyTemplates, REPORT_REASONS,
  type RequestableOrder, type ReplyTemplate,
} from '@/api/services/rating';
import { apiGetAiStudioCredits } from '@/api/services/aiStudio';
import { aiErrorInfo } from '@/api/services/aiFeatures';

const fieldCls = 'w-full border border-bone rounded-lg px-3 py-2 text-[13px] text-charcoal outline-none box-border focus:border-brand-royal';
const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/* ── Reply / edit reply ─────────────────────────────────────────────────── */
export function ReplyModal({
  title, initialText, storeId, templates, onManageTemplates, onDraft, onClose, onSubmit,
}: {
  title: string; initialText: string; storeId: string; templates: ReplyTemplate[];
  onManageTemplates: () => void;
  /** AI draft (1 credit). Never posts: the text lands in the box for the seller to edit. */
  onDraft?: () => Promise<string>;
  onClose: () => void; onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!onDraft) return;
    let alive = true;
    apiGetAiStudioCredits(storeId).then(r => { if (alive) setCredits(r.data.balance); }).catch(() => undefined);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function draft() {
    if (!onDraft || drafting) return;
    setDrafting(true); setError('');
    try { setText(await onDraft()); setDrafted(true); setCredits(c => (c == null ? c : Math.max(0, c - 1))); }
    catch (err) { setError(aiErrorInfo(err).message); }
    finally { setDrafting(false); }
  }

  async function submit() {
    if (saving) return;
    if (!text.trim()) { setError('Reply cannot be empty.'); return; }
    setError(''); setSaving(true);
    try { await onSubmit(text.trim()); }
    catch (err) { setError(errMsg(err, 'Failed to save reply.')); setSaving(false); }
  }

  const noCredits = credits === 0;
  return (
    <Modal title={title} onClose={onClose} mobileSheet footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={submit} loading={saving}>Post reply</Button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-slate">Shown publicly under the review as “Seller response”. You can edit it for 24 hours.</p>
        <textarea
          value={text} onChange={e => { setText(e.target.value); setError(''); }} rows={5} maxLength={800}
          placeholder="Write your reply…" aria-label="Reply" className={`${fieldCls} resize-y`}
        />
        {templates.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] text-slate">Templates:</span>
            {templates.map(t => (
              <button key={t.id} type="button" onClick={() => { setText(t.text); setDrafted(false); setError(''); }}
                className="px-2.5 py-1 rounded-full border border-bone bg-white text-[12px] text-charcoal hover:border-brand-royal cursor-pointer">
                {t.title}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onManageTemplates} className="self-start text-[12px] text-brand-royal underline bg-transparent border-0 p-0 cursor-pointer">
          {templates.length ? 'Manage templates' : 'Save reply templates (up to 5)'}
        </button>
        {onDraft && (
          <div className="rounded-lg bg-cream px-3 py-2.5 flex flex-col gap-1.5">
            <Button variant="secondary" size="sm" onClick={draft} loading={drafting} disabled={noCredits} icon={<Sparkles size={13} />}>
              Draft with AI · 1 credit
            </Button>
            {noCredits
              ? <p className="text-[12px] text-error">You have 0 AI credits. <Link to={`/store/${storeId}/ai/studio`} className="underline">Buy credits in AI Studio</Link>.</p>
              : <p className="text-[12px] text-slate">{credits != null ? `${credits} credits left. ` : ''}The draft is only a suggestion — edit it, then post.</p>}
            {drafted && <p className="text-[12px] text-success inline-flex items-center gap-1"><Check size={12} /> AI draft added. Not posted yet.</p>}
          </div>
        )}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Report a review ────────────────────────────────────────────────────── */
export function ReportModal({ reviewId, onClose, onDone }: { reviewId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (busy) return;
    if (!code) { setError('Choose a reason.'); return; }
    if (code === 'other' && text.trim().length < 5) { setError('Please describe the problem (at least 5 characters).'); return; }
    setBusy(true); setError('');
    try { await apiReportReview(reviewId, code, text.trim()); toast.success('Review reported. Edudeen will look at it.'); onDone(); }
    catch (err) { setError(errMsg(err, 'Could not report this review.')); setBusy(false); }
  }

  return (
    <Modal title="Report this review" onClose={onClose} mobileSheet footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={submit} loading={busy}>Send report</Button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-slate">The review stays public until Edudeen decides. You can report a review once.</p>
        <fieldset className="flex flex-col gap-1.5 border-0 p-0 m-0">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map(r => (
            <label key={r.code} className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer min-h-[36px]">
              <input type="radio" name="report-reason" checked={code === r.code} onChange={() => { setCode(r.code); setError(''); }} />
              {r.label}
            </label>
          ))}
        </fieldset>
        <div>
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, 300))} rows={3} maxLength={300}
            placeholder={code === 'other' ? 'Describe the problem (required)' : 'Add details (optional)'} aria-label="Details" className={`${fieldCls} resize-y`} />
          <p className="text-[12px] text-slate text-end mt-0.5">{text.length}/300</p>
        </div>
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Reply templates (max 5) ────────────────────────────────────────────── */
export function TemplatesModal({
  storeId, initial, onClose, onSaved,
}: { storeId: string; initial: ReplyTemplate[]; onClose: () => void; onSaved: (t: ReplyTemplate[]) => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<ReplyTemplate[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (i: number, patch: Partial<ReplyTemplate>) => { setRows(rs => rs.map((r, k) => (k === i ? { ...r, ...patch } : r))); setError(''); };

  async function save() {
    if (busy) return;
    if (rows.some(r => !r.title.trim() || r.text.trim().length < 5)) { setError('Each template needs a title and text (5+ characters).'); return; }
    setBusy(true); setError('');
    try {
      const res = await apiSaveReplyTemplates(storeId, rows.map(r => ({ ...r, title: r.title.trim(), text: r.text.trim() })));
      onSaved(res.data.templates); toast.success('Templates saved.');
    } catch (err) { setError(errMsg(err, 'Could not save templates.')); setBusy(false); }
  }

  return (
    <Modal title="Reply templates" onClose={onClose} mobileSheet footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={save} loading={busy}>Save templates</Button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-slate">Save up to 5 short replies you use often, then insert them with one click.</p>
        {rows.length === 0 && <p className="text-[13px] text-slate">No templates yet.</p>}
        {rows.map((r, i) => (
          <div key={r.id || i} className="border border-bone rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input value={r.title} onChange={e => set(i, { title: e.target.value.slice(0, 40) })} placeholder="Title (e.g. Thank you)" aria-label={`Template ${i + 1} title`} className={fieldCls} />
              <button type="button" aria-label={`Delete template ${i + 1}`} onClick={() => setRows(rs => rs.filter((_, k) => k !== i))}
                className="shrink-0 w-9 h-9 grid place-items-center rounded-lg border border-bone bg-white text-slate hover:text-error cursor-pointer"><Trash2 size={14} /></button>
            </div>
            <textarea value={r.text} onChange={e => set(i, { text: e.target.value.slice(0, 800) })} rows={3} placeholder="Reply text" aria-label={`Template ${i + 1} text`} className={`${fieldCls} resize-y`} />
          </div>
        ))}
        {rows.length < 5 && (
          <Button variant="secondary" size="sm" icon={<Plus size={13} />} onClick={() => setRows(rs => [...rs, { id: '', title: '', text: '' }])}>Add template ({rows.length}/5)</Button>
        )}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

/* ── Request reviews from completed orders ──────────────────────────────── */
const MAX_PER_SEND = 20;
export function RequestReviewsModal({ storeId, onClose, onSent }: { storeId: string; onClose: () => void; onSent: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState<RequestableOrder[] | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setItems(null); setError('');
    apiGetRequestableOrders(storeId)
      .then(r => { if (alive) setItems(r.data.items); })
      .catch(e => { if (alive) setError(errMsg(e, 'Could not load your orders.')); });
    return () => { alive = false; };
  }, [storeId, tick]);

  const eligible = (items ?? []).filter(i => i.eligible && !sent.has(i.orderId));

  function toggle(id: string) {
    setPicked(p => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else if (n.size < MAX_PER_SEND) n.add(id);
      return n;
    });
  }

  async function send() {
    if (sending || picked.size === 0) return;
    setSending(true);
    const ok = new Set(sent); const bad: Record<string, string> = {};
    for (const id of picked) {
      try { await apiRequestReview(id); ok.add(id); }
      catch (e) { bad[id] = errMsg(e, 'Could not send'); }
    }
    setSent(ok); setFailed(bad); setPicked(new Set()); setSending(false);
    const okCount = Object.keys(bad).length === 0 ? picked.size : picked.size - Object.keys(bad).length;
    if (okCount > 0) { toast.success(`${okCount} review request${okCount === 1 ? '' : 's'} sent.`); onSent(); }
    if (Object.keys(bad).length) toast.error(`${Object.keys(bad).length} could not be sent.`);
  }

  const date = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '');
  return (
    <Modal title="Request reviews" onClose={onClose} mobileSheet fullHeightMobile footer={
      <>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={send} loading={sending} disabled={picked.size === 0}>Send request{picked.size ? ` (${picked.size})` : ''}</Button>
      </>
    }>
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-slate">Each buyer gets one standard message from Edudeen with a link to review. You can request once per order, up to 60 days after delivery, {MAX_PER_SEND} at a time.</p>
        {error ? (
          <div className="text-[13px] text-error flex items-center gap-3">{error}<Button size="sm" variant="secondary" onClick={() => setTick(t => t + 1)}>Retry</Button></div>
        ) : items === null ? (
          <div className="flex flex-col gap-2">{[1, 2, 3].map(i => <SkeletonBox key={i} height={52} rounded="8px" />)}</div>
        ) : items.length === 0 ? (
          <p className="text-[13px] text-slate py-6 text-center">No completed orders to request reviews for yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {items.map(o => {
              const justSent = sent.has(o.orderId);
              const already = !!o.requestedAt || (!o.eligible && o.blockedReason === 'already_requested');
              const disabled = !o.eligible || justSent;
              const reason = justSent ? 'Sent' : o.blockedText;
              return (
                <li key={o.orderId} title={disabled && reason ? reason : undefined}
                  className={`flex items-center gap-3 border border-bone rounded-lg px-3 py-2.5 min-h-[52px] ${disabled ? 'bg-cream/60' : 'bg-white'}`}>
                  <input type="checkbox" aria-label={`Select order ${o.orderNumber}`} disabled={disabled || sending}
                    checked={picked.has(o.orderId)} onChange={() => toggle(o.orderId)}
                    className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-charcoal truncate">{o.buyerName} · #{o.orderNumber}</p>
                    <p className="text-[12px] text-slate truncate">{o.productName}{o.itemCount > 1 ? ` +${o.itemCount - 1}` : ''} · {date(o.date)}</p>
                    {failed[o.orderId] && <p className="text-[12px] text-error">{failed[o.orderId]}</p>}
                  </div>
                  {justSent ? <Badge color="green">Sent</Badge>
                    : already ? <Badge color="gray">Requested {date(o.requestedAt)}</Badge>
                    : !o.eligible ? <span className="text-[12px] text-slate text-end max-w-[130px]">{o.blockedText}</span>
                    : null}
                </li>
              );
            })}
          </ul>
        )}
        {items && eligible.length > MAX_PER_SEND && <p className="text-[12px] text-slate">Only {MAX_PER_SEND} can be sent at once; send these, then pick more.</p>}
      </div>
    </Modal>
  );
}
