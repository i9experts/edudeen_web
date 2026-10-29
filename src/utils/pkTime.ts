/**
 * Seller-facing schedule times are Pakistan time (UTC+5, no DST), whatever timezone the seller's device is in.
 * Forms keep a "wall clock" string `YYYY-MM-DDTHH:mm`; only these helpers turn it into / read it from a real instant.
 */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
const p2 = (n: number) => String(n).padStart(2, '0');

function wallFromShifted(shifted: Date): string {
  return `${shifted.getUTCFullYear()}-${p2(shifted.getUTCMonth() + 1)}-${p2(shifted.getUTCDate())}T${p2(shifted.getUTCHours())}:${p2(shifted.getUTCMinutes())}`;
}

/** "2026-10-30T15:00" (Pakistan wall clock) -> ISO instant, or null when empty/invalid. */
export function pktWallToIso(wall: string | null | undefined): string | null {
  if (!wall) return null;
  const d = new Date(`${wall.length === 16 ? `${wall}:00` : wall}+05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO instant -> Pakistan wall clock string; '' when empty/invalid. */
export function isoToPktWall(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return wallFromShifted(new Date(d.getTime() + PKT_OFFSET_MS));
}

/** The current Pakistan wall clock. */
export function pktNowWall(): string {
  return wallFromShifted(new Date(Date.now() + PKT_OFFSET_MS));
}

/**
 * An instant in the VIEWER's timezone with the zone named, e.g. "Fri, 30 Oct, 3:00 pm GMT+4".
 * Used for buyers (live classes are stored as UTC, entered in Pakistan time).
 */
export function formatLocalWithZone(iso: string | null | undefined, opts: { withDate?: boolean } = {}): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...(opts.withDate === false ? {} : { weekday: 'short', day: 'numeric', month: 'short' }),
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(d);
  } catch { return d.toLocaleString(); }
}

/** The same instant as a Pakistan-time label, e.g. "3:00 pm PKT". */
export function formatPkt(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true }).format(d)} PKT`;
}

/** Pakistan wall clock string -> readable label ("30 Oct 2026, 3:00 pm"). */
export function pktWallLabel(wall: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(wall);
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  return `${new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(d)} (Pakistan time)`;
}
