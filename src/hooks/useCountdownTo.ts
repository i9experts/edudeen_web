import { useEffect, useState } from 'react';
import { countdownParts, formatCountdown } from '@/utils/countdown';

export interface Countdown {
  /** Whole hours left, padded (can exceed 24 - prefer `text` / `long` for display). */
  h: string; m: string; s: string;
  days: number;
  /** Hours / minutes / seconds within the current day-unit (0-23 / 0-59 / 0-59). */
  hours: number; minutes: number; seconds: number;
  /** 24h or more left: show days/hours/minutes, not a running HH:MM:SS. */
  long: boolean;
  /** The shared display string: "15d 12h 03m" or "HH:MM:SS". */
  text: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Live countdown to a real end time (e.g. an admin sale campaign's endDate).
 * Returns null when there's no end time or it has passed — callers then hide the timer instead of
 * inventing one. Display with `text` so every timer on the site looks the same.
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
  const p = countdownParts(ms);
  return {
    h: pad(Math.floor(ms / 3_600_000)),
    m: pad(p.minutes),
    s: pad(p.seconds),
    days: p.days, hours: p.hours, minutes: p.minutes, seconds: p.seconds,
    long: p.long,
    text: formatCountdown(ms),
  };
}
