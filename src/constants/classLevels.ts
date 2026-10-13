// Mirror of edudeen_api/src/products/class-levels.ts (keep both in sync): the ordered class list
// behind the "Class" filter, a product's classFrom..classTo and a child's class.

export const CLASS_LEVELS = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'prep', label: 'Prep' },
  { value: 'kg', label: 'KG' },
  { value: 'class-1', label: 'Class 1' },
  { value: 'class-2', label: 'Class 2' },
  { value: 'class-3', label: 'Class 3' },
  { value: 'class-4', label: 'Class 4' },
  { value: 'class-5', label: 'Class 5' },
  { value: 'class-6', label: 'Class 6' },
  { value: 'class-7', label: 'Class 7' },
  { value: 'class-8', label: 'Class 8' },
  { value: 'class-9', label: 'Class 9' },
  { value: 'class-10', label: 'Class 10' },
  { value: 'class-11', label: 'Class 11' },
  { value: 'class-12', label: 'Class 12' },
  { value: 'o-level', label: 'O Level' },
  { value: 'a-level', label: 'A Level' },
  { value: 'university', label: 'University' },
] as const;

export const CLASS_VALUES: string[] = CLASS_LEVELS.map(c => c.value);
const CLASS_LABEL = new Map<string, string>(CLASS_LEVELS.map(c => [c.value, c.label]));

export const classLabel = (value: string | null | undefined) => (value ? CLASS_LABEL.get(value) ?? value : '');
export const isClassValue = (v: unknown): v is string => typeof v === 'string' && CLASS_LABEL.has(v);
export const classIndex = (v: string | null | undefined) => (v ? CLASS_VALUES.indexOf(v) : -1);

/** Coarse education level -> the class it starts from; used to derive a child's level from their class. */
const LEVEL_CLASSES: Record<string, string[]> = {
  preschool: ['nursery', 'prep', 'kg'],
  primary_school: ['class-1', 'class-2', 'class-3', 'class-4', 'class-5'],
  middle_school: ['class-6', 'class-7', 'class-8'],
  secondary_school: ['class-9', 'class-10', 'o-level'],
  college: ['class-11', 'class-12', 'a-level'],
  university: ['university'],
};
export function levelForClass(value: string): string | null {
  return Object.entries(LEVEL_CLASSES).find(([, cs]) => cs.includes(value))?.[0] ?? null;
}

/** Old free-text ("Class 3", "grade 5", "3rd class") -> class value, else null. */
export function canonicalClass(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim().toLowerCase();
  if (!t) return null;
  if (CLASS_LABEL.has(t)) return t;
  const byLabel = CLASS_LEVELS.find(c => c.label.toLowerCase() === t || c.value.replace('-', ' ') === t);
  if (byLabel) return byLabel.value;
  const m = t.match(/^(?:(?:class|grade)\s*-?\s*(\d{1,2})|(\d{1,2})\s*(?:st|nd|rd|th)?\s*(?:class|grade))$/);
  const n = m ? Number(m[1] ?? m[2]) : NaN;
  return n >= 1 && n <= 12 ? `class-${n}` : null;
}

/** "Class 2-4", "Class 3", "Nursery - KG"; null when the product has no class range. */
export function classRangeLabel(from?: string | null, to?: string | null): string | null {
  const f = from ?? to;
  const t = to ?? from;
  if (!f || !t) return null;
  if (f === t) return classLabel(f);
  const num = (v: string) => (v.startsWith('class-') ? v.slice(6) : null);
  return num(f) && num(t) ? `Class ${num(f)}-${num(t)}` : `${classLabel(f)} - ${classLabel(t)}`;
}

/** What to show for a child's class: the label for a known value, the text as typed otherwise. */
export const childClassLabel = (gradeLabel: string | null | undefined) => classLabel(canonicalClass(gradeLabel)) || (gradeLabel ?? '');
