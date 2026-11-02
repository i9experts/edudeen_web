import {
  BookOpen, BookMarked, BookOpenCheck, Library, Notebook, NotebookPen, Pencil, PencilRuler, Ruler,
  Scissors, Music, Brain, Atom, Dna, Microscope, Globe2, Landmark, Map, Clock, Star, Shapes, Blocks,
  Gamepad2, Code, Bot, Keyboard, FileCheck, Trophy, Target, Lightbulb, Video, Users, Heart, Sparkles,
  Mic, Telescope, Leaf, Calendar, ScrollText, Book, Pen, Highlighter, School, Award, Smile, Sigma,
  Type, SpellCheck, Brush, Compass, Hourglass, Gift, Calculator, FlaskConical, Baby, Laptop,
  ClipboardCheck, Presentation, PenLine, Palette, Backpack, Puzzle, GraduationCap, Home, Languages,
  MoonStar, FileText, LayoutGrid, type LucideIcon,
} from 'lucide-react';
import { resolveCategoryArt, type ArtId } from './categoryArtMap';

// Specific keywords first (first match wins), so sub-categories get their own icon.
const RULES: Array<[string, LucideIcon]> = [
  ['tajweed|tajwid|qirat|qiraat', Mic],
  ['noorani|nurani|qaida|nazra|nazrah', BookOpenCheck],
  ['hifz|hafiz|memori[sz]\\w*', Brain],
  ['tafsir|tafseer|tarjuma|translation', ScrollText],
  ['quran\\w*|qur an|koran|surah|juz', BookMarked],
  ['dua|duas|namaz|salah|salat|ramadan|hajj|umrah', MoonStar],
  ['seerah|sirah|prophet\\w*|hadith|hadees|fiqh|aqeedah|aqidah', Landmark],
  ['islam\\w*|muslim|deen|tarbiyah|tarbiyyah|nasheed', Star],
  ['arabic|nahw|sarf|balagha', Languages],
  ['urdu|ghazal|nazm|muhavare|muhavara|insha|nastaliq', PenLine],
  ['phonics|alphabet|abc|spelling', SpellCheck],
  ['grammar', Type],
  ['vocabulary|literature|essay\\w*|reading|comprehension|stories|story|storybooks?', BookOpen],
  ['english|ielts|toefl', Languages],
  ['algebra|calculus|trigonometry|statistics', Sigma],
  ['geometry|shapes?', Shapes],
  ['arithmetic|numbers?|numeracy|fractions?|math\\w*', Calculator],
  ['physics|atom\\w*', Atom],
  ['chemistry|lab|experiments?', FlaskConical],
  ['biology|ecology|nature|plants?', Dna],
  ['astronomy|space', Telescope],
  ['science\\w*', Microscope],
  ['history', Hourglass],
  ['geography|maps?', Map],
  ['pakistan|civics|economics|culture', Landmark],
  ['social|world|studies', Globe2],
  ['rhymes?|nasheed|music|songs?', Music],
  ['colou?rs?', Palette],
  ['montessori|nursery|kg|preschool|pre school|toddlers?|kindergarten|playgroup|early|kids?', Baby],
  ['coding|code|programming|python|scratch', Code],
  ['robotics|ai', Bot],
  ['typing', Keyboard],
  ['computers?|ict|digital|software|web|excel|office', Laptop],
  ['past papers?|papers?|mock|test|tests|mcqs?', FileCheck],
  ['mdcat|ecat|sat|css|entry test|prep|revision', Target],
  ['matric|fsc|o level|a level|olevel|alevel|intermediate|exams?', ClipboardCheck],
  ['rubrics?|assessments?', Award],
  ['lesson|lessons|planner|planners|curriculum|syllabus', Calendar],
  ['worksheets?|printables?', FileText],
  ['teachers?|classroom', Presentation],
  ['cursive|tracing|penmanship|handwriting|writing', Pencil],
  ['calligraphy|khattati|khatati', Brush],
  ['drawing|sketch\\w*|painting|colou?ring', Highlighter],
  ['craft|crafts|art|arts|creativ\\w*|design', Scissors],
  ['notebooks?|diary|diaries', Notebook],
  ['pens?|markers?', Pen],
  ['pencils?|erasers?|rulers?', Ruler],
  ['bags?|backpacks?', Backpack],
  ['stationery|supplies', PencilRuler],
  ['textbooks?|novels?|readers?|kitab|guides?|notes', Book],
  ['library|books?', Library],
  ['flashcards?', NotebookPen],
  ['puzzles?', Puzzle],
  ['building|blocks', Blocks],
  ['games?|boardgames?', Gamepad2],
  ['stem|toys?', Lightbulb],
  ['video|videos|lectures?|webinars?', Video],
  ['tutors?|tutoring|workshops?|bootcamps?', Users],
  ['courses?|class|classes|online', GraduationCap],
  ['parents?|parenting|family|mother|mothers', Heart],
  ['homeschool\\w*|home school|home', Home],
  ['gifts?|bundles?', Gift],
  ['school|schools', School],
  ['others?|misc|miscellaneous|general', LayoutGrid],
];

const COMPILED = RULES.map(([src, Icon]) => [new RegExp(`(?:^| )(?:${src})(?= |$)`), Icon] as const);

// Generic pool: a name with no keyword gets a stable, name-specific icon (never its parent's).
const POOL: LucideIcon[] = [
  Sparkles, Compass, Lightbulb, Smile, Leaf, Trophy, Star, Brain, Shapes, Target, Award, Heart,
  Gift, Hourglass, Clock, Book, Notebook, Pencil, Puzzle, Telescope,
];

const ART_FALLBACK: Partial<Record<ArtId, LucideIcon>> = {
  quran: BookMarked, islamic: MoonStar, arabic: Languages, urdu: PenLine, english: BookOpen,
  math: Calculator, science: FlaskConical, social: Globe2, early: Baby, computer: Laptop,
  exam: ClipboardCheck, teacher: Presentation, books: BookOpen, stationery: Backpack, toys: Puzzle,
  handwriting: PenLine, creative: Palette, courses: GraduationCap, homeschool: Home, worksheet: FileText,
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickIcon(name: string, parentName?: string | null): LucideIcon {
  const n = normalize(name);
  for (const [re, Icon] of COMPILED) if (re.test(n)) return Icon;
  const art = resolveCategoryArt(name, null);
  if (art !== 'default' && art !== 'others' && ART_FALLBACK[art]) return ART_FALLBACK[art]!;
  if (!n) return LayoutGrid;
  return POOL[hash(`${n}|${normalize(parentName ?? '')}`) % POOL.length];
}

const ALL_ICONS: LucideIcon[] = Array.from(new Set([...RULES.map(([, i]) => i), ...POOL]));

/**
 * Icons for one list of sibling categories, guaranteed all different (up to ~70 items).
 * The best keyword match wins; a later sibling that would repeat gets the next free icon.
 */
export function assignCategoryIcons(names: string[], parentName?: string | null): LucideIcon[] {
  const used = new Set<LucideIcon>();
  return names.map(name => {
    let icon = pickIcon(name, parentName);
    if (used.has(icon)) {
      const start = hash(normalize(name)) % ALL_ICONS.length;
      for (let i = 0; i < ALL_ICONS.length; i++) {
        const c = ALL_ICONS[(start + i) % ALL_ICONS.length];
        if (!used.has(c)) { icon = c; break; }
      }
    }
    used.add(icon);
    return icon;
  });
}

/** Simple line icon matched to the category's own name. Pass `icon` from assignCategoryIcons for unique siblings. */
export function CategoryIcon({
  name, parentName, className = 'w-5 h-5', icon,
}: { name: string; parentName?: string | null; className?: string; icon?: LucideIcon }) {
  const Icon = icon ?? pickIcon(name, parentName);
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
