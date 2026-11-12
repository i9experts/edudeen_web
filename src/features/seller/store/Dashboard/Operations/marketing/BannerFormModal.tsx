import { useEffect, useState } from 'react';
import { Modal, Button, FileDropSelect } from '@/components/comman/ui';
import { cropToAspect } from '@/utils/imageUpscale';
import { apiCreateStoreBanner, apiUpdateStoreBanner, STORE_BANNER_TYPES, type StoreBanner, type StoreBannerType } from '@/api/services/storeBanner';
import { SlideLinkPicker, type SlideLink } from './SlideLinkPicker';

export const BANNER_TYPE_LABEL: Record<StoreBannerType, string> = {
  hero: 'Hero', promotion: 'Promotion', season: 'Season', collection: 'Collection', video: 'Video',
};

export const BANNER_STATUS_STYLE: Record<StoreBanner['status'], { bg: string; color: string; label: string }> = {
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Active' },
  scheduled: { bg: '#EAF1FB', color: '#1D5EAE', label: 'Scheduled' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#F0EEE6', color: '#5A5852', label: 'Expired' },
  draft:     { bg: '#F0EEE6', color: '#5A5852', label: 'Draft' },
};

const DESKTOP_RATIO = 4;        // 4:1 wide strip
const MOBILE_RATIO = 16 / 9;    // phones

const FIELD_CLS = 'w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50';

/** Small preview of the picture that will actually be uploaded (already cropped), at its real shape. */
function CropPreview({ file, ratioClass, label }: { file: File; ratioClass: string; label: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className={`mt-2 ${ratioClass} rounded-lg overflow-hidden border border-bone bg-cream`}>
      {url && <img src={url} alt={label} className="w-full h-full object-cover" />}
    </div>
  );
}

// ── Store slide create / edit modal ───────────────────────────────────────────
/** Create: pick pictures (cropped to 4:1 desktop + 16:9 phone before upload), a type, an optional link and schedule.
 *  Edit (`banner` given): label, type and link only - a picture is replaced by deleting and adding a slide. */
export function StoreBannerFormModal({ storeId, banner, onClose, onSaved }: { storeId: string; banner?: StoreBanner; onClose: () => void; onSaved: () => void }) {
  const editing = !!banner;
  const [type, setType] = useState<StoreBannerType>(banner?.type ?? 'hero');
  const [ctaLabel, setCtaLabel] = useState(banner?.ctaLabel ?? '');
  const [link, setLink] = useState<SlideLink | null>(
    banner && (banner.linkType === 'product' || banner.linkType === 'collection') && banner.linkTarget ? { linkType: banner.linkType, linkTarget: banner.linkTarget } : null,
  );
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const legacyLink = editing && banner!.linkTarget && banner!.linkType !== 'product' && banner!.linkType !== 'collection';

  async function pickDesktop(f: File | null) {
    if (!f) { setFile(null); return; }
    setPreparing(true);
    try { setFile(await cropToAspect(f, DESKTOP_RATIO)); } finally { setPreparing(false); }
  }
  async function pickMobile(f: File | null) {
    if (!f) { setMobileFile(null); return; }
    setPreparing(true);
    try { setMobileFile(await cropToAspect(f, MOBILE_RATIO, 640, 1440)); } finally { setPreparing(false); }
  }

  async function submit() {
    if (!editing && !file) { setError('Please choose a banner image.'); return; }
    if (link && !link.linkTarget) { setError(`Choose which ${link.linkType} the slide opens, or pick “No link”.`); return; }
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) { setError('The end must be after the start.'); return; }
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await apiUpdateStoreBanner(storeId, banner!._id, {
          type,
          ctaLabel,
          // Only touch the link when it changed (an old slide with a legacy link can still change its label).
          ...(link || !legacyLink ? { linkType: link?.linkType ?? 'product', linkTarget: link?.linkTarget ?? '' } : {}),
        });
      } else {
        await apiCreateStoreBanner(storeId, {
          type,
          ctaLabel: ctaLabel || undefined,
          ...(link ? { linkType: link.linkType, linkTarget: link.linkTarget } : {}),
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          endAt: endAt ? new Date(endAt).toISOString() : undefined,
        }, file!, mobileFile ?? undefined);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the banner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? 'Edit slide' : 'Add slide'}
      onClose={onClose}
      mobileSheet
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={preparing}>{editing ? 'Save' : 'Add slide'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!editing && (
          <>
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Desktop picture</label>
              <FileDropSelect value={file} onChange={f => { void pickDesktop(f); }} label="Click to upload desktop banner" />
              <p className="mt-1.5 text-[12px] text-slate/70">
                Shown as a wide 4:1 strip (best 2560×640). We crop it to the centre for you and enlarge small pictures.
              </p>
              {file && <CropPreview file={file} ratioClass="aspect-[4/1]" label="Desktop crop preview" />}
            </div>
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Phone picture (optional)</label>
              <FileDropSelect value={mobileFile} onChange={f => { void pickMobile(f); }} label="Click to upload phone banner" />
              <p className="mt-1.5 text-[12px] text-slate/70">Shown at 16:9 on phones (best 1440×810). Without one, the desktop picture is used.</p>
              {mobileFile && <CropPreview file={mobileFile} ratioClass="aspect-[16/9] max-w-[320px]" label="Phone crop preview" />}
            </div>
          </>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Type</label>
            <select value={type} onChange={e => setType(e.target.value as StoreBannerType)}
              className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              {STORE_BANNER_TYPES.map(t => <option key={t} value={t}>{BANNER_TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-charcoal mb-1.5">Label (optional)</label>
            <input value={ctaLabel} maxLength={60} onChange={e => setCtaLabel(e.target.value)} placeholder="Shop Now" className={FIELD_CLS} />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">When tapped (optional)</label>
          <SlideLinkPicker storeId={storeId} value={link} onChange={setLink} />
          {legacyLink && !link && <p className="mt-1.5 text-[12px] text-slate">This slide has an older link. Pick a product or collection to replace it.</p>}
        </div>
        {!editing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Starts (optional)</label>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className={FIELD_CLS} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-charcoal mb-1.5">Ends (optional)</label>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className={FIELD_CLS} />
            </div>
          </div>
        )}
        {preparing && <p className="text-[12px] text-slate" role="status">Preparing your picture…</p>}
        {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
