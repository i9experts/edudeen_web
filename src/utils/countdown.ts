// The ONE countdown format for every sale timer (top bar, deals banner, flash-sale header, mega menu...).
// More than 24 hours left -> "15d 12h 03m"; under 24 hours -> "HH:MM:SS". Never "372:56:11".
// Every timer must be fed the same `endsAt` (the sale record's end date) so they always agree.

const pad = (n: number) => String(n).padStart(2, '0');

export interface CountdownParts {
  totalMs: number;
  days: number;
  /** 0-23 */
  hours: number;
  minutes: number;
  seconds: number;
  /** true when 24 hours or more remain (days/hours/minutes display) */
  long: boolean;
}

export function countdownParts(ms: number): CountdownParts {
  const clamped = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  return {
    totalMs: clamped,
    days,
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    long: clamped >= 86_400_000,
  };
}

/** "15d 12h 03m" (24h or more) or "HH:MM:SS"; '' once the time has run out. */
export function formatCountdown(ms: number): string {
  if (!(ms > 0)) return '';
  const p = countdownParts(ms);
  if (p.long) return `${p.days}d ${p.hours}h ${pad(p.minutes)}m`;
  return `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
}

/** Time left until an ISO end date in the shared format; 'ending now' when it has passed. */
export function timeLeftText(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '';
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return '';
  return formatCountdown(end - now) || 'ending now';
}
