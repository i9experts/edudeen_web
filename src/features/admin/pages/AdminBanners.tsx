import { useState } from 'react';
import { Plus, ImageIcon, ExternalLink, Pencil, Trash2, Pause, Play, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminBanners, useBannerCount } from '@/hooks/admin/useAdminBanners';
import {
  apiCreateBannerFromUrl, apiUpdateBanner, apiDeleteBanner, apiPauseBanner, apiResumeBanner,
  bannerPlacements, ADMIN_BANNER_PLACEMENTS, type Banner, type PromotionPlacement,
} from '@/api/services/banner';
import { Button } from '@/components/comman/ui/Button';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { Modal } from '@/components/comman/ui/Modal';
import { Input } from '@/components/comman/ui/Input';
import { ImageUpload } from '@/components/comman/ui/Upload';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

const PLACEMENT_LABEL: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero',
  marketplaceHero: 'Marketplace Hero',
  educationHero: 'Education Marketplace Hero',
  categoryHero: 'Category Hero',
  productPage: 'Product Page Banner',
};

const STATUS_STYLE: Record<Banner['status'], { bg: string; color: string; label: string }> = {
  active:    { bg: '#EAF7EF', color: '#1E7A3C', label: 'Active' },
  scheduled: { bg: '#EAF1FB', color: '#1D5EAE', label: 'Scheduled' },
  paused:    { bg: '#FDF3E7', color: '#9A6A17', label: 'Paused' },
  expired:   { bg: '#EDF2F4', color: '#486071', label: 'Expired' },
  draft:     { bg: '#EDF2F4', color: '#486071', label: 'Draft' },
};

// ── Form modal ────────────────────────────────────────────────────────────────
function BannerFormModal({
  banner, currentCount, onClose, onSaved,
}: {
  banner: Banner | null;
  currentCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!banner;
  const [images, setImages] = useState<string[]>(banner?.bannerImage ? [banner.bannerImage] : []);
  const [urlOnTap, setUrlOnTap] = useState(banner?.urlOnTap ?? '');
  const [placements, setPlacements] = useState<PromotionPlacement[]>(
    banner ? bannerPlacements(banner) : ['marketplaceHero'],
  );
  const [order, setOrder] = useState(String(banner?.order ?? currentCount));
  const [startAt, setStartAt] = useState(banner?.startAt ? banner.startAt.slice(0, 16) : '');
  const [endAt, setEndAt] = useState(banner?.endAt ? banner.endAt.slice(0, 16) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function togglePlacement(p: PromotionPlacement) {
    setPlacements(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));
  }

  async function submit() {
    if (!images[0]) { setError('Please upload a banner image.'); return; }
    if (placements.length === 0) { setError('Select at least one placement.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        bannerImage: images[0],
        urlOnTap: urlOnTap || undefined,
        placements,
        order: Number(order) || 0,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      };
      if (isEdit) {
        await apiUpdateBanner(banner._id, payload);
      } else {
        await apiCreateBannerFromUrl(payload);
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save Changes' : 'Add Banner'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Banner Image</label>
          <ImageUpload value={images} onChange={setImages} maxFiles={1} />
          <p className="mt-1.5 text-[11px] text-slate/70">
            Recommended: 2560×720px (minimum 1280px wide) — this banner renders full-width on desktop, so anything narrower will look blurry.
          </p>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Placement</label>
          <p className="text-[11px] text-slate/70 mb-1.5">Pick one or more — this banner will rotate on every placement checked.</p>
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
        <Input label="Link URL (optional)" placeholder="https://example.com/sale" value={urlOnTap} onChange={e => setUrlOnTap(e.target.value)} />
        <Input label="Display Order" type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Starts (optional)" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
          <Input label="Ends (optional)" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminBanners() {
  usePageTitle('Banners');
  const { banners, loading, error, refetch: refetchBanners } = useAdminBanners();
  // Bumped after every change so the per-placement counts reload with the list.
  const [countKey, setCountKey] = useState(0);
  const counts = useBannerCount(countKey);
  const oversubscribed = counts.filter(c => c.isOversubscribed || c.current > c.visibleLimit);
  const refetch = () => { refetchBanners(); setCountKey(k => k + 1); };
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);
  const [toggleErrorId, setToggleErrorId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState('');

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      await apiDeleteBanner(deleting._id);
      setDeleting(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete banner.');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function togglePause(b: Banner) {
    setToggleBusyId(b._id);
    setToggleErrorId(null);
    setToggleError('');
    try {
      if (b.status === 'paused') await apiResumeBanner(b._id);
      else await apiPauseBanner(b._id);
      refetch();
    } catch (err) {
      // Same inline-error convention as Delete/the form modal on this page —
      // this was the one action here that silently did nothing on failure.
      setToggleErrorId(b._id);
      setToggleError(err instanceof Error ? err.message : `Failed to ${b.status === 'paused' ? 'resume' : 'pause'} this banner.`);
    } finally {
      setToggleBusyId(null);
    }
  }

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Content"
        title="Banners"
        subtitle="Manage promotional banners across Homepage, Marketplace, Education Marketplace, and Category placements. How many rotate at once per placement is configured in Platform Config."
        actions={
          <Button icon={<Plus size={14} />} onClick={() => setEditing('new')} className="shrink-0">
            Add Banner
          </Button>
        }
      />

      <div className="px-4 sm:px-7 pt-6 pb-8">
        {oversubscribed.length > 0 && (
          <div className="mb-4 bg-warning-bg border border-warning-border rounded-lg px-4 py-2.5 text-[12.5px] text-charcoal flex items-start gap-2">
            <AlertTriangle size={15} className="text-warning shrink-0 mt-[2px]" />
            <div>
              {oversubscribed.map(c => (
                <p key={c.placement} className="m-0">
                  <strong>{PLACEMENT_LABEL[c.placement] ?? c.placement}</strong> has {c.current} active banners but only shows {c.visibleLimit} at a time — the ones with the highest Display Order won't be seen.
                </p>
              ))}
              <p className="m-0 mt-1 text-[11.5px] text-slate">Pause some, or raise the limit in Platform Config.</p>
            </div>
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-bone rounded-xl overflow-hidden flex flex-col">
                <SkeletonBox className="aspect-[16/9] w-full" rounded="0" />
                <div className="p-3 flex flex-col gap-2">
                  <SkeletonBox className="h-4 w-1/2" />
                  <SkeletonBox className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-[13px] text-error text-center py-8">{error}</p>
        ) : banners.length === 0 ? (
          <div className="bg-white border border-bone rounded-xl">
            <EmptyState
              icon={<ImageIcon size={28} className="text-slate" />}
              title="No banners yet"
              description="Add one to feature it on a placement."
              action={{ label: 'Add Banner', onClick: () => setEditing('new'), icon: <Plus size={14} /> }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...banners].sort((a, b) => a.order - b.order).map(b => {
              const statusStyle = STATUS_STYLE[b.status] ?? STATUS_STYLE[b.isActive ? 'active' : 'draft'];
              return (
                <div key={b._id} className="bg-white border border-bone rounded-xl overflow-hidden flex flex-col transition-colors duration-200 hover:border-brand-orange/25">
                  <div className="aspect-[16/9] bg-cream">
                    <img loading="lazy" decoding="async" src={b.bannerImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="px-[8px] py-[2px] rounded-[5px] text-[11px] font-semibold"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                      <span className="text-[11px] text-slate">Order {b.order}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bannerPlacements(b).map(p => (
                        <span key={p} className="text-[10px] text-slate bg-cream border border-bone rounded-full px-[7px] py-[1px]">
                          {PLACEMENT_LABEL[p] ?? p}
                        </span>
                      ))}
                    </div>
                    {b.urlOnTap && (
                      <a href={b.urlOnTap} target="_blank" rel="noreferrer" className="text-[11px] text-brand-orange truncate flex items-center gap-1">
                        <ExternalLink size={10} /> {b.urlOnTap}
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <button onClick={() => setEditing(b)} className="flex-1 px-[10px] py-[6px] rounded-[6px] text-[11px] font-medium text-charcoal bg-cream border border-bone cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-bone focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => togglePause(b)} disabled={toggleBusyId === b._id} className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-medium text-charcoal bg-cream border border-bone cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-bone disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        {b.status === 'paused' ? <Play size={11} /> : <Pause size={11} />}
                      </button>
                      <button onClick={() => { setDeleting(b); setDeleteError(''); }} className="px-[10px] py-[6px] rounded-[6px] text-[11px] font-medium text-error bg-error-bg border border-error-border cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-error hover:text-white focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {toggleErrorId === b._id && (
                      <p className="text-[11px] text-error leading-snug">{toggleError}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <BannerFormModal
          banner={editing === 'new' ? null : editing}
          currentCount={banners.length}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      {deleting && (
        <Modal mobileSheet
          title="Delete Banner"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteBusy}>Delete Banner</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Delete this banner? This cannot be undone.
          </p>
          {deleteError && <p className="text-[12px] text-error mt-2">{deleteError}</p>}
        </Modal>
      )}
    </div>
  );
}
