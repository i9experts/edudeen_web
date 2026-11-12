import { CLASS_LEVELS } from '@/constants/classLevels';

// In-store catalog filters live in the URL: ?q&class&subject&min&max&kind&sort&page (min/max = store currency).
export const CATALOG_SORTS = ['newest', 'price_asc', 'price_desc', 'best_rated'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];
export type CatalogKind = 'all' | 'digital' | 'physical' | 'course';

export interface CatalogFilters {
  q: string;
  cls: string;
  subject: string;
  /** Collection tab (id). */
  collection: string;
  min: number | null;
  max: number | null;
  kind: CatalogKind;
  sort: CatalogSort;
  page: number;
}

const KINDS: CatalogKind[] = ['digital', 'physical', 'course'];
const CLASS_VALUES = new Set<string>(CLASS_LEVELS.map(c => c.value));

function num(v: string | null): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000_000 ? n : null;
}

/** Reads the filters from a query string; anything malformed falls back to "not set" so the API never answers 400 for a typo'd link. */
export function filtersFromParams(p: URLSearchParams, defSort: CatalogSort = 'newest'): CatalogFilters {
  const sort = p.get('sort');
  const kind = p.get('kind') as CatalogKind | null;
  const cls = p.get('class') ?? '';
  const subject = p.get('subject') ?? '';
  const collection = p.get('collection') ?? p.get('section') ?? ''; // ?section= is an alias; links we write always use ?collection=
  const page = Number(p.get('page'));
  let min = num(p.get('min'));
  let max = num(p.get('max'));
  if (min != null && max != null && min > max) { min = null; max = null; }
  return {
    q: (p.get('q') ?? '').slice(0, 100),
    cls: CLASS_VALUES.has(cls) ? cls : '',
    subject: /^[a-f0-9]{24}$/i.test(subject) ? subject : '',
    collection: /^[a-f0-9]{24}$/i.test(collection) ? collection : '',
    min, max,
    kind: kind && KINDS.includes(kind) ? kind : 'all',
    sort: sort && (CATALOG_SORTS as readonly string[]).includes(sort) ? (sort as CatalogSort) : defSort,
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

/** Writes the filters into a copy of `base`, dropping defaults; unrelated params (e.g. #tabs, ?preview) are kept. */
export function filtersToParams(base: URLSearchParams, f: CatalogFilters, defSort: CatalogSort = 'newest'): URLSearchParams {
  const p = new URLSearchParams(base);
  const set = (k: string, v: string | null) => { if (v) p.set(k, v); else p.delete(k); };
  set('q', f.q.trim() || null);
  set('class', f.cls || null);
  set('subject', f.subject || null);
  set('collection', f.collection || null);
  set('min', f.min != null ? String(f.min) : null);
  set('max', f.max != null ? String(f.max) : null);
  set('kind', f.kind !== 'all' ? f.kind : null);
  set('sort', f.sort !== defSort ? f.sort : null);
  set('page', f.page > 1 ? String(f.page) : null);
  return p;
}

/** Filters behind the "Filters" button (search and kind chips sit outside it). */
export function sheetFilterCount(f: CatalogFilters): number {
  return (f.cls ? 1 : 0) + (f.subject ? 1 : 0) + (f.min != null || f.max != null ? 1 : 0);
}

export function anyFilterActive(f: CatalogFilters): boolean {
  return !!f.q.trim() || f.kind !== 'all' || sheetFilterCount(f) > 0;
}
