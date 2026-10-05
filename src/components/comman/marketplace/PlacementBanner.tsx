import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { BannerCarousel, type BannerCarouselItem } from '@/components/comman/marketplace/BannerCarousel';
import { apiGetBanners, type PromotionPlacement } from '@/api/services/banner';

// Banners change rarely; one fetch per placement per few minutes is plenty.
const TTL_MS = 3 * 60 * 1000;
const cache = new Map<PromotionPlacement, { at: number; items: BannerCarouselItem[] }>();
const inflight = new Map<PromotionPlacement, Promise<BannerCarouselItem[]>>();

function load(placement: PromotionPlacement): Promise<BannerCarouselItem[]> {
  const hit = cache.get(placement);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.items);
  const running = inflight.get(placement);
  if (running) return running;
  const p = apiGetBanners(placement)
    .then(res => (res.data ?? []).map(b => ({ _id: b._id, order: b.order, imageUrl: b.bannerImage, linkUrl: b.urlOnTap })))
    .catch(() => [] as BannerCarouselItem[])
    .then(items => { cache.set(placement, { at: Date.now(), items }); inflight.delete(placement); return items; });
  inflight.set(placement, p);
  return p;
}

/**
 * The live banners for one placement — Edudeen's own (Admin → Banners) and
 * sellers' approved paid promotions, which run as banners in the same slot.
 * Renders nothing when the placement has no active banner, so pages look
 * exactly as before until the admin publishes one. Views and clicks are
 * tracked (and credited to the seller's promotion) by BannerCarousel.
 */
export function PlacementBanner({ placement, className }: { placement: PromotionPlacement; className?: string }) {
  const [items, setItems] = useState<BannerCarouselItem[]>(() => cache.get(placement)?.items ?? []);

  useEffect(() => {
    let alive = true;
    load(placement).then(list => { if (alive) setItems(list); });
    return () => { alive = false; };
  }, [placement]);

  if (!items.length) return null;
  return (
    <section aria-label="Featured promotions" className={clsx('relative w-full overflow-hidden rounded-2xl bg-cream aspect-[2/1] sm:aspect-[3/1] lg:aspect-[4/1]', className)}>
      <BannerCarousel entityType="banner" banners={items} />
    </section>
  );
}
