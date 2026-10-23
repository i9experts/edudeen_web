import type { BannerCarouselItem } from '@/components/comman/marketplace/BannerCarousel';
import { apiGetBanners, type PromotionPlacement } from '@/api/services/banner';

// Banners change rarely; one fetch per placement per few minutes is plenty.
const TTL_MS = 60 * 1000;
const cache = new Map<PromotionPlacement, { at: number; items: BannerCarouselItem[] }>();
const inflight = new Map<PromotionPlacement, Promise<BannerCarouselItem[]>>();

export const BANNERS_CHANGED_EVENT = 'edudeen:banners-changed';

export function cachedBanners(placement: PromotionPlacement): BannerCarouselItem[] {
  return cache.get(placement)?.items ?? [];
}

export function loadPlacementBanners(placement: PromotionPlacement): Promise<BannerCarouselItem[]> {
  const hit = cache.get(placement);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.items);
  const running = inflight.get(placement);
  if (running) return running;
  const p = apiGetBanners(placement)
    .then(res => (res.data ?? []).map(b => ({ _id: b._id, order: b.order, imageUrl: b.bannerImage, linkUrl: b.urlOnTap, title: b.title })))
    .catch(() => [] as BannerCarouselItem[])
    .then(items => { cache.set(placement, { at: Date.now(), items }); inflight.delete(placement); return items; });
  inflight.set(placement, p);
  return p;
}

/** Drops every cached placement and tells mounted PlacementBanners to re-fetch (used after an inline admin edit). */
export function invalidatePlacementBanners() {
  cache.clear();
  inflight.clear();
  window.dispatchEvent(new Event(BANNERS_CHANGED_EVENT));
}