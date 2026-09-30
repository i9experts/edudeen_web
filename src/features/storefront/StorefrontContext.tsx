import { createContext, useContext, type ReactNode } from 'react';
import type { PublicStoreData } from '@/api/services/store';
import { getMainAppUrl } from '@/utils/storefrontUrl';
import type {
  StoreThemeData, ThemeBorderRadius, ThemeButtonStyle, ThemeButtonWidth, ThemeScale, ThemeCardStyle, ThemeButtonSize,
  ThemeHeroStyle, ThemeHeroAlignment, ThemeProductImageRatio, ThemeProductImageHover, ThemeProductGridDensity,
  ThemeTestimonialStyle, ThemeFaqStyle, ThemeHeaderStyle, ThemeFooterStyle,
} from '@/api/services/storeTheme';

export interface StorefrontCfg {
  primaryColor: string;
  bgColor:      string;
  textColor:    string;
  accentColor:  string;
  font:         string;
  buttonStyle:  ThemeButtonStyle;
  buttonSize:   ThemeButtonSize;
  /** `theme.buttonRadius` resolved to a real CSS value — `ThemedButton` only. */
  buttonRadiusPx: string;
  /** `theme.buttonWidth` — `ThemedButton` only (never applied to forced-size
   *  inline nav/footer "highlight" links, only real section CTAs). */
  buttonWidth:    ThemeButtonWidth;
  /** `theme.imageRadius` resolved to a real CSS value — standalone content
   *  images only (`ImageWithTextSection`), never buttons/cards. */
  imageRadiusPx:  string;

  // Each section keeps its own base container-width/vertical-spacing/heading
  // font-size literal (they're genuinely different values across sections —
  // Faq is narrower than Video is narrower than Testimonials, by design) —
  // these are the shared multipliers a section applies to ITS OWN base value,
  // so `typeScale`/`containerWidth`/`sectionSpacing` move every section
  // together while preserving their existing relative proportions. All three
  // resolve to exactly 1 at the default setting, so a pre-existing store
  // (or any section not yet touched by this pass) renders pixel-identical.
  typeScaleFactor:      number;
  containerWidthScale:  number;
  sectionSpacingScale:  number;

  /** Product Cards scope — `ProductCardShell` only. Independent from
   *  testimonial cards even though both use the same 3 style names. */
  productCardStyle:     ThemeCardStyle;
  productCardRadiusPx:  string;
  /** Testimonials scope — the `cards` variant only. Independent from
   *  product cards. */
  testimonialCardStyle:    ThemeCardStyle;
  testimonialCardRadiusPx: string;

  heroStyle:          ThemeHeroStyle;
  heroAlignment:      ThemeHeroAlignment;
  productImageRatio:  ThemeProductImageRatio;
  productImageHover:  ThemeProductImageHover;
  productGridDensity: ThemeProductGridDensity;
  testimonialStyle:   ThemeTestimonialStyle;
  faqStyle:           ThemeFaqStyle;
  headerStyle:        ThemeHeaderStyle;
  footerStyle:        ThemeFooterStyle;
  /** Derived from `bgColor`'s luminance — lets the few chrome pieces that
   *  aren't already colored via `cfg` (the navbar's background/text, which
   *  are otherwise hardcoded light) flip to a dark treatment for a
   *  deliberately dark theme (e.g. "Luxury Noir") without needing a new
   *  stored field. A light theme's `bgColor` (every pre-existing store)
   *  always resolves this to `false`, so nothing changes for them. */
  isDarkTheme:        boolean;
}

export const RADIUS_PX_MAP: Record<ThemeBorderRadius, string> = {
  none:   '0px',
  small:  '6px',
  medium: '12px',
  large:  '20px',
  full:   '9999px',
};

// Edudeen logo gold (the minaret) and the default-theme cover gradient built
// from all three logo colors — navy (keeps the white store name legible on
// the left) → green → gold.
export const EDUDEEN_GOLD = '#CCB000';
export const EDUDEEN_DEFAULT_COVER_GRADIENT =
  'linear-gradient(120deg, #174771 0%, #2E6B5C 38%, #66AD36 64%, #E2C21A 86%, #F4DC4C 100%)';
export const EDUDEEN_GOLD_GRADIENT = 'linear-gradient(90deg, #F4DC4C 0%, #E2C21A 50%, #CCB000 100%)';

// The colors the backend stamps on every new store's theme (store-theme.schema
// defaults — the old orange palette). A store still on exactly these never
// picked its own colors, so it gets Edudeen's default look instead.
const BACKEND_UNTOUCHED_COLORS = { primaryColor: '#D97757', bgColor: '#FAF9F5', accentColor: '#B95A3A' };

/** True when the seller hasn't chosen theme colors — the store then uses Edudeen's default look. */
export function isEdudeenDefaultTheme(theme: StoreThemeData | null): boolean {
  const t = theme?.theme;
  if (!t?.primaryColor && !t?.bgColor) return true;
  const same = (a?: string, b?: string) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();
  return same(t?.primaryColor, BACKEND_UNTOUCHED_COLORS.primaryColor)
    && same(t?.bgColor, BACKEND_UNTOUCHED_COLORS.bgColor)
    && same(t?.accentColor, BACKEND_UNTOUCHED_COLORS.accentColor);
}

// A store with no saved theme renders in Edudeen's own look — the logo
// navy + green on white, same typeface as the main site.
export const STOREFRONT_CFG_DEFAULT: StorefrontCfg = {
  primaryColor: '#174771',
  bgColor:      '#FFFFFF',
  textColor:    '#152D43',
  accentColor:  '#66AD36',
  font:         'Arial',
  buttonStyle:    'solid',
  buttonSize:     'md',
  buttonRadiusPx: RADIUS_PX_MAP.medium,
  buttonWidth:    'auto',
  imageRadiusPx:  RADIUS_PX_MAP.medium,
  typeScaleFactor:     1,
  containerWidthScale: 1,
  sectionSpacingScale: 1,
  productCardStyle:        'outlined',
  productCardRadiusPx:     RADIUS_PX_MAP.medium,
  testimonialCardStyle:    'outlined',
  testimonialCardRadiusPx: RADIUS_PX_MAP.medium,
  heroStyle:          'overlay',
  heroAlignment:      'left',
  productImageRatio:  'square',
  productImageHover:  'none',
  productGridDensity: 'cozy',
  testimonialStyle:   'cards',
  faqStyle:           'accordion',
  headerStyle:        'standard',
  footerStyle:        'columns',
  isDarkTheme:        false,
};

/** Simple relative-luminance check — good enough to distinguish "a light
 *  cream/white storefront" (every existing default) from "a deliberately
 *  dark one," not a color-accessibility engine. */
function isDarkHex(hex: string): boolean {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) < 100;
}

// 'comfortable'/'standard' always map to 1 — the neutral, exactly-today's-look
// setting — so a field simply missing on an old store (defaulted upstream to
// 'comfortable'/'standard' anyway) can never visually drift.
const SCALE_FACTOR_MAP: Record<ThemeScale, number> = { compact: 0.9, comfortable: 1, spacious: 1.15 };
const CONTAINER_SCALE_MAP: Record<'narrow' | 'standard' | 'wide', number> = { narrow: 0.85, standard: 1, wide: 1.15 };
const SPACING_SCALE_MAP: Record<ThemeScale, number> = { compact: 0.65, comfortable: 1, spacious: 1.4 };

/** Single source of truth for turning a saved `StoreTheme` doc into the
 *  resolved `StorefrontCfg` the storefront actually renders with — used by
 *  both the real storefront (`StorefrontLayout`) and the seller's live
 *  builder preview (`BuilderPreview`), so the two can never drift apart. */
export function resolveStorefrontCfg(theme: StoreThemeData | null): StorefrontCfg {
  const t = theme?.theme;
  // Colors/font the seller never changed → Edudeen's palette; layout choices still apply.
  const edudeen = isEdudeenDefaultTheme(theme);
  return {
    primaryColor: edudeen ? STOREFRONT_CFG_DEFAULT.primaryColor : (t?.primaryColor ?? STOREFRONT_CFG_DEFAULT.primaryColor),
    bgColor:      edudeen ? STOREFRONT_CFG_DEFAULT.bgColor      : (t?.bgColor      ?? STOREFRONT_CFG_DEFAULT.bgColor),
    textColor:    edudeen ? STOREFRONT_CFG_DEFAULT.textColor    : (t?.textColor    ?? STOREFRONT_CFG_DEFAULT.textColor),
    accentColor:  edudeen ? STOREFRONT_CFG_DEFAULT.accentColor  : (t?.accentColor  ?? STOREFRONT_CFG_DEFAULT.accentColor),
    font:         edudeen ? STOREFRONT_CFG_DEFAULT.font         : (t?.font         ?? STOREFRONT_CFG_DEFAULT.font),
    buttonStyle:    t?.buttonStyle  ?? STOREFRONT_CFG_DEFAULT.buttonStyle,
    buttonSize:     t?.buttonSize   ?? STOREFRONT_CFG_DEFAULT.buttonSize,
    buttonRadiusPx: RADIUS_PX_MAP[t?.buttonRadius ?? 'medium'],
    buttonWidth:    t?.buttonWidth  ?? STOREFRONT_CFG_DEFAULT.buttonWidth,
    imageRadiusPx:  RADIUS_PX_MAP[t?.imageRadius ?? 'medium'],
    typeScaleFactor:     SCALE_FACTOR_MAP[t?.typeScale ?? 'comfortable'],
    containerWidthScale: CONTAINER_SCALE_MAP[t?.containerWidth ?? 'standard'],
    sectionSpacingScale: SPACING_SCALE_MAP[t?.sectionSpacing ?? 'comfortable'],
    productCardStyle:        t?.productCardStyle        ?? STOREFRONT_CFG_DEFAULT.productCardStyle,
    productCardRadiusPx:     RADIUS_PX_MAP[t?.productCardRadius ?? 'medium'],
    testimonialCardStyle:    t?.testimonialCardStyle    ?? STOREFRONT_CFG_DEFAULT.testimonialCardStyle,
    testimonialCardRadiusPx: RADIUS_PX_MAP[t?.testimonialCardRadius ?? 'medium'],
    heroStyle:          t?.heroStyle          ?? STOREFRONT_CFG_DEFAULT.heroStyle,
    heroAlignment:      t?.heroAlignment      ?? STOREFRONT_CFG_DEFAULT.heroAlignment,
    productImageRatio:  t?.productImageRatio  ?? STOREFRONT_CFG_DEFAULT.productImageRatio,
    productImageHover:  t?.productImageHover  ?? STOREFRONT_CFG_DEFAULT.productImageHover,
    productGridDensity: t?.productGridDensity ?? STOREFRONT_CFG_DEFAULT.productGridDensity,
    testimonialStyle:   t?.testimonialStyle   ?? STOREFRONT_CFG_DEFAULT.testimonialStyle,
    faqStyle:           t?.faqStyle           ?? STOREFRONT_CFG_DEFAULT.faqStyle,
    headerStyle:        theme?.header?.headerStyle ?? STOREFRONT_CFG_DEFAULT.headerStyle,
    footerStyle:        theme?.footer?.footerStyle  ?? STOREFRONT_CFG_DEFAULT.footerStyle,
    isDarkTheme:        isDarkHex(edudeen ? STOREFRONT_CFG_DEFAULT.bgColor : (t?.bgColor ?? STOREFRONT_CFG_DEFAULT.bgColor)),
  };
}

export interface StorefrontLinkSettings {
  linkType:      string;
  pageSlug?:     string;
  url?:          string;
  categoryId?:   string;
  collectionId?: string;
}

/** Resolves a nav_link/footer-link/CTA block's link settings into a real
 *  in-app path or external href — the one place `category`/`collection`
 *  (Phase 4) join the pre-existing `home`/`page`/`blog`/`external` types.
 *  `/category/:slugOrId` and `/collections/:slugOrId` (Phase 11) both accept
 *  a raw id as a fallback to a real slug, so routing by the block's stored
 *  `categoryId`/`collectionId` here is always valid even though a slug would
 *  render a prettier URL — matches the existing Marketplace legacy-id
 *  redirect precedent rather than requiring a second slug lookup here. */
export function resolveStorefrontLink(link: StorefrontLinkSettings, basePath = ''): { to?: string; href?: string } {
  if (link.linkType === 'external') return { href: link.url };
  if (link.linkType === 'blog') return { to: `${basePath}/blog` };
  if (link.linkType === 'page' && link.pageSlug) return { to: `${basePath}/${link.pageSlug}` };
  if (link.linkType === 'category' && link.categoryId) return { to: `${basePath}/category/${link.categoryId}` };
  if (link.linkType === 'collection' && link.collectionId) return { to: `${basePath}/collections/${link.collectionId}` };
  return { to: basePath || `/` }; // 'home' (and any unrecognized/incomplete fallback)
}

export interface StorefrontContextValue {
  store:  PublicStoreData;
  theme:  StoreThemeData | null;
  cfg:    StorefrontCfg;
  /** Resolves a nav_link/footer-link block's link settings into a real in-app path or external href. */
  resolveLink: (link: StorefrontLinkSettings) => { to?: string; href?: string };
  /** '' on a store's own subdomain; `/shop/<slug>` when the store is opened
   *  inside the main Edudeen app. Prefix every storefront-internal path with it. */
  basePath?: string;
  /** Goes to a main-app page (product, checkout, login, account) — a plain
   *  in-app navigation inside Edudeen, a cross-origin jump on a subdomain. */
  goToMainApp?: (path: string) => void;
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

export function StorefrontProvider({ value, children }: { value: StorefrontContextValue; children: ReactNode }) {
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontContextValue {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error('useStorefront must be used within a StorefrontProvider (StorefrontLayout)');
  return ctx;
}

/** Storefront-internal path helper + main-app jump, safe with or without a `basePath`. */
export function useStorefrontPaths() {
  const { basePath = '', goToMainApp } = useStorefront();
  const path = (p: string) => (p === '/' || p === '' ? (basePath || '/') : `${basePath}${p.startsWith('/') ? p : `/${p}`}`);
  const toMain = (p: string) => (goToMainApp ? goToMainApp(p) : (window.location.href = getMainAppUrl(p)));
  return { basePath, path, toMain };
}
