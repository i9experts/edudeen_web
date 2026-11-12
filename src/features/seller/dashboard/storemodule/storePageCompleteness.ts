import type { EducatorProfile } from '@/api/services/store';

export interface CompletenessItem {
  key: 'logo' | 'banner' | 'headline' | 'description' | 'phone' | 'faq' | 'teacher';
  label: string;
  hint: string;
  done: boolean;
  /** DOM id of the field to scroll to / focus. */
  anchor: string;
  /** Where that field lives, relative to /store/:storeId/ (Customize store or Store Settings). */
  path: string;
}

export const DESCRIPTION_MIN_CHARS = 80;
export const FAQ_MIN = 3;

/** What the meter reads. Page fields come from the Customize-store DRAFT (or the live store elsewhere); phone + FAQ are Store Settings values. */
export interface MeterInput {
  logo?: string | null;
  coverImage?: string | null;
  tagline?: string | null;
  description?: string | null;
  contactPhone?: string | null;
  faqs?: { q?: string; a?: string }[] | null;
  educatorProfile?: EducatorProfile | null;
  gradesServed?: string[] | null;
  subjects?: string[] | null;
  teachingLanguages?: string[] | null;
}

/**
 * THE store-page meter (one list, three screens: Customize store, Store Settings, Dashboard setup card).
 * Seven checks: logo, banner, tagline, description 80+, phone, 3+ FAQs, teaching profile.
 */
export function storeSetupMeter(s: MeterInput): CompletenessItem[] {
  const ep = s.educatorProfile;
  const teacher = !!(ep && (ep.headline?.trim() || ep.qualifications?.length || ep.subjects?.length || ep.institutions?.length))
    || !!(s.gradesServed?.length || s.subjects?.length || s.teachingLanguages?.length);
  const faqCount = (s.faqs ?? []).filter(f => f?.q?.trim() && f?.a?.trim()).length;
  return [
    { key: 'logo', label: 'Logo', hint: 'A square logo buyers recognise', done: !!s.logo?.trim(), anchor: 'sp-logo', path: 'storebuilder#sp-logo' },
    { key: 'banner', label: 'Banner photo', hint: 'A wide photo behind your store name', done: !!s.coverImage?.trim(), anchor: 'sp-banner', path: 'storebuilder#sp-banner' },
    { key: 'headline', label: 'Tagline', hint: 'One line on what you teach', done: !!s.tagline?.trim(), anchor: 'sp-headline', path: 'storebuilder#sp-headline' },
    { key: 'description', label: `Description (${DESCRIPTION_MIN_CHARS}+ characters)`, hint: `${Math.min((s.description ?? '').trim().length, DESCRIPTION_MIN_CHARS)}/${DESCRIPTION_MIN_CHARS} characters`, done: (s.description ?? '').trim().length >= DESCRIPTION_MIN_CHARS, anchor: 'sp-description', path: 'storebuilder#sp-description' },
    { key: 'phone', label: 'Contact phone', hint: 'Buyers can reach you', done: !!s.contactPhone?.trim(), anchor: 'sp-phone', path: 'settings#sp-phone' },
    { key: 'faq', label: `${FAQ_MIN}+ FAQs`, hint: `${Math.min(faqCount, FAQ_MIN)}/${FAQ_MIN} answered questions`, done: faqCount >= FAQ_MIN, anchor: 'sp-faq', path: 'settings#sp-faq' },
    { key: 'teacher', label: 'Teaching profile', hint: 'Your one-liner, qualifications, grades or subjects', done: teacher, anchor: 'sp-teacher', path: 'storebuilder#sp-teacher' },
  ];
}
