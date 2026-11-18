import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { apiUpdatePayoutSchedule, type EarningsSummary } from '@/api/services/finance';
import { PAYOUT_CHOICES, payoutCadence } from './payoutCadence';

/**
 * The seller's OWN choice of payout rhythm for this wallet currency. Nothing is moved automatically: a store keeps
 * the schedule it has (platform default: monthly) until the seller saves another one here. Only the date a payout
 * request is created changes; fees, clearing days and the minimum amount are not touched.
 */
export function PayoutScheduleCard({ s, storeId, onSaved }: { s: EarningsSummary; storeId: string; onSaved: () => void }) {
  const current = s.payoutFrequency === 'semimonthly' ? 'semimonthly' : s.payoutFrequency === 'monthly' || !s.payoutFrequency ? 'monthly' : null;
  const [pick, setPick] = useState<string>(current ?? 'monthly');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setPick(current ?? 'monthly'); setMsg(null); }, [current, s.currency]);

  // Schedules that are not one of the two seller options (daily / weekly / every 2 weeks / on request) are set by the Edudeen team.
  if (current === null) {
    return (
      <p className="text-[12.5px] text-slate flex items-center gap-2"><CalendarDays size={14} className="shrink-0" />Your payouts are {payoutCadence(s.payoutFrequency)}. Ask the Edudeen team if you want to change this.</p>
    );
  }

  const dirty = pick !== current;
  async function save() {
    setSaving(true); setMsg(null);
    try {
      await apiUpdatePayoutSchedule(storeId, { currency: s.currency, frequency: pick as 'monthly' | 'semimonthly' });
      setMsg({ ok: true, text: 'Saved. Your next payout date is updated.' });
      onSaved();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save your payout schedule.' });
    } finally { setSaving(false); }
  }

  return (
    <section aria-labelledby="payout-schedule-h" className="bg-white border border-bone rounded-xl px-5 py-4">
      <h2 id="payout-schedule-h" className="text-[14px] font-bold text-carbon m-0 flex items-center gap-2"><CalendarDays size={15} className="text-brand-royal" />Payout schedule ({s.currency})</h2>
      <p className="text-[12.5px] text-slate mt-1 mb-3">How often Edudeen prepares your payout. Only money that finished clearing is paid, each payout still needs admin approval, and the minimum amount is unchanged.</p>
      <div role="radiogroup" aria-label="Payout schedule" className="flex flex-col sm:flex-row gap-2">
        {PAYOUT_CHOICES.map(o => (
          <label key={o.value} className={`flex-1 min-h-[44px] flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer ${pick === o.value ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white'}`}>
            <input type="radio" name="payout-schedule" value={o.value} checked={pick === o.value} onChange={() => { setPick(o.value); setMsg(null); }} className="mt-1" />
            <span><span className="block text-[13px] font-semibold text-carbon">{o.label}</span><span className="block text-[12px] text-slate">{o.hint}</span></span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <Button size="sm" variant="primary" loading={saving} disabled={!dirty} onClick={save}>Save schedule</Button>
        {msg && <span role={msg.ok ? 'status' : 'alert'} className={`text-[12.5px] ${msg.ok ? 'text-success' : 'text-error'}`}>{msg.text}</span>}
      </div>
    </section>
  );
}
