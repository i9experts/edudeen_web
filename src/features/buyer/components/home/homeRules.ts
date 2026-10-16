// Pure rules behind the home page sections. No React / alias imports, so scripts/test-home-rules.mjs can run them.

/** "X sold" is shown only from this many sales: "2 sold" would hurt trust instead of building it. */
export const SOLD_MIN = 10;

export function soldLabel(count: number | null | undefined): string | null {
  return typeof count === 'number' && Number.isFinite(count) && count >= SOLD_MIN ? `${Math.floor(count)} sold` : null;
}

interface HasId { _id: string }

/**
 * One product appears in at most ONE home section. Sections are filled in render order: a product used by an
 * earlier section is removed from every later one. `max` caps each section AFTER removing duplicates (so a
 * dropped duplicate is replaced by the next product, not by a hole). `seed` = ids already on the page.
 * The catalogue grid at the bottom ("Browse everything") is deliberately NOT part of this: it is the full list.
 */
export function dedupeInOrder<K extends string, T extends HasId>(
  order: readonly K[],
  lists: Partial<Record<K, T[]>>,
  max: Partial<Record<K, number>> = {},
  seed: Iterable<string> = [],
): Record<K, T[]> {
  const seen = new Set<string>(seed);
  const out = {} as Record<K, T[]>;
  for (const key of order) {
    const cap = max[key] ?? Infinity;
    const kept: T[] = [];
    for (const p of lists[key] ?? []) {
      if (kept.length >= cap) break;
      if (!p?._id || seen.has(p._id)) continue;
      seen.add(p._id);
      kept.push(p);
    }
    out[key] = kept;
  }
  return out;
}

export interface PaymentFlags { card?: boolean; bankTransfer?: boolean; jazzcash?: boolean; easypaisa?: boolean }
export type PaymentTrustId = 'cod' | 'jazzcash' | 'easypaisa' | 'card' | 'bank';

/**
 * Payment methods the trust strip may show: ONLY ones that are really enabled. Card also needs the web app's
 * Stripe key (`stripeKeyPresent`); COD needs at least one live store that accepts it.
 */
export function paymentTrust(flags: PaymentFlags | undefined, codAvailable: boolean | undefined, stripeKeyPresent: boolean): PaymentTrustId[] {
  const out: PaymentTrustId[] = [];
  if (codAvailable) out.push('cod');
  if (flags?.jazzcash) out.push('jazzcash');
  if (flags?.easypaisa) out.push('easypaisa');
  if (flags?.card && stripeKeyPresent) out.push('card');
  if (flags?.bankTransfer) out.push('bank');
  return out;
}

/** https://wa.me link for a stored WhatsApp number (digits only; a leading 0 is treated as Pakistan, +92). Empty when unusable. */
export function whatsappLink(raw: string | undefined | null): string {
  let digits = (raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : '';
}

export type GradeTileKind = 'class' | 'level' | 'teacher';
export interface GradeTileDef { id: string; label: string; kind: GradeTileKind; value: string }

/** The shop-by-grade tiles, in order. `class` = home `?class=` filter, `level` = /learn/<level> page, `teacher` = the admin's teacher category. */
export const GRADE_TILES: GradeTileDef[] = [
  { id: 'nursery', label: 'Nursery', kind: 'class', value: 'nursery' },
  { id: 'kg', label: 'KG', kind: 'class', value: 'kg' },
  { id: 'primary', label: 'Class 1-5', kind: 'level', value: 'primary_school' },
  { id: 'middle', label: 'Class 6-8', kind: 'level', value: 'middle_school' },
  { id: 'secondary', label: 'Class 9-10', kind: 'level', value: 'secondary_school' },
  { id: 'teachers', label: 'Teachers', kind: 'teacher', value: 'teacher' },
];

/** Education level an `class` tile belongs to (its resources are counted under that level). */
export const CLASS_TILE_LEVEL: Record<string, string> = { nursery: 'preschool', kg: 'preschool' };

export const learnLevelPath = (level: string) => `/learn/${level.replace(/_/g, '-')}`;
