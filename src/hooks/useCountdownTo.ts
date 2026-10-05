import { useEffect, useState } from 'react';

export interface Countdown { h: string; m: string; s: string }

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Live countdown to a real end time (e.g. an admin sale campaign's endDate).
 * Hours run past 24 for multi-day sales. Returns null when there's no end
 * time or it has passed — callers then hide the timer instead of inventing one.
 */
export function useCountdownTo(endIso: string | null | undefined): Countdown | null {
  const end = endIso ? new Date(endIso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (Number.isNaN(end)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);
  if (Number.isNaN(end)) return null;
  const ms = end - now;
  if (ms <= 0) return null;
  return {
    h: pad(Math.floor(ms / 3_600_000)),
    m: pad(Math.floor((ms % 3_600_000) / 60_000)),
    s: pad(Math.floor((ms % 60_000) / 1000)),
  };
}
