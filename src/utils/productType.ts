/** Products are Physical or Digital. The old 'educational' type was retired; if the API still returns it
 *  (old data not yet migrated) it is treated as digital. */
export type ProductKind = 'physical' | 'digital';

export function normalizeProductType(t: string | null | undefined): ProductKind | undefined {
  if (!t) return undefined;
  return t === 'physical' ? 'physical' : 'digital';
}
