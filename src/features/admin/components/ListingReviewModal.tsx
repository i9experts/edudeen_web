import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, XCircle } from 'lucide-react';
import { Modal, Button, Textarea, SkeletonBox, StatusBadge } from '@/components/comman/ui';
import {
  apiGetListingForReview, apiApproveListing, apiRejectListing, type ListingReview,
} from '@/api/services/marketplace/adminMarketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { getStorePagePath } from '@/utils/storefrontUrl';

const LICENSE: Record<string, string> = {
  personal: 'Personal use', single_classroom: 'One classroom', school: 'Whole school', commercial: 'Commercial',
};

// What a reviewer checks before a listing goes live on an education marketplace.
const CHECKLIST = [
  'Title and cover match what is being sold',
  'Suitable for the stated age / grade',
  'No copied or pirated material (textbook scans, others’ worksheets)',
  'Price and format are clear; files open',
];

function sizeLabel(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Review one listing: see everything, then approve or send it back with a reason. */
export function ListingReviewModal({ listingId, onClose, onDone }: { listingId: string; onClose: () => void; onDone: (status: string) => void }) {
  const [data, setData] = useState<ListingReview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState<'view' | 'reject'>('view');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiGetListingForReview(listingId)
      .then(res => { if (alive) setData(res.data); })
      .catch(err => { if (alive) setLoadError(err instanceof Error ? err.message : 'Could not load this listing.'); });
    return () => { alive = false; };
  }, [listingId]);

  const canDecide = data?.status === 'pending_review' || data?.status === 'rejected';
  const reasonOk = reason.trim().length >= 10;

  async function approve() {
    setBusy(true); setError('');
    try { const res = await apiApproveListing(listingId); onDone(res.data.status); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not approve.'); }
    finally { setBusy(false); }
  }
  async function reject() {
    if (!reasonOk) return;
    setBusy(true); setError('');
    try { const res = await apiRejectListing(listingId, reason.trim()); onDone(res.data.status); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not send it back.'); }
    finally { setBusy(false); }
  }

  const grade = data?.educationLevel
    ? data.educationLevel === 'other' ? data.customLevel : EDUCATION_LEVELS.find(l => l.value === data.educationLevel)?.label
    : null;
  const price = data?.variants.find(v => v.isDefault) ?? data?.variants[0];

  return (
    <Modal
      title="Review listing"
      onClose={onClose}
      width={720}
      mobileSheet
      footer={!data || !canDecide ? <Button variant="ghost" onClick={onClose}>Close</Button> : mode === 'reject' ? (
        <>
          <Button variant="ghost" onClick={() => setMode('view')} disabled={busy}>Back</Button>
          <Button variant="danger" onClick={reject} loading={busy} disabled={!reasonOk}>Send back to seller</Button>
        </>
      ) : (
        <>
          <Button variant="outline" icon={<XCircle size={14} />} onClick={() => setMode('reject')} disabled={busy}>Needs changes</Button>
          <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={approve} loading={busy}>Approve &amp; publish</Button>
        </>
      )}
    >
      {loadError ? (
        <p role="alert" className="text-[13px] text-error">{loadError}</p>
      ) : !data ? (
        <div className="flex flex-col gap-3"><SkeletonBox height={140} rounded="10px" /><SkeletonBox height={80} rounded="10px" /></div>
      ) : mode === 'reject' ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-charcoal">Tell <b>{data.seller?.name ?? 'the seller'}</b> what to fix. They see this note and can resubmit after editing.</p>
          <Textarea
            id="listing-reject-reason"
            label="What needs to change"
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Please add the grade level and a cover image that shows the actual worksheet."
          />
          <p className="text-[11.5px] text-slate">{reason.trim().length < 10 ? `At least 10 characters (${reason.trim().length}/10)` : 'Ready to send'}</p>
          {error && <p role="alert" className="text-[12.5px] text-error">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[16px] font-bold text-carbon leading-snug">{data.name}</p>
              <p className="text-slate mt-0.5">
                by {data.seller?.name ?? 'Unknown'}{data.seller?.email ? ` · ${data.seller.email}` : ''}
                {data.store && <> · <a href={getStorePagePath(data.store.slug)} target="_blank" rel="noreferrer" className="text-brand-orange inline-flex items-center gap-1">{data.store.name} <ExternalLink size={11} /></a></>}
              </p>
            </div>
            <StatusBadge status={data.status} size="sm" />
          </div>

          {data.status === 'rejected' && data.reviewNote && (
            <p className="rounded-lg bg-error-bg text-error px-3 py-2 text-[12.5px]"><b>Sent back earlier:</b> {data.reviewNote}</p>
          )}

          {data.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.images.map(src => (
                <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={src} alt="" className="h-[110px] w-[110px] object-cover rounded-lg border border-bone" />
                </a>
              ))}
            </div>
          )}

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 rounded-lg border border-bone bg-cream/50 px-3 py-3">
            {[
              ['Type', data.productType],
              ['Category', [data.category, data.subCategory].filter(Boolean).join(' › ') || '—'],
              ['Grade', grade ?? '—'],
              ['Price', price ? `${price.currency} ${price.price.toLocaleString()}${price.compareAtPrice ? ` (was ${price.compareAtPrice.toLocaleString()})` : ''}` : '—'],
              ...(data.digital ? [['License', LICENSE[data.digital.licenseType] ?? data.digital.licenseType], ['Downloads', data.digital.downloadLimit]] : []),
              ...(data.scheduledAt ? [['Go-live date', new Date(data.scheduledAt).toLocaleString()]] : []),
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[10.5px] uppercase tracking-[0.06em] text-slate font-semibold">{k}</dt>
                <dd className="text-carbon font-medium capitalize break-words">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Description</p>
            <p className="text-charcoal whitespace-pre-line max-h-[180px] overflow-y-auto leading-relaxed">{data.description || '—'}</p>
          </div>

          {data.digital && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Files buyers get</p>
              {data.digital.files.length === 0 ? <p className="text-error">No files uploaded.</p> : (
                <ul className="flex flex-col gap-1">
                  {data.digital.files.map(f => (
                    <li key={f.viewUrl}>
                      <a href={f.viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-orange">
                        <FileText size={14} /> {f.name} <span className="text-slate">{sizeLabel(f.size)}</span> <ExternalLink size={11} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-slate mt-1">Links work for 10 minutes.</p>
            </div>
          )}

          <div className="rounded-lg border border-bone px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Check before approving</p>
            <ul className="list-disc pl-4 text-charcoal flex flex-col gap-0.5">
              {CHECKLIST.map(c => <li key={c}>{c}</li>)}
            </ul>
          </div>
          {error && <p role="alert" className="text-[12.5px] text-error">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
