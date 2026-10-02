import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiTrackPromotionImpression, apiTrackPromotionClick } from '@/api/services/promotions';
import { setPromotionAttribution } from '@/utils/promotionAttribution';
import { cloudinaryUrl, cloudinarySrcSet, cloudinaryDensitySrcSet } from '@/utils/cloudinaryImage';

/** Minimal shape this carousel needs — both the platform `Banner` (Marketplace/
 *  Education Marketplace hero) and a store's own `StoreBanner` (storefront hero)
 *  map onto this at their call site, so this component stays data-source-agnostic. */
export interface BannerCarouselItem {
  _id: string;
  order: number;
  imageUrl: string;
  linkUrl?: string | null;
  /** Store-banner-only: a seller-provided dedicated mobile crop. Swapped in
   *  below 768px via `<picture>` art-direction instead of just serving a
   *  smaller version of the desktop crop. */
  mobileImageUrl?: string | null;
}

const MOBILE_BREAKPOINT = '(max-width: 767px)';

interface BannerCarouselProps {
  banners: BannerCarouselItem[];
  /** Which collection these ids belong to — tags impression/click tracking and
   *  the click-attribution token read back at checkout. */
  entityType: 'banner' | 'store_banner';
  /** 'cover' (default) fills the box edge-to-edge, cropping as needed — right
   *  for a full-bleed page hero. 'contain' instead shows the whole image
   *  un-cropped (letterboxed if its aspect ratio doesn't match the box) — for
   *  a fixed-size showcase slot where any uploaded image, small or large,
   *  needs to display in full (e.g. Marketplace's WelcomeStrip hero cell). */
  fit?: 'cover' | 'contain';
}

const ROTATE_MS = 5000;

/** Promotional banner carousel — full-bleed background layer. Fills its nearest
 *  `relative`-positioned, sized parent (`absolute inset-0`). Every slide is
 *  mounted up front (the admin-configurable per-placement limit keeps this to
 *  a handful of images) and slides via `transform: translateX` — swapping
 *  `src` on an interval instead would re-fetch/re-decode each slide on every
 *  rotation and flash blank on a slow connection. Each slide's offset is the
 *  *shortest signed distance* from the active index (wrapping around the
 *  list), so going from the last slide back to the first (or vice versa)
 *  slides one step over instead of sweeping across every slide in between. */
export function BannerCarousel({ banners, entityType, fit = 'cover' }: BannerCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(() => new Set());
  const impressedIds = useRef(new Set<string>());
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  ).current;

  const sorted = [...banners].sort((a, b) => a.order - b.order);
  const len = sorted.length;
  const active = sorted[index];

  useEffect(() => {
    if (sorted.length < 2 || paused || prefersReducedMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % sorted.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [sorted.length, paused, prefersReducedMotion]);

  useEffect(() => {
    if (index >= sorted.length) setIndex(0);
  }, [sorted.length, index]);

  useEffect(() => {
    if (!active || impressedIds.current.has(active._id)) return;
    impressedIds.current.add(active._id);
    apiTrackPromotionImpression(entityType, active._id);
  }, [active, entityType]);

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + sorted.length) % sorted.length);

  function handleClick() {
    apiTrackPromotionClick(entityType, active._id);
    setPromotionAttribution(entityType, active._id);
  }

  const activeLoaded = active ? loadedIds.has(active._id) : false;

  return (
    <div
      className="absolute inset-0 group"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Skeleton — visible only until the currently-active slide has painted at least once */}
      {!activeLoaded && <div className="absolute inset-0 animate-pulse bg-[#edebe2]" />}

      {/* Bottom legibility scrim — keeps the dot indicators readable regardless
          of how light the active slide's image is, without touching the image
          itself or adding any text content. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent z-[2]" />

      {sorted.map((banner, i) => {
        const isActive = i === index;
        const img = (
          <picture>
            {banner.mobileImageUrl && (
              <source media={MOBILE_BREAKPOINT} srcSet={cloudinaryDensitySrcSet(banner.mobileImageUrl, 480)} />
            )}
            <img
              src={cloudinaryUrl(banner.imageUrl, 1920)}
              srcSet={cloudinarySrcSet(banner.imageUrl)}
              sizes="100vw"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : undefined}
              decoding="async"
              alt=""
              onLoad={() => setLoadedIds((prev) => (prev.has(banner._id) ? prev : new Set(prev).add(banner._id)))}
              className={clsx(
                'absolute inset-0 w-full h-full',
                fit === 'contain' ? 'object-contain bg-cream' : 'object-cover',
                fit === 'cover' && isActive && !prefersReducedMotion && 'hero-kenburns',
              )}
            />
          </picture>
        );

        // Shortest signed distance from the active slide, wrapping around the
        // list — keeps every slide parked directly off-screen to the left or
        // right of the active one instead of stacked at a single spot, so
        // the transform transition below reads as a real slide, not a jump-cut.
        let diff = i - index;
        if (diff > len / 2) diff -= len;
        if (diff < -len / 2) diff += len;

        return (
          <div
            key={banner._id}
            aria-hidden={!isActive}
            style={{ transform: `translateX(${diff * 100}%)` }}
            className={clsx(
              'absolute inset-0 will-change-transform transition-transform ease-[cubic-bezier(0.65,0,0.35,1)] duration-[650ms]',
              isActive ? 'z-[1]' : 'pointer-events-none',
            )}
          >
            {isActive && banner.linkUrl ? (
              <a href={banner.linkUrl} target="_blank" rel="noreferrer" onClick={handleClick} className="absolute inset-0">
                {img}
              </a>
            ) : (
              img
            )}
          </div>
        );
      })}

      {sorted.length > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute start-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/85 shadow-[0_4px_14px_rgba(20,15,10,0.12)] backdrop-blur-sm hover:bg-white hover:scale-105 flex items-center justify-center border-none cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 z-10"
          >
            <ChevronLeft size={16} className="text-charcoal" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute end-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/85 shadow-[0_4px_14px_rgba(20,15,10,0.12)] backdrop-blur-sm hover:bg-white hover:scale-105 flex items-center justify-center border-none cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 z-10"
          >
            <ChevronRight size={16} className="text-charcoal" />
          </button>
          <div className="absolute bottom-4 end-4 sm:end-6 lg:end-10 flex gap-[6px] z-10">
            {sorted.map((b, i) => (
              <button
                key={b._id}
                onClick={() => setIndex(i)}
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === index}
                className="p-2 -m-2 flex items-center cursor-pointer"
              >
                <span
                  className="block h-[6px] rounded-full border border-black/10 transition-all duration-300 ease-out"
                  style={{ width: i === index ? 22 : 6, background: i === index ? '#174771' : 'rgba(255,255,255,0.75)' }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
