import type { StorefrontColors, ThemeHeaderStyle, ThemeFooterStyle } from '@/api/services/storeTheme';

export type ThemeCategory = 'fashion' | 'beauty' | 'food' | 'lifestyle' | 'luxury' | 'electronics' | 'general';
export type ThemeBadge    = 'new' | 'popular' | 'trending';

export interface ThemeDefinition {
  id:          string;
  name:        string;
  description: string;
  /** Used for the Filters chip row and the Recommended strip's heuristic. */
  category:    ThemeCategory;
  /** Sparingly assigned — most themes have none. */
  badge?:      ThemeBadge;
  /** Short trait chips shown in the Preview modal header, e.g.
   *  "Split Hero · Editorial Type · Minimal Cards". */
  characteristics: string[];
  /** Every one of the 24 `theme`-level fields, always complete — enforced by
   *  this type (no `Partial<>`), never just a color recolor. */
  colors:      StorefrontColors;
  headerStyle: ThemeHeaderStyle;
  footerStyle: ThemeFooterStyle;
}

// 10 curated, genuinely distinct themes — composition (hero/header/footer/
// card layout/typography/spacing), not just palette. "Warm Craft"
// intentionally matches every schema default exactly, so it's the safe
// baseline a pre-existing store (or a fresh one that's never applied a
// theme) is equivalent to.
export const THEMES: ThemeDefinition[] = [
  {
    id: 'warm-craft',
    name: 'Warm Craft',
    description: 'Artisan & handmade — warm terracotta, a full-bleed hero, and soft rounded cards.',
    category: 'lifestyle',
    characteristics: ['Full-Bleed Hero', 'Warm Terracotta', 'Rounded Cards'],
    colors: {
      primaryColor: '#174771', accentColor: '#0F3354', bgColor: '#FAF9F5', textColor: '#2C2A28', font: 'Poppins',
      buttonStyle: 'solid', buttonRadius: 'medium', buttonWidth: 'auto', buttonSize: 'md',
      imageRadius: 'medium',
      typeScale: 'comfortable', containerWidth: 'standard', sectionSpacing: 'comfortable',
      productCardStyle: 'outlined', productCardRadius: 'medium',
      testimonialCardStyle: 'outlined', testimonialCardRadius: 'medium',
      heroStyle: 'overlay', heroAlignment: 'left',
      productImageRatio: 'square', productImageHover: 'none', productGridDensity: 'cozy',
      testimonialStyle: 'cards', faqStyle: 'accordion',
    },
    headerStyle: 'standard', footerStyle: 'columns',
  },
  {
    id: 'modern-fashion',
    name: 'Modern Fashion',
    description: 'Premium fashion — dramatic split hero, editorial type, and a full-width CTA.',
    category: 'fashion',
    characteristics: ['Split Hero', 'Editorial Type', 'Full-Width CTA'],
    colors: {
      primaryColor: '#1F1B2E', accentColor: '#C9A15A', bgColor: '#FFFFFF', textColor: '#1A1720', font: 'Montserrat',
      buttonStyle: 'solid', buttonRadius: 'small', buttonWidth: 'full', buttonSize: 'lg',
      imageRadius: 'small',
      typeScale: 'comfortable', containerWidth: 'wide', sectionSpacing: 'comfortable',
      productCardStyle: 'elevated', productCardRadius: 'small',
      testimonialCardStyle: 'flat', testimonialCardRadius: 'none',
      heroStyle: 'split', heroAlignment: 'left',
      productImageRatio: 'portrait', productImageHover: 'zoom', productGridDensity: 'relaxed',
      testimonialStyle: 'cards', faqStyle: 'accordion',
    },
    headerStyle: 'centered', footerStyle: 'minimal',
  },
  {
    id: 'minimal-boutique',
    name: 'Minimal Boutique',
    description: 'Quiet luxury — restrained monochrome, sharp corners, and generous whitespace.',
    category: 'general',
    characteristics: ['Whitespace-First', 'Thin Type', 'Sharp Corners'],
    colors: {
      primaryColor: '#111111', accentColor: '#6E6E6E', bgColor: '#FFFFFF', textColor: '#111111', font: 'Inter',
      buttonStyle: 'outline', buttonRadius: 'none', buttonWidth: 'auto', buttonSize: 'sm',
      imageRadius: 'none',
      typeScale: 'compact', containerWidth: 'narrow', sectionSpacing: 'compact',
      productCardStyle: 'flat', productCardRadius: 'none',
      testimonialCardStyle: 'flat', testimonialCardRadius: 'none',
      heroStyle: 'overlay', heroAlignment: 'center',
      productImageRatio: 'square', productImageHover: 'none', productGridDensity: 'cozy',
      testimonialStyle: 'minimal', faqStyle: 'list',
    },
    headerStyle: 'standard', footerStyle: 'minimal',
  },
  {
    id: 'bold-editorial',
    name: 'Bold Editorial',
    description: 'Magazine-inspired commerce — oversized serif headlines and a bordered product grid.',
    category: 'fashion',
    characteristics: ['Oversized Type', 'Split Hero', 'Bordered Cards'],
    colors: {
      primaryColor: '#8A6D3B', accentColor: '#5F4A28', bgColor: '#FBFAF7', textColor: '#242220', font: 'Fraunces',
      buttonStyle: 'outline', buttonRadius: 'small', buttonWidth: 'auto', buttonSize: 'lg',
      imageRadius: 'large',
      typeScale: 'spacious', containerWidth: 'wide', sectionSpacing: 'spacious',
      productCardStyle: 'outlined', productCardRadius: 'small',
      testimonialCardStyle: 'elevated', testimonialCardRadius: 'large',
      heroStyle: 'split', heroAlignment: 'left',
      productImageRatio: 'portrait', productImageHover: 'none', productGridDensity: 'relaxed',
      testimonialStyle: 'cards', faqStyle: 'accordion',
    },
    headerStyle: 'standard', footerStyle: 'columns',
  },
  {
    id: 'clean-grid',
    name: 'Clean Grid',
    description: 'Contemporary ecommerce — vibrant, fully rounded, with soft-tinted buttons.',
    category: 'general',
    badge: 'popular',
    characteristics: ['Structured Grid', 'Pill Buttons', 'Rounded Imagery'],
    colors: {
      primaryColor: '#FF6B35', accentColor: '#FFB627', bgColor: '#FFFDF9', textColor: '#241C15', font: 'DM Sans',
      buttonStyle: 'soft', buttonRadius: 'full', buttonWidth: 'auto', buttonSize: 'md',
      imageRadius: 'full',
      typeScale: 'comfortable', containerWidth: 'standard', sectionSpacing: 'comfortable',
      productCardStyle: 'elevated', productCardRadius: 'full',
      testimonialCardStyle: 'flat', testimonialCardRadius: 'full',
      heroStyle: 'split', heroAlignment: 'center',
      productImageRatio: 'square', productImageHover: 'zoom', productGridDensity: 'relaxed',
      testimonialStyle: 'minimal', faqStyle: 'list',
    },
    headerStyle: 'centered', footerStyle: 'minimal',
  },
  {
    id: 'luxury-noir',
    name: 'Luxury Noir',
    description: 'Fine jewelry & premium goods — a deep dark palette with cinematic imagery.',
    category: 'luxury',
    characteristics: ['Dark Palette', 'Cinematic Hero', 'Serif Type'],
    colors: {
      primaryColor: '#C9A461', accentColor: '#8B7333', bgColor: '#0E0D0C', textColor: '#F3F1EA', font: 'Playfair Display',
      buttonStyle: 'outline', buttonRadius: 'none', buttonWidth: 'auto', buttonSize: 'md',
      imageRadius: 'none',
      typeScale: 'spacious', containerWidth: 'wide', sectionSpacing: 'spacious',
      productCardStyle: 'flat', productCardRadius: 'none',
      testimonialCardStyle: 'flat', testimonialCardRadius: 'none',
      heroStyle: 'overlay', heroAlignment: 'center',
      productImageRatio: 'portrait', productImageHover: 'zoom', productGridDensity: 'relaxed',
      testimonialStyle: 'minimal', faqStyle: 'list',
    },
    headerStyle: 'centered', footerStyle: 'minimal',
  },
  {
    id: 'fresh-market',
    name: 'Fresh Market',
    description: 'Food, organic & wellness — a natural palette with a friendly, rounded feel.',
    category: 'food',
    characteristics: ['Rounded & Friendly', 'Soft CTA', 'Category Feel'],
    colors: {
      primaryColor: '#4C7A3D', accentColor: '#D98E2D', bgColor: '#FBF8F0', textColor: '#2B2A22', font: 'Nunito',
      buttonStyle: 'solid', buttonRadius: 'full', buttonWidth: 'auto', buttonSize: 'md',
      imageRadius: 'large',
      typeScale: 'comfortable', containerWidth: 'standard', sectionSpacing: 'comfortable',
      productCardStyle: 'outlined', productCardRadius: 'large',
      testimonialCardStyle: 'outlined', testimonialCardRadius: 'large',
      heroStyle: 'overlay', heroAlignment: 'left',
      productImageRatio: 'square', productImageHover: 'none', productGridDensity: 'cozy',
      testimonialStyle: 'cards', faqStyle: 'accordion',
    },
    headerStyle: 'standard', footerStyle: 'columns',
  },
  {
    id: 'street-urban',
    name: 'Street / Urban',
    description: 'Sneakers & streetwear — bold contrast type and an energetic, edge-to-edge grid.',
    category: 'fashion',
    badge: 'new',
    characteristics: ['Bold Type', 'High Contrast', 'Energetic Grid'],
    colors: {
      primaryColor: '#E8382A', accentColor: '#1A1A1A', bgColor: '#F5F4F0', textColor: '#111111', font: 'Space Grotesk',
      buttonStyle: 'solid', buttonRadius: 'none', buttonWidth: 'full', buttonSize: 'lg',
      imageRadius: 'none',
      typeScale: 'spacious', containerWidth: 'wide', sectionSpacing: 'compact',
      productCardStyle: 'flat', productCardRadius: 'none',
      testimonialCardStyle: 'flat', testimonialCardRadius: 'none',
      heroStyle: 'overlay', heroAlignment: 'left',
      productImageRatio: 'square', productImageHover: 'zoom', productGridDensity: 'cozy',
      testimonialStyle: 'minimal', faqStyle: 'list',
    },
    headerStyle: 'standard', footerStyle: 'minimal',
  },
  {
    id: 'soft-studio',
    name: 'Soft Studio',
    description: 'Beauty & skincare — soft neutrals, spacious layout, and subtle shadow-only cards.',
    category: 'beauty',
    badge: 'trending',
    characteristics: ['Soft Neutrals', 'Spacious Layout', 'Subtle Shadows'],
    colors: {
      primaryColor: '#C98B7A', accentColor: '#E8B4A0', bgColor: '#FBF6F3', textColor: '#3A2E2A', font: 'Lora',
      buttonStyle: 'soft', buttonRadius: 'large', buttonWidth: 'auto', buttonSize: 'md',
      imageRadius: 'large',
      typeScale: 'comfortable', containerWidth: 'narrow', sectionSpacing: 'spacious',
      productCardStyle: 'elevated', productCardRadius: 'large',
      testimonialCardStyle: 'elevated', testimonialCardRadius: 'large',
      heroStyle: 'split', heroAlignment: 'center',
      productImageRatio: 'square', productImageHover: 'none', productGridDensity: 'relaxed',
      testimonialStyle: 'cards', faqStyle: 'accordion',
    },
    headerStyle: 'centered', footerStyle: 'minimal',
  },
  {
    id: 'tech-commerce',
    name: 'Tech Commerce',
    description: 'Electronics & gadgets — a crisp geometric grid with structured, specification-style cards.',
    category: 'electronics',
    characteristics: ['Crisp Grid', 'Structured Cards', 'Modern Sans'],
    colors: {
      primaryColor: '#2563EB', accentColor: '#0EA5E9', bgColor: '#F7F9FC', textColor: '#10151C', font: 'Roboto',
      buttonStyle: 'solid', buttonRadius: 'small', buttonWidth: 'auto', buttonSize: 'md',
      imageRadius: 'small',
      typeScale: 'compact', containerWidth: 'standard', sectionSpacing: 'compact',
      productCardStyle: 'outlined', productCardRadius: 'small',
      testimonialCardStyle: 'outlined', testimonialCardRadius: 'small',
      heroStyle: 'split', heroAlignment: 'left',
      productImageRatio: 'square', productImageHover: 'none', productGridDensity: 'cozy',
      testimonialStyle: 'cards', faqStyle: 'accordion',
    },
    headerStyle: 'standard', footerStyle: 'columns',
  },
];

export const THEME_CATEGORIES: { value: ThemeCategory | 'all'; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'fashion',     label: 'Fashion' },
  { value: 'beauty',      label: 'Beauty' },
  { value: 'food',        label: 'Food' },
  { value: 'lifestyle',   label: 'Lifestyle' },
  { value: 'luxury',      label: 'Luxury' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'general',     label: 'General' },
];
