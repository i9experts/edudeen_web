import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock, ShieldCheck } from 'lucide-react';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { StatusBadge, SkeletonBox } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUpload } from '@/hooks/upload/useUpload';
import { useStoreVerification, useVerificationActions, useVerificationRequirementsPreview } from '@/hooks/store/useStoreVerification';
import type { VerificationDocumentType, VerificationDocumentView } from '@/api/services/storeVerification';
import {
  BusinessInfoFields, DocumentUploadCard, VERIFICATION_LEVEL_LABELS,
  type BusinessInfoValues,
} from '@/features/seller/components/verification/VerificationFormFields';

const HISTORY_ACTION_LABEL: Record<string, string> = {
  submitted: 'Submitted for review',
  resubmitted: 'Resubmitted after rejection',
  under_review: 'Marked under review by admin',
  approved: 'Approved — store went live',
  rejected: 'Rejected',
};

const EMPTY_BUSINESS_INFO: BusinessInfoValues = {
  country: 'PK',
  businessType: null,
  legalBusinessName: '',
  registrationNumber: '',
  taxId: '',
  businessAddress: '',
  idDocumentType: null,
  authorizedContact: { name: null, designation: null, email: null, phone: null },
};

function isFieldFilled(values: BusinessInfoValues, path: string): boolean {
  if (path.startsWith('authorizedContact.')) {
    const key = path.split('.')[1] as keyof typeof values.authorizedContact;
    return !!values.authorizedContact[key]?.trim();
  }
  const value = (values as any)[path];
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

export function StoreVerification() {
  usePageTitle('Business Verification');
  const { storeId } = useStoreWorkspace();
  const { data, loading, error: loadError, refetch } = useStoreVerification(storeId);
  const { save, attachDocument, submit, saving, uploadingType, submitting, error, setError } = useVerificationActions(storeId);
  const { requirements, preview } = useVerificationRequirementsPreview(storeId);
  const { upload } = useUpload('private');

  const [values, setValues] = useState<BusinessInfoValues>(EMPTY_BUSINESS_INFO);
  const [saved, setSaved] = useState(false);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    if (!data) return;
    setValues({
      country: data.country,
      businessType: data.businessType,
      legalBusinessName: data.legalBusinessName ?? '',
      registrationNumber: data.registrationNumber ?? '',
      taxId: data.taxId ?? '',
      businessAddress: data.businessAddress ?? '',
      idDocumentType: data.idDocumentType,
      authorizedContact: data.authorizedContact ?? EMPTY_BUSINESS_INFO.authorizedContact,
    });
    preview({ country: data.country, businessType: data.businessType ?? undefined });
  }, [data, preview]);

  if (loading && !data) {
    return (
      <>
        <StorePageHeader title="Business Verification" subtitle="Required before your store can go live on the marketplace." />
        <div className="px-4 sm:px-7 py-6 flex flex-col gap-4">
          <SkeletonBox height={100} />
          <SkeletonBox height={300} />
        </div>
      </>
    );
  }

  if (loadError || !data) {
    return (
      <>
        <StorePageHeader title="Business Verification" subtitle="Required before your store can go live on the marketplace." />
        <div className="px-4 sm:px-7 py-6">
          <div className="bg-error-bg border border-error-border rounded-lg px-4 py-3 text-[13px] text-error">{loadError || 'Failed to load.'}</div>
        </div>
      </>
    );
  }

  // Editable while nothing's been submitted yet, or after a rejection —
  // locked the moment it's pending/under_review/verified. This reads
  // `verificationStatus`, never the store's marketplace `storeStatus` —
  // they're independent (see StoreService, store.schema.ts).
  const editable = data.verificationStatus === 'not_started' || data.verificationStatus === 'rejected';
  const level = requirements?.verificationLevel ?? data.verificationLevel;

  // Live checklist — driven by the requirements PREVIEW (recalculated the
  // instant country/businessType changes, before anything is saved), not by
  // the last-saved `data.documents`, so switching business type updates the
  // required/optional badges immediately. Upload state (fileName/viewUrl)
  // still comes from `data.documents`, since that's the actual persisted
  // record of what's been uploaded.
  const uploadedByType = new Map(data.documents.map(d => [d.type, d]));
  const requiredDocs = requirements?.requiredDocuments ?? [];
  const optionalDocs = requirements?.optionalDocuments ?? [];
  const checklist: VerificationDocumentView[] = [...new Set([...requiredDocs, ...optionalDocs])].map((type) => {
    const uploaded = uploadedByType.get(type);
    const required = requiredDocs.includes(type);
    return {
      type,
      required,
      state: uploaded ? 'uploaded' : (required ? 'missing' : 'not_required'),
      fileName: uploaded?.fileName ?? null,
      uploadedAt: uploaded?.uploadedAt ?? null,
      viewUrl: uploaded?.viewUrl ?? null,
    };
  });

  const missingFields = (requirements?.requiredFields ?? []).filter(path => !isFieldFilled(values, path));
  const missingDocs = checklist.filter(d => d.required && d.state !== 'uploaded');
  const requiredCount = checklist.filter(d => d.required).length;
  const completeCount = checklist.filter(d => d.required && d.state === 'uploaded').length;
  // `requirements !== null` guards the same race as OnboardingPage's Step 4:
  // before the live requirements preview resolves for the first time,
  // `missingFields`/`missingDocs` would otherwise default to "nothing known
  // missing yet" rather than genuinely complete. The backend independently
  // re-validates on submit regardless, but the button shouldn't ever look
  // clickable before the frontend actually knows what's required.
  const canSubmit = editable && requirements !== null && missingFields.length === 0 && missingDocs.length === 0;

  const handleBusinessInfoChange = (next: BusinessInfoValues) => {
    setValues(next);
    if (next.country !== values.country || next.businessType !== values.businessType) {
      preview({ country: next.country, businessType: next.businessType ?? undefined });
    }
  };

  const handleSaveDraft = async () => {
    setSaved(false);
    const ok = await save({
      country: values.country,
      businessType: values.businessType ?? undefined,
      legalBusinessName: values.legalBusinessName,
      registrationNumber: values.registrationNumber,
      taxId: values.taxId,
      businessAddress: values.businessAddress,
      idDocumentType: values.idDocumentType ?? undefined,
      authorizedContact: values.authorizedContact,
    });
    if (ok) { setSaved(true); refetch(); }
    return ok;
  };

  const handleUpload = async (type: VerificationDocumentType, file: File) => {
    setError('');
    try {
      const uploadedFile = await upload(file, 'kyc_document');
      const ok = await attachDocument(type, { publicId: uploadedFile.publicId, resourceType: uploadedFile.resourceType, fileName: file.name });
      if (ok) refetch();
    } catch {
      setError('Failed to upload document. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Persist the latest edited fields before locking the submission in —
    // the backend independently re-validates everything regardless (see
    // StoreService.submitVerification), this is just so a last-second edit
    // isn't silently dropped.
    const savedOk = await handleSaveDraft();
    if (!savedOk) return;
    const ok = await submit();
    if (ok) refetch();
  };

  return (
    <>
      <StorePageHeader title="Business Verification" subtitle="Required before your store can go live on the marketplace." />
      <div className="px-4 sm:px-7 py-6 flex flex-col gap-5 max-w-[720px]">

        <div className="bg-white border border-bone rounded-[14px] p-5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-brand-pale-orange flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-brand-orange" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-carbon">
                {VERIFICATION_LEVEL_LABELS[level].label}
              </p>
              <p className="text-[12px] text-slate">{editable ? 'Complete every required field and document, then submit for review.' : 'Your submission is locked while under review.'}</p>
            </div>
          </div>
          <StatusBadge status={data.verificationStatus} />
        </div>

        {data.verificationStatus === 'rejected' && data.rejectionReason && (
          <div className="bg-error-bg border border-error-border rounded-[10px] px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={14} className="text-error shrink-0 mt-[2px]" />
            <div>
              <p className="text-[12.5px] font-semibold text-error mb-[2px]">Your last submission was rejected</p>
              <p className="text-[12.5px] text-error">{data.rejectionReason}</p>
              <p className="text-[12px] text-error/80 mt-1">Correct the details below and submit again.</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-bone rounded-[14px] p-5">
          <p className="text-[13px] font-bold text-carbon mb-4">Business Information</p>
          <BusinessInfoFields values={values} onChange={handleBusinessInfoChange} disabled={!editable || saving || submitting} />
          {editable && (
            <div className="flex items-center gap-3 mt-4">
              <Button variant="outline" size="sm" onClick={handleSaveDraft} loading={saving}>Save Draft</Button>
              {saved && <span className="text-[12px] text-success font-medium inline-flex items-center gap-1"><Check size={12} /> Saved</span>}
            </div>
          )}
        </div>

        <div className="bg-white border border-bone rounded-[14px] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-bold text-carbon">Required Documents</p>
            {requiredCount > 0 && (
              <span className="text-[12px] font-semibold text-slate">{completeCount} of {requiredCount} complete</span>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {checklist.map(doc => (
              <DocumentUploadCard
                key={doc.type}
                doc={doc}
                uploading={uploadingType === doc.type}
                disabled={!editable || submitting}
                onUpload={file => handleUpload(doc.type, file)}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{error}</div>
        )}

        {editable && (
          <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
            {data.verificationStatus === 'rejected' ? 'Resubmit for Review' : 'Submit for Review'}
          </Button>
        )}

        {data.history.length > 0 && (
          <div className="bg-white border border-bone rounded-[14px] p-5">
            <p className="text-[13px] font-bold text-carbon mb-3">History</p>
            <div className="flex flex-col gap-2">
              {data.history.slice().reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Clock size={12} className="text-slate mt-[3px] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] text-charcoal">
                      <span className="font-semibold">{HISTORY_ACTION_LABEL[h.action] ?? h.action}</span>
                      {' — '}<span className="text-slate">{new Date(h.at).toLocaleString()}</span>
                    </p>
                    {h.note && <p className="text-[12px] text-slate mt-[1px]">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
