const DISMISSED_KEY = 'dismissedAnnouncementIds';

/** Shared dismissal-persistence for any dismissible top-of-page bar (platform
 *  `AnnouncementBanner`, per-store `StoreAnnouncementBar`) — one localStorage
 *  list keyed by an id the caller constructs, so callers never collide as long
 *  as their ids are unique (e.g. a store bar's id embeds the storeId). */
export function getDismissedBannerIds(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'); } catch { return []; }
}

export function dismissBanner(id: string): void {
  const next = [...new Set([...getDismissedBannerIds(), id])];
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
}
