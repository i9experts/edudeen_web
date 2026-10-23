import { useState } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { CalendarClock } from 'lucide-react';
import {
  apiCreateBannerFromUrl, apiUpdateBanner,
  bannerPlacements, ADMIN_BANNER_PLACEMENTS, type Banner, type PromotionPlacement,
} from '@/api/services/banner';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input } from '@/components/comman/ui/Input';
import { LinkTargetPicker } from '@/features/admin/components/LinkTargetPicker';
import { ImageUpload } from '@/components/comman/ui/Upload';
export const PLACEMENT_LABEL: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero',
  marketplaceHero: 'Marketplace Hero',
  educationHero: 'Education Marketplace Hero',
  categoryHero: 'Category Hero',
  productPage: 'Product Page Banner',
};

export const STATUS_STYLE: Record<Banner['status'], { bg: string; color: string; label: string }> = {
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Live now' },
  scheduled: { bg: '#EAF1FB', color: '#1D5EAE', label: 'Scheduled' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#EDF2F4', color: '#486071', label: 'Expired' },
  draft:     { bg: '#EDF2F4', color: '#486071', label: 'Draft' },
};

/** ISO (UTC) -> the value a datetime-local input expects, in the admin's own timezone. */
function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fmtWhen = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

/** What the admin should read on the card: live / scheduled for a date / draft ... */
export function effectiveState(b: Banner): { key: 'live' | 'scheduled' | 'draft' | 'paused' | 'expired'; style: { bg: string; color: string; label: string } } {
  if (b.live) return { key: 'live', style: STATUS_STYLE.active };
  if (b.status === 'scheduled') return { key: 'scheduled', style: { ...STATUS_STYLE.scheduled, label: b.startAt ? `Goes live ${fmtWhen(b.startAt)}` : 'Scheduled' } };
  if (b.status === 'paused') return { key: 'paused', style: STATUS_STYLE.paused };
  if (b.status === 'expired') return { key: 'expired', style: STATUS_STYLE.expired };
  if (b.status === 'active') return { key: 'expired', style: STATUS_STYLE.expired };
  return { key: 'draft', style: STATUS_STYLE.draft };
}

// ── Form modal ────────────────────────────────────────────────────────────────
export function BannerFormModal({
  banner, currentCount, onClose, onSaved, defaultPlacement, beforeWrite,
}: {
  banner: Banner | null;
  currentCount: number;
  onClose: () => void;
  onSaved: () => void;
  /** Placement pre-ticked when adding a new banner. */
  defaultPlacement?: PromotionPlacement;
  /** Inline site editor: runs before the save request. Resolve to the extra request config (reauth headers) or null to cancel — nothing is sent. */
  beforeWrite?: () => Promise<AxiosRequestConfig | null>;
}) {
  const isEdit = !!banner;
  const [images, setImages] = useState<string[]>(banner?.bannerImage ? [banner.bannerImage] : []);
  const [urlOnTap, setUrlOnTap] = useState(banner?.urlOnTap ?? '');
  const [placements, setPlacements] = useState<PromotionPlacement[]>(
    banner ? bannerPlacements(banner) : [defaultPlacement ?? 'homepageHero'],
  );
  const [order, setOrder] = useState(String(banner?.order ?? currentCount));
  const [startAt, setStartAt] = useState(toLocalInput(banner?.startAt));
  const [endAt, setEndAt] = useState(toLocalInput(banner?.endAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function togglePlacement(p: PromotionPlacement) {
    setPlacements(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));
  }

  const scheduledForLater = !!startAt && new Date(startAt).getTime() > Date.now();

  async function submit(asDraft: boolean) {
    if (!images[0]) { setError('Please upload a banner image.'); return; }
    if (placements.length === 0) { setError('Select at least one placement.'); return; }
    if (startAt && endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) { setError('The end time must be after the start time.'); return; }
    if (!asDraft && endAt && new Date(endAt).getTime() < Date.now()) { setError('The end time is already in the past.'); return; }
    setError('');
    setSaving(true);
    try {
      let reqCfg: AxiosRequestConfig | undefined;
      if (beforeWrite) {
        const cfg = await beforeWrite();
        if (!cfg) return; // password not confirmed: nothing is changed
        reqCfg = cfg;
      }
      const common = {
        bannerImage: images[0],
        urlOnTap: urlOnTap || undefined,
        placements,
        order: Number(order) || 0,
        saveAsDraft: asDraft,
      };
      if (isEdit) {
        // null clears a schedule that was set earlier.
        await apiUpdateBanner(banner._id, { ...common, startAt: startAt ? new Date(startAt).toISOString() : null, endAt: endAt ? new Date(endAt).toISOString() : null }, reqCfg);
      } else {
        await apiCreateBannerFromUrl({ ...common, startAt: startAt ? new Date(startAt).toISOString() : undefined, endAt: endAt ? new Date(endAt).toISOString() : undefined }, reqCfg);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save banner.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet
      title={isEdit ? 'Edit Banner' : 'Add Banner'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={saving}>Save as draft</Button>
          <Button onClick={() => submit(false)} loading={saving}>{scheduledForLater ? 'Schedule banner' : (isEdit && banner?.status !== 'draft' ? 'Save changes' : 'Publish now')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Banner Image</label>
          <ImageUpload value={images} onChange={setImages} maxFiles={1} autoUpscaleBelow={1280} />
          <p className="mt-1.5 text-[12px] text-slate/70">
            Recommended: 2560×720px. Smaller pictures are enlarged automatically (they may look a little soft), so use the biggest image you have.
          </p>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Placement</label>
          <p className="text-[12px] text-slate/70 mb-1.5">Pick one or more — this banner will rotate on every placement checked.</p>
          <div className="flex flex-col gap-1.5">
            {ADMIN_BANNER_PLACEMENTS.map(p => (
              <label key={p} className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={placements.includes(p)}
                  onChange={() => togglePlacement(p)}
                  className="size-[15px] rounded border-bone accent-brand-orange cursor-pointer"
                />
                {PLACEMENT_LABEL[p]}
              </label>
            ))}
          </div>
        </div>
        <LinkTargetPicker value={urlOnTap} onChange={setUrlOnTap} label="When a visitor clicks the banner, show" />
        <Input label="Display Order" type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} />
        <div className="rounded-xl border border-bone bg-cream/50 p-3">
          <p className="text-[12px] font-semibold text-charcoal mb-1 flex items-center gap-1.5"><CalendarClock size={13} /> Schedule (optional)</p>
          <p className="text-[12px] text-slate mb-2.5">Set a start date to prepare a banner in advance (for example next month's sale): it goes live by itself at that time and is removed after the end time. Leave both empty to publish right away and keep it until you remove it. Times are in your own timezone.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Goes live at" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            <Input label="Ends at" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
          </div>
          <p className="text-[12px] text-slate mt-2">"Save as draft" keeps it hidden until you publish it.</p>
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

