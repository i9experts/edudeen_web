import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { apiGetStoreBanners, MAX_STORE_SLIDES, type StoreBanner } from '@/api/services/storeBanner';

/** Customize Store: read-only summary of the banner slides. The editor lives in Marketing -> Storefront -> Banners (one editor, no second copy). */
export function StoreBannerSummary({ storeId }: { storeId: string }) {
  const [banners, setBanners] = useState<StoreBanner[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback((quiet = false) => {
    if (!quiet) { setBanners(null); setError(false); }
    apiGetStoreBanners(storeId)
      .then(res => { setBanners(res.data ?? []); setError(false); })
      .catch(() => { if (!quiet) setError(true); });
  }, [storeId]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['banners', 'store', 'marketing'], () => load(true));

  const editor = `/store/${storeId}/marketing?group=storefront&tab=banners`;
  const live = (banners ?? []).filter(b => b.status === 'active' || b.status === 'scheduled')
    .sort((a, b) => b.priority - a.priority || a.order - b.order);

  if (error) {
    return (
      <p className="text-[13px] text-slate">
        Could not load your slides. <button type="button" onClick={() => load()} className="font-semibold text-brand-royal underline bg-transparent border-0 cursor-pointer p-0">Try again</button>
      </p>
    );
  }
  if (!banners) return <div className="h-14 rounded-xl bg-mist animate-pulse" aria-busy="true" aria-label="Loading slides" />;

  return (
    <div className="flex flex-col gap-3">
      {live.length === 0 ? (
        <p className="text-[13px] text-slate">No slides yet. Without slides, your store shows the banner photo above (or Edudeen&apos;s default gradient).</p>
      ) : (
        <ul className="list-none p-0 m-0 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Your banner slides">
          {live.slice(0, MAX_STORE_SLIDES).map((b, i) => (
            <li key={b._id} className="relative aspect-[16/9] rounded-lg overflow-hidden border border-bone bg-cream">
              <img src={b.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
              <span className="absolute top-1 start-1 px-1.5 rounded bg-black/55 text-white text-[12px] font-semibold">{i + 1}</span>
              {b.status === 'scheduled' && <span className="absolute bottom-1 start-1 px-1.5 rounded bg-white/90 text-[12px] font-semibold text-charcoal">Scheduled</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[12.5px] text-slate m-0"><span className="font-semibold text-carbon">{live.length} of {MAX_STORE_SLIDES}</span> slides in use. They change every 6 seconds.</p>
        <Link to={editor} className="text-[13px] font-semibold text-brand-royal hover:underline min-h-[44px] inline-flex items-center">{live.length === 0 ? 'Add slides' : 'Edit slides'}</Link>
      </div>
    </div>
  );
}
