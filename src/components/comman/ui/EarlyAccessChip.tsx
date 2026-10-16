import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Crown } from 'lucide-react';
import { formatCountdown } from '@/utils/countdown';

/** Time until `iso`; "a moment" once it has passed. */
export function untilStart(iso: string, now = Date.now()): string {
  // Same shared format as every sale timer ("15d 12h 03m" / "HH:MM:SS").
  return formatCountdown(new Date(iso).getTime() - now) || 'a moment';
}

/**
 * Edudeen Premium early access: a sale members can already shop. Shows the real public start time,
 * e.g. "Premium early access · Public sale starts in 1h 20m". Only rendered for members (the API only
 * sends early campaigns to them), so non-members never see it.
 */
export function EarlyAccessChip({ startDate, onDark = false, short = false, className }: { startDate?: string | null; onDark?: boolean; short?: boolean; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const starts = startDate ? `Public sale starts in ${untilStart(startDate, now)}` : null;
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[12px] font-bold max-w-full',
      onDark ? 'bg-[#F4DC4C] text-[#152D43]' : 'bg-[#fff6d6] text-[#8a6100] border border-[#f1d98a]',
      className,
    )}>
      <Crown size={11} className="shrink-0" aria-hidden />
      <span className="truncate">Premium early access{starts && !short ? ` · ${starts}` : ''}</span>
    </span>
  );
}
