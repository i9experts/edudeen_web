import { useEffect, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { Image as ImageIcon, Pause, Play, Trash2, Plus } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox, Button } from '@/components/comman/ui';
import { apiGetStoreBanners, apiPauseStoreBanner, apiResumeStoreBanner, apiDeleteStoreBanner, type StoreBanner } from '@/api/services/storeBanner';
import { StoreBannerFormModal, BANNER_TYPE_LABEL, BANNER_STATUS_STYLE } from './BannerFormModal';

export function BannersTab() {
  const { storeId } = useStoreWorkspace();
  // Store Banners
  const [storeBanners, setStoreBanners] = useState<StoreBanner[]>([]);
  const [storeBannersLoading, setStoreBannersLoading] = useState(true);
  const [storeBannersError, setStoreBannersError] = useState('');
  const [addingBanner, setAddingBanner] = useState(false);
  const [bannerBusyId, setBannerBusyId] = useState<string | null>(null);

  function refetchStoreBanners() {
    if (!storeId) return;
    setStoreBannersLoading(true);
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
    } catch {
      // best-effort — button just stays as-is on failure
    } finally {
      setBannerBusyId(null);
    }
  }

  async function removeBanner(b: StoreBanner) {
    setBannerBusyId(b._id);
    try {
      await apiDeleteStoreBanner(storeId, b._id);
      setStoreBanners(prev => prev.filter(x => x._id !== b._id));
    } catch {
      // best-effort
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
            <p className="text-[15px] font-bold text-carbon">Store Banners</p>
            <p className="text-[12.5px] text-slate mt-0.5">
              Hero, promotion, season and collection banners for your storefront.
            </p>
          </div>
          <Button icon={<Plus size={14} />} onClick={() => setAddingBanner(true)}>Add Banner</Button>
        </div>

        {storeBannersError && <p className="text-xs text-error">{storeBannersError}</p>}

        {storeBannersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={160} rounded="10px" />)}
          </div>
        ) : storeBanners.length === 0 ? (
          <EmptyState
            icon={<ImageIcon size={28} className="text-brand-orange opacity-55" />}
            title="No store banners yet"
            description="Add a hero banner to make your storefront feel professional."
            action={{ label: 'Add Banner', onClick: () => setAddingBanner(true), icon: <Plus size={14} /> }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...storeBanners].sort((a, b) => b.priority - a.priority || a.order - b.order).map(b => {
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
                    <div className="flex items-center gap-2 mt-auto pt-2">
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
    </>
  );
}
