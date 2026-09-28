import { Image, Type, Star, LayoutGrid, Columns, Quote, HelpCircle, Video, Grid3x3, ShieldCheck, Mail, type LucideIcon } from 'lucide-react';
import type { SectionType } from '@/api/services/storefrontTypes';

export interface SectionMeta {
  type:               SectionType;
  label:              string;
  description:        string;
  Icon:               LucideIcon;
  color:              string; // icon chip background/foreground accent, one per type for quick visual recognition
  defaultSettings:    Record<string, any>;
  allowedBlockTypes:  string[];
  blockLabel:         string;
  defaultBlockSettings: Record<string, any>;
}

export const SECTION_META: SectionMeta[] = [
  {
    type: 'hero', label: 'Hero / Slider', description: 'Full-width image slides with a headline and call-to-action button.',
    Icon: Image, color: '#174771',
    defaultSettings: { heightPreset: 'medium' },
    allowedBlockTypes: ['hero_slide'], blockLabel: 'Slide',
    defaultBlockSettings: { imageUrl: '', heading: '', subheading: '', ctaText: '', ctaLink: { linkType: 'home' } },
  },
  {
    type: 'rich_text', label: 'Rich Text', description: 'Paragraphs, headings, images, quotes and lists.',
    Icon: Type, color: '#6366F1',
    defaultSettings: { heading: '', alignment: 'left' },
    allowedBlockTypes: ['heading', 'paragraph', 'image', 'quote', 'list', 'divider'], blockLabel: 'Block',
    defaultBlockSettings: { text: '' },
  },
  {
    type: 'featured_products', label: 'Featured Products', description: 'A curated strip of products — pinned, best sellers, trending, new arrivals, a category, or hand-picked.',
    Icon: Star, color: '#F59E0B',
    defaultSettings: { heading: 'Featured', source: 'pinned', limit: 8 },
    allowedBlockTypes: [], blockLabel: '',
    defaultBlockSettings: {},
  },
  {
    type: 'product_catalog', label: 'Product Catalog', description: 'The full, paginated browse grid with tag filters and sorting.',
    Icon: LayoutGrid, color: '#0EA5E9',
    defaultSettings: { heading: 'Our Products', defaultSort: 'newest', columns: 3, showFilters: true },
    allowedBlockTypes: [], blockLabel: '',
    defaultBlockSettings: {},
  },
  {
    type: 'image_with_text', label: 'Image with Text', description: 'An image next to a heading, body copy and an optional button.',
    Icon: Columns, color: '#14B8A6',
    defaultSettings: {},
    allowedBlockTypes: ['image_text_pair'], blockLabel: 'Pair',
    defaultBlockSettings: { imageUrl: '', heading: '', body: '', ctaText: '', imagePosition: 'left' },
  },
  {
    type: 'testimonials', label: 'Testimonials', description: 'Customer quotes with a name, role, and star rating.',
    Icon: Quote, color: '#A855F7',
    defaultSettings: { heading: 'What buyers say' },
    allowedBlockTypes: ['testimonial'], blockLabel: 'Testimonial',
    defaultBlockSettings: { quote: '', authorName: '', rating: 5 },
  },
  {
    type: 'faq', label: 'FAQ', description: 'A list of collapsible question/answer pairs.',
    Icon: HelpCircle, color: '#EC4899',
    defaultSettings: { heading: 'Frequently Asked Questions' },
    allowedBlockTypes: ['faq_item'], blockLabel: 'Question',
    defaultBlockSettings: { question: '', answer: '' },
  },
  {
    type: 'video', label: 'Video', description: 'A YouTube or Vimeo embed.',
    Icon: Video, color: '#EF4444',
    defaultSettings: { heading: '', videoUrl: '', aspectRatio: '16:9' },
    allowedBlockTypes: [], blockLabel: '',
    defaultBlockSettings: {},
  },
  {
    type: 'featured_category_grid', label: 'Category Grid', description: 'Tiles linking to your subcategories — a "shop by category" grid.',
    Icon: Grid3x3, color: '#0891B2',
    defaultSettings: { heading: 'Shop by Category', categoryIds: [] },
    allowedBlockTypes: [], blockLabel: '',
    defaultBlockSettings: {},
  },
  {
    type: 'trust_badges', label: 'Trust Badges', description: 'A row of reassurance badges — shipping, returns, secure payment, support.',
    Icon: ShieldCheck, color: '#059669',
    defaultSettings: {},
    allowedBlockTypes: ['trust_badge_item'], blockLabel: 'Badge',
    defaultBlockSettings: { icon: 'truck', text: '' },
  },
  {
    type: 'newsletter', label: 'Newsletter', description: 'An email signup — subscribes to your store\'s newsletter.',
    Icon: Mail, color: '#7C3AED',
    defaultSettings: { heading: 'Stay in the loop', subtext: '' },
    allowedBlockTypes: [], blockLabel: '',
    defaultBlockSettings: {},
  },
];

export const SECTION_META_BY_TYPE: Record<SectionType, SectionMeta> = Object.fromEntries(SECTION_META.map(m => [m.type, m])) as Record<SectionType, SectionMeta>;
