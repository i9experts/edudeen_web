import { clsx } from 'clsx';
import { Check, FileText, Loader2, Upload, ExternalLink, ShieldCheck } from 'lucide-react';
import type {
  BusinessType, IdDocumentType, VerificationDocumentType, VerificationLevel,
  AuthorizedContact, VerificationDocumentView,
} from '@/api/services/storeVerification';

export const BUSINESS_TYPE_OPTIONS: { id: BusinessType; label: string; desc: string }[] = [
  { id: 'individual',  label: 'Individual',  desc: 'Selling under your own name, no registered company' },
  { id: 'company',     label: 'Company',     desc: 'Registered private limited / corporation' },
  { id: 'partnership',  label: 'Partnership', desc: 'Registered partnership or firm' },
];

export const ID_DOC_TYPE_OPTIONS: { id: IdDocumentType; label: string }[] = [
  { id: 'cnic',         label: 'CNIC (National ID)' },
  { id: 'passport',     label: 'Passport' },
  { id: 'national_id',  label: 'Other National ID' },
];

// A short, curated list, not an exhaustive ISO country picker — Edudeen
// doesn't yet have a confirmed, distinct legal requirement set for any of
// these beyond Pakistan's ID-document options, so every entry here resolves
// to the same generic requirement set today (see the backend's
// verification-requirements.config.ts). The list exists so "seller country"
// is real, structured data the architecture can key off of later — adding a
// genuine country-specific rule doesn't require touching this list.
export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'PK', label: 'Pakistan' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'OTHER', label: 'Other' },
];

export const VERIFICATION_LEVEL_LABELS: Record<VerificationLevel, { label: string; desc: string }> = {
  basic:    { label: 'Basic Verification',    desc: 'Identity and address verification' },
  business: { label: 'Business Verification', desc: 'Legal business identity and registration' },
  enhanced: { label: 'Enhanced Verification', desc: 'Additional trust review' },
};

export const VERIFICATION_DOCUMENT_LABELS: Record<VerificationDocumentType, { label: string; desc: string }> = {
  business_registration: { label: 'Business Registration / License', desc: 'Certificate of incorporation or trade license' },
  tax_registration:      { label: 'Tax Registration Certificate',    desc: 'NTN certificate or equivalent tax registration' },
  address_proof:         { label: 'Proof of Business Address',       desc: 'Utility bill, lease agreement, or bank statement' },
  owner_id:              { label: 'Government ID',                   desc: 'CNIC, passport, or national ID of the account holder' },
  authorization_proof:   { label: 'Authorization / Ownership Proof', desc: 'Only if the authorized contact isn’t the owner' },
};

/** Client-side mirror of the backend's determineVerificationLevel — used
 *  ONLY for instant visual feedback the moment a business type is picked
 *  (before the debounced requirements-preview call resolves). The backend
 *  value from `getVerificationRequirements`/`getVerification` is always the
 *  one actually rendered into the document checklist and the only one ever
 *  trusted for gating. */
export function previewVerificationLevel(businessType: BusinessType | null): VerificationLevel {
  return businessType === 'company' || businessType === 'partnership' ? 'business' : 'basic';
}

export interface BusinessInfoValues {
  country: string;
  businessType: BusinessType | null;
  legalBusinessName: string;
  registrationNumber: string;
  taxId: string;
  businessAddress: string;
  idDocumentType: IdDocumentType | null;
  authorizedContact: AuthorizedContact;
}

const inputClass = 'w-full px-3 py-[10px] rounded-lg border border-bone text-[13px] text-charcoal outline-none bg-white transition-[border-color,box-shadow] duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10';
const labelClass = 'block text-[12px] font-medium text-charcoal mb-[6px]';

export function BusinessInfoFields({ values, onChange, disabled }: {
  values: BusinessInfoValues;
  onChange: (next: BusinessInfoValues) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof BusinessInfoValues>(key: K, value: BusinessInfoValues[K]) =>
    onChange({ ...values, [key]: value });
  const setContact = (key: keyof AuthorizedContact, value: string) =>
    onChange({ ...values, authorizedContact: { ...values.authorizedContact, [key]: value } });

  const isBusiness = values.businessType === 'company' || values.businessType === 'partnership';
  const level = previewVerificationLevel(values.businessType);

  return (
    <fieldset disabled={disabled} className="disabled:opacity-60">
      <div className="mb-5">
        <label htmlFor="verif-country" className={labelClass}>Country <span className="text-brand-orange">*</span></label>
        <select id="verif-country" className={clsx(inputClass, 'cursor-pointer')}
          value={values.country} onChange={e => set('country', e.target.value)}>
          {COUNTRY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </div>

      <div className="mb-5">
        <label className={labelClass}>Business Type <span className="text-brand-orange">*</span></label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
          {BUSINESS_TYPE_OPTIONS.map(opt => {
            const selected = values.businessType === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => set('businessType', opt.id)}
                className={clsx(
                  'text-left rounded-xl p-[14px] border-2 cursor-pointer transition-all duration-200 ease-out',
                  selected ? 'bg-brand-pale-orange/40 border-brand-orange' : 'bg-white border-bone hover:border-slate/40',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-bold text-carbon">{opt.label}</span>
                  {selected && <Check size={13} className="text-brand-orange shrink-0" />}
                </div>
                <p className="text-[12px] text-slate leading-[1.4]">{opt.desc}</p>
              </button>
            );
          })}
        </div>
        {values.businessType && (
          <div className="flex items-center gap-[6px] mt-3 text-[12px] text-brand-deep-orange font-medium">
            <ShieldCheck size={13} />
            Applicable level: {VERIFICATION_LEVEL_LABELS[level].label}
          </div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="verif-legal-name" className={labelClass}>Legal Business Name <span className="text-brand-orange">*</span></label>
        <input id="verif-legal-name" className={inputClass} placeholder="e.g. Creative Classroom Resources Pvt Ltd"
          value={values.legalBusinessName} onChange={e => set('legalBusinessName', e.target.value)} />
      </div>

      {isBusiness && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="verif-reg-number" className={labelClass}>Business Registration Number <span className="text-brand-orange">*</span></label>
            <input id="verif-reg-number" className={inputClass} placeholder="Registration / incorporation number"
              value={values.registrationNumber} onChange={e => set('registrationNumber', e.target.value)} />
          </div>
          <div>
            <label htmlFor="verif-tax-id" className={labelClass}>Tax ID / NTN <span className="text-brand-orange">*</span></label>
            <input id="verif-tax-id" className={inputClass} placeholder="Tax registration number"
              value={values.taxId} onChange={e => set('taxId', e.target.value)} />
          </div>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="verif-address" className={labelClass}>Business Address <span className="text-brand-orange">*</span></label>
        <textarea id="verif-address" rows={3} className={clsx(inputClass, 'resize-y')} placeholder="Street, city, province/state, postal code, country"
          value={values.businessAddress} onChange={e => set('businessAddress', e.target.value)} />
      </div>

      <div className="mb-4">
        <label htmlFor="verif-id-type" className={labelClass}>ID Document Type <span className="text-brand-orange">*</span></label>
        <select id="verif-id-type" className={clsx(inputClass, 'cursor-pointer')}
          value={values.idDocumentType ?? ''} onChange={e => set('idDocumentType', (e.target.value || null) as IdDocumentType | null)}>
          <option value="">Select ID document type...</option>
          {ID_DOC_TYPE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>

      <div className="pt-2 mt-2 border-t border-bone">
        <p className="text-[12px] font-semibold text-carbon mb-3 mt-4">Authorized Representative</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="verif-contact-name" className={labelClass}>Full Name <span className="text-brand-orange">*</span></label>
            <input id="verif-contact-name" className={inputClass} placeholder="Full name"
              value={values.authorizedContact.name ?? ''} onChange={e => setContact('name', e.target.value)} />
          </div>
          <div>
            <label htmlFor="verif-contact-designation" className={labelClass}>Designation <span className="text-slate font-normal">(optional)</span></label>
            <input id="verif-contact-designation" className={inputClass} placeholder="e.g. Owner, Director"
              value={values.authorizedContact.designation ?? ''} onChange={e => setContact('designation', e.target.value)} />
          </div>
          <div>
            <label htmlFor="verif-contact-email" className={labelClass}>Email <span className="text-brand-orange">*</span></label>
            <input id="verif-contact-email" type="email" className={inputClass} placeholder="contact@business.com"
              value={values.authorizedContact.email ?? ''} onChange={e => setContact('email', e.target.value)} />
          </div>
          <div>
            <label htmlFor="verif-contact-phone" className={labelClass}>Phone <span className="text-brand-orange">*</span></label>
            <input id="verif-contact-phone" type="tel" className={inputClass} placeholder="+92 3XX XXXXXXX"
              value={values.authorizedContact.phone ?? ''} onChange={e => setContact('phone', e.target.value)} />
          </div>
        </div>
      </div>
    </fieldset>
  );
}

export function DocumentUploadCard({ doc, uploading, disabled, onUpload }: {
  doc: VerificationDocumentView;
  uploading: boolean;
  disabled?: boolean;
  onUpload: (file: File) => void;
}) {
  const meta = VERIFICATION_DOCUMENT_LABELS[doc.type];
  const uploaded = doc.state === 'uploaded';
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className={clsx(
      'flex items-start gap-3 p-4 rounded-xl border transition-colors duration-150',
      uploaded ? 'bg-success-bg/40 border-success/30' : 'bg-cream border-bone',
    )}>
      <div className={clsx(
        'size-10 rounded-lg flex items-center justify-center shrink-0',
        uploaded ? 'bg-success/15 text-success' : 'bg-brand-pale-orange text-brand-orange',
      )}>
        {uploading ? <Loader2 size={18} className="animate-spin" /> : uploaded ? <Check size={18} /> : <FileText size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-carbon">{meta.label}</p>
          {doc.required
            ? <span className="text-[9.5px] font-bold uppercase tracking-wide text-brand-deep-orange bg-brand-pale-orange rounded-full px-[7px] py-[2px]">Required</span>
            : <span className="text-[9.5px] font-medium text-slate bg-bone rounded-full px-[7px] py-[2px]">Optional</span>}
        </div>
        <p className="text-[12px] text-slate mt-[2px] leading-[1.4]">{meta.desc}</p>
        {uploaded && (
          <div className="flex items-center gap-[6px] mt-[6px]">
            <p className="text-[12px] text-success font-medium truncate max-w-[220px]">{doc.fileName}</p>
            {doc.viewUrl && (
              <a href={doc.viewUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] text-brand-orange font-medium inline-flex items-center gap-[3px] hover:underline">
                View <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}
      </div>
      <label className={clsx(
        'shrink-0 inline-flex items-center gap-[6px] px-3 py-[7px] rounded-lg text-[12px] font-semibold border cursor-pointer transition-colors duration-150',
        uploaded ? 'border-bone text-charcoal bg-white hover:bg-cream' : 'border-brand-orange text-brand-orange bg-white hover:bg-brand-pale-orange/40',
        (uploading || disabled) && 'opacity-50 cursor-not-allowed pointer-events-none',
      )}>
        <Upload size={12} /> {uploaded ? 'Replace' : 'Upload'}
        <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden" onChange={handleFile} disabled={uploading || disabled} />
      </label>
    </div>
  );
}
