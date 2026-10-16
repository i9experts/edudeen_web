/** Urdu interface = Urdu words/format, but Latin digits (site convention). Read at call time from <html lang>. */
export const isUrduUi = () => typeof document !== 'undefined' && document.documentElement.lang === 'ur';
export const timeLocale = (): string | undefined => (isUrduUi() ? 'ur-PK-u-nu-latn' : undefined);

export function localeTime(d: Date, opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }): string {
  try { return d.toLocaleTimeString(timeLocale() ?? [], opts); } catch { return ''; }
}
export function localeDateTime(d: Date, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
  try { return d.toLocaleString(timeLocale() ?? [], opts); } catch { return ''; }
}
export function localeDate(d: Date, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  try { return d.toLocaleDateString(timeLocale() ?? [], opts); } catch { return ''; }
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
