import { urDayPeriod } from '@/i18n/ur';
/** Urdu interface = Urdu words/format, but Latin digits (site convention). Read at call time from <html lang>. */
export const isUrduUi = () => typeof document !== 'undefined' && document.documentElement.lang === 'ur';
export const timeLocale = (): string | undefined => (isUrduUi() ? 'ur-PK-u-nu-latn' : undefined);

/** Urdu clock text: "دوپہر 1:05" (Latin digits, the site convention). */
function urClock(d: Date, withMinutes = true): string {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${urDayPeriod(h)} ${h12}${withMinutes ? `:${String(d.getMinutes()).padStart(2, '0')}` : ''}`;
}

export function localeTime(d: Date, opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }): string {
  // Plain hour/minute times in Urdu get the right day period (the browser's one says شام for 1 pm).
  if (isUrduUi() && (opts.hour || opts.timeStyle === 'short') && !opts.second && !opts.timeZone && opts.hour12 !== false) {
    return Number.isNaN(d.getTime()) ? '' : urClock(d, opts.minute !== undefined || opts.timeStyle === 'short');
  }
  try { return d.toLocaleTimeString(timeLocale() ?? [], opts); } catch { return ''; }
}
export function localeDateTime(d: Date, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
  if (isUrduUi() && !Number.isNaN(d.getTime()) && (opts.timeStyle === 'short' || (opts.hour && !opts.second && !opts.timeZone))) {
    const { timeStyle: _t, hour: _h, minute: _m, hour12: _h12, ...dateOpts } = opts;
    void _t; void _h; void _m; void _h12;
    try { return `${d.toLocaleDateString(timeLocale(), dateOpts)}، ${urClock(d)}`; } catch { return ''; }
  }
  try { return d.toLocaleString(timeLocale() ?? [], opts); } catch { return ''; }
}
export function localeDate(d: Date, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  try { return d.toLocaleDateString(timeLocale() ?? [], opts); } catch { return ''; }
}

/** Chat-list time: today = clock time, yesterday = "Yesterday", this week = weekday, older = "30 Sep" (Urdu-aware). */
export function chatListTime(iso: string | Date, now: Date = new Date()): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86400000);
  if (diffDays <= 0) return localeTime(d);
  if (diffDays === 1) return isUrduUi() ? 'کل' : 'Yesterday';
  if (diffDays < 7) return localeDate(d, { weekday: 'long' });
  return localeDate(d, { day: 'numeric', month: 'short' });
}

/** "5 min ago" / "منٹ پہلے" — one place for every short relative time. unit: 'min' | 'h' | 'd' */
export function relAgo(n: number, unit: 'min' | 'h' | 'd'): string {
  if (isUrduUi()) return `${n} ${unit === 'min' ? 'منٹ' : unit === 'h' ? 'گھنٹے' : 'دن'} پہلے`;
  return unit === 'min' ? `${n} min ago` : `${n}${unit} ago`;
}

/** Countdown parts as "1h 5m" / "5m 3s" / "12s", Urdu-aware; recomputed every render (no exact-match strings). */
export function durationText(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (isUrduUi()) {
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} گھنٹے`);
    if (m > 0 || h > 0) parts.push(`${m} منٹ`);
    if (h === 0) parts.push(`${sec} سیکنڈ`);
    return parts.join(' ');
  }
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
