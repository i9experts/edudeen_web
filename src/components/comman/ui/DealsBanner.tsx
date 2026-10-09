import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight, Zap, Gift } from 'lucide-react';
import { apiGetPublicActiveCampaigns, type PublicCampaign } from '@/api/services/marketing/publicCampaigns';
import { cloudinaryUrl, cloudinarySrcSet } from '@/utils/cloudinaryImage';
import { currencySymbol } from '@/utils/currency';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';

// Exported so other one-off campaign banners can share the exact same
// countdown behavior/markup instead of drifting into their own reimplementation.
export function useCountdown(endDate: string) {
  const [remaining, setRemaining] = useState(() => new Date(endDate).getTime() - Date.now());

  useEffect(() => {
    setRemaining(new Date(endDate).getTime() - Date.now());
    const id = setInterval(() => setRemaining(new Date(endDate).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const clamped = Math.max(0, remaining);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    expired: clamped <= 0,
    days:    Math.floor(totalSeconds / 86400),
    hours:   Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function CountdownUnit({ value, label, size = 'md' }: { value: number; label: string; size?: 'md' | 'sm' }) {
  const isSm = size === 'sm';
  return (
    <div className="flex flex-col items-center gap-[4px]">
      <div
        className={clsx(
          'flex items-center justify-center rounded-[10px] border border-white/15 bg-white font-bold tabular-nums leading-none text-brand-deep-orange',
          isSm ? 'w-[38px] h-[40px] text-[15px]' : 'w-[50px] h-[52px] text-[21px]',
        )}
      >
        {String(value).padStart(2, '0')}
      </div>
      <span className={clsx('font-semibold uppercase tracking-[0.06em] text-white/70', isSm ? 'text-[12px]' : 'text-[12px]')}>{label}</span>
    </div>
  );
}

// ── Campaign image — the banner's hero visual. `fit="contain"` (default,
// the non-compact 3-column layout) sits inside a bounded "showcase" panel
// (never a bare floating image); `fit="cover"` (compact) instead fills its
// parent completely edge-to-edge, cropping as needed — the parent there is
// already a fixed, consistent size, so this is what gives every campaign's
// image (whatever its own aspect ratio) the same premium, no-visible-card-
// behind-it look instead of letterboxing against blank space. Graceful
// fallback (a plain decorative icon, not a fake photo) when there's no real
// image or it fails to load. Local error state is keyed by campaign id at the
// call site, so switching campaigns doesn't get stuck on a stale error. ──
function CampaignImage({ src, fit = 'contain', rounded = true }: { src: string | null; fit?: 'contain' | 'cover'; rounded?: boolean }) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-pale-orange">
          <Gift size={26} className="text-brand-orange" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={cloudinaryUrl(src, 500)}
      srcSet={cloudinarySrcSet(src, [250, 500, 750])}
      sizes="(min-width: 1024px) 230px, 170px"
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={clsx(
        'transition-transform duration-300 ease-out group-hover:scale-[1.03]',
        fit === 'cover' ? 'absolute inset-0 w-full h-full object-cover' : 'max-h-full max-w-full object-contain',
        rounded && (fit === 'cover' ? 'rounded-[20px]' : 'rounded-[10px]'),
      )}
    />
  );
}

// Premium compact countdown digit — light-card flavor of `CountdownUnit`
// above (that one is styled for the dark/orange 3-column banner; this one
// needs to read on the light warm surface of the compact+label promo card).
// Remounted via a `key` at the call site each time `value` changes so the
// existing `countdown-tick` keyframe (index.css) replays on every real tick
// instead of being a static digit.
function MiniCountdownUnit({ value }: { value: number }) {
  return (
    <div className="countdown-tick flex h-[24px] w-[24px] items-center justify-center rounded-[7px] border border-bone bg-white text-[12px] font-bold tabular-nums leading-none text-carbon sm:h-[26px] sm:w-[26px]">
      {String(value).padStart(2, '0')}
    </div>
  );
}

const ROTATE_MS = 6000;
// Showing a raw low opt-in count ("1 store participating") undersells the
// sale more than it informs — below this, the line is just omitted rather
// than advertising how few sellers have joined so far. Platform-sponsored
// campaigns never hit this path (see below) since "All N stores" is never a
// weak number to show.
const MIN_STORE_COUNT_TO_SHOW = 3;

/** Platform-wide sale campaign banner for the buyer marketplace/homepage —
 * a compact (~180px), full-width, Alibaba/Daraz/Temu-style event strip, not
 * a tall hero. Multiple campaigns can be active at once (sellers opt their
 * stores into a platform Campaign independently) — this rotates through all
 * of them one at a time, soonest-ending first, instead of only ever showing
 * a single one and silently dropping the rest. Distinct from the
 * admin-managed image `BannerCarousel` (that's promo images; this is the
 * structured Campaign feature sellers opt their stores into).
 *
 * Desktop is a fixed-height 40/35/25 three-column layout — campaign copy,
 * then the product image in its own showcase panel (bled slightly past the
 * card's top edge for emphasis), then countdown + CTA. Below lg it stacks to
 * one column (text → image → countdown), growing to fit instead of forcing
 * the same fixed height. */
export function DealsBanner({ className, storeType, compact = false, label = false }: {
  className?: string;
  storeType?: string;
  /** Forces the single-column mobile-style stack (text → image → countdown)
   *  regardless of viewport width, and drops the built-in page gutters/fixed
   *  height — for embedding inside a narrower host layout (e.g. Marketplace's
   *  WelcomeStrip hero cell) instead of as its own full-width page section. */
  compact?: boolean;
  /** Compact-only: shows the campaign's name + discount headline to the left
   *  of the image instead of the bare image alone — for a host card (e.g.
   *  Marketplace's hero Flash Sale card) that has room to say what the deal
   *  actually is, rather than a shopper having to click through to find out. */
  label?: boolean;
}) {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<PublicCampaign[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Rotation order comes straight from the backend (admin-set Campaign.order,
    // soonest-ending as the tiebreaker) — never re-sorted client-side, so an
    // admin's chosen position actually takes effect.
    apiGetPublicActiveCampaigns(storeType)
      .then((res) => {
        if (cancelled) return;
        setCampaigns(res.data ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeType]);

  // Auto-rotate through every active campaign, one at a time — pauses while
  // the cursor is over the banner so it never changes mid-read or mid-click.
  useEffect(() => {
    if (paused || campaigns.length <= 1) return;
    const id = setInterval(() => setActiveIndex(i => (i + 1) % campaigns.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, campaigns.length]);

  useEffect(() => {
    if (activeIndex >= campaigns.length) setActiveIndex(0);
  }, [campaigns.length, activeIndex]);

  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const campaign = campaigns[activeIndex] ?? null;
  const countdown = useCountdown(campaign?.endDate ?? '');

  // A campaign that expires while it's on screen is dropped from the
  // rotation instead of freezing on a dead 00:00:00 countdown.
  useEffect(() => {
    if (campaign && countdown.expired) {
      setCampaigns(prev => prev.filter(c => c._id !== campaign._id));
    }
  }, [campaign, countdown.expired]);

  if (!campaign) return null;

  const hasPercentOff = campaign.discountType === 'percentage' && campaign.discountValue != null;
  const hasFixedOff = campaign.discountType === 'fixed' && campaign.discountValue != null;
  const displayedFixedOff = hasFixedOff ? convert(campaign.discountValue as number, campaign.currency ?? 'USD') : null;
  const discountHeadline = hasPercentOff
    ? `UP TO ${campaign.discountValue}% OFF`
    : hasFixedOff
      ? `${currencySymbol(displayCurrency)}${displayedFixedOff} OFF`
      : 'SPECIAL DEALS';

  const showStoreCount = campaign.sponsorType === 'platform' || campaign.storeCount >= MIN_STORE_COUNT_TO_SHOW;
  const metaText = [
    campaign.sponsorType === 'platform' ? 'Sponsored by Edudeen' : null,
    showStoreCount ? (campaign.sponsorType === 'platform' ? `All ${campaign.storeCount} stores participating` : `${campaign.storeCount} stores participating`) : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={clsx('banner-slide-down', compact ? undefined : 'px-4 sm:px-6 lg:px-10 pt-3', className)}
    >
      {/* No overflow-hidden on this outer layer in the default (non-compact)
          layout — the product image is allowed to bleed slightly past the
          card's own top edge for visual emphasis there. Compact mode has no
          such bleed (see the CENTER column below), so it clips normally —
          without that, stacked content taller than the host's own height
          assumption would spill out past the visible rounded card. */}
      <div className={clsx('relative w-full h-full transition-transform duration-200 hover:-translate-y-[2px]', compact && (label ? 'overflow-hidden' : 'overflow-hidden rounded-[20px]'))}>
        {compact ? (
          label ? (
            /* Compact + label: the exact same light warm gradient (orange →
               `#2863A2` → `#5B9BD5`) the default/non-compact card below
               already uses — on-theme, no foreign hue — plus the same
               depth tricks that card uses to keep it from reading as a flat
               two-tone streak: a soft top-left highlight, and a warm dark
               blur (`#0B2A45`, also lifted from that same card) sitting
               behind the countdown/CTA column so the white text there stays
               legible even though the base gradient itself is light. No
               rounding on the outer layer here (unlike every other variant)
               — this card is meant to sit full-width/edge-to-edge against
               the page, not read as a floating rounded card. */
            <div className="absolute inset-0 overflow-hidden border border-black/10">
              <div className="gradient-drift absolute inset-0 bg-gradient-to-r from-brand-orange via-[#4E8F28] to-[#66AD36]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.22),transparent_55%)]" />
              <div className="pointer-events-none absolute -bottom-10 end-[6%] size-32 rounded-full bg-[#0B2A45]/35 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
            </div>
          ) : (
            <div className="absolute inset-0 overflow-hidden rounded-[20px] border border-bone bg-white" />
          )
        ) : (
          <div className="absolute inset-0 overflow-hidden rounded-[20px] border border-black/10">
            <div className="gradient-drift absolute inset-0 bg-gradient-to-br from-brand-orange via-[#4E8F28] to-[#66AD36]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.18),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] bg-[length:16px_16px]" />
            <div className="pointer-events-none absolute -top-10 start-[38%] size-40 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-14 end-[20%] size-48 rounded-full bg-[#0B2A45]/25 blur-3xl" />
            {/* Thin vertical separators between the 3 columns — desktop only, there's no room below lg. */}
            <div className="pointer-events-none hidden lg:block absolute inset-y-6 start-[40%] w-px bg-white/15" />
            <div className="pointer-events-none hidden lg:block absolute inset-y-6 start-[75%] w-px bg-white/15" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
          </div>
        )}

        {compact ? (
          label ? (
            /* Compact + label: image first (left), then the real campaign
               data (name/discount from the API response), then a live
               countdown + "Shop Now" CTA on the right — a self-contained
               promo card rather than a bare thumbnail needing an external
               countdown row next to it. */
            <button
              key={campaign._id}
              onClick={() => navigate(`/?campaign=${encodeURIComponent(campaign._id)}`)}
              className="group relative z-[1] flex w-full flex-col items-stretch border-none bg-transparent p-0 outline-none cursor-pointer overflow-hidden text-start sm:h-full sm:flex-row"
            >
              {/* Below `sm`, the image fills its box edge-to-edge (`cover`,
                  no padding) — there's no room there for the letterboxed
                  "contain" treatment to still read as intentional. At `sm`
                  and up there's real space either side, so it switches to
                  `contain`: the source banner image is a full promo graphic
                  (product photo + its own badge/QR code/text), and cropping
                  it there was cutting real content off. Wide + fixed-size
                  regardless of the image's own aspect ratio, so whichever
                  campaign is showing always lands in the same box instead of
                  resizing the card around it. No rounding on either — this
                  card has none. */}
              <div className="relative h-[150px] w-full shrink-0 sm:h-full sm:w-[280px] md:w-[340px]">
                <div className="absolute inset-0 sm:hidden">
                  <CampaignImage src={campaign.bannerImage} fit="cover" rounded={false} />
                </div>
                {/* `cover` here, not `contain` — the box is short (the card
                    itself is only ~100px tall), so a `contain` image sizes
                    to that height and never actually gets visually bigger
                    no matter how wide the box grows; `cover` fills the box
                    on both axes, so widening the box really does widen the
                    visible photo. */}
                <div className="hidden sm:block sm:absolute sm:inset-y-2 sm:inset-x-0">
                  <CampaignImage src={campaign.bannerImage} fit="cover" />
                </div>
                {hasPercentOff && (
                  <span className="absolute end-1 top-1 sm:end-auto sm:start-1 z-[1] inline-flex items-center rounded-full bg-brand-deep-orange px-[8px] py-[3px] text-[12px] font-bold leading-none text-white">
                    -{campaign.discountValue}% OFF
                  </span>
                )}

                {/* Mobile only, top-left — Limited Time badge, then the
                   title + sponsor line stacked right under it (mirrors the
                   OFF badge's opposite corner). Text-shadow instead of a
                   scrim here, since there's no gradient backing behind
                   this block. */}
                <div className="absolute start-1 end-1 top-1 z-[1] flex flex-col items-start gap-[3px] sm:hidden">
                  <span className="inline-flex items-center gap-[4px] rounded-full bg-white/90 px-[7px] py-[2.5px] text-[12px] font-bold uppercase tracking-wide text-brand-deep-orange">
                    <Zap size={9} className="fill-brand-deep-orange" /> Limited Time
                  </span>
                  <span className="font-serif text-[13px] font-bold leading-tight text-white truncate max-w-full" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
                    {campaign.name}
                  </span>
                  {metaText && (
                    <span className="text-[12px] text-white/90 truncate max-w-full" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}>
                      {metaText}
                    </span>
                  )}
                </div>

                {/* Mobile only: discount + countdown/CTA sit directly on the
                   image (dark scrim for legibility) instead of in their own
                   section below it — the sm:flex column version further
                   down carries the same content for sm and up. */}
                <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-[3px] bg-gradient-to-t from-black/75 via-black/45 to-transparent px-3 pt-9 pb-[9px] sm:hidden">
                  <span className="flex items-center gap-[5px] text-[12px] font-bold leading-none text-white truncate">
                    <span className="inline-block h-[9px] w-[3px] shrink-0 rounded-full bg-brand-orange" />
                    {discountHeadline}
                  </span>

                  {/* Countdown + CTA — also on the image on mobile (the
                     sm:flex column further down carries the same content,
                     styled for a light background, for sm and up). */}
                  <div className="flex items-center justify-between gap-3 mt-[3px]">
                    <div className="flex flex-col items-center gap-[3px]">
                      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/70">Ends In</span>
                      <div className="flex items-center gap-[3px]">
                        <MiniCountdownUnit key={`h${countdown.hours}`} value={countdown.hours} />
                        <span className="pb-[1px] text-[12px] font-bold leading-none text-white/50">:</span>
                        <MiniCountdownUnit key={`m${countdown.minutes}`} value={countdown.minutes} />
                        <span className="pb-[1px] text-[12px] font-bold leading-none text-white/50">:</span>
                        <MiniCountdownUnit key={`s${countdown.seconds}`} value={countdown.seconds} />
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full bg-brand-orange px-4 py-[8px] text-[12px] font-bold text-white transition-all duration-200 ease-out group-hover:-translate-y-[1px] group-hover:bg-brand-deep-orange group-active:translate-y-0">
                      Shop Now <ArrowRight size={11} className="transition-transform duration-200 ease-out group-hover:translate-x-[3px]" />
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden w-px shrink-0 self-stretch bg-white/15 sm:my-3 sm:block" />

              <div className="hidden min-w-0 flex-1 flex-col justify-center gap-[5px] px-3.5 py-1.5 sm:flex sm:px-4 sm:py-0">
                <span className="inline-flex w-fit items-center gap-[5px] rounded-full bg-white/90 px-[9px] py-[4px] text-[12px] font-bold uppercase tracking-wide text-brand-deep-orange">
                  <Zap size={10} className="fill-brand-deep-orange" /> Limited Time
                </span>
                <span className="font-serif text-[16px] font-bold leading-tight tracking-[-0.005em] text-white truncate sm:text-[18px]">{campaign.name}</span>
                <span className="flex items-center gap-[6px] text-[12px] font-bold leading-none text-white truncate">
                  <span className="inline-block h-[10px] w-[3px] shrink-0 rounded-full bg-brand-orange" />
                  {discountHeadline}
                </span>
                {metaText && (
                  <span className="text-[12px] text-white/70 truncate">{metaText}</span>
                )}
              </div>

              <div className="hidden w-px shrink-0 self-stretch bg-white/15 sm:my-3 sm:block" />

              {/* sm and up only now — on mobile this same countdown+CTA
                 renders inside the image overlay above instead. */}
              <div className="hidden sm:flex sm:shrink-0 sm:flex-col sm:items-center sm:justify-center sm:gap-[9px] sm:px-4 sm:py-0">
                <div className="flex flex-col items-center gap-[3px]">
                  <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/70">Ends In</span>
                  <div className="flex items-center gap-[3px]">
                    <MiniCountdownUnit key={`h${countdown.hours}`} value={countdown.hours} />
                    <span className="pb-[1px] text-[12px] font-bold leading-none text-white/50">:</span>
                    <MiniCountdownUnit key={`m${countdown.minutes}`} value={countdown.minutes} />
                    <span className="pb-[1px] text-[12px] font-bold leading-none text-white/50">:</span>
                    <MiniCountdownUnit key={`s${countdown.seconds}`} value={countdown.seconds} />
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full bg-brand-orange px-4 py-[8px] text-[12px] font-bold text-white transition-all duration-200 ease-out group-hover:-translate-y-[1px] group-hover:bg-brand-deep-orange group-active:translate-y-0">
                  Shop Now <ArrowRight size={11} className="transition-transform duration-200 ease-out group-hover:translate-x-[3px]" />
                </span>
              </div>
            </button>
          ) : (
          /* Compact: the image alone, filling the card completely edge-to-
             edge (fit="cover") — one fixed, consistent size every campaign
             image sits in, so nothing peeks out around it regardless of the
             source image's own aspect ratio. No headline/description/
             countdown text on top, since the image is the entire point of
             this placement. */
          <button
            key={campaign._id}
            onClick={() => navigate(`/?campaign=${encodeURIComponent(campaign._id)}`)}
            className="group relative z-[1] block w-full h-full border-none bg-transparent p-0 outline-none cursor-pointer overflow-hidden rounded-[20px]"
          >
            <CampaignImage src={campaign.bannerImage} fit="cover" />
            {hasPercentOff && (
              <span className="absolute top-2 start-2 -rotate-6 flex flex-col items-center justify-center size-[42px] rounded-full bg-error text-white border-2 border-white/40 z-[1]">
                <span className="text-[12px] font-bold leading-none">-{campaign.discountValue}%</span>
                <span className="text-[5px] font-semibold uppercase tracking-wide leading-none mt-[1px]">off</span>
              </span>
            )}
          </button>
          )
        ) : (
          <button
            key={campaign._id}
            onClick={() => navigate(`/?campaign=${encodeURIComponent(campaign._id)}`)}
            aria-label={`${campaign.name} — ${discountHeadline}. Shop the sale`}
            className="campaign-fade group relative z-[1] flex w-full h-full flex-col gap-3 border-none bg-transparent text-start text-white outline-none cursor-pointer px-5 py-4 lg:flex-row lg:items-center lg:gap-6 lg:px-7 lg:py-0 lg:min-h-[112px]"
          >
            {/* LEFT — one tidy block: label, headline, name + description on one line. */}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px]">
              <span className="inline-flex w-fit items-center gap-[5px] rounded-full bg-white/15 px-[10px] py-[3px] text-[12px] font-semibold uppercase tracking-[0.08em] text-white ring-1 ring-white/25">
                <Zap size={11} className="fill-white" /> Limited time{campaign.sponsorType === 'platform' ? ' · Edudeen' : ''}
              </span>
              <span className="font-serif text-[24px] sm:text-[27px] font-bold leading-[1.1] tracking-[-0.01em] text-white">
                {discountHeadline}
              </span>
              <p className="truncate text-[13px] text-white/90">
                <span className="font-semibold">{campaign.name}</span>
                {campaign.description ? <span className="text-white/75"> · {campaign.description}</span> : null}
              </p>
              {metaText && <p className="hidden sm:block truncate text-[12px] text-white/65">{metaText}</p>}
            </div>

            {/* MIDDLE — small product thumbnail, only when the campaign has an image (no empty glass panel). */}
            {campaign.bannerImage && (
              <div className="relative hidden lg:block h-[84px] w-[150px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/25 bg-white/10">
                <CampaignImage src={campaign.bannerImage} fit="cover" />
              </div>
            )}

            {/* RIGHT — countdown + CTA on one row/column pair. */}
            <div className="flex shrink-0 items-center justify-between gap-4 lg:flex-col lg:items-end lg:justify-center lg:gap-[8px]">
              <div className="countdown-pulse flex items-center gap-[4px]" aria-label="Time left">
                <MiniCountdownUnit key={`h${countdown.hours}`} value={countdown.hours} />
                <span className="pb-[1px] text-[12px] font-bold leading-none text-white/60">:</span>
                <MiniCountdownUnit key={`m${countdown.minutes}`} value={countdown.minutes} />
                <span className="pb-[1px] text-[12px] font-bold leading-none text-white/60">:</span>
                <MiniCountdownUnit key={`s${countdown.seconds}`} value={countdown.seconds} />
              </div>
              <span className="inline-flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full bg-white px-5 py-[8px] text-[13px] font-bold text-brand-deep-orange shadow-sm transition-[background-color,transform] duration-150 group-hover:bg-cream group-hover:scale-[1.03]">
                Shop the sale <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </div>          </button>
        )}

        {/* Carousel indicators — a bit bigger/more visible than a subtle hairline,
            still along the bottom-center so they add no extra height. */}
        {campaigns.length > 1 && (
          <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-[6px] z-[1]">
            {campaigns.map((c, i) => (
              <button
                key={c._id}
                onClick={e => { e.stopPropagation(); setActiveIndex(i); }}
                aria-label={`Show ${c.name}`}
                aria-current={i === activeIndex}
                className="pointer-events-auto relative w-7 h-5 flex items-center border-none bg-transparent cursor-pointer"
              >
                <span className="relative block h-[5px] w-full rounded-full border border-black/10 bg-white/25 overflow-hidden">
                  <span
                    className={clsx(
                      'absolute inset-y-0 start-0 rounded-full bg-white',
                      i < activeIndex ? 'w-full' : i > activeIndex ? 'w-0' : 'campaign-progress-fill',
                    )}
                    style={i === activeIndex ? { animationDuration: `${ROTATE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
                  />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
