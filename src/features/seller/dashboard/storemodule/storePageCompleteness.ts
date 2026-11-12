import type { StorePageFields } from '@/api/services/storeTheme';

export interface CompletenessItem {
  key: 'banner' | 'logo' | 'headline' | 'about' | 'teacher' | 'featured' | 'years';
  label: string;
  hint: string;
  done: boolean;
  /** DOM id of the field to scroll to / focus. */
  anchor: string;
}

/** Same bar the server's profile meter uses for a "real" About text (store/featured-stores.util PROFILE_*). */
export const ABOUT_MIN_CHARS = 30;
export const FEATURED_MIN = 2;

/** Seven checks for the Customize-store page, computed from the DRAFT so the score moves as the seller types. */
export function storePageCompleteness(page: StorePageFields, featuredCount: number): CompletenessItem[] {
  const ep = page.educatorProfile;
  const teacher = !!(ep && (ep.headline?.trim() || ep.qualifications?.length || ep.subjects?.length || ep.institutions?.length));
  return [
    { key: 'banner', label: 'Banner photo', hint: 'A wide photo behind your store name', done: !!page.coverImage, anchor: 'sp-banner' },
    { key: 'logo', label: 'Logo', hint: 'A square logo buyers recognise', done: !!page.logo, anchor: 'sp-logo' },
    { key: 'headline', label: 'Headline', hint: 'One line on what you teach', done: !!page.tagline?.trim(), anchor: 'sp-headline' },
    { key: 'about', label: 'About your store', hint: `At least ${ABOUT_MIN_CHARS} characters`, done: (page.aboutBio ?? '').trim().length >= ABOUT_MIN_CHARS, anchor: 'sp-about' },
    { key: 'teacher', label: 'Teacher info', hint: 'Your one-liner, qualifications or subjects', done: teacher, anchor: 'sp-teacher' },
    { key: 'featured', label: `${FEATURED_MIN}+ featured products`, hint: 'Shown in a row above all products', done: featuredCount >= FEATURED_MIN, anchor: 'sp-highlights' },
    { key: 'years', label: 'Years teaching', hint: 'Builds trust with parents', done: ep?.experienceYears != null, anchor: 'sp-years' },
  ];
}
