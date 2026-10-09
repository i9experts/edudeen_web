import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Zap, Tag, ChevronRight } from 'lucide-react';
import { useTopBarDeals, timeLeft } from '@/hooks/useTopBarDeals';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatMoney } from '@/utils/currency';

interface TickerItem {
  key: string;
  kind: 'sale' | 'flash';
  label: string;
  detail?: string;
  path: string;
}

const ROTATE_MS = 4500;

/**
 * Left side of the top bar: admin sale campaigns (October sale, 11.11, Azadi
 * sale…) followed by the marketplace's deepest flash deals, rotating one at a
 * time. Pauses while hovered; renders nothing when there's no live sale.
 */
export function TopBarDealsTicker({ className }: { className?: string }) {
  const navigate = useNavigate();
  const deals = useTopBarDeals();
  const { currency, convert } = useCurrencyPreference();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Countdown refresh — once a minute is enough for "2d 4h" style labels.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const items = useMemo<TickerItem[]>(() => {
    if (!deals) return [];
    const sales = deals.campaigns.map<TickerItem>(c => {
      const off = c.discountType === 'percentage' && c.discountValue != null
        ? `Up to ${c.discountValue}% off`
        : c.discountType === 'fixed' && c.discountValue != null
          ? `${formatMoney(Math.round(convert(c.discountValue, c.currency ?? 'USD')), currency)} off`
          : null;
      return {
        key: `c-${c._id}`,
        kind: 'sale',
        label: c.name,
        detail: [off, `ends in ${timeLeft(c.endDate, now)}`].filter(Boolean).join(' · '),
        path: `/?campaign=${encodeURIComponent(c._id)}`,
      };
    });
    const flash = deals.flashDeals.map<TickerItem>(d => ({
      key: `f-${d.product._id}`,
      kind: 'flash',
      label: d.product.name,
      detail: `-${d.pct}%`,
      path: `/product/${d.product.slug}`,
    }));
    return [...sales, ...flash];
  }, [deals, currency, convert, now]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (items.length === 0) return <div className={clsx('flex-1 min-w-0', className)} />;
  const item = items[index % items.length];
  const Icon = item.kind === 'sale' ? Tag : Zap;

  return (
    <div
      className={clsx('flex-1 min-w-0 flex items-center gap-2', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <span className={clsx(
        'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-bold uppercase tracking-[0.06em]',
        item.kind === 'sale' ? 'bg-[#F4DC4C] text-[#152D43]' : 'bg-white/15 text-white',
      )}>
        <Icon size={11} className={item.kind === 'flash' ? 'fill-current' : undefined} />
        <span className="hidden sm:inline">{item.kind === 'sale' ? 'Sale' : 'Flash'}</span>
      </span>
      <button
        key={item.key}
        onClick={() => navigate(item.path)}
        className="topbar-ticker-in min-w-0 flex items-center gap-1.5 bg-transparent border-none p-0 text-white cursor-pointer text-[12.5px] hover:underline underline-offset-4"
        title={`${item.label}${item.detail ? ` — ${item.detail}` : ''}`}
      >
        <span className="font-bold truncate">{item.label}</span>
        {item.detail && <span className="hidden sm:inline shrink-0 text-white/85 whitespace-nowrap">{item.detail}</span>}
        <ChevronRight size={13} className="shrink-0 opacity-80" />
      </button>
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
