import { useEffect, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { Image as ImageIcon, Pause, Play, Trash2, Plus, ArrowLeft, ArrowRight, Pencil, Link2 } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox, Button } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiGetStoreBanners, apiPauseStoreBanner, apiResumeStoreBanner, apiDeleteStoreBanner, apiReorderStoreBanners, MAX_STORE_SLIDES, type StoreBanner } from '@/api/services/storeBanner';
import { StoreBannerFormModal, BANNER_TYPE_LABEL, BANNER_STATUS_STYLE } from './BannerFormModal';

const sortSlides = (list: StoreBanner[]) => [...list].sort((a, b) => b.priority - a.priority || a.order - b.order);
const takesSlot = (b: StoreBanner) => b.status === 'active' || b.status === 'scheduled';

export function BannersTab() {
  const { storeId } = useStoreWorkspace();
  const toast = useToast();
  // Store Banners
  const [storeBanners, setStoreBanners] = useState<StoreBanner[]>([]);
  const [storeBannersLoading, setStoreBannersLoading] = useState(true);
  const [storeBannersError, setStoreBannersError] = useState('');
  const [addingBanner, setAddingBanner] = useState(false);
  const [editing, setEditing] = useState<StoreBanner | null>(null);
  const [bannerBusyId, setBannerBusyId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const slotsUsed = storeBanners.filter(takesSlot).length;
  const slotsFull = slotsUsed >= MAX_STORE_SLIDES;

  async function move(index: number, delta: -1 | 1) {
    const list = sortSlides(storeBanners);
    const target = index + delta;
    if (target < 0 || target >= list.length || reordering) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    const before = storeBanners;
    // Optimistic: the same numbers the server will store (order = position, priority reset).
    setStoreBanners(next.map((b, i) => ({ ...b, order: i, priority: 0 })));
    setReordering(true);
    try {
      await apiReorderStoreBanners(storeId, next.map(b => b._id));
    } catch (err) {
      setStoreBanners(before);
      toast.error(err instanceof Error ? err.message : 'Could not change the order.');
    } finally {
      setReordering(false);
    }
  }

  function refetchStoreBanners() {
    if (!storeId) return;
    setStoreBannersLoading(true);
    setStoreBannersError('');
    apiGetStoreBanners(storeId)
      .then(res => setStoreBanners(res.data ?? []))
      .catch(err => setStoreBannersError(err instanceof Error ? err.message : 'Failed to load store banners.'))
      .finally(() => setStoreBannersLoading(false));
  }

  useEffect(() => {
    if (!storeId) return;
    refetchStoreBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function toggleBannerPause(b: StoreBanner) {
    setBannerBusyId(b._id);
    try {
      if (b.status === 'paused') await apiResumeStoreBanner(storeId, b._id);
      else await apiPauseStoreBanner(storeId, b._id);
      refetchStoreBanners();
    } catch (err) {
      // e.g. resuming a 5th slide: the API answers 400 with the reason
      toast.error(err instanceof Error ? err.message : 'Could not change this slide.');
    } finally {
      setBannerBusyId(null);
    }
  }

  async function removeBanner(b: StoreBanner) {
    setBannerBusyId(b._id);
    try {
      await apiDeleteStoreBanner(storeId, b._id);
      setStoreBanners(prev => prev.filter(x => x._id !== b._id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete this slide.');
    } finally {
      setBannerBusyId(null);
    }
  }

  // Admin paused/approved something or a schedule went live: quiet re-read (a failed re-read keeps the list).
  useLiveRefresh(['banners', 'store', 'marketing'], () => {
    if (!storeId) return;
    apiGetStoreBanners(storeId).then(res => setStoreBanners(res.data ?? [])).catch(() => {});
  }, !!storeId);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-carbon">Store banner slides</p>
            <p className="text-[12.5px] text-slate mt-0.5">
              Up to {MAX_STORE_SLIDES} slides rotate at the top of your store. <span className="font-semibold text-carbon" aria-live="polite">{slotsUsed} of {MAX_STORE_SLIDES} in use.</span>
            </p>
          </div>
          <Button icon={<Plus size={14} />} onClick={() => setAddingBanner(true)} disabled={slotsFull} title={slotsFull ? `You already have ${MAX_STORE_SLIDES} slides. Pause or delete one first.` : undefined}>Add slide</Button>
        </div>

        {storeBannersError && (
          <p className="text-xs text-error">{storeBannersError} <button type="button" onClick={refetchStoreBanners} className="underline bg-transparent border-0 cursor-pointer text-error p-0">Try again</button></p>
        )}

        {storeBannersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={160} rounded="10px" />)}
          </div>
        ) : storeBanners.length === 0 && !storeBannersError ? (
          <EmptyState
            icon={<ImageIcon size={28} className="text-brand-orange opacity-55" />}
            title="No banner slides yet"
            description="Add a slide to make your storefront feel professional."
            action={{ label: 'Add slide', onClick: () => setAddingBanner(true), icon: <Plus size={14} /> }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortSlides(storeBanners).map((b, index, all) => {
              const st = BANNER_STATUS_STYLE[b.status] ?? BANNER_STATUS_STYLE.draft;
              return (
                <div key={b._id} className="bg-white border border-bone rounded-[10px] overflow-hidden flex flex-col transition-colors duration-200 hover:border-brand-orange/25">
                  <div className="aspect-[16/9] bg-cream">
                    <img loading="lazy" decoding="async" src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="px-[8px] py-[2px] rounded-[5px] text-[12px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      <span className="text-[12px] text-slate">{BANNER_TYPE_LABEL[b.type]}</span>
                    </div>
                    {b.ctaLabel && <p className="text-[12px] text-charcoal font-medium truncate">{b.ctaLabel}</p>}
                    {b.linkTarget && (b.linkType === 'product' || b.linkType === 'collection') && (
                      <p className="text-[12px] text-slate flex items-center gap-1"><Link2 size={11} aria-hidden /> Opens one of your {b.linkType === 'product' ? 'products' : 'collections'}</p>
                    )}
                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <button type="button" aria-label="Move earlier" disabled={index === 0 || reordering} onClick={() => move(index, -1)}
                        className="size-9 rounded-[6px] bg-cream border border-bone cursor-pointer flex items-center justify-center text-charcoal hover:bg-bone disabled:opacity-40 disabled:cursor-default focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                        <ArrowLeft size={13} aria-hidden className="rtl:rotate-180" />
                      </button>
                      <button type="button" aria-label="Move later" disabled={index === all.length - 1 || reordering} onClick={() => move(index, 1)}
                        className="size-9 rounded-[6px] bg-cream border border-bone cursor-pointer flex items-center justify-center text-charcoal hover:bg-bone disabled:opacity-40 disabled:cursor-default focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                        <ArrowRight size={13} aria-hidden className="rtl:rotate-180" />
                      </button>
                      <button type="button" aria-label="Edit slide" onClick={() => setEditing(b)}
                        className="size-9 rounded-[6px] bg-cream border border-bone cursor-pointer flex items-center justify-center text-charcoal hover:bg-bone focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                        <Pencil size={13} aria-hidden />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleBannerPause(b)} disabled={bannerBusyId === b._id}
                        className="flex-1 px-[10px] py-[6px] rounded-[6px] text-[12px] font-medium text-charcoal bg-cream border border-bone cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-bone disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        {b.status === 'paused' ? <Play size={11} /> : <Pause size={11} />} {b.status === 'paused' ? 'Resume' : 'Pause'}
                      </button>
                      <button aria-label="Delete" onClick={() => removeBanner(b)} disabled={bannerBusyId === b._id}
                        className="px-[10px] py-[6px] rounded-[6px] text-[12px] font-medium text-error bg-error-bg border border-error-border cursor-pointer flex items-center justify-center gap-1 outline-none transition-colors duration-150 hover:bg-error hover:text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    {addingBanner && (
      <StoreBannerFormModal
        storeId={storeId}
        onClose={() => setAddingBanner(false)}
        onSaved={() => { setAddingBanner(false); refetchStoreBanners(); }}
      />
    )}
    {editing && (
      <StoreBannerFormModal
        storeId={storeId}
        banner={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); refetchStoreBanners(); }}
      />
    )}
    </>
  );
}
