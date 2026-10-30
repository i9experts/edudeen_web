import {
  BookOpen, BookMarked, Calculator, FlaskConical, Globe2, Baby, Laptop, ClipboardCheck,
  Presentation, PenLine, Palette, Backpack, Puzzle, GraduationCap, Home, Languages,
  MoonStar, FileText, LayoutGrid, type LucideIcon,
} from 'lucide-react';
import { resolveCategoryArt, type ArtId } from './categoryArtMap';

const ICONS: Record<ArtId, LucideIcon> = {
  quran: BookMarked,
  islamic: MoonStar,
  arabic: Languages,
  urdu: PenLine,
  english: BookOpen,
  math: Calculator,
  science: FlaskConical,
  social: Globe2,
  early: Baby,
  computer: Laptop,
  exam: ClipboardCheck,
  teacher: Presentation,
  books: BookOpen,
  stationery: Backpack,
  toys: Puzzle,
  handwriting: PenLine,
  creative: Palette,
  courses: GraduationCap,
  homeschool: Home,
  worksheet: FileText,
  others: LayoutGrid,
  default: LayoutGrid,
};

/** Simple line icon matched to the category name (falls back to the parent's). */
export function CategoryIcon({
  name, parentName, className = 'w-5 h-5',
}: { name: string; parentName?: string | null; className?: string }) {
  const Icon = ICONS[resolveCategoryArt(name, parentName)];
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
