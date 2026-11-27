import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { CheckCircle2, Clock, FileText, Lock, ShieldCheck, Upload, XCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { Input, Select } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useToast } from '@/contexts/ToastContext';
import { useBusyAction } from '@/hooks/useBusyAction';
import {
  apiGetMyKyc, apiSaveKyc, apiSubmitKyc, apiUploadKycDocument,
  KYC_DOC_LABEL, KYC_ID_TYPES, kycIdTypeLabel,
  type KycDocumentType, type KycDraftPayload, type KycIdType, type KycSellerType, type MyKyc,
} from '@/api/services/kyc';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf';

interface Form {
  sellerType: KycSellerType | '';
  country: string; state: string; city: string; line: string;
  idType: KycIdType | '';
  fullName: string; idNumber: string; taxNumber: string;
  legalBusinessName: string; registrationNumber: string;
  bankAccountHolder: string; bankName: string;
}

const fromKyc = (k: MyKyc): Form => ({
  sellerType: k.sellerType ?? '',
  country: k.address.country ?? '', state: k.address.state ?? '', city: k.address.city ?? '', line: k.address.line ?? '',
  idType: k.idType ?? '',
  fullName: k.fullName ?? '', idNumber: '', taxNumber: '',
  legalBusinessName: k.legalBusinessName ?? '', registrationNumber: k.registrationNumber ?? '',
  bankAccountHolder: k.bankAccountHolder ?? '', bankName: k.bankName ?? '',
});

/** Numbers are only sent when typed: the saved ones come back masked and stay as they are. */
function toPayload(f: Form, step: 1 | 2): KycDraftPayload {
  if (step === 2) return { bankAccountHolder: f.bankAccountHolder, bankName: f.bankName };
  return {
    sellerType: f.sellerType || null,
    idType: f.idType || null,
    address: { country: f.country, state: f.state, city: f.city, line: f.line },
    fullName: f.fullName,
    legalBusinessName: f.legalBusinessName,
    registrationNumber: f.registrationNumber,
    ...(f.idNumber.trim() ? { idNumber: f.idNumber } : {}),
    ...(f.taxNumber.trim() ? { taxNumber: f.taxNumber } : {}),
  };
}

const roughlySame = (a: string, b: string) => {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const x = n(a); const y = n(b);
  return !x || !y || x === y || x.includes(y) || y.includes(x);
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-bone rounded-xl p-4 md:p-5 flex flex-col gap-3">
      <div>
        <h2 className="m-0 text-[14px] font-bold text-carbon">{title}</h2>
        {hint && <p className="m-0 mt-0.5 text-[12px] text-slate">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function DocSlot({ type, kyc, editable, onUploaded }: { type: KycDocumentType; kyc: MyKyc; editable: boolean; onUploaded: (k: MyKyc) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const up = useBusyAction();
  const doc = kyc.documents.find(d => d.type === type);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    const r = await up.run(() => apiUploadKycDocument(type, file));
    if (r) onUploaded(r.data);
    if (input.current) input.current.value = '';
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-charcoal">{KYC_DOC_LABEL[type]}</span>
      <button
        type="button" disabled={!editable || up.busy} onClick={() => input.current?.click()}
        className={clsx(
          'min-h-[110px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 px-3 text-center text-[12px]',
          doc ? 'border-success/40 bg-success-bg/50 text-carbon' : 'border-brand-orange/50 bg-cream text-graphite',
          editable ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        {up.busy ? <span>Uploading…</span> : doc ? (
          <><FileText size={18} className="text-success" /><span className="font-medium break-all">{doc.fileName}</span>{editable && <span className="text-slate">Tap to replace</span>}</>
        ) : (
          <><Upload size={18} className="text-brand-orange" /><span className="font-medium">Upload</span><span className="text-slate">Photo or PDF, up to 10 MB</span></>
        )}
      </button>
      {doc?.viewUrl && <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="text-[12px] text-brand-royal underline">View uploaded file</a>}
      {up.error && <p role="alert" className="m-0 text-[12px] text-error">{up.error}</p>}
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={e => pick(e.target.files?.[0])} />
    </div>
  );
}

function StatusBanner({ kyc }: { kyc: MyKyc }) {
  const map = {
    not_started: { Icon: ShieldCheck, cls: 'bg-info-bg border-[#bfdcf3] text-carbon', text: 'Verify your identity to receive payouts. It takes about 5 minutes. Your store stays live while you do it.' },
    pending: { Icon: Clock, cls: 'bg-warning-bg border-warning-border text-carbon', text: 'Thanks! Your details are being reviewed, usually within 2 working days. We will notify you by email.' },
    approved: { Icon: CheckCircle2, cls: 'bg-success-bg border-success/30 text-carbon', text: 'You are verified. Payouts are enabled and your stores show a Verified badge.' },
    rejected: { Icon: XCircle, cls: 'bg-error-bg border-error-border text-carbon', text: 'Your verification needs changes. Update the details below and submit again.' },
  }[kyc.status];
  return (
    <div role="status" className={clsx('flex items-start gap-2 rounded-xl border px-4 py-3 text-[13px]', map.cls)}>
      <map.Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="m-0">{map.text}</p>
        {kyc.status === 'rejected' && kyc.rejectionReason && <p className="m-0 mt-1 font-semibold">Reason: {kyc.rejectionReason}</p>}
      </div>
    </div>
  );
}

/** Seller identity verification (KYC): one per seller account, covers all their stores. Payouts wait for approval. */
export default function SellerVerification() {
  usePageTitle('Verification (KYC)');
  const toast = useToast();
  const [kyc, setKyc] = useState<MyKyc | null>(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const save = useBusyAction();

  const load = useCallback(() => apiGetMyKyc()
    .then(r => { setLoadError(''); setKyc(r.data); setForm(fromKyc(r.data)); })
    .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load your verification.')), []);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => (f ? { ...f, [k]: v } : f));
  const onDoc = (k: MyKyc) => setKyc(k);

  if (loadError) {
    return (
      <>
        <StorePageHeader title="Verification (KYC)" />
        <div className="px-4 md:px-8 pt-6">
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            <span className="flex-1">{loadError}</span>
            <Button size="sm" variant="outline" onClick={() => { void load(); }}>Try again</Button>
          </div>
        </div>
      </>
    );
  }
  if (!kyc || !form) {
    return (
      <>
        <StorePageHeader title="Verification (KYC)" />
        <div className="px-4 md:px-8 pt-6 flex flex-col gap-4 max-w-[760px]" aria-busy="true">
          <SkeletonBox height={56} rounded="12px" /><SkeletonBox height={220} rounded="12px" /><SkeletonBox height={220} rounded="12px" />
        </div>
      </>
    );
  }

  const editable = kyc.editable;
  const company = form.sellerType === 'company';
  const passport = form.idType === 'passport';
  const mismatch = !!form.bankAccountHolder && !!form.fullName && !roughlySame(form.fullName, form.bankAccountHolder);

  const next = async () => {
    const r = await save.run(() => apiSaveKyc(toPayload(form, 1)));
    if (r) { setKyc(r.data); setForm(f => (f ? { ...f, idNumber: '', taxNumber: '' } : f)); setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  const submit = async () => {
    const saved = await save.run(() => apiSaveKyc(toPayload(form, 2)));
    if (!saved) return;
    setKyc(saved.data);
    const r = await save.run(() => apiSubmitKyc());
    if (r) { setKyc(r.data); toast.success('Submitted. We will let you know once it is reviewed.'); }
  };

  const steps = (
    <div className="flex items-center justify-center gap-3 text-[12px]" aria-label={`Step ${step} of 2`}>
      {[1, 2].map(n => (
        <div key={n} className="flex items-center gap-3">
          {n === 2 && <span className="w-10 h-px bg-brand-orange/50" />}
          <span className={clsx('w-7 h-7 rounded-full flex items-center justify-center font-bold border', step === n ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-brand-orange border-brand-orange/60')}>{n}</span>
        </div>
      ))}
      <span className="text-slate ms-1">{step === 1 ? 'ID information' : 'Bank information'}</span>
    </div>
  );

  // Read-only summary while under review or once approved.
  if (!editable) {
    return (
      <>
        <StorePageHeader title="Verification (KYC)" subtitle="One verification covers every store on your account." />
        <div className="px-4 md:px-8 pt-6 pb-10 flex flex-col gap-4 max-w-[760px]">
          <StatusBanner kyc={kyc} />
          <Section title="Submitted details">
            <dl className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {[
                ['Seller type', kyc.sellerType === 'company' ? 'Company' : 'Individual'],
                ['Full name (as on ID)', kyc.fullName],
                ['ID type', kycIdTypeLabel(kyc.idType)],
                ['ID number', kyc.idNumberMasked],
                ['Tax number', kyc.taxNumberMasked],
                ...(kyc.sellerType === 'company' ? [['Legal business name', kyc.legalBusinessName], ['Registration number', kyc.registrationNumber]] : []),
                ['Address', [kyc.address.line, kyc.address.city, kyc.address.state, kyc.address.country].filter(Boolean).join(', ')],
                ['Bank account holder', kyc.bankAccountHolder],
              ].map(([k, v]) => (
                <div key={k as string}><dt className="text-slate text-[12px]">{k}</dt><dd className="m-0 text-carbon font-medium break-words">{v || '—'}</dd></div>
              ))}
            </dl>
            <p className="m-0 flex items-center gap-1.5 text-[12px] text-slate"><Lock size={12} /> Locked while {kyc.status === 'approved' ? 'approved' : 'under review'}. Contact support to change it.</p>
          </Section>
        </div>
      </>
    );
  }

  return (
    <>
      <StorePageHeader title="Verification (KYC)" subtitle="Verify once to receive payouts. One verification covers every store on your account." />
      <div className="px-4 md:px-8 pt-6 pb-10 flex flex-col gap-4 max-w-[760px]">
        <StatusBanner kyc={kyc} />
        {steps}
        <p className="m-0 flex items-center justify-center gap-1.5 text-[12px] text-success"><ShieldCheck size={13} /> Your information is encrypted and only seen by the Edudeen review team.</p>

        {step === 1 ? (
          <>
            <Section title="Seller type">
              <div role="radiogroup" aria-label="Seller type" className="flex flex-wrap gap-2">
                {([['individual', 'Individual'], ['company', 'Company / business']] as const).map(([v, label]) => (
                  <button key={v} type="button" role="radio" aria-checked={form.sellerType === v} onClick={() => set('sellerType', v)}
                    className={clsx('min-h-[40px] px-4 rounded-full border text-[13px] font-medium cursor-pointer', form.sellerType === v ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-carbon border-bone')}>
                    {label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Business address" hint="Where you or your business are based.">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Country" value={form.country} maxLength={100} onChange={e => set('country', e.target.value)} placeholder="e.g. Pakistan" autoComplete="country-name" />
                <Input label="Province / state" value={form.state} maxLength={100} onChange={e => set('state', e.target.value)} placeholder="e.g. Sindh" autoComplete="address-level1" />
                <Input label="City" value={form.city} maxLength={100} onChange={e => set('city', e.target.value)} placeholder="e.g. Karachi" autoComplete="address-level2" />
              </div>
              <Input label="Address" value={form.line} maxLength={300} onChange={e => set('line', e.target.value)} placeholder="House / office, street, area" autoComplete="street-address" />
            </Section>

            <Section title="ID document" hint="A clear photo of a valid government ID. All four corners visible, no glare.">
              <Select label="ID type" value={form.idType} onChange={e => set('idType', e.target.value as KycIdType | '')}>
                <option value="">Choose…</option>
                {KYC_ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
              <div className={clsx('grid gap-3', passport ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2')}>
                <DocSlot type="id_front" kyc={kyc} editable onUploaded={onDoc} />
                {!passport && <DocSlot type="id_back" kyc={kyc} editable onUploaded={onDoc} />}
              </div>
            </Section>

            <Section title="ID information">
              <Input label="Full name (exactly as on your ID)" value={form.fullName} maxLength={200} onChange={e => set('fullName', e.target.value)} autoComplete="name" />
              <Input label="ID / passport number" value={form.idNumber} maxLength={60} onChange={e => set('idNumber', e.target.value)}
                placeholder={kyc.idNumberMasked ? `Saved (${kyc.idNumberMasked}). Type to replace.` : 'e.g. 42101-1234567-1'} autoComplete="off" />
              <Input label={company ? 'National tax number' : 'National tax number (optional)'} value={form.taxNumber} maxLength={60} onChange={e => set('taxNumber', e.target.value)}
                placeholder={kyc.taxNumberMasked ? `Saved (${kyc.taxNumberMasked}). Type to replace.` : 'e.g. NTN, TIN, VAT number'} autoComplete="off" />
              {company && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Legal business name" value={form.legalBusinessName} maxLength={200} onChange={e => set('legalBusinessName', e.target.value)} autoComplete="organization" />
                    <Input label="Registration number" value={form.registrationNumber} maxLength={200} onChange={e => set('registrationNumber', e.target.value)} autoComplete="off" />
                  </div>
                  <DocSlot type="registration_certificate" kyc={kyc} editable onUploaded={onDoc} />
                </>
              )}
            </Section>

            {save.error && <p role="alert" className="m-0 text-[13px] text-error">{save.error}</p>}
            <Button fullWidth onClick={next} loading={save.busy} disabled={save.busy}>Next</Button>
          </>
        ) : (
          <>
            <Section title="Bank information document" hint="A bank statement, cheque or bank letter showing your name and account number.">
              <DocSlot type="bank_proof" kyc={kyc} editable onUploaded={onDoc} />
            </Section>
            <Section title="Bank information">
              <Input label="Account holder name" value={form.bankAccountHolder} maxLength={200} onChange={e => set('bankAccountHolder', e.target.value)} />
              <p className={clsx('m-0 -mt-1 text-[12px]', mismatch ? 'text-warning' : 'text-slate')}>
                {mismatch ? `This doesn't match the name on your ID (${form.fullName}). You can still submit, but the review may take longer.` : 'The bank account name must be the same as the name on your ID.'}
              </p>
              <Input label="Bank name" value={form.bankName} maxLength={200} onChange={e => set('bankName', e.target.value)} />
              <p className="m-0 text-[12px] text-slate">Add the account number itself under Earnings → payout method. Payouts go only to a verified seller.</p>
            </Section>

            {kyc.missing.length > 0 && (
              <p className="m-0 text-[12px] text-slate">Still needed: {kyc.missing.join(', ')}</p>
            )}
            {save.error && <p role="alert" className="m-0 text-[13px] text-error">{save.error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={save.busy}>Previous</Button>
              <Button onClick={submit} loading={save.busy} disabled={save.busy}>Submit</Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
