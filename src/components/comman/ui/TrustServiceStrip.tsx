import { Download, ShieldCheck, RefreshCcw, BadgeCheck, Headset, Tag, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface TrustItem {
  Icon: LucideIcon;
  label: string;
  sub?: string;
  /** Per-item icon accent (bg + icon color) — falls back to the uniform
   *  orange-on-white/dark treatment below when omitted, so existing callers
   *  (Homepage's dark bar, Education's plain light bar) render unchanged. */
  accent?: { bg: string; icon: string };
}

// Only claims backed by a real feature: instant token downloads, platform
// checkout, buyer return requests on physical items, store verification,
// buyer↔seller messaging / contact form, and seller campaigns.
const DEFAULT_ITEMS: TrustItem[] = [
  { Icon: Download,    label: 'Instant Downloads'     },
  { Icon: ShieldCheck, label: 'Secure Checkout'       },
  { Icon: RefreshCcw,  label: 'Return Requests'       },
  { Icon: BadgeCheck,  label: 'Verified Sellers'      },
  { Icon: Headset,     label: 'Help When You Need It' },
  { Icon: Tag,         label: 'Daily Deals'           },
];

interface TrustServiceStripProps {
  /** 'light' (default, unchanged) — the cream strip already used on Marketplace/
   *  EducationMarketplace. 'dark' — carbon bg, for placement inside a dark section
   *  (e.g. right under a dark hero/Flash Sale band). 'card' — a soft mint, rounded
   *  floating card (Marketplace's own trust strip) instead of a full-bleed section,
   *  meant to pair with items that set their own per-item `accent`. */
  variant?: 'light' | 'dark' | 'card';
  /** Override the default 6-item list — e.g. a denser 4-item set with subtext. */
  items?: TrustItem[];
}

export function TrustServiceStrip({ variant = 'light', items = DEFAULT_ITEMS }: TrustServiceStripProps) {
  const dark = variant === 'dark';
  const card = variant === 'card';
  return (
    <div className={clsx(
      dark ? 'bg-carbon' : card ? 'py-0' : 'bg-cream border-y border-bone',
      !card && 'py-4',
    )}>
      <div className={card ? undefined : 'px-4 sm:px-6 lg:px-10'}>
        <div className={clsx(
          card && 'mx-4 sm:mx-6 lg:mx-10 rounded-2xl border border-[#DCEFE3] bg-gradient-to-br from-[#EAF7F0] to-[#F5FBF8] px-5 py-5',
          'grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-3',
          items.length <= 4 ? 'lg:grid-cols-4' : items.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6',
          !dark && !card && 'lg:divide-x lg:divide-bone',
          card && 'lg:divide-x lg:divide-[#DCEFE3]',
        )}>
          {items.map(({ Icon, label, sub, accent }) => (
            <div key={label} className={clsx('flex items-center gap-[10px] justify-center sm:justify-start', !dark && 'lg:ps-4 lg:first:ps-0')}>
              <span
                className={clsx(
                  'flex size-9 items-center justify-center rounded-full border shrink-0',
                  accent ? 'border-transparent' : dark ? 'bg-white/[0.06] border-white/10' : 'bg-white border-bone',
                )}
                style={accent ? { background: accent.bg } : undefined}
              >
                <Icon size={16} className={accent ? undefined : 'text-brand-orange'} style={accent ? { color: accent.icon } : undefined} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <p className={clsx('text-[12.5px] font-semibold leading-tight whitespace-nowrap', dark ? 'text-white' : 'text-charcoal')}>{label}</p>
                {sub && <p className={clsx('text-[12px] leading-tight mt-[1px]', dark ? 'text-white/50' : 'text-slate')}>{sub}</p>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
