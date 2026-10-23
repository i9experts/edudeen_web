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
  /** Admin-given title, used as the picture's alt text. */
  title?: string;
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
   *  needs to display in full (e.g. Marketplace's WelcomeStrip hero cell).
   *  'blend' = whole picture, never cropped, stretched or upscaled, on a blurred copy of itself that fills the
   *  rest of the box - any picture shape looks right and keeps its full quality (homepage hero). */
  fit?: 'cover' | 'contain' | 'blend';
  /** Dot indicators under the slides (default on). Off where the prev/next arrows are enough. */
  showDots?: boolean;
  /** Called with the id of the slide currently visible (admin inline editor uses it to focus that banner). */
  onActiveChange?: (id: string) => void;
}

const ROTATE_MS = 5000;

/** Seller/admin typed links: only http(s) or a site path - never javascript:/data: (defence in depth). */
function isSafeLink(url: string) {
  const u = url.trim();
  if (u.startsWith('//')) return /^\/\/[^/\s]/.test(u);
  return u.startsWith('/') || /^https?:\/\//i.test(u);
}

function isExternalLink(url: string) {
  if (url.startsWith('/') && !url.startsWith('//')) return false;
  try { return new URL(url).host !== window.location.host; } catch { return true; }
}

/** Promotional banner carousel — full-bleed background layer. Fills its nearest
 *  `relative`-positioned, sized parent (`absolute inset-0`). Every slide is
 *  mounted up front (the admin-configurable per-placement limit keeps this to
 *  a handful of images) and slides via `transform: translateX` — swapping
 *  `src` on an interval instead would re-fetch/re-decode each slide on every
 *  rotation and flash blank on a slow connection. Each slide's offset is the
 *  *shortest signed distance* from the active index (wrapping around the
 *  list), so going from the last slide back to the first (or vice versa)
 *  slides one step over instead of sweeping across every slide in between. */
export function BannerCarousel({ banners, entityType, fit = 'cover', showDots = true, onActiveChange }: BannerCarouselProps) {
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

  // Finger swipe (phones have no arrows): a mostly-horizontal drag of 40px+ moves one slide.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const p = e.touches[0]; touchStart.current = { x: p.clientX, y: p.clientY }; setPaused(true); };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    touchStart.current = null;
    setPaused(false);
    if (!s || sorted.length < 2) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - s.x;
    const dy = p.clientY - s.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    const rtl = document.documentElement.dir === 'rtl';
    go((dx < 0) !== rtl ? 1 : -1);
  };

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + sorted.length) % sorted.length);

  function handleClick() {
    apiTrackPromotionClick(entityType, active._id);
    setPromotionAttribution(entityType, active._id);
  }

  const activeId = active?._id;
  useEffect(() => { if (activeId) onActiveChange?.(activeId); }, [activeId, onActiveChange]);

  const activeLoaded = active ? loadedIds.has(active._id) : false;

  return (
    <div
      className="absolute inset-0 group touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touchStart.current = null; setPaused(false); }}
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
        const hq = fit === 'contain' ? 'auto' : 'auto:best';
        const img = (
          <>
          <picture>
            {fit === 'blend' && (
              <img
                src={cloudinaryUrl(banner.imageUrl, 480)}
                alt=""
                aria-hidden
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-90"
              />
            )}
            {banner.mobileImageUrl && (
              <source media={MOBILE_BREAKPOINT} srcSet={cloudinaryDensitySrcSet(banner.mobileImageUrl, 480)} />
            )}
            <img
              src={cloudinaryUrl(banner.imageUrl, 1920, hq)}
              srcSet={cloudinarySrcSet(banner.imageUrl, undefined, hq)}
              sizes="100vw"
              loading={i === 0 ? 'eager' : 'lazy'}
              fetchPriority={i === 0 ? 'high' : undefined}
              decoding="async"
              alt={banner.title || 'Edudeen offer'}
              onLoad={() => setLoadedIds((prev) => (prev.has(banner._id) ? prev : new Set(prev).add(banner._id)))}
              className={clsx(
                'absolute inset-0 w-full h-full',
                fit === 'contain' ? 'object-contain bg-cream' : fit === 'blend' ? 'object-contain' : 'object-cover',
                fit === 'cover' && isActive && !prefersReducedMotion && 'hero-kenburns',
              )}
            />
          </picture>
          {banner.title && (
            <>
              <div aria-hidden className="absolute inset-y-0 start-0 w-[70%] bg-gradient-to-r from-[#0F3354]/75 via-[#0F3354]/35 to-transparent pointer-events-none rtl:bg-gradient-to-l" />
              <div className="absolute inset-y-0 start-0 flex items-center ps-5 sm:ps-8 lg:ps-12 pe-4 max-w-[75%] sm:max-w-[60%] pointer-events-none">
                <h2 className="m-0 text-white font-bold leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] text-[20px] sm:text-[28px] lg:text-[40px] line-clamp-3">
                  {banner.title}
                </h2>
              </div>
            </>
          )}
          </>
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
            {isActive && banner.linkUrl && isSafeLink(banner.linkUrl) ? (
              // Links inside Edudeen (a category, product, sale…) open in place;
              // only outside sites get a new tab.
              <a
                href={banner.linkUrl}
                {...(isExternalLink(banner.linkUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
                onClick={handleClick}
                className="absolute inset-0"
              >
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
            className="absolute start-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-transparent hover:bg-black/15 hover:scale-105 hidden md:flex items-center justify-center border-none cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 z-10"
          >
            <ChevronLeft size={26} strokeWidth={2.5} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute end-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-transparent hover:bg-black/15 hover:scale-105 hidden md:flex items-center justify-center border-none cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 z-10"
          >
            <ChevronRight size={26} strokeWidth={2.5} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
          </button>
          {showDots && <div className="absolute bottom-4 end-4 sm:end-6 lg:end-10 flex gap-[6px] z-10">
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
          </div>}
        </>
      )}
    </div>
  );
}
