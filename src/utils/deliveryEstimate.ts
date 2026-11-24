/** Display-only delivery date range: today (Asia/Karachi) + seller dispatch (working days, Sundays skipped) + route days (calendar). */

/** Today's calendar date in Pakistan as a UTC-midnight Date (so day maths ignores the viewer's zone/DST). */
function karachiToday(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) left -= 1; // Sundays are not working days
  }
  return d;
}

function addDays(from: Date, n: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

/** Returns the formatted range, or null when inputs are missing/invalid (caller keeps the old text). */
export function deliveryEstimateLabel(
  dispatchDays: number | null | undefined,
  routeDays: { min: number; max: number } | null | undefined,
  lang: 'en' | 'ur',
  now: Date = new Date(),
): string | null {
  if (!dispatchDays || dispatchDays < 1 || !routeDays) return null;
  if (![dispatchDays, routeDays.min, routeDays.max].every(Number.isFinite) || routeDays.min < 0 || routeDays.max < routeDays.min) return null;
  const today = karachiToday(now);
  const start = addDays(addWorkingDays(today, 1), routeDays.min);
  const end = addDays(addWorkingDays(today, dispatchDays), routeDays.max);
  const locale = lang === 'ur' ? 'ur-PK' : 'en-GB';
  const fmt = (d: Date, withMonth: boolean) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric', ...(withMonth ? { month: 'short' } : {}) }).format(d);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const a = fmt(start, !sameMonth);
  const b = fmt(end, true);
  return start.getTime() === end.getTime() ? b : `${a} - ${b}`;
}
