import { isUrduUi, relAgo, localeDate, localeTime } from './localeTime';
/** "2 min ago", "3h ago", "May 18 10:14 AM" for anything older than a day. */
export function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return isUrduUi() ? 'ابھی' : 'Just now';
  if (min < 60) return relAgo(min, 'min');
  const hr = Math.floor(min / 60);
  if (hr < 24) return relAgo(hr, 'h');
  if (hr < 48) return ` ${localeTime(date)}`;
  return localeDate(date) +
    ' ' + localeTime(date);
}
