/**
 * Title quality, class/age consistency and off-platform contact rules for the seller product forms AND bulk upload.
 * Pure (no imports) so `npm run test:rules` can run it with plain node. The API mirrors it in
 * edudeen_api/src/products/product-quality.util.ts and contact-info.util.ts (those are the authority) - keep in step.
 *
 * Class range: REQUIRED for digital products (to publish), optional for physical goods and drafts.
 */

export const MIN_TITLE_LENGTH = 10;
export const TITLE_SUGGESTION = 'Grade 5 Complete Course Book Set - Publisher Name';
export const POLICY_LINE = 'Do not put phone numbers, WhatsApp or emails in titles, descriptions or images; all sales must go through Edudeen.';

/** Same order as the API's CLASS_LEVELS. */
const CLASSES: { value: string; label: string }[] = [
  { value: 'nursery', label: 'Nursery' }, { value: 'prep', label: 'Prep' }, { value: 'kg', label: 'KG' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: `class-${i + 1}`, label: `Class ${i + 1}` })),
  { value: 'o-level', label: 'O Level' }, { value: 'a-level', label: 'A Level' }, { value: 'university', label: 'University' },
];
const idx = (v?: string | null) => (v ? CLASSES.findIndex(c => c.value === v) : -1);
const labelOf = (v: string) => CLASSES.find(c => c.value === v)?.label ?? v;

/** Trim, collapse spaces, capitalise the first letter. */
export function normalizeTitle(raw: unknown): string {
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Blocking message, or null. */
export function titleError(raw: unknown): string | null {
  const len = String(raw ?? '').trim().length;
  if (len === 0) return 'Enter a title';
  return len < MIN_TITLE_LENGTH ? `Title needs at least ${MIN_TITLE_LENGTH} characters so buyers know what it is (now ${len}).` : null;
}

/** Add/Edit form title rule: titleError plus "must start with a capital letter" (the seller fixes it, nothing is silently rewritten). */
export function titleFormError(raw: unknown): string | null {
  const base = titleError(raw);
  if (base) return base;
  const first = String(raw ?? '').trim().charAt(0);
  return first && first !== first.toUpperCase() ? 'Title must start with a capital letter (e.g. "Class 5 Maths Worksheets").' : null;
}

const GRADE_WORD =/\b(?:class|grade|g)\s*[-:#]?\s*(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?\b/i;
const KNOWN_LEVEL = /\b(kg|nursery|prep)\b/i;

/** Non-blocking: a title that says almost nothing. */
export function vagueTitleWarning(title: string): string | null {
  const t = normalizeTitle(title);
  if (!t) return null;
  const vague = /^(course|books?|worksheets?|notes?|resource|resources)\s*(g|grade|class)?\s*\d+$/i.test(t);
  const words = t.split(/\s+/).filter(Boolean);
  const hasGrade = GRADE_WORD.test(t) || KNOWN_LEVEL.test(t);
  return vague || (words.length < 3 && hasGrade)
    ? `This title is quite vague. Say what it is, who it is for and who made it, e.g. "${TITLE_SUGGESTION}".`
    : null;
}

export function titleGrade(title: string): { from: string; to: string; label: string } | null {
  const m = GRADE_WORD.exec(title);
  if (m) {
    const a = Number(m[1]); const b = m[2] ? Number(m[2]) : a;
    if (a >= 1 && a <= 12 && b >= a && b <= 12) return { from: `class-${a}`, to: `class-${b}`, label: a === b ? `Class ${a}` : `Class ${a}-${b}` };
  }
  const k = KNOWN_LEVEL.exec(title);
  if (k) { const v = k[1].toLowerCase(); return { from: v, to: v, label: labelOf(v) }; }
  return null;
}

function rangeText(from: string, to: string): string {
  if (from === to) return labelOf(from);
  const n = (v: string) => (v.startsWith('class-') ? v.slice(6) : null);
  return n(from) && n(to) ? `${n(from)}-${n(to)}` : `${labelOf(from)} - ${labelOf(to)}`;
}

/** Non-blocking: what the title says vs the class range picked. */
export function titleClassConflict(title: string, classFrom?: string | null, classTo?: string | null): string | null {
  const from = classFrom || classTo; const to = classTo || classFrom;
  const fi = idx(from); const ti = idx(to);
  if (fi < 0 || ti < 0) return null;
  const sel = rangeText(from as string, to as string);
  const g = titleGrade(title);
  if (g) {
    const gf = idx(g.from); const gt = idx(g.to);
    if (gt < fi || gf > ti) return `Title says ${g.label} but suitable classes are ${sel}. Please check one of them.`;
    if (ti - fi >= 8 && gt - gf <= 3) return `Title says ${g.label} but this is marked suitable for ${sel}. Narrow the class range if it is meant for ${g.label}.`;
    return null;
  }
  if (/\bbeginner\b/i.test(title) && fi >= idx('class-6')) return `Title says Beginner but suitable classes are ${sel}. Please check the class range.`;
  return null;
}

/** Class range needed to publish: every type except physical. */
export function classRangeRequired(type: string | null | undefined): boolean {
  return type !== 'physical';
}
export function classRangeError(type: string | null | undefined, classFrom?: string | null, classTo?: string | null): string | null {
  return classRangeRequired(type) && !classFrom && !classTo ? 'Choose the classes this is suitable for (e.g. Class 3 to Class 5) - buyers filter by class.' : null;
}

export function qualityWarnings(title: string, classFrom?: string | null, classTo?: string | null): string[] {
  return [vagueTitleWarning(title), titleClassConflict(title, classFrom, classTo)].filter((w): w is string => !!w);
}

// ── Search visibility (mirror of API searchVisibility in product-quality.util.ts; the list on the SEO page comes from the API) ──
// The product editor uses it for the live "how will this look in search" hint, so both must give the same answer.
export const SEARCH_TITLE_MIN = 30;
export const SEARCH_TITLE_MAX = 60;
export const SEARCH_DESC_MIN = 150;
const SEARCH_WEIGHTS = { title: 20, description: 20, images: 15, classRange: 15, subject: 10, language: 10, board: 10 } as const;
type SearchKey = keyof typeof SEARCH_WEIGHTS;
export interface SearchInput {
  name?: string | null; description?: string | null; seoTitle?: string | null; seoDescription?: string | null;
  isPhysical: boolean; imageCount: number; classFrom?: string | null; classTo?: string | null;
  hasSubject: boolean; language?: string | null; boardCount: number;
}
export interface SearchMissing { key: SearchKey; label: string; fix: { step: number; fieldId: string } }
const plain = (s: unknown) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const FIX = {
  title: { step: 0, fieldId: 'ap-name' }, seoTitle: { step: 0, fieldId: 'fld-seo' },
  description: { step: 0, fieldId: 'ap-desc' }, seoDescription: { step: 0, fieldId: 'fld-seo' },
  images: { step: 1, fieldId: 'fld-photos' }, learning: { step: 3, fieldId: 'fld-learning' }, subject: { step: 3, fieldId: 'fld-category' },
};

export function searchVisibility(i: SearchInput): { score: number; missing: SearchMissing[] } {
  let earned = 0; let possible = 0;
  const missing: SearchMissing[] = [];
  const add = (key: SearchKey, got: number, label: string | null, fix: { step: number; fieldId: string }) => {
    const w = SEARCH_WEIGHTS[key]; possible += w; earned += w * Math.max(0, Math.min(1, got));
    if (label && got < 1) missing.push({ key, label, fix });
  };
  const custom = plain(i.seoTitle);
  const title = custom || plain(i.name);
  const tFix = custom ? FIX.seoTitle : FIX.title;
  const tl = title.length;
  const vague = !custom && !!vagueTitleWarning(title);
  if (tl === 0) add('title', 0, 'Add a title', FIX.title);
  else if (tl < SEARCH_TITLE_MIN) add('title', tl >= MIN_TITLE_LENGTH ? 0.5 : 0.2, `Make the title longer (${tl} characters, ${SEARCH_TITLE_MIN}-${SEARCH_TITLE_MAX} is best)`, tFix);
  else if (tl > SEARCH_TITLE_MAX) add('title', 0.7, `Shorten the title (${tl} characters, Google cuts it after ${SEARCH_TITLE_MAX})`, tFix);
  else add('title', vague ? 0.7 : 1, vague ? 'Say more in the title (what it is, who it is for)' : null, tFix);

  const customDesc = plain(i.seoDescription);
  const desc = customDesc || plain(i.description);
  const dl = desc.length;
  add('description', dl >= SEARCH_DESC_MIN ? 1 : dl >= 100 ? 0.7 : dl >= 20 ? 0.4 : 0,
    dl === 0 ? 'Add a description' : `Write a longer description (${dl} characters, ${SEARCH_DESC_MIN}+ is best)`, customDesc ? FIX.seoDescription : FIX.description);

  const img = Math.max(0, i.imageCount | 0);
  add('images', img >= 3 ? 1 : img === 2 ? 0.66 : img === 1 ? 0.33 : 0, img === 0 ? 'Add photos' : `Add more photos (${img} now, 3+ is best)`, FIX.images);
  if (!i.isPhysical) add('classRange', i.classFrom || i.classTo ? 1 : 0, 'Set the class range', FIX.learning);
  add('subject', i.hasSubject ? 1 : 0, 'Pick the subject (sub-category)', FIX.subject);
  add('language', i.language ? 1 : 0, 'Say which language it is in', FIX.learning);
  if (!i.isPhysical) add('board', i.boardCount > 0 ? 1 : 0, 'Pick the exam board / syllabus', FIX.learning);
  return { score: possible > 0 ? Math.round((earned / possible) * 100) : 0, missing };
}

// ── Off-platform contact details (mirror of the API detector; the server decides) ──
const PK_MOBILE = /(?<![\d.])(?:(?:\+|00)?92[\s.-]?\(?0?3\d{2}\)?[\s.-]?\d{7}|0\(?3\d{2}\)?[\s.-]?\d{7})(?![\d])/g;
const INTL_PHONE = /(?<![\w])\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?![\d])/g;
const PK_LANDLINE = /(?<![\d.])0(?:2[1-9]|4[1-9]|5[1-9]|6[1-9]|9[1-9])\d?[\s.-]\d{3,4}[\s.-]?\d{4}(?![\d])/g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi;
const EMAIL_OBF = /[A-Z0-9._%+-]+\s*[(\[]\s*at\s*[)\]]\s*[A-Z0-9-]+\s*[(\[]?\s*dot\s*[)\]]?\s*[A-Z]{2,}/gi;
const WHATSAPP = /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|web\.whatsapp\.com)\/\S*|wh?atsa+p+\b|whats\s?app|واٹس\s?ایپ|واٹسپ/gi;
const TELEGRAM = /(?:https?:\/\/)?(?:t\.me|telegram\.me)\/\S*|\btelegram\b/gi;
const digits = (s: string) => s.replace(/\D/g, '').length;

/** Matched contact details in a text (empty = clean). */
export function findContactInfo(text: string | null | undefined): string[] {
  const t = String(text ?? '');
  if (!t.trim()) return [];
  const out: string[] = [];
  const add = (re: RegExp, keep: (s: string) => boolean = () => true) => {
    re.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = re.exec(t))) { const s = m[0].trim(); if (s && keep(s)) out.push(s.slice(0, 80)); if (m.index === re.lastIndex) re.lastIndex++; }
  };
  add(EMAIL); add(EMAIL_OBF); add(WHATSAPP); add(TELEGRAM);
  add(PK_MOBILE, s => digits(s) >= 10);
  add(INTL_PHONE, s => digits(s) >= 9 && digits(s) <= 15);
  add(PK_LANDLINE, s => digits(s) >= 9);
  return [...new Set(out)];
}

export function contactWarning(...texts: Array<string | null | undefined>): string | null {
  const hits = texts.flatMap(t => findContactInfo(t));
  return hits.length
    ? `Found contact details (${[...new Set(hits)].slice(0, 3).join(', ')}). The listing will be sent to review instead of going live. ${POLICY_LINE}`
    : null;
}
