import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Star, ArrowRight, Home, Package, ShoppingBag, User, ShieldCheck, Truck, Headphones } from 'lucide-react';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { PhoneShell, StatusBar, HomeScreenMockup } from './AppDownloadBanner';
import { ProductImage } from '@/components/comman/marketplace/ProductCard';
import { TokenStorage } from '@/api/services/auth';
import { formatMoney } from '@/utils/currency';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { apiGetTestimonials, type Testimonial } from '@/api/services/testimonials';
import { apiGetAllProducts, type MarketplaceProduct } from '@/api/services/marketplace';

// Mirrors AppDownloadBanner's own bottom tab bar (kept local/smaller here
// rather than importing — that one isn't exported and this screen only
// needs the visual, not the active-tab logic).
const CLOSING_TAB_ICONS = [Home, ShoppingBag, Package, User] as const;

const compactNumber   = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

// Phone-mockup sample rows, used only until real catalogue items load. Stats,
// avatars and ratings never fall back to made-up figures.
const FALLBACK_PREVIEW_ITEMS = [
  { id: 'fallback-1', name: 'Tajweed Quran (Colour-Coded)', images: [] as string[], price: 24.99,  currency: 'USD' },
  { id: 'fallback-2', name: 'Arabic for Beginners Course',  images: [] as string[], price: 39.99,  currency: 'USD' },
  { id: 'fallback-3', name: 'Grade 5 Maths Workbook',       images: [] as string[], price: 9.99,   currency: 'USD' },
];

// Fills the gap between the CTA copy and the phone mockup — same trust
// language already used in the hero/trust-bar sections on this page, not
// new claims.
const CLOSING_TRUST_ITEMS = [
  { Icon: ShieldCheck, label: 'Secure Payments' },
  { Icon: Truck,       label: 'Fast Delivery' },
  { Icon: Headphones,  label: 'Help When Needed' },
];

/**
 * Self-contained closing banner — one continuous orange band holding both
 * the "trusted by" stats row and the sign-up CTA, with a real-product phone
 * mockup bridging the two. Drop-in reusable (self-fetches
 * stats/testimonials/products, same pattern as AppDownloadBanner) so any
 * page can render it with no props. Currently used at the bottom of the
 * Homepage, ahead of the Footer.
 */
export function ClosingCtaBanner({ className }: { className?: string }) {
  const navigate = useNavigate();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [previewProducts, setPreviewProducts] = useState<MarketplaceProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGetPlatformStats()
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(() => { /* non-critical — the fixed reference figures stay up instead */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetTestimonials(5)
      .then(res => { if (!cancelled) setTestimonials(res.data ?? []); })
      .catch(() => { /* non-critical — the fixed reference avatars stay up instead */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetAllProducts(1, 12)
      .then(res => { if (!cancelled) setPreviewProducts(res.data?.products ?? []); })
      .catch(() => { /* non-critical — phone mockup just stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  // Real platform numbers once loaded; the fixed reference figures until then.
  const realStatItems = stats ? [
    { value: `${compactNumber.format(stats.sellersCount)}+`,  label: 'Active Sellers' },
    { value: `${compactCurrency.format(stats.gmv)}+`,         label: 'GMV Processed' },
    { value: `${compactNumber.format(stats.buyersCount)}+`,   label: 'Happy Buyers' },
    ...(stats.ratingCount > 0 ? [{ value: `${stats.avgRating.toFixed(1)}★`, label: 'Store Rating' }] : []),
  ] : [];
  // Real numbers only — nothing is shown until the stats API answers.
  const displayStatItems = realStatItems;

  const hasRealRating = !!stats && stats.ratingCount > 0;
  const avatarNames = testimonials.slice(0, 5).map(t => t.name);

  // Real catalog items with an actual photo when available; the fixed
  // reference product list otherwise (ProductImage already renders a clean
  // fallback glyph for an empty images array, so these still look intentional).
  const realPreviewItems = previewProducts.filter(p => (p.images ?? []).length > 0).slice(0, 3);
  const previewRows = realPreviewItems.length > 0
    ? realPreviewItems.map(p => {
        const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
        return { id: p._id, name: p.name, images: p.images ?? [], price: dv?.price, currency: dv?.currency };
      })
    : FALLBACK_PREVIEW_ITEMS;

  return (
    <section className={clsx('grain-overlay relative overflow-hidden bg-gradient-to-br from-brand-orange via-[#66AD36] to-brand-deep-orange', className)}>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-white/40 to-white/10" />
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[280px] h-[280px] rounded-full -top-24 -start-10 bg-white/10 blur-3xl" />
        <div className="absolute w-[220px] h-[220px] rounded-full -bottom-20 -end-8 bg-carbon/15 blur-3xl" />
        <div className="absolute w-[220px] h-[220px] rounded-full top-1/3 start-[40%] bg-white/[0.07] blur-3xl" />
        {/* Faint dotted-grid texture on the right half — same technique used
           behind AppDownloadBanner's phone cluster — so the wide orange
           field reads as deliberate depth rather than a flat fill. */}
        <div
          className="hidden lg:block absolute end-0 top-0 bottom-0 w-1/2 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        {/* Decorative bag mark — purely ornamental (matches the reference's
           bottom-left bag/ribbon flourish), not standing in for real data. */}
        <ShoppingBag size={130} strokeWidth={1.25} className="absolute -bottom-6 start-2 text-white/[0.12]" />
      </div>

      {/* Stats row — same orange background as the CTA below, just a thin
         hairline divider instead of a separate solid-color band. */}
      <div className="relative z-[1] pt-10 sm:pt-12 pb-5 sm:pb-6 px-4 sm:px-6 lg:px-12 border-b border-white/15">
        {/* Kept in one start-aligned column (not pushed out to the right)
           so the avatar/rating row stays clear of the phone cluster, which
           is wide enough now to reach well past the old end-hand slot. */}
        <div className="lg:max-w-[560px]">
          <p className="text-[13px] sm:text-[14px] font-bold text-white mb-4">
            Trusted by educators, parents &amp; learners
          </p>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
            {displayStatItems.map(({ value, label }) => (
              <div key={label}>
                <p className="text-[19px] sm:text-[21px] font-bold text-white leading-none">{value}</p>
                <p className="text-[10.5px] text-white/70 mt-1 whitespace-nowrap">{label}</p>
              </div>
            ))}
            <div className="flex items-center gap-3 ps-1 sm:ps-3">
              <div className="flex -space-x-2">
                {avatarNames.map((name, i) => (
                  <Avatar key={i} name={name} size={34} className="ring-2 ring-white/40" />
                ))}
              </div>
              {hasRealRating && (
                <div className="flex items-center gap-[4px]">
                  <Star size={13} className="text-white fill-white" />
                  <span className="text-[13px] font-bold text-white">{stats!.avgRating.toFixed(1)}/5</span>
                  <span className="text-[11px] text-white/70 whitespace-nowrap">
                    From {compactNumber.format(stats!.ratingCount)} reviews
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-[1] pt-8 sm:pt-10 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10 lg:pe-[170px]">
          <div className="max-w-lg shrink-0">
            <h2 className="font-serif text-[24px] sm:text-[28px] font-bold text-white mb-2 leading-[1.2] tracking-[-0.01em]">
              Ready to start your journey?
            </h2>
            <p className="text-[13px] text-white/85 mb-6 leading-[1.7]">
              Books, Quran learning, courses and worksheets from educators you can trust.
            </p>
            <div className="flex flex-wrap gap-3">
              {/* Plain buyer sign-up (not the seller flow); hidden once signed in. */}
              {!TokenStorage.isLoggedIn() && (
                <Button variant="dark" size="md" pill onClick={() => navigate('/register')}>
                  Create Your Account <ArrowRight size={13} className="inline align-middle ms-1" />
                </Button>
              )}
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center gap-2 px-5 py-[10px] rounded-full text-[13px] font-medium text-carbon bg-white hover:bg-white/90 transition-colors cursor-pointer"
              >
                Browse resources
              </button>
            </div>
          </div>

          {/* Fills the wide gap ahead of the phone mockup instead of leaving
             it bare. */}
          <div className="hidden lg:flex flex-col gap-4 ps-8 border-s border-white/20 shrink-0">
            {CLOSING_TRUST_ITEMS.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-[10px]">
                <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-white" />
                </span>
                <span className="text-[12.5px] font-semibold text-white whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phone cluster bridging both rows — same two-phone composition as
         AppDownloadBanner (reuses its HomeScreenMockup + PhoneShell/StatusBar
         rather than a second hand-rolled version): a back phone showing the
         app's home/discover screen, overlapped by a front phone with real
         catalog items when available (the fixed reference list otherwise). A
         soft glow + contact shadow ground the pair instead of letting them
         float in the empty space beside the CTA copy. */}
      <div className="hidden lg:flex items-end justify-center absolute end-2 lg:end-8 top-1/2 -translate-y-1/2 pb-2 z-[2]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 75% 65% at 50% 55%, rgba(255,255,255,0.20) 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-0 w-[240px] h-[28px] rounded-[50%] bg-black/20 blur-[3px]" />

        <PhoneShell primary={false} className="-me-[86px] -translate-x-[10px] translate-y-[14px] -rotate-[15deg]">
          <HomeScreenMockup />
        </PhoneShell>

        <PhoneShell className="rotate-[2deg]">
          {/* PhoneShell's screen area has no background of its own — every
             other screen mockup (HomeScreenMockup included) sets its own
             bg-white, so this one needs to as well or the dark device frame
             shows straight through the "screen". */}
          <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
            <StatusBar />
            <div className="px-[12px] pt-[6px] flex-1">
              <p className="text-[13px] font-bold text-carbon mb-[9px]">My Orders</p>
              <div className="flex flex-col gap-[7px]">
                {previewRows.map(row => (
                  <div key={row.id} className="flex items-center gap-[9px] rounded-[10px] border border-bone p-[8px]">
                    <div className="w-10 h-10 rounded-[8px] overflow-hidden shrink-0">
                      <ProductImage images={row.images} name={row.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9.5px] font-semibold text-charcoal truncate">{row.name}</p>
                      {row.price != null && <p className="text-[8.5px] font-bold text-brand-orange mt-[2px]">{formatMoney(row.price, row.currency)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-auto h-[34px] border-t border-bone flex items-center justify-around bg-white shrink-0">
              {CLOSING_TAB_ICONS.map((Icon, i) => (
                <Icon key={i} size={13} className={i === 2 ? 'text-brand-orange' : 'text-slate/60'} />
              ))}
            </div>
          </div>
        </PhoneShell>
      </div>
    </section>
  );
}
