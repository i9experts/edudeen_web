import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Block } from './storefrontTypes';
import type { EducatorProfile } from './store';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ThemeBorderRadius       = 'none' | 'small' | 'medium' | 'large' | 'full';
export type ThemeButtonStyle        = 'solid' | 'outline' | 'soft';
export type ThemeButtonWidth        = 'auto' | 'full';
export type ThemeScale              = 'compact' | 'comfortable' | 'spacious';
export type ThemeContainerWidth     = 'narrow' | 'standard' | 'wide';
export type ThemeCardStyle          = 'flat' | 'outlined' | 'elevated';
export type ThemeButtonSize         = 'sm' | 'md' | 'lg';
export type ThemeHeroStyle          = 'overlay' | 'split';
export type ThemeHeroAlignment      = 'left' | 'center';
export type ThemeProductImageRatio  = 'square' | 'portrait';
export type ThemeProductImageHover  = 'none' | 'zoom';
export type ThemeProductGridDensity = 'cozy' | 'relaxed';
export type ThemeTestimonialStyle   = 'cards' | 'minimal';
export type ThemeFaqStyle           = 'accordion' | 'list';
export type ThemeHeaderStyle        = 'standard' | 'centered';
export type ThemeFooterStyle        = 'columns' | 'minimal';

export interface StorefrontColors {
  primaryColor: string;
  bgColor:      string;
  textColor:    string;
  accentColor:  string;
  font:         string;
  buttonStyle:  ThemeButtonStyle;
  /** Buttons scope — independent from product/testimonial cards and images. */
  buttonRadius: ThemeBorderRadius;
  buttonWidth:  ThemeButtonWidth;
  /** Images scope — standalone content images only (never buttons/cards). */
  imageRadius:  ThemeBorderRadius;
  typeScale:          ThemeScale;
  containerWidth:     ThemeContainerWidth;
  sectionSpacing:     ThemeScale;
  buttonSize:         ThemeButtonSize;
  heroStyle:          ThemeHeroStyle;
  heroAlignment:      ThemeHeroAlignment;
  /** Product Cards scope — independent from testimonial cards. */
  productCardStyle:   ThemeCardStyle;
  productCardRadius:  ThemeBorderRadius;
  productImageRatio:  ThemeProductImageRatio;
  productImageHover:  ThemeProductImageHover;
  productGridDensity: ThemeProductGridDensity;
  testimonialStyle:   ThemeTestimonialStyle;
  /** Testimonials scope — independent from product cards. */
  testimonialCardStyle:  ThemeCardStyle;
  testimonialCardRadius: ThemeBorderRadius;
  faqStyle:           ThemeFaqStyle;
}

export interface StorefrontHeader {
  logoSource:    'store' | 'custom';
  customLogoUrl: string | null;
  blocks:        Block[]; // nav_link blocks
  navAlignment:  'left' | 'center' | 'right';
  headerStyle:   ThemeHeaderStyle;
}

export interface StorefrontFooter {
  blocks:      Block[]; // footer_column / social_link / copyright_text blocks
  footerStyle: ThemeFooterStyle;
}

export type IdentityBannerLayout = 'standard' | 'compact' | 'immersive';

export interface IdentityBanner {
  showFollowButton:     boolean;
  showMessageButton:    boolean;
  showLoyaltyButton:    boolean;
  layout:               IdentityBannerLayout;
  showBadges:           boolean;
  showFollowerCount:    boolean;
  showProductCount:     boolean;
  showRating:           boolean;
  descriptionMaxLines:  number | null;
}

/** Highlight rows above "All products": seller-picked Featured (max 8, ordered) + two automatic rows. */
export interface StorefrontHighlights {
  featuredProductIds: string[];
  showNewArrivals:    boolean;
  showBestSellers:    boolean;
}

export interface StoreThemeData {
  _id:            string;
  storeId:        string;
  // Live/published — read by the public storefront exactly as before the
  // draft/publish split existed.
  theme:          StorefrontColors;
  header:         StorefrontHeader;
  footer:         StorefrontFooter;
  identityBanner: IdentityBanner;
  // Which curated `themes.ts` definition the `theme`/`header`/`footer`
  // fields were last bulk-applied from — null if never applied one.
  baseThemeId:    string | null;
  // The seller's working copy — what every `apiUpdateStoreXxx` call below
  // now writes to. Mirrors the live shape exactly; only `apiPublishStoreTheme`
  // ever copies this over the live fields above.
  draft: {
    theme:          StorefrontColors;
    header:         StorefrontHeader;
    footer:         StorefrontFooter;
    identityBanner: IdentityBanner;
    baseThemeId:    string | null;
  };
  lastPublishedAt: string | null;
}

/** The seller's working copy — what Store Builder's Theme/Header/Footer tabs
 *  read/edit and what Live Preview renders. Same shape as the public payload
 *  plus `lastPublishedAt`, so "unpublished changes" can be diffed against
 *  `apiGetStoreTheme`'s live root fields without a second round trip. */
export interface StoreThemeDraftData {
  theme:          StorefrontColors;
  header:         StorefrontHeader;
  footer:         StorefrontFooter;
  identityBanner: IdentityBanner;
  baseThemeId:    string | null;
  /** Highlights draft, and what buyers see right now. */
  storefront:          StorefrontHighlights;
  publishedStorefront: StorefrontHighlights;
  /** Customize-store draft (name, headline, about, logo, banner photo, teacher profile) and what buyers see now. */
  storePage:          StorePageFields;
  publishedStorePage: StorePageFields;
  /** When the draft was last saved; null = no saved draft (the page starts from the live values). */
  storePageSavedAt:   string | null;
  lastPublishedAt: string | null;
}

export interface StorePageFields {
  name:            string;
  tagline:         string | null;
  description:     string | null;
  logo:            string | null;
  coverImage:      string | null;
  aboutBio:        string | null;
  educatorProfile: EducatorProfile | null;
}

export function apiUpdateStorePageDraft(storeId: string, payload: Partial<StorePageFields>) {
  return client.patch<never, ApiResponse<{ storePage: StorePageFields; publishedStorePage: StorePageFields; storePageSavedAt: string }>>(
    ENDPOINTS.STORE_THEME.UPDATE_STORE_PAGE(storeId), payload);
}

export function apiUpdateStorefrontHighlights(storeId: string, payload: Partial<StorefrontHighlights>) {
  return client.patch<never, ApiResponse<{ storefront: StorefrontHighlights }>>(ENDPOINTS.STORE_THEME.UPDATE_STOREFRONT(storeId), payload);
}

export function apiGetStoreTheme(storeId: string) {
  return client.get<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.GET(storeId));
}

export function apiGetStoreThemeDraft(storeId: string) {
  return client.get<never, ApiResponse<StoreThemeDraftData>>(ENDPOINTS.STORE_THEME.DRAFT(storeId));
}

export function apiPublishStoreTheme(storeId: string) {
  return client.post<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.PUBLISH(storeId));
}

export function apiRevertStoreThemeDraft(storeId: string) {
  return client.post<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.REVERT_DRAFT(storeId));
}

export function apiGetPublicStoreTheme(storeId: string) {
  return client.get<never, ApiResponse<StoreThemeData | null>>(ENDPOINTS.STORE_THEME.PUBLIC(storeId));
}

export function apiUpdateStoreThemeColors(storeId: string, payload: Partial<StorefrontColors> & { baseThemeId?: string | null }) {
  return client.patch<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.UPDATE_THEME(storeId), payload);
}

export function apiUpdateStoreHeader(storeId: string, payload: Partial<Omit<StorefrontHeader, 'blocks'>> & { blocks?: Block[] }) {
  return client.patch<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.UPDATE_HEADER(storeId), payload);
}

export function apiUpdateStoreFooter(storeId: string, blocks: Block[], footerStyle?: ThemeFooterStyle) {
  return client.patch<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.UPDATE_FOOTER(storeId), { blocks, footerStyle });
}

export function apiUpdateIdentityBanner(storeId: string, payload: Partial<IdentityBanner>) {
  return client.patch<never, ApiResponse<StoreThemeData>>(ENDPOINTS.STORE_THEME.UPDATE_IDENTITY_BANNER(storeId), payload);
}
