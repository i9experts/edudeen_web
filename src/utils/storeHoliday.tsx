/**
 * Store on holiday - buyer-side helpers. The SERVER is the gate (cart-add and checkout refuse); this only decides what
 * to show. The API sends `holiday` (store) / `storeHoliday` (product) with just enabled / returnDate / message /
 * digitalStillSells, and only while a holiday is in force.
 */
export interface StoreHolidayInfo {
  enabled: boolean;
  returnDate: string | null;
  message: string | null;
  digitalStillSells: boolean;
}

/** Same rule as the API: physical always pauses; digital (and courses) only when the seller paused them too. */
export function holidayBlocksType(h: StoreHolidayInfo | null | undefined, type: string | null | undefined): boolean {
  if (!h || !h.enabled) return false;
  if (h.returnDate && new Date(h.returnDate).getTime() <= Date.now()) return false; // already over, cron may lag a minute
  if (type === 'physical') return true;
  return h.digitalStillSells === false;
}

/** "20 Nov 2026" (Pakistan day), '' when no return date. */
export function holidayDate(h: StoreHolidayInfo | null | undefined): string {
  if (!h?.returnDate) return '';
  const d = new Date(h.returnDate);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

/** Plain-English label for aria/title/toasts. */
export function holidayLabel(h: StoreHolidayInfo | null | undefined): string {
  const date = holidayDate(h);
  return date ? `Store away until ${date}` : 'Store is away for now';
}

/** Same as AwayText, from the server's English sentence on a cart line ("Store away until 20 Nov 2026"). */
export function AwayTextFromServer({ text, className }: { text: string | null | undefined; className?: string }) {
  const m = /^Store away until\s+(.+)$/.exec(text ?? '');
  return (
    <span className={className}>
      {m ? <><span>Store away until</span> <span translate="no">{m[1]}</span></> : <span>Store is away for now</span>}
    </span>
  );
}

/**
 * "Store away until 20 Nov 2026" as two text nodes so the Urdu translator matches the fixed part and the date stays as is.
 */
export function AwayText({ holiday, className }: { holiday: StoreHolidayInfo | null | undefined; className?: string }) {
  const date = holidayDate(holiday);
  return (
    <span className={className}>
      {date ? (
        <>
          <span>Store away until</span> <span translate="no">{date}</span>
        </>
      ) : (
        <span>Store is away for now</span>
      )}
    </span>
  );
}
