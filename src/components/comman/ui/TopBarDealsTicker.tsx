import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Zap, Tag, Crown, ChevronRight, Megaphone } from 'lucide-react';
import { useTopBarDeals, timeLeft } from '@/hooks/useTopBarDeals';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatMoney } from '@/utils/currency';
import { upToLabel } from '@/utils/saleMath';
import { untilStart } from './EarlyAccessChip';
import { usePremiumDeals } from '@/hooks/usePremiumDeals';
import { useActiveAnnouncements } from '@/hooks/useActiveAnnouncements';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { isHomeLanding } from '@/utils/homeMode';

interface TickerItem {
  key: string;
  kind: 'sale' | 'flash' | 'premium';
  early?: boolean;
  label: string;
  detail?: string;
  path: string;
}

const ROTATE_MS = 4500;

/**
 * Left side of the top bar. ONE-SALE-SURFACE RULE: on the home landing page the Mega Sale banner and the Flash Sale
 * row already advertise the live sale, so the ticker must not repeat the same sale text there - it rotates the
 * platform's announcements (Admin -> Announcements) or, failing that, the short tick-strip messages instead.
 * Everywhere else (and on the home page while no sale banner is showing) it shows the sales below.
 */
export function TopBarDealsTicker({ className }: { className?: string }) {
  const { pathname, search } = useLocation();
  const deals = useTopBarDeals();
  const saleBannerVisible = isHomeLanding(pathname, search) && (deals?.campaigns.length ?? 0) > 0;
  return saleBannerVisible ? <InfoTicker className={className} /> : <SaleTicker className={className} />;
}

/** Non-sale messages: active announcements for buyers, else the admin's tick-strip lines. Nothing to say = an empty bar. */
function InfoTicker({ className }: { className?: string }) {
  const announcements = useActiveAnnouncements('buyers');
  const { config } = usePublicPlatformConfig();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const items = useMemo(() => {
    if (announcements.length) return announcements.map(a => ({ key: a._id, label: a.title, detail: a.message }));
    return (config?.homeContent?.promiseItems ?? []).filter(Boolean).map(t => ({ key: t, label: t, detail: '' }));
  }, [announcements, config]);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, items.length]);
  if (items.length === 0) return <div className={clsx('flex-1 min-w-0', className)} />;
  const item = items[index % items.length];
  return (
    <div className={clsx('flex-1 min-w-0 flex items-center gap-2', className)} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-live="polite">
      <Megaphone size={13} className="shrink-0 opacity-90" />
      <span key={item.key} className="topbar-ticker-in min-w-0 flex items-center gap-1.5 text-[12.5px] text-white" title={item.detail ? `${item.label}: ${item.detail}` : item.label}>
        <span className="font-bold truncate">{item.label}</span>
        {item.detail && <span className="hidden sm:inline truncate text-white/85">{item.detail}</span>}
      </span>
    </div>
  );
}

function SaleTicker({ className }: { className?: string }) {
  const deals = useTopBarDeals();
  // Premium members: the biggest member discounts replace the normal flash deals.
  const { deals: premiumDeals } = usePremiumDeals();
  const { currency, convert } = useCurrencyPreference();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Countdown refresh - every second (under 24h the shared format is a running HH:MM:SS).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const items = useMemo<TickerItem[]>(() => {
    if (!deals) return [];
    const sales = deals.campaigns.map<TickerItem>(c => {
      // "Up to X% off" is the REAL biggest discount among the items on sale (never the number typed into the campaign).
      const off = c.discountType === 'percentage' && c.discountValue != null
        ? upToLabel(deals.maxPct)
        : c.discountType === 'fixed' && c.discountValue != null
          ? `${formatMoney(Math.round(convert(c.discountValue, c.currency ?? 'USD')), currency)} off`
          : null;
      return {
        key: `c-${c._id}`,
        kind: 'sale',
        label: c.name,
        early: !!c.earlyAccess,
        detail: [off, c.earlyAccess && c.startDate ? `Premium early access · public sale starts in ${untilStart(c.startDate, now)}` : `ends in ${timeLeft(c.endDate, now)}`].filter(Boolean).join(' · '),
        path: `/?campaign=${encodeURIComponent(c._id)}`,
      };
    });
    const flash = premiumDeals ? premiumDeals.slice(0, 5).map<TickerItem>(d => ({
      key: `p-${d.product._id}`,
      kind: 'premium',
      label: d.product.name,
      detail: `${d.pct}% off`,
      path: `/product/${d.product.slug}`,
    })) : deals.flashDeals.map<TickerItem>(d => ({
      key: `f-${d.product._id}`,
      kind: 'flash',
      label: d.product.name,
      detail: `-${d.pct}%`,
      path: `/product/${d.product.slug}`,
    }));
    return [...sales, ...flash];
  }, [deals, premiumDeals, currency, convert, now]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (items.length === 0) return <div className={clsx('flex-1 min-w-0', className)} />;
  const item = items[index % items.length];
  const Icon = item.kind === 'sale' ? Tag : item.kind === 'premium' ? Crown : Zap;

  return (
    <div
      className={clsx('flex-1 min-w-0 flex items-center gap-2', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <span className={clsx(
        'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[12px] font-bold uppercase tracking-[0.06em]',
        item.kind === 'sale' ? 'bg-[#F4DC4C] text-[#152D43]' : 'bg-white/15 text-white',
      )}>
        <Icon size={11} className={item.kind === 'flash' ? 'fill-current' : undefined} />
        <span className="hidden sm:inline">{item.early ? 'Early access' : item.kind === 'sale' ? 'Sale' : item.kind === 'premium' ? 'Premium' : 'Flash'}</span>
      </span>
      <Link
        key={item.key}
        to={item.path}
        className="topbar-ticker-in min-w-0 min-h-10 md:min-h-0 flex items-center gap-1.5 bg-transparent border-none p-0 text-white no-underline cursor-pointer text-[12.5px] hover:underline underline-offset-4"
        title={`${item.label}${item.detail ? ` — ${item.detail}` : ''}`}
      >
        <span className="font-bold truncate">{item.label}</span>
        {item.detail && <span className="hidden sm:inline shrink-0 text-white/85 whitespace-nowrap">{item.detail}</span>}
        <ChevronRight size={13} className="shrink-0 opacity-80" />
      </Link>
      {items.length > 1 && (
        <span className="hidden md:flex shrink-0 items-center gap-1 ms-1" aria-hidden>
          {items.map((it, i) => (
            <span key={it.key} className={clsx('size-[5px] rounded-full', i === index % items.length ? 'bg-white' : 'bg-white/35')} />
          ))}
        </span>
      )}
    </div>
  );
}
