// Mirrors the API rule (edudeen_api/src/collections/collection-name.util.ts): same name = same lowercase letters/digits.
export const COLLECTION_NAME_MIN = 2;
export const COLLECTION_NAME_MAX = 40;
export const MAX_COLLECTIONS = 20;

export const cleanCollectionName = (s: string) => s.replace(/\s+/g, ' ').trim();
export const normalizeCollectionName = (s: string) => cleanCollectionName(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Returns an error text, or '' when the name is fine. `others` = names of the store's other collections. */
export function collectionNameError(name: string, others: string[]): string {
  const clean = cleanCollectionName(name);
  if (clean.length < COLLECTION_NAME_MIN) return `Name must be at least ${COLLECTION_NAME_MIN} characters.`;
  if (clean.length > COLLECTION_NAME_MAX) return `Name can be at most ${COLLECTION_NAME_MAX} characters.`;
  const key = normalizeCollectionName(clean);
  if (!key) return 'Name must contain letters or numbers.';
  if (others.some(o => normalizeCollectionName(o) === key)) return 'This collection already exists';
  return '';
}
