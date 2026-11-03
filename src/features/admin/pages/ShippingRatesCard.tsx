import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, SkeletonBox, Toggle } from '@/components/comman/ui';
import {
  apiAdminGetShippingRates, apiAdminSaveShippingRates,
  type ShippingRateTable, type RouteKey,
} from '@/api/services/shipping';

const inp = 'w-full px-3 py-[8px] text-[13px] border border-bone rounded-lg text-carbon bg-white outline-none focus:border-brand-royal';

const ROUTES: { key: RouteKey; label: string; hint: string }[] = [
  { key: 'sameCity', label: 'Same city', hint: 'Seller ships from the buyer\'s city.' },
  { key: 'sameProvince', label: 'Same province', hint: 'Different city, same province.' },
  { key: 'national', label: 'Rest of Pakistan', hint: 'Different province.' },
];

// Form keeps everything as text so half-typed numbers do not jump around.
interface SlabDraft { upToKg: string; feePKR: string }
interface RouteDraft { slabs: SlabDraft[]; extraPerKgPKR: string }
interface Draft {
  enabled: boolean;
  routes: Record<RouteKey, RouteDraft>;
  fragileSurchargePKR: string; fuelSurchargePct: string; taxPct: string; volumetricDivisor: string;
}

const toDraft = (t: ShippingRateTable): Draft => ({
  enabled: !!t.enabled,
  routes: Object.fromEntries(ROUTES.map(r => [r.key, {
    slabs: (t.routes?.[r.key]?.slabs ?? []).map(s => ({ upToKg: String(s.upToKg), feePKR: String(s.feePKR) })),
    extraPerKgPKR: String(t.routes?.[r.key]?.extraPerKgPKR ?? 0),
  }])) as Record<RouteKey, RouteDraft>,
  fragileSurchargePKR: String(t.fragileSurchargePKR ?? 0),
  fuelSurchargePct: String(t.fuelSurchargePct ?? 0),
  taxPct: String(t.taxPct ?? 0),
  volumetricDivisor: String(t.volumetricDivisor ?? 5000),
});

const num = (s: string) => (s.trim() === '' ? NaN : Number(s));

/** Returns the table to send, or an error text. */
function build(d: Draft): { table?: ShippingRateTable; error?: string } {
  const routes = {} as ShippingRateTable['routes'];
  for (const r of ROUTES) {
    const rd = d.routes[r.key];
    if (rd.slabs.length < 1 || rd.slabs.length > 12) return { error: `${r.label}: add between 1 and 12 weight rows.` };
    const slabs = rd.slabs.map(s => ({ upToKg: num(s.upToKg), feePKR: num(s.feePKR) }));
    for (let i = 0; i < slabs.length; i++) {
      const s = slabs[i];
      if (!Number.isFinite(s.upToKg) || s.upToKg <= 0) return { error: `${r.label}, row ${i + 1}: "up to kg" must be more than 0.` };
      if (!Number.isFinite(s.feePKR) || s.feePKR < 0) return { error: `${r.label}, row ${i + 1}: fee must be 0 or more.` };
      if (i > 0 && s.upToKg <= slabs[i - 1].upToKg) return { error: `${r.label}, row ${i + 1}: kg must be higher than the row above.` };
      if (i > 0 && s.feePKR < slabs[i - 1].feePKR) return { error: `${r.label}, row ${i + 1}: fee cannot be lower than the row above.` };
    }
    const extra = num(rd.extraPerKgPKR);
    if (!Number.isFinite(extra) || extra < 0) return { error: `${r.label}: extra per additional kg must be 0 or more.` };
    routes[r.key] = { slabs, extraPerKgPKR: extra };
  }
  const fragile = num(d.fragileSurchargePKR), fuel = num(d.fuelSurchargePct), tax = num(d.taxPct), vol = num(d.volumetricDivisor);
  if (!Number.isFinite(fragile) || fragile < 0) return { error: 'Fragile surcharge must be 0 or more.' };
  if (!Number.isFinite(fuel) || fuel < 0 || fuel > 100) return { error: 'Fuel surcharge must be between 0 and 100 %.' };
  if (!Number.isFinite(tax) || tax < 0 || tax > 100) return { error: 'Tax must be between 0 and 100 %.' };
  if (!Number.isFinite(vol) || vol < 1000 || vol > 10000) return { error: 'Volumetric divisor must be between 1000 and 10000.' };
  return { table: { enabled: d.enabled, routes, fragileSurchargePKR: fragile, fuelSurchargePct: fuel, taxPct: tax, volumetricDivisor: vol } };
}

function Field({ id, label, hint, value, onChange }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-[12px] font-semibold text-charcoal block mb-1.5">{label}</label>
      <input id={id} type="number" min={0} step="any" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} className={inp} />
      {hint && <p className="text-[12px] text-slate mt-1">{hint}</p>}
    </div>
  );
}

/** Admin: weight-based delivery rate table (all PKR). When off, flat zone fees are used. */
export function ShippingRatesCard() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoadError('');
    apiAdminGetShippingRates()
      .then(res => { if (alive) setDraft(toDraft(res.data)); })
      .catch(err => { if (alive) setLoadError(err instanceof Error ? err.message : 'Could not load the rate table.'); });
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
  if (!draft) return <div className="flex flex-col gap-3"><SkeletonBox height={40} rounded="8px" /><SkeletonBox height={120} rounded="8px" /></div>;

  const edit = (fn: (d: Draft) => Draft) => { setDraft(d => (d ? fn(d) : d)); setMsg(null); };
  const setRoute = (k: RouteKey, fn: (r: RouteDraft) => RouteDraft) => edit(d => ({ ...d, routes: { ...d.routes, [k]: fn(d.routes[k]) } }));
  const check = build(draft);

  async function save() {
    const out = build(draft!);
    if (!out.table) { setMsg({ ok: false, text: out.error ?? 'Check the values.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await apiAdminSaveShippingRates(out.table);
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
      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream">
        <div>
          <p className="text-[13px] font-medium text-charcoal">Use weight-based delivery rates</p>
          <p className="text-[12px] text-slate">When off, the flat zone fees above are used as before. When on, delivery is worked out per seller from parcel weight, route, and surcharges.</p>
        </div>
        <Toggle label="Use weight-based delivery rates" checked={draft.enabled} onChange={v => edit(d => ({ ...d, enabled: v }))} />
      </div>

      {ROUTES.map(r => {
        const rd = draft.routes[r.key];
        return (
          <div key={r.key} className="rounded-xl border border-bone p-4">
            <p className="text-[13.5px] font-semibold text-charcoal">{r.label}</p>
            <p className="text-[12px] text-slate mb-3">{r.hint} Fee is for parcels up to the weight shown (PKR).</p>
            <div className="flex flex-col gap-2">
              {rd.slabs.map((s, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`rt-${r.key}-kg-${i}`} className="text-[12px] text-slate block mb-1">Up to (kg)</label>
                    <input id={`rt-${r.key}-kg-${i}`} type="number" min={0} step="any" inputMode="decimal" value={s.upToKg} className={inp}
                      onChange={e => setRoute(r.key, x => ({ ...x, slabs: x.slabs.map((y, j) => (j === i ? { ...y, upToKg: e.target.value } : y)) }))} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label htmlFor={`rt-${r.key}-fee-${i}`} className="text-[12px] text-slate block mb-1">Fee (Rs)</label>
                    <input id={`rt-${r.key}-fee-${i}`} type="number" min={0} step="any" inputMode="decimal" value={s.feePKR} className={inp}
                      onChange={e => setRoute(r.key, x => ({ ...x, slabs: x.slabs.map((y, j) => (j === i ? { ...y, feePKR: e.target.value } : y)) }))} />
                  </div>
                  <button type="button" aria-label={`Remove row ${i + 1} of ${r.label}`} disabled={rd.slabs.length <= 1}
                    onClick={() => setRoute(r.key, x => ({ ...x, slabs: x.slabs.filter((_, j) => j !== i) }))}
                    className="size-9 shrink-0 rounded-lg flex items-center justify-center text-slate hover:text-error hover:bg-error-bg cursor-pointer bg-transparent border-0 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-4 mt-3">
              <Button size="sm" variant="outline" icon={<Plus size={14} />} disabled={rd.slabs.length >= 12}
                onClick={() => setRoute(r.key, x => {
                  const last = x.slabs[x.slabs.length - 1];
                  return { ...x, slabs: [...x.slabs, { upToKg: last ? String((Number(last.upToKg) || 0) + 1) : '1', feePKR: last?.feePKR ?? '0' }] };
                })}>Add row</Button>
              <div className="w-[220px] max-w-full">
                <Field id={`rt-${r.key}-extra`} label="Extra per additional kg (Rs)" hint="Charged for each kg above the last row."
                  value={rd.extraPerKgPKR} onChange={v => setRoute(r.key, x => ({ ...x, extraPerKgPKR: v }))} />
              </div>
            </div>
          </div>
        );
      })}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="rt-fragile" label="Fragile surcharge (Rs)" value={draft.fragileSurchargePKR} onChange={v => edit(d => ({ ...d, fragileSurchargePKR: v }))} />
        <Field id="rt-fuel" label="Fuel surcharge (%)" value={draft.fuelSurchargePct} onChange={v => edit(d => ({ ...d, fuelSurchargePct: v }))} />
        <Field id="rt-tax" label="Tax (%)" value={draft.taxPct} onChange={v => edit(d => ({ ...d, taxPct: v }))} />
        <Field id="rt-vol" label="Volumetric divisor" hint="Default 5000 (courier standard)." value={draft.volumetricDivisor} onChange={v => edit(d => ({ ...d, volumetricDivisor: v }))} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" loading={saving} disabled={saving} onClick={save}>Save rates</Button>
        {!check.table && <span className="text-[12px] text-error">{check.error}</span>}
        {msg && <span role="status" className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-error'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
