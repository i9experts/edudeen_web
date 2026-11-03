import { useEffect, useState } from 'react';
import { Button, SkeletonBox, Toggle } from '@/components/comman/ui';
import { apiAdminGetCourierSettings, apiAdminSaveCourierSettings, type CourierSettings } from '@/api/services/shipping';

const inp = 'w-full px-3 py-[8px] text-[13px] border border-bone rounded-lg text-carbon bg-white outline-none focus:border-brand-royal';

const COURIERS: { id: keyof CourierSettings['enabled']; label: string }[] = [
  { id: 'tcs', label: 'TCS' },
  { id: 'leopards', label: 'Leopards' },
  { id: 'postex', label: 'PostEx' },
];

interface Draft { enabled: CourierSettings['enabled']; useLiveRates: boolean; markupPct: string; handlingFeePKR: string }
const toDraft = (s: CourierSettings): Draft => ({
  enabled: { tcs: !!s.enabled?.tcs, leopards: !!s.enabled?.leopards, postex: !!s.enabled?.postex },
  useLiveRates: !!s.useLiveRates,
  markupPct: String(s.markupPct ?? 0),
  handlingFeePKR: String(s.handlingFeePKR ?? 0),
});
const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

function build(d: Draft): { value?: CourierSettings; error?: string } {
  const markup = num(d.markupPct), fee = num(d.handlingFeePKR);
  if (!Number.isFinite(markup) || markup < 0 || markup > 100) return { error: 'Markup must be between 0 and 100 %.' };
  if (!Number.isFinite(fee) || fee < 0 || fee > 100000) return { error: 'Handling fee must be 0 or more (max 100,000).' };
  return { value: { enabled: d.enabled, useLiveRates: d.useLiveRates, markupPct: markup, handlingFeePKR: fee } };
}

/** Admin: which Edudeen couriers sellers may choose, live rates switch, and the markup added on live quotes. */
export function CouriersCard() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadError('');
    apiAdminGetCourierSettings()
      .then(res => { if (alive) setDraft(toDraft(res.data)); })
      .catch(err => { if (alive) setLoadError(err instanceof Error ? err.message : 'Could not load courier settings.'); });
    return () => { alive = false; };
  }, [tick]);

  if (loadError) {
    return (
      <div className="flex items-center gap-3">
        <p role="alert" className="text-[13px] text-error">{loadError}</p>
        <Button size="sm" variant="outline" onClick={() => setTick(t => t + 1)}>Try again</Button>
      </div>
    );
  }
  if (!draft) return <div className="flex flex-col gap-3"><SkeletonBox height={40} rounded="8px" /><SkeletonBox height={80} rounded="8px" /></div>;

  const edit = (fn: (d: Draft) => Draft) => { setDraft(d => (d ? fn(d) : d)); setMsg(null); };
  const check = build(draft);

  async function save() {
    const out = build(draft!);
    if (!out.value) { setMsg({ ok: false, text: out.error ?? 'Check the values.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await apiAdminSaveCourierSettings(out.value);
      setDraft(toDraft(res.data));
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12.5px] text-slate leading-relaxed">
        Edudeen uses one courier account for all sellers. A courier only becomes selectable for sellers when it is switched on here
        AND its account credentials are set on the server. Live rates need those credentials too; until then (or when a courier
        cannot give a price) the weight-based table above is used, then the flat zone fee.
      </p>

      <div className="rounded-xl border border-bone p-4 flex flex-col gap-3">
        <p className="text-[13.5px] font-semibold text-charcoal">Couriers sellers may choose</p>
        {COURIERS.map(c => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream">
            <p className="text-[13px] font-medium text-charcoal">{c.label}</p>
            <Toggle label={`Offer ${c.label}`} checked={draft.enabled[c.id]} onChange={v => edit(d => ({ ...d, enabled: { ...d.enabled, [c.id]: v } }))} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream">
        <div>
          <p className="text-[13px] font-medium text-charcoal">Use live courier rates</p>
          <p className="text-[12px] text-slate">Ask the courier for its price at checkout (cached for an hour). Off = the weight-based table / zone fee only.</p>
        </div>
        <Toggle label="Use live courier rates" checked={draft.useLiveRates} onChange={v => edit(d => ({ ...d, useLiveRates: v }))} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-markup" className="text-[12px] font-semibold text-charcoal block mb-1.5">Markup on live rates (%)</label>
          <input id="cr-markup" type="number" min={0} max={100} step="any" inputMode="decimal" value={draft.markupPct} className={inp} onChange={e => edit(d => ({ ...d, markupPct: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="cr-handling" className="text-[12px] font-semibold text-charcoal block mb-1.5">Handling fee per parcel (Rs)</label>
          <input id="cr-handling" type="number" min={0} step="any" inputMode="decimal" value={draft.handlingFeePKR} className={inp} onChange={e => edit(d => ({ ...d, handlingFeePKR: e.target.value }))} />
        </div>
      </div>
      <p className="text-[12px] text-slate -mt-2">Markup and handling fee are added to live courier prices only, not to the weight-based table.</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" loading={saving} disabled={saving} onClick={save}>Save courier settings</Button>
        {!check.value && <span className="text-[12px] text-error">{check.error}</span>}
        {msg && <span role="status" className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-error'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
