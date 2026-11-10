/** Age + ship-by badges for the seller Orders list. The ship-by time itself comes from the API (`shipBy`). */
export type BadgeTone = 'grey' | 'amber' | 'red';

const HOUR = 3_600_000;

/** "Just now" / "5 hours ago" / "2 days ago". */
export function orderAgeText(dateIso: string, now: number = Date.now()): string {
  const ms = Math.max(0, now - new Date(dateIso).getTime());
  const h = Math.floor(ms / HOUR);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** "Tue 12 Nov" in Pakistan time (the due date is a Pakistan working-day date). */
export function shipByDateText(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')}`;
}

/** grey: more than 24 h left, amber: under 24 h, red: overdue (then `secondary` says by how long). */
export function shipByBadge(shipByIso: string | null | undefined, now: number = Date.now()): { tone: BadgeTone; label: string; secondary?: string } | null {
  if (!shipByIso) return null;
  const t = new Date(shipByIso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = t - now;
  const span = (ms: number) => {
    const h = Math.max(1, Math.floor(Math.abs(ms) / HOUR));
    return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
  };
  const label = `Ship by ${shipByDateText(shipByIso)}`;
  if (diff <= 0) return { tone: 'red', label, secondary: `Overdue by ${span(diff)}` };
  return { tone: diff < 24 * HOUR ? 'amber' : 'grey', label };
}
