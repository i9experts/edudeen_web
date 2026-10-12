import { useMemo, useState } from 'react';
import { Plus, ImageIcon, ExternalLink, Pencil, Trash2, Pause, Play, AlertTriangle, CalendarClock, Radio } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminBanners, useBannerCount } from '@/hooks/admin/useAdminBanners';
import {
  apiDeleteBanner, apiPauseBanner, apiResumeBanner,
  bannerPlacements, type Banner, type PromotionPlacement,
} from '@/api/services/banner';
import { Button } from '@/components/comman/ui/Button';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { BannerFormModal, PLACEMENT_LABEL, fmtWhen, effectiveState } from '@/features/admin/pages/BannerFormModal';
import { Modal } from '@/components/comman/ui/Modal';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

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
  const [filter, setFilter] = useState<'all' | 'live' | 'scheduled' | 'draft' | 'paused' | 'expired'>('all');

  const withState = useMemo(() => banners.map(b => ({ b, st: effectiveState(b) })), [banners]);
  const stateCounts = useMemo(() => {
    const c = { all: withState.length, live: 0, scheduled: 0, draft: 0, paused: 0, expired: 0 };
    for (const x of withState) c[x.st.key] += 1;
    return c;
  }, [withState]);
  const liveByPlacement = useMemo(() => {
    const m = new Map<PromotionPlacement, Banner[]>();
    for (const x of withState) if (x.st.key === 'live') for (const p of bannerPlacements(x.b)) m.set(p, [...(m.get(p) ?? []), x.b]);
    return m;
  }, [withState]);
  const visible = withState.filter(x => filter === 'all' || x.st.key === filter).sort((a, c) => a.b.order - c.b.order);

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
              <p className="m-0 mt-1 text-[12px] text-slate">Pause some, or raise the limit in Platform Config.</p>
            </div>
          </div>
        )}
        {!loading && !error && banners.length > 0 && (
          <div className="mb-5 bg-white border border-bone rounded-xl p-4">
            <p className="text-[13px] font-semibold text-carbon flex items-center gap-1.5 mb-3"><Radio size={14} className="text-success" /> Live right now</p>
            {liveByPlacement.size === 0 ? (
              <p className="text-[12.5px] text-slate">No banner is live at the moment — visitors see the default page. Publish one below, or wait for a scheduled one.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {[...liveByPlacement.entries()].map(([p, list]) => (
                  <div key={p} className="flex items-center gap-3 min-w-0">
                    <div className="flex -space-x-2 rtl:space-x-reverse shrink-0">
                      {list.slice(0, 3).map(b => <img key={b._id} src={b.bannerImage} alt="" className="w-14 h-8 object-cover rounded border-2 border-white bg-cream" />)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-medium text-charcoal truncate">{PLACEMENT_LABEL[p] ?? p}</p>
                      <p className="text-[12px] text-slate">{list.length} banner{list.length === 1 ? '' : 's'} live</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && !error && banners.length > 0 && (
          <div role="tablist" aria-label="Filter banners" className="mb-4 flex flex-wrap gap-2">
            {([['all', 'All'], ['live', 'Live'], ['scheduled', 'Scheduled'], ['draft', 'Drafts'], ['paused', 'Paused'], ['expired', 'Expired']] as const).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} type="button" onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium border cursor-pointer transition-colors ${filter === k ? 'bg-carbon text-white border-carbon' : 'bg-white text-charcoal border-bone hover:bg-cream'}`}>
                {label} <span className="opacity-70">{stateCounts[k]}</span>
              </button>
            ))}
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
            {visible.length === 0 && <p className="col-span-full text-[13px] text-slate text-center py-8">No banners in this view.</p>}
            {visible.map(({ b, st }) => {
              const statusStyle = st.style;
              return (
                <div key={b._id} className="bg-white border border-bone rounded-xl overflow-hidden flex flex-col transition-colors duration-200 hover:border-brand-orange/25">
                  <div className="aspect-[16/9] bg-cream">
                    <img loading="lazy" decoding="async" src={b.bannerImage} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="px-[8px] py-[2px] rounded-[5px] text-[12px] font-semibold"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {statusStyle.label}
                      </span>
                      <span className="text-[12px] text-slate">Order {b.order}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bannerPlacements(b).map(p => (
                        <span key={p} className="text-[12px] text-slate bg-cream border border-bone rounded-full px-[7px] py-[1px]">
                          {PLACEMENT_LABEL[p] ?? p}
                        </span>
                      ))}
                    </div>
                    {(b.startAt || b.endAt) && (
                      <p className="text-[12px] text-slate flex items-start gap-1.5 m-0">
                        <CalendarClock size={11} className="mt-[3px] shrink-0" />
                        <span>{b.startAt ? `From ${fmtWhen(b.startAt)}` : ''}{b.startAt && b.endAt ? ' · ' : ''}{b.endAt ? `Until ${fmtWhen(b.endAt)}` : ''}</span>
                      </p>
                    )}
                    {b.urlOnTap && (
                      <a href={b.urlOnTap} target="_blank" rel="noreferrer" className="text-[12px] text-brand-orange truncate flex items-center gap-1">
                        <ExternalLink size={10} /> {b.urlOnTap}
                      </a>
                    )}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <button onClick={() => setEditing(b)} className="flex-1 px-[10px] py-[6px] rounded-[6px] text-[12px] font-medium text-charcoal bg-cream border border-bone cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-bone focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        <Pencil size={11} /> Edit
                      </button>
                      <button onClick={() => togglePause(b)} disabled={toggleBusyId === b._id} className="px-[10px] py-[6px] rounded-[6px] text-[12px] font-medium text-charcoal bg-cream border border-bone cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-bone disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        {b.status === 'paused' ? <Play size={11} /> : <Pause size={11} />}
                      </button>
                      <button aria-label="Delete" onClick={() => { setDeleting(b); setDeleteError(''); }} className="px-[10px] py-[6px] rounded-[6px] text-[12px] font-medium text-error bg-error-bg border border-error-border cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-error hover:text-white focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        <Trash2 size={11} />
                      </button>
                    </div>
                    {toggleErrorId === b._id && (
                      <p className="text-[12px] text-error leading-snug">{toggleError}</p>
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
