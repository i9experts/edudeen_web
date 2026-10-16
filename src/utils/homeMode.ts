/**
 * The homepage IS the shop. With any of these query keys in the URL it shows the browse view (category / search /
 * filters); with none it shows the landing sections (hero, shelves, ...). Kept here (not in HomeBrowse) so small
 * pieces such as the top-bar ticker can ask "is the landing page showing?" without importing the whole page.
 */
export const BROWSE_KEYS = ['category', 'search', 'q', 'cat', 'grade', 'class', 'type', 'min', 'max', 'rating', 'free', 'board', 'age', 'sort', 'page', 'exact', 'browse'];

export function isBrowseMode(params: URLSearchParams): boolean {
  return BROWSE_KEYS.some(k => params.has(k));
}

/** True on `/` when the landing sections (incl. the Mega Sale banner and Flash Sale row) are what the visitor sees. */
export function isHomeLanding(pathname: string, search: string): boolean {
  return pathname === '/' && !isBrowseMode(new URLSearchParams(search));
}
