import { Input } from '@/components/comman/ui';
import { CARRIERS, OTHER_CARRIER, isSelfCarrier, trackingUrlFor, type ShipForm } from '@/utils/carriers';

export const EMPTY_SHIP_FORM: ShipForm = { carrier: '', otherName: '', number: '', url: '', expected: '', note: '' };

const selectCls = 'w-full min-h-[44px] px-3 rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

/** Next form state after an edit. The tracking link follows carrier + number until the seller edits the link by hand. */
export function nextShipForm(prev: ShipForm, patch: Partial<ShipForm>, urlTouched: boolean): ShipForm {
  const f = { ...prev, ...patch };
  if (!urlTouched && ('carrier' in patch || 'number' in patch) && !('url' in patch)) f.url = trackingUrlFor(f.carrier, f.number);
  if (isSelfCarrier(f.carrier)) f.url = patch.url ?? '';
  return f;
}

/** Carrier dropdown + the fields that carrier needs. Parent owns the state (see nextShipForm). */
export function ShipFields({ form, errors, onChange, idPrefix = 'ship' }: {
  form: ShipForm;
  errors: Partial<Record<keyof ShipForm, string>>;
  onChange: (patch: Partial<ShipForm>) => void;
  idPrefix?: string;
}) {
  const self = isSelfCarrier(form.carrier);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <label htmlFor={`${idPrefix}-carrier`} className="text-[12px] font-semibold text-charcoal block mb-1.5">Carrier *</label>
        <select
          id={`${idPrefix}-carrier`}
          className={selectCls}
          value={form.carrier}
          aria-invalid={!!errors.carrier}
          onChange={e => onChange({ carrier: e.target.value })}
        >
          <option value="" disabled>Choose how this is delivered…</option>
          {CARRIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {errors.carrier && <p role="alert" className="text-[12px] text-error mt-1">{errors.carrier}</p>}
      </div>

      {form.carrier === OTHER_CARRIER && (
        <Input label="Carrier name *" value={form.otherName} maxLength={60} onChange={e => onChange({ otherName: e.target.value })} placeholder="e.g. Local courier" error={errors.otherName} />
      )}

      {form.carrier && !self && (
        <>
          <Input label="Tracking number *" value={form.number} maxLength={60} onChange={e => onChange({ number: e.target.value })} placeholder="e.g. LE123456789PK" error={errors.number} />
          <Input label="Tracking link" value={form.url} maxLength={500} onChange={e => onChange({ url: e.target.value })} placeholder="https://…" error={errors.url} />
        </>
      )}

      {self && (
        <>
          <p className="text-[12px] text-slate">No tracking number needed. The buyer is told you are delivering this parcel yourself.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label htmlFor={`${idPrefix}-expected`} className="text-[12px] font-semibold text-charcoal block mb-1.5">Expected delivery date (optional)</label>
              <input id={`${idPrefix}-expected`} type="date" min={today} value={form.expected} onChange={e => onChange({ expected: e.target.value })} className={selectCls} />
            </div>
            <Input label="Note for the buyer (optional)" value={form.note} maxLength={300} onChange={e => onChange({ note: e.target.value })} placeholder="e.g. Rider will call before arriving" error={errors.note} />
          </div>
        </>
      )}
    </div>
  );
}
