import { useState, useEffect, useRef, useCallback } from 'react';
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
const SLIDE_MS = 600;

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

/** Promotional banner carousel — fills its nearest `relative`, sized parent.
 *  Classic infinite-loop slider: one horizontal track `[last*, 1, 2 … n, first*]`
 *  (* = clones). Next always moves the track one step left, Previous one step
 *  right, so the direction is always the natural one - including past the ends:
 *  after sliding onto a clone the track silently jumps (no animation) to the
 *  identical real slide. Auto-play moves forward only. Touch / mouse drag
 *  follows the finger and then snaps to the next or previous slide. */
export function BannerCarousel({ banners, entityType, fit = 'cover', showDots = true, onActiveChange }: BannerCarouselProps) {
  const sorted = [...banners].sort((a, b) => a.order - b.order);
  const n = sorted.length;
  const loop = n > 1;
  const slides = loop ? [sorted[n - 1], ...sorted, sorted[0]] : sorted;

  // pos = index into `slides` (1..n are the real ones when looping).
  const [pos, setPos] = useState(loop ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(() => new Set());
  const impressedIds = useRef(new Set<string>());
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  ).current;

  const posRef = useRef(pos);
  const busy = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);
  const setPosition = (p: number) => { posRef.current = p; setPos(p); };

  // Real slide index (0..n-1) behind the current track position.
  const realIndex = loop ? (((pos - 1) % n) + n) % n : 0;
  const active = sorted[realIndex];

  // The list changed length (admin added / removed a banner): start again from the first slide.
  useEffect(() => {
    window.clearTimeout(settleTimer.current);
    busy.current = false;
    setAnimate(false);
    setDragX(0);
    setPosition(n > 1 ? 1 : 0);
  }, [n]);

  // After arriving on a clone, jump (no animation) to the identical real slide.
  const settle = useCallback(() => {
    window.clearTimeout(settleTimer.current);
    busy.current = false;
    if (n < 2) return;
    const p = posRef.current;
    if (p === 0) { setAnimate(false); setPosition(n); }
    else if (p === n + 1) { setAnimate(false); setPosition(1); }
  }, [n]);

  const moveBy = useCallback((delta: number) => {
    if (n < 2 || busy.current) return;
    const target = posRef.current + delta;
    if (target < 0 || target > n + 1) return;
    busy.current = true;
    setAnimate(!prefersReducedMotion);
    setDragX(0);
    setPosition(target);
    window.clearTimeout(settleTimer.current);
    // Safety net: if `transitionend` never fires (background tab, reduced motion) still settle.
    settleTimer.current = window.setTimeout(settle, SLIDE_MS + 150);
  }, [n, prefersReducedMotion, settle]);
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // Auto-play: forward only; the timer restarts after every move so a manual click gets a full pause.
  useEffect(() => {
    if (n < 2 || paused || prefersReducedMotion) return;
    const id = window.setTimeout(() => moveBy(1), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [n, paused, prefersReducedMotion, pos, moveBy]);

  useEffect(() => {
    if (!active || impressedIds.current.has(active._id)) return;
    impressedIds.current.add(active._id);
    apiTrackPromotionImpression(entityType, active._id);
  }, [active, entityType]);

  // Drag / swipe (touch + mouse). Vertical page scroll stays native (touch-action: pan-y).
  const drag = useRef<{ x: number; y: number; w: number; on: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (n < 2 || busy.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag.current = { x: e.clientX, y: e.clientY, w: e.currentTarget.clientWidth || 1, on: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.on) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      d.on = true;
      setPaused(true);
      setAnimate(false);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    }
    setDragX(dx);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.on) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > Math.min(80, d.w * 0.15)) moveBy(dx < 0 ? 1 : -1);
    else { setAnimate(true); setDragX(0); }
    setPaused(false);
  };

  const activeId = active?._id;
  useEffect(() => { if (activeId) onActiveChange?.(activeId); }, [activeId, onActiveChange]);

  const activeLoaded = active ? loadedIds.has(active._id) : false;

  // Dots jump straight to a slide (more than one step is fine for a dot).
  const goTo = (i: number) => { if (loop && !busy.current) moveBy(i + 1 - posRef.current); };

  return (
    <div
      className="absolute inset-0 group overflow-hidden touch-pan-y select-none"
      dir="ltr"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); } }}
      onDragStart={(e) => e.preventDefault()}
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

      <div
        className="flex h-full w-full will-change-transform"
        style={{
          transform: `translate3d(calc(${-pos * 100}% + ${dragX}px), 0, 0)`,
          transition: animate ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
        }}
        onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'transform') settle(); }}
      >
        {slides.map((banner, i) => {
          const isActive = i === pos;
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
                    draggable={false}
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
                  loading="eager"
                  fetchPriority={i === (loop ? 1 : 0) ? 'high' : undefined}
                  decoding="async"
                  draggable={false}
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
                  <div aria-hidden className="absolute inset-y-0 start-0 w-[70%] bg-gradient-to-r from-[#0F3354]/75 via-[#0F3354]/35 to-transparent pointer-events-none" />
                  <div className="absolute inset-y-0 start-0 flex items-center ps-5 sm:ps-8 lg:ps-12 pe-4 max-w-[75%] sm:max-w-[60%] pointer-events-none">
                    <h2 className="m-0 text-white font-bold leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] text-[20px] sm:text-[28px] lg:text-[40px] line-clamp-3">
                      {banner.title}
                    </h2>
                  </div>
                </>
              )}
            </>
          );

          return (
            <div key={`${banner._id}-${i}`} aria-hidden={!isActive} className="relative h-full w-full flex-none overflow-hidden">
              {isActive && banner.linkUrl && isSafeLink(banner.linkUrl) ? (
                // Links inside Edudeen (a category, product, sale…) open in place;
                // only outside sites get a new tab.
                <a
                  href={banner.linkUrl}
                  draggable={false}
                  {...(isExternalLink(banner.linkUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
                  onClick={() => { apiTrackPromotionClick(entityType, banner._id); setPromotionAttribution(entityType, banner._id); }}
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
      </div>

      {/* Bottom legibility scrim — keeps the dot indicators readable on light images. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent z-[2]" />

      {loop && (
        <>
          <button
            onClick={() => moveBy(-1)}
            aria-label="Previous banner"
            className="absolute start-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-transparent hover:bg-black/15 hover:scale-105 hidden md:flex items-center justify-center border-none cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 z-10"
          >
            <ChevronLeft size={26} strokeWidth={2.5} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
          </button>
          <button
            onClick={() => moveBy(1)}
            aria-label="Next banner"
            className="absolute end-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-transparent hover:bg-black/15 hover:scale-105 hidden md:flex items-center justify-center border-none cursor-pointer opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-[opacity,transform,background-color] duration-200 z-10"
          >
            <ChevronRight size={26} strokeWidth={2.5} className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
          </button>
          {showDots && <div className="absolute bottom-4 end-4 sm:end-6 lg:end-10 flex gap-[6px] z-10">
            {sorted.map((b, i) => (
              <button
                key={b._id}
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === realIndex}
                className="p-2 -m-2 flex items-center cursor-pointer"
              >
                <span
                  className="block h-[6px] rounded-full border border-black/10 transition-all duration-300 ease-out"
                  style={{ width: i === realIndex ? 22 : 6, background: i === realIndex ? '#174771' : 'rgba(255,255,255,0.75)' }}
                />
              </button>
            ))}
          </div>}
        </>
      )}
    </div>
  );
}
