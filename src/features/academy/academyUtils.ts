import { BookOpen, CheckCircle2, FileText, Megaphone, PlayCircle, ShieldCheck, Store, Truck, Wallet, type LucideIcon } from 'lucide-react';
import type { AcademyCategory, AcademyLessonType } from '@/api/services/academy';

/** Countries an admin can target a course at. Empty selection = every country. */
export const ACADEMY_COUNTRY_CODES = [
  'PK', 'AE', 'SA', 'QA', 'KW', 'OM', 'BH', 'GB', 'US', 'CA', 'AU', 'IN', 'BD', 'MY', 'ID', 'TR', 'EG', 'NG', 'KE', 'ZA', 'DE', 'FR',
] as const;

export function countryName(code: string): string {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code; } catch { return code; }
}

export const CATEGORY_STYLE: Record<AcademyCategory, { bg: string; Icon: LucideIcon }> = {
  getting_started:     { bg: 'bg-tint-sky',     Icon: Store },
  products_listings:   { bg: 'bg-tint-peach',   Icon: BookOpen },
  orders_reviews:      { bg: 'bg-tint-mint',    Icon: CheckCircle2 },
  shipping:            { bg: 'bg-tint-butter',  Icon: Truck },
  payments_finance:    { bg: 'bg-tint-lilac',   Icon: Wallet },
  marketing:           { bg: 'bg-tint-blossom', Icon: Megaphone },
  policies_guidelines: { bg: 'bg-tint-seafoam', Icon: ShieldCheck },
};

export const LESSON_ICON: Record<AcademyLessonType, LucideIcon> = { video: PlayCircle, text: FileText, pdf: FileText };

export function formatViews(n: number): string {
  return new Intl.NumberFormat('en', { notation: n >= 10_000 ? 'compact' : 'standard' }).format(n);
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
