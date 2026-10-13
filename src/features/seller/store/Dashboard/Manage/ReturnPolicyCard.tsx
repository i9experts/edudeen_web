import { useEffect, useState } from 'react';
import { apiUpdateStore } from '@/api/services/store';
import { Toggle } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import type { StoreReturnPolicy } from '@/utils/sellerTrust';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

export function ReturnPolicyCard({ storeId, policy, refetch }: {
  storeId: string;
  policy: StoreReturnPolicy | null | undefined;
  refetch: () => void;
}) {
  const [accepted, setAccepted] = useState(policy?.returnsAccepted ?? true);
  const [days, setDays] = useState(String(policy?.windowDays || 7));
  const [note, setNote] = useState(policy?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setAccepted(policy?.returnsAccepted ?? true);
    setDays(String(policy?.windowDays || 7));
    setNote(policy?.note ?? '');
  }, [policy?.returnsAccepted, policy?.windowDays, policy?.note]);

  const n = Number(days);
  const daysError = accepted && (!Number.isInteger(n) || n < 1 || n > 90) ? 'Enter a whole number from 1 to 90.' : null;
  const noteError = note.length > 300 ? 'Keep the note to 300 characters.' : null;

  async function save() {
    if (daysError || noteError) return;
    setSaving(true); setMsg(null);
    try {
      await apiUpdateStore({
        storeId,
        returnPolicy: { returnsAccepted: accepted, windowDays: accepted ? n : 0, note: note.trim() || null },
      });
      refetch();
      setMsg({ ok: true, text: 'Return policy saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save the return policy.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-bone bg-white p-5">
      <p className="text-[13.5px] font-semibold text-charcoal mb-1">Return policy</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-4">
        Shown to buyers on your product pages for physical items. Digital downloads can be refunded only before they are downloaded, whatever you set here.
        Buyers still send a request that you review; this is your stated policy.
      </p>
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
        <label htmlFor="return-note" className="text-[12px] font-semibold text-charcoal block mb-1.5">Note for buyers (optional)</label>
        <textarea id="return-note" rows={3} maxLength={300} value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="e.g. Items must be unused and in original packaging." />
        <p className="text-[12px] text-slate mt-1">{note.length}/300</p>
        {noteError && <p className="text-[12px] text-red-600 mt-1">{noteError}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" loading={saving} disabled={!!daysError || !!noteError} onClick={save}>Save return policy</Button>
        {msg && <span className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
