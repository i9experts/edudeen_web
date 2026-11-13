/** Pure rules shared by ShopByCategory and HomeCardGrid (Amazon-style category cards). */

/** Lower-case letters + digits only, so "Maths " and "maths" are the same label. */
export function normLabel(s: string | undefined | null): string {
  return (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

/** "Others", "Other resources", "Other..." catch-all names. */
export function isOthersName(name: string | undefined | null): boolean {
  return /^\s*others?\b/i.test(name ?? '');
}

export const OTHERS_MIN_PRODUCTS = 2;

/** Keep the first item per id, then the first per normalised name. Items without a name only dedupe by id. */
export function uniqueByIdThenName<T>(items: T[], idOf: (t: T) => string, nameOf: (t: T) => string): T[] {
  const ids = new Set<string>();
  const names = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const id = idOf(it);
    if (id && ids.has(id)) continue;
    const n = normLabel(nameOf(it));
    if (n && names.has(n)) continue;
    if (id) ids.add(id);
    if (n) names.add(n);
    out.push(it);
  }
  return out;
}

/**
 * Order cards/tiles: "Others" go last and are dropped when they hold fewer than 2 products.
 * `minBeforeOthers`: "Others" never sits in the first row, so it is dropped unless at least that many
 * normal items come before it.
 */
export function placeOthersLast<T>(items: T[], nameOf: (t: T) => string, countOf: (t: T) => number | undefined, minBeforeOthers = 0): T[] {
  const normal = items.filter(i => !isOthersName(nameOf(i)));
  const others = items.filter(i => isOthersName(nameOf(i)) && (countOf(i) ?? 0) >= OTHERS_MIN_PRODUCTS);
  return normal.length >= minBeforeOthers ? [...normal, ...others] : normal;
}

/** Grid classes: swipe row (snap) below 480px, 2 columns on tablet, 4 on desktop. */
export const CARD_GRID_CLASS =
  'flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 min-[480px]:grid min-[480px]:grid-cols-2 min-[480px]:overflow-visible min-[480px]:snap-none lg:grid-cols-4 lg:gap-5';
export const CARD_ITEM_CLASS = 'max-[479px]:w-[82%] max-[479px]:shrink-0 max-[479px]:snap-start';

/** Tile layout for 1-3 tiles so no empty cell is left in the 2-column grid. */
export function tileSpanClass(count: number, index: number): string {
  if (count === 1) return 'col-span-2';
  if (count === 3 && index === 2) return 'col-span-2';
  return '';
}
