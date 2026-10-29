import { useState } from 'react';
import { Button, Input, Modal } from '@/components/comman/ui';
import { apiSaveCertificateDetails, type CertificateDetails } from '@/api/services/classroom';

interface Props {
  idOrSlug: string;
  initial?: CertificateDetails | null;
  /** Prefill for the name when nothing was saved yet. */
  defaultName?: string;
  onClose: () => void;
  onSaved: (d: CertificateDetails) => void;
}

const LIMITS = { fullName: 80, other: 80 };

/** Plain text only: strips angle brackets so nothing HTML-like is ever stored on a certificate. */
const clean = (v: string) => v.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

/** Asked once when a learner starts a course with a certificate: what to print on it. */
export function CertificateDetailsModal({ idOrSlug, initial, defaultName, onClose, onSaved }: Props) {
  const [f, setF] = useState({
    fullName: initial?.fullName ?? defaultName ?? '',
    guardianName: initial?.guardianName ?? '',
    institute: initial?.institute ?? '',
    city: initial?.city ?? '',
    country: initial?.country ?? '',
  });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const name = clean(f.fullName);
  const nameError = name.length < 2 ? 'Enter your full name (at least 2 letters)' : name.length > LIMITS.fullName ? `Up to ${LIMITS.fullName} characters` : '';
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF(p => ({ ...p, [k]: e.target.value })); setError(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError) return;
    const body: CertificateDetails = {
      fullName: name,
      guardianName: clean(f.guardianName) || null,
      institute: clean(f.institute) || null,
      city: clean(f.city) || null,
      country: clean(f.country) || null,
    };
    setBusy(true);
    try {
      await apiSaveCertificateDetails(idOrSlug, body);
      onSaved(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Modal title="Your certificate details" onClose={onClose} width={480} mobileSheet
      footer={<>
        <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={busy}>Later</Button>
        <Button variant="primary" size="md" type="submit" form="cert-details-form" loading={busy}>Save details</Button>
      </>}>
      <form id="cert-details-form" onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <p className="text-[13px] text-slate m-0">These details will be printed on your certificate and cannot be changed after you finish.</p>
        <Input label="Full name *" value={f.fullName} maxLength={LIMITS.fullName} autoComplete="name" onChange={set('fullName')} error={touched ? nameError || undefined : undefined} />
        <Input label="Father / guardian name" value={f.guardianName} maxLength={LIMITS.other} onChange={set('guardianName')} />
        <Input label="School / institute" value={f.institute} maxLength={LIMITS.other} onChange={set('institute')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="City" value={f.city} maxLength={LIMITS.other} autoComplete="address-level2" onChange={set('city')} />
          <Input label="Country" value={f.country} maxLength={LIMITS.other} autoComplete="country-name" onChange={set('country')} />
        </div>
        {error && <p role="alert" className="text-[13px] text-error m-0">{error}</p>}
      </form>
    </Modal>
  );
}
