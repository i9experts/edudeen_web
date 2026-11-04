import { isClassValue } from '@/constants/classLevels';

/**
 * Pretty, shareable URL for a class x subject listing: `/browse/class-5/math`, or `/browse/class-5` for a class only.
 * It renders the same HomeBrowse view as `/?class=class-5&category=math` (which keeps working). The subject is a category slug.
 */
export const browsePath = (cls: string, subjectSlug?: string | null) =>
  `/browse/${encodeURIComponent(cls)}${subjectSlug ? `/${encodeURIComponent(subjectSlug)}` : ''}`;

/** Lower-cases and validates the `:class` segment; null when it is not a known class value. */
export function parseBrowseClass(raw: string | undefined): string | null {
  const v = (raw ?? '').trim().toLowerCase();
  return isClassValue(v) ? v : null;
}

/** Lower-cased category slug from the `:subject` segment; '' = none, null = malformed. */
export function parseBrowseSubject(raw: string | undefined): string | '' | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return '';
  return /^[a-z0-9][a-z0-9-]{0,99}$/.test(v) ? v : null;
}
