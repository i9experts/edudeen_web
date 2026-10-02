// Education-specific labels shared by product forms, filters and product pages.
// Values match the API (products/schemas/product.schema.ts CURRICULA).

export const CURRICULA = [
  { value: 'federal',     label: 'Federal Board (FBISE)' },
  { value: 'punjab',      label: 'Punjab Board' },
  { value: 'sindh',       label: 'Sindh Board' },
  { value: 'kpk',         label: 'KPK Board' },
  { value: 'balochistan', label: 'Balochistan Board' },
  { value: 'ajk_gb',      label: 'AJK / Gilgit-Baltistan' },
  { value: 'cambridge_o', label: 'Cambridge O Level' },
  { value: 'cambridge_a', label: 'Cambridge A Level' },
  { value: 'igcse',       label: 'IGCSE' },
  { value: 'ib',          label: 'IB' },
  { value: 'aku_eb',      label: 'Aga Khan Board (AKU-EB)' },
  { value: 'madrasa',     label: 'Madrasa / Wifaq' },
] as const;

export type CurriculumValue = (typeof CURRICULA)[number]['value'];

export const CURRICULUM_LABEL: Record<string, string> = Object.fromEntries(CURRICULA.map(c => [c.value, c.label]));

export const LICENSE_LABEL: Record<string, string> = {
  personal: 'Personal use',
  single_classroom: 'One classroom',
  school: 'Whole school',
  commercial: 'Commercial',
};

/** "Ages 6–8", "Ages 10+", "Up to age 5" — null when no range is set. */
export function ageLabel(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return min === max ? `Age ${min}` : `Ages ${min}–${max}`;
  if (min != null) return `Ages ${min}+`;
  return `Up to age ${max}`;
}
