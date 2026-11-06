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

/** grey: more than 24 h left, amber: under 24 h, red: overdue. */
export function shipByBadge(shipByIso: string | null | undefined, now: number = Date.now()): { tone: BadgeTone; label: string } | null {
  if (!shipByIso) return null;
  const t = new Date(shipByIso).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = t - now;
  const span = (ms: number) => {
    const h = Math.max(1, Math.floor(Math.abs(ms) / HOUR));
    return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
  };
  if (diff <= 0) return { tone: 'red', label: `Overdue by ${span(diff)}` };
  return { tone: diff < 24 * HOUR ? 'amber' : 'grey', label: `Ship within ${span(diff)}` };
}
