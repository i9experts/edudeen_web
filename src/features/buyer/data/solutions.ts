import type { StockPhotoKey } from '@/assets/stockPhotos';

export interface Solution {
  slug: string;
  name: string;
  headline: string;
  subtext: string;
  image: StockPhotoKey;
  highlights: string[];
}

// Positioning copy about how Edudeen's real, existing capabilities apply to
// each education audience — not fabricated data or invented customer claims.
export const SOLUTIONS: Solution[] = [
  {
    slug: 'teachers-tutors',
    name: 'Teachers & Tutors',
    headline: 'Share what you teach, and get paid for it.',
    subtext: 'Sell worksheets, lesson plans, recorded lessons and tutoring packages from your own branded store — with digital delivery handled for you.',
    image: 'studentWriting',
    highlights: ['Instant digital delivery for worksheets and notes', 'Your own branded teaching store', 'Orders, students and payouts in one dashboard'],
  },
  {
    slug: 'islamic-scholars',
    name: 'Quran & Islamic Studies',
    headline: 'Bring Quran and Islamic learning to more students.',
    subtext: 'For Quran teachers, scholars and madrasas — publish courses, study guides and printed Islamic books from one store, and reach students beyond your own community.',
    image: 'quran',
    highlights: ['Sell Quran courses and study material digitally', 'Stock tracking for printed Mushafs and books', 'One storefront for your madrasa or circle'],
  },
  {
    slug: 'schools-academies',
    name: 'Schools & Academies',
    headline: 'One place for your academy\'s courses and materials.',
    subtext: 'List course bundles, textbooks and school supplies together, keep an eye on orders from families, and see what your students actually buy.',
    image: 'classroom',
    highlights: ['Course bundles alongside physical materials', 'One order list for every family and student', 'Analytics on your best-selling courses'],
  },
  {
    slug: 'publishers-bookshops',
    name: 'Publishers & Bookshops',
    headline: 'Put your whole catalogue online, edition by edition.',
    subtext: 'Track stock for every title, edition and format, fulfil orders for printed books, and sell eBook versions from the same listing.',
    image: 'bookshop',
    highlights: ['Per-edition and per-format stock tracking', 'Low-stock alerts before a title sells out', 'Printed and digital formats on one product'],
  },
  {
    slug: 'creators',
    name: 'Educational Creators',
    headline: 'Sell digital learning resources without the busywork.',
    subtext: 'Digital delivery, no inventory counts to manage, and AI Studio for the product descriptions you don\'t have time to write.',
    image: 'onlineStudy',
    highlights: ['Digital delivery for eBooks, printables and courses', 'AI-assisted product descriptions', 'Your own branded storefront'],
  },
];

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find(s => s.slug === slug);
}
