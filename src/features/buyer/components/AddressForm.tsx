import { useState } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { LocationPickerMap } from '@/components/comman/ui';
import { apiAddAddress, type Address, type AddressPayload } from '@/api/services/address';

const INPUT_CLS = 'w-full py-[10px] px-[13px] text-[13px] border border-bone rounded-[9px] outline-none text-charcoal bg-white box-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 transition-colors';
const LABEL_CLS = 'text-[12px] font-medium text-graphite mb-[6px] block';

export const EMPTY_ADDRESS_FORM: AddressPayload = {
  label: 'Home', recipientName: '', phoneNumber: '',
  addressLine1: '', addressLine2: '', state: '', city: '', zipCode: '',
  latitude: null, longitude: null,
  isDefault: false,
};

// Province for Pakistan's main cities — lets an address typed as one line at
// sign-up ("House 5, Street 2, Gulshan, Karachi") pre-fill City and State.
const PK_CITY_STATE: Record<string, string> = {
  karachi: 'Sindh', hyderabad: 'Sindh', sukkur: 'Sindh', larkana: 'Sindh',
  lahore: 'Punjab', faisalabad: 'Punjab', rawalpindi: 'Punjab', multan: 'Punjab', gujranwala: 'Punjab',
  sialkot: 'Punjab', bahawalpur: 'Punjab', sargodha: 'Punjab', sahiwal: 'Punjab', gujrat: 'Punjab',
  islamabad: 'Islamabad Capital Territory',
  peshawar: 'Khyber Pakhtunkhwa', abbottabad: 'Khyber Pakhtunkhwa', mardan: 'Khyber Pakhtunkhwa', swat: 'Khyber Pakhtunkhwa',
  quetta: 'Balochistan', gwadar: 'Balochistan',
  gilgit: 'Gilgit-Baltistan', muzaffarabad: 'Azad Kashmir', mirpur: 'Azad Kashmir',
};

/** A new address pre-filled from the account's sign-up details — the one-line
 *  address goes into Address Line 1, and a recognised city name at its end
 *  fills City/State. */
export function addressFromProfile(profile: { name?: string; phone?: string | null; address?: string | null } | null | undefined): AddressPayload {
  const form: AddressPayload = {
    ...EMPTY_ADDRESS_FORM,
    recipientName: profile?.name ?? '',
    phoneNumber: profile?.phone ?? '',
    isDefault: true,
  };
  const raw = (profile?.address ?? '').trim();
  if (!raw) return form;
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
  const zip = parts.length > 1 && /^\d{5}$/.test(parts[parts.length - 1]) ? parts.pop()! : '';
  const last = parts[parts.length - 1]?.toLowerCase() ?? '';
  const state = PK_CITY_STATE[last];
  if (state && parts.length > 1) {
    form.city = parts.pop()!;
    form.state = state;
  }
  form.addressLine1 = parts.join(', ');
  form.zipCode = zip;
  return form;
}

const REQUIRED: { key: keyof AddressPayload; label: string }[] = [
  { key: 'recipientName', label: 'Recipient name' },
  { key: 'phoneNumber', label: 'Phone number' },
  { key: 'addressLine1', label: 'Address line 1' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zipCode', label: 'Zip code' },
];

/** Names the required fields still empty, or null when the form is complete. */
export function missingAddressFields(form: AddressPayload): string | null {
  const missing = REQUIRED.filter(f => !String(form[f.key] ?? '').trim()).map(f => f.label);
  return missing.length ? `Please fill in: ${missing.join(', ')}` : null;
}

/** Saves a new address. The API answers a failed save with a bare message and
 *  no data (not an HTTP error), so that case is turned into a thrown error. */
export async function saveNewAddress(form: AddressPayload): Promise<Address> {
  const res = await apiAddAddress(form);
  if (!res?.data?._id) throw new Error(res?.message || 'Failed to save address.');
  return res.data;
}

function AddrField({ label, value, onChange, placeholder, half, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; half?: boolean; required?: boolean;
}) {
  return (
    <div className={half ? '' : 'sm:col-span-2'}>
      <label className={LABEL_CLS}>{label}{required && <span className="text-brand-orange"> *</span>}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={INPUT_CLS} />
    </div>
  );
}

export function AddressForm({ initial, onSave, onCancel, saving, submitLabel = 'Save Address', cancelLabel = 'Discard', note }: {
  initial: AddressPayload; onSave: (d: AddressPayload) => void; onCancel?: () => void; saving: boolean;
  submitLabel?: string; cancelLabel?: string;
  /** Shown above the fields (e.g. "We filled this in from your sign-up"). */
  note?: string;
}) {
  const [form, setForm] = useState<AddressPayload>(initial);
  const [error, setError] = useState('');
  const set = (k: keyof AddressPayload, v: string | boolean | number | null) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    const missing = missingAddressFields(form);
    if (missing) { setError(missing); return; }
    setError('');
    onSave(form);
  };

  return (
    <div className="border-[1.5px] border-brand-orange rounded-[12px] px-5 py-5 bg-[#fffaf7]">
      {note && <p className="text-[12.5px] text-charcoal bg-white border border-bone rounded-lg px-3 py-2 mb-4">{note}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL_CLS}>Label</label>
          <div className="flex gap-2">
            {(['Home', 'Work', 'Other'] as const).map(l => (
              <button
                key={l} type="button" onClick={() => set('label', l)}
                className={clsx(
                  'px-4 py-[6px] rounded-lg text-[12px] font-semibold cursor-pointer border',
                  form.label === l
                    ? 'border-brand-orange bg-brand-pale-orange text-brand-deep-orange'
                    : 'border-bone bg-white text-slate',
                )}
              >{l}</button>
            ))}
          </div>
        </div>
        <AddrField label="Recipient Name"            value={form.recipientName}      onChange={v => set('recipientName', v)}  placeholder="Full name"        half required />
        <AddrField label="Phone Number"              value={form.phoneNumber}        onChange={v => set('phoneNumber', v)}    placeholder="e.g. 03001234567" half required />
        <AddrField label="Address Line 1"            value={form.addressLine1}       onChange={v => set('addressLine1', v)}   placeholder="House no, Street" required />
        <AddrField label="Address Line 2 (Optional)" value={form.addressLine2 ?? ''} onChange={v => set('addressLine2', v)}   placeholder="Landmark, Area"   />
        <AddrField label="City"                      value={form.city}               onChange={v => set('city', v)}           placeholder="e.g. Karachi"     half required />
        <AddrField label="State"                     value={form.state}              onChange={v => set('state', v)}          placeholder="e.g. Sindh"       half required />
        <AddrField label="Zip Code"                  value={form.zipCode}            onChange={v => set('zipCode', v)}        placeholder="e.g. 75300"       half required />
        <div className="sm:col-span-2">
          <LocationPickerMap
            latitude={form.latitude ?? null}
            longitude={form.longitude ?? null}
            onChange={(lat, lng) => setForm(p => ({ ...p, latitude: lat, longitude: lng }))}
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox" id="addr-default"
            checked={form.isDefault ?? false}
            onChange={e => set('isDefault', e.target.checked)}
            className="w-[15px] h-[15px] cursor-pointer accent-brand-orange"
          />
          <label htmlFor="addr-default" className="text-[12px] text-graphite cursor-pointer">
            Set as default address
          </label>
        </div>
      </div>
      {error && <p role="alert" className="text-[12px] text-error mt-3">{error}</p>}
      <div className="flex gap-[10px] mt-[18px]">
        <button
          type="button" onClick={submit} disabled={saving}
          className={clsx(
            'px-6 min-h-11 rounded-[9px] text-[13px] font-semibold bg-brand-orange text-white border-none flex items-center gap-[6px]',
            saving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-brand-deep-orange transition-colors',
          )}
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-[18px] min-h-11 rounded-[9px] text-[13px] border border-bone bg-white text-slate cursor-pointer">
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}
