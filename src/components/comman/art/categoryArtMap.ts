// Maps a category / product name (English, Roman Urdu, slugs) to one of the
// built-in education illustrations in CategoryArt.tsx. Pure data + logic, no JSX.

export type ArtId =
  | 'quran' | 'islamic' | 'arabic' | 'urdu' | 'english' | 'math' | 'science' | 'social'
  | 'early' | 'computer' | 'exam' | 'teacher' | 'books' | 'stationery' | 'toys'
  | 'handwriting' | 'creative' | 'courses' | 'homeschool' | 'worksheet' | 'others' | 'default';

export const ART_IDS: ArtId[] = [
  'quran', 'islamic', 'arabic', 'urdu', 'english', 'math', 'science', 'social', 'early', 'computer',
  'exam', 'teacher', 'books', 'stationery', 'toys', 'handwriting', 'creative', 'courses', 'homeschool',
  'worksheet', 'others', 'default',
];

// Order matters: the first rule that matches wins, so specific subjects come before generic words.
const RULES: Array<[ArtId, string]> = [
  ['quran', 'quran\\w*|qur an|koran|tajweed|tajwid|noorani|nurani|hifz|hafiz|nazra|nazrah|tafsir|tafseer|tarjuma|qirat|qiraat|surah|juz'],
  ['islamic', 'islam\\w*|seerah|sirah|seeratun|hadith|hadees|fiqh|dua|duas|namaz|salah|salat|aqeedah|aqidah|tarbiyyah|tarbiyah|muslim|deen|nasheed|prophet\\w*|ramadan|hajj|umrah'],
  ['arabic', 'arabic|arabi|nahw|sarf|balagha'],
  ['urdu', 'urdu|qaida|nastaliq|ghazal|muhavare|muhavara|nazm|insha'],
  ['english', 'english|phonics|grammar|spelling|vocabulary|ielts|toefl|reading|comprehension|essay\\w*|literature|alphabet|abc'],
  ['math', 'math|maths|mathematics|algebra|geometry|arithmetic|calculus|trigonometry|statistics|numeracy|numbers?|fractions?|ریاضی'],
  ['science', 'science|sciences|physics|chemistry|biology|lab|experiments?|atom\\w*|ecology'],
  ['social', 'social|pakistan|history|geography|civics|economics|culture|world|maps?|studies'],
  ['early', 'early|kg|nursery|montessori|rhymes?|preschool|pre school|toddlers?|kindergarten|playgroup|colou?rs'],
  ['computer', 'computers?|coding|code|ai|typing|digital|programming|python|scratch|robotics|ict|software|web|excel|office'],
  ['exam', 'exams?|matric|fsc|o level|a level|olevel|alevel|past papers?|papers?|mdcat|ecat|css|sat|test|tests|mcqs?|mock|entry test|prep|revision|intermediate'],
  ['teacher', 'teachers?|lesson|lessons|worksheets?|rubrics?|planner|planners|classroom|assessments?|curriculum|syllabus|printables?'],
  ['handwriting', 'handwriting|writing|cursive|penmanship|tracing'],
  ['creative', 'calligraphy|art|arts|craft|crafts|creativ\\w*|drawing|painting|colou?ring|khattati|khatati|design|sketch\\w*'],
  ['stationery', 'stationery|notebooks?|pens?|pencils?|supplies|bags?|markers?|erasers?|rulers?|diary|diaries'],
  ['books', 'books?|textbooks?|novels?|readers?|library|storybooks?|stories|story|kitab|guides?|notes'],
  ['toys', 'toys?|games?|puzzles?|stem|flashcards?|building|blocks|boardgames?|educational toys'],
  ['courses', 'courses?|class|classes|live|webinars?|lectures?|workshops?|bootcamps?|tutors?|tutoring|video|videos|online'],
  ['homeschool', 'homeschool\\w*|home school|parents?|parenting|family|mother|mothers|home'],
  ['others', 'others?|misc|miscellaneous|general'],
];

const COMPILED = RULES.map(([id, src]) => [id, new RegExp(`(?:^| )(?:${src})(?= |$)`)] as const);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** First keyword match for a text, or null. */
export function matchArt(text: string | null | undefined): ArtId | null {
  if (!text) return null;
  const n = normalize(text);
  if (!n) return null;
  for (const [id, re] of COMPILED) if (re.test(n)) return id;
  return null;
}

/**
 * Pick the illustration for a category. Matches the name (then slug) first; a
 * sub-category with no keyword match of its own inherits its parent's art.
 */
export function resolveCategoryArt(nameOrSlug: string | null | undefined, parentName?: string | null): ArtId {
  return matchArt(nameOrSlug) ?? matchArt(parentName) ?? 'default';
}

/** Product cover: its category (if known), its name and tags, then the product type. */
export function resolveProductArt(opts: {
  name?: string | null;
  categoryName?: string | null;
  tags?: string[] | null;
  productType?: string | null;
}): ArtId {
  const byType: ArtId =
    opts.productType === 'physical' ? 'books'
    : opts.productType === 'digital' ? 'worksheet'
    : 'default';
  return matchArt(opts.categoryName) ?? matchArt(opts.name) ?? matchArt((opts.tags ?? []).join(' ')) ?? byType;
}
