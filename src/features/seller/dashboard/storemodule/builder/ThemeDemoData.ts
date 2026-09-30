/** Static, local demo content for the Theme Gallery — deliberately NOT
 *  fetched from any backend API (see `ThemeStorefrontPreview.tsx`: the
 *  gallery renders up to 10+ cards at once, and each would otherwise need
 *  its own real product/store query). Every theme gets its own realistic
 *  storefront personality — a store name, a hero moment, and 3 named,
 *  priced products with a real photograph — instead of generic placeholder
 *  text/rectangles.
 *
 *  Images are served from Lorem Picsum's stable id-based CDN
 *  (`picsum.photos/id/<n>/...`), a long-running, always-available stock
 *  photo service — chosen because no product-photo search/generation tool
 *  is available in this environment. Each theme gets its own reserved block
 *  of 4 ids (hero + 3 products) so nothing repeats within one card; the
 *  photos are real photography, not flat placeholders, even though their
 *  literal subject isn't guaranteed to match the product name next to it. */

export interface DemoProduct {
  name:  string;
  price: number;
  image: string;
  badge?: string;
}

export interface ThemeDemoContent {
  storeName:      string;
  heroHeadline:   string;
  heroSubheading: string;
  heroCta:        string;
  heroImage:      string;
  products:       [DemoProduct, DemoProduct, DemoProduct];
  testimonial: {
    quote:      string;
    authorName: string;
    authorRole: string;
    rating:     number;
  };
}

function img(id: number, w = 900, h = 900) {
  return `https://picsum.photos/id/${id}/${w}/${h}`;
}

// Keyed by theme `id` — ids are persisted per store, never rename them (see
// themes.ts). Content is education-only: books, Quran/Islamic learning,
// courses, kids' learning, worksheets and school supplies.
export const THEME_DEMO_CONTENT: Record<string, ThemeDemoContent> = {
  'warm-craft': {
    storeName: 'Little Learners Co.',
    heroHeadline: 'Learning, made by hand.',
    heroSubheading: 'Montessori-inspired teaching aids and learning kits for curious minds.',
    heroCta: 'Shop Learning Kits',
    heroImage: img(10, 1600, 900),
    products: [
      { name: 'Alphabet Tracing Board', price: 24, image: img(20) },
      { name: 'Wooden Counting Beads Set', price: 18, image: img(30) },
      { name: 'Phonics Flashcard Box', price: 15, image: img(40) },
    ],
    testimonial: { quote: 'My daughter learned her letters in weeks — beautifully made.', authorName: 'Priya N.', authorRole: 'Verified Parent', rating: 5 },
  },
  'modern-fashion': {
    storeName: 'SCHOLAR ACADEMY',
    heroHeadline: 'Master a new skill this term.',
    heroSubheading: 'Structured online courses taught by experienced teachers.',
    heroCta: 'Browse Courses',
    heroImage: img(50, 1600, 900),
    products: [
      { name: 'O-Level Mathematics Course', price: 49, image: img(60) },
      { name: 'IELTS Preparation Bootcamp', price: 59, image: img(70) },
      { name: 'Intro to Python for Students', price: 39, image: img(80) },
    ],
    testimonial: { quote: 'Clear lessons and great practice papers. I passed with an A.', authorName: 'Amara K.', authorRole: 'Verified Student', rating: 5 },
  },
  'minimal-boutique': {
    storeName: 'STUDY HALL',
    heroHeadline: 'Less clutter, better study.',
    heroSubheading: 'A tightly-edited range of study guides and planners.',
    heroCta: 'Explore',
    heroImage: img(90, 1600, 900),
    products: [
      { name: 'Academic Year Planner', price: 14, image: img(100) },
      { name: 'Cornell Notes Notebook', price: 8, image: img(110) },
      { name: 'Exam Revision Guide', price: 12, image: img(120) },
    ],
    testimonial: { quote: 'Simple, focused and exactly what I needed for finals.', authorName: 'Elena R.', authorRole: 'Verified Buyer', rating: 5 },
  },
  'bold-editorial': {
    storeName: 'THE PAGE HOUSE',
    heroHeadline: 'New titles, this season.',
    heroSubheading: 'An independent publisher of textbooks, readers and non-fiction.',
    heroCta: 'Shop Books',
    heroImage: img(130, 1600, 900),
    products: [
      { name: 'Illustrated World History', price: 28, image: img(140) },
      { name: 'Grade 5 English Reader', price: 11, image: img(150) },
      { name: 'Science Encyclopedia for Kids', price: 32, image: img(160) },
    ],
    testimonial: { quote: 'Beautifully printed books my students actually want to read.', authorName: 'Jonas W.', authorRole: 'Verified Teacher', rating: 5 },
  },
  'clean-grid': {
    storeName: 'Classroom & Co',
    heroHeadline: 'New learning resources, every week.',
    heroSubheading: 'Worksheets, books and supplies for every grade.',
    heroCta: 'Shop New In',
    heroImage: img(170, 1600, 900),
    products: [
      { name: 'Grade 3 Math Worksheet Pack', price: 6, image: img(180) },
      { name: 'Illustrated Children\'s Dictionary', price: 19, image: img(190) },
      { name: 'School Backpack', price: 26, image: img(200) },
    ],
    testimonial: { quote: 'Easy to browse, easy to buy. My go-to for school resources.', authorName: 'Sam T.', authorRole: 'Verified Parent', rating: 4 },
  },
  'luxury-noir': {
    storeName: 'NOOR ACADEMY',
    heroHeadline: 'Learn the Quran, beautifully.',
    heroSubheading: 'Premium Mushafs, tajweed courses and Islamic learning sets.',
    heroCta: 'Explore the Collection',
    heroImage: img(210, 1600, 900),
    products: [
      { name: 'Colour-Coded Tajweed Quran', price: 35, image: img(220) },
      { name: 'Online Tajweed Course', price: 45, image: img(230) },
      { name: 'Seerah Book Set (4 Vols)', price: 60, image: img(240) },
    ],
    testimonial: { quote: 'The tajweed Quran is stunning and the course is so well paced.', authorName: 'Fatima D.', authorRole: 'Verified Student', rating: 5 },
  },
  'fresh-market': {
    storeName: 'Bright Sprouts',
    heroHeadline: 'Early learning, full of joy.',
    heroSubheading: 'Activity books, puzzles and printables for ages 3 to 8.',
    heroCta: 'Shop for Kids',
    heroImage: img(250, 1600, 900),
    products: [
      { name: 'My First Numbers Activity Book', price: 9, image: img(260) },
      { name: 'Arabic Alphabet Puzzle', price: 16, image: img(270) },
      { name: 'Preschool Printables Bundle', price: 7, image: img(280) },
    ],
    testimonial: { quote: 'My kids ask for "learning time" every day now.', authorName: 'Noah B.', authorRole: 'Verified Parent', rating: 5 },
  },
  'street-urban': {
    storeName: 'CAMPUS SUPPLY CO.',
    heroHeadline: 'Back to school, sorted.',
    heroSubheading: 'Stationery and supplies for students of every level.',
    heroCta: 'Shop Supplies',
    heroImage: img(290, 1600, 900),
    products: [
      { name: 'Scientific Calculator', price: 22, image: img(300), badge: 'NEW' },
      { name: 'Geometry Box Set', price: 9, image: img(310) },
      { name: 'A4 Ruled Notebooks (5-Pack)', price: 12, image: img(320) },
    ],
    testimonial: { quote: 'Everything on the school list in one order — delivered fast.', authorName: 'Malik J.', authorRole: 'Verified Parent', rating: 5 },
  },
  'soft-studio': {
    storeName: 'Sakinah Studies',
    heroHeadline: 'Faith, learned gently.',
    heroSubheading: 'Islamic studies workbooks, dua cards and printable journals.',
    heroCta: 'Shop Islamic Studies',
    heroImage: img(330, 1600, 900),
    products: [
      { name: 'Daily Duas Flashcards', price: 12, image: img(340) },
      { name: 'Ramadan Reflection Journal', price: 10, image: img(350) },
      { name: 'Islamic Studies Workbook Gr. 2', price: 14, image: img(360) },
    ],
    testimonial: { quote: 'Our family uses the dua cards every night — lovely quality.', authorName: 'Hana S.', authorRole: 'Verified Buyer', rating: 5 },
  },
  'tech-commerce': {
    storeName: 'CODE CAMPUS',
    heroHeadline: 'Learn digital skills, online.',
    heroSubheading: 'Self-paced courses and downloadable resources for modern learners.',
    heroCta: 'Browse Courses',
    heroImage: img(370, 1600, 900),
    products: [
      { name: 'Web Development Fundamentals', price: 49, image: img(380) },
      { name: 'Digital Literacy for Teachers', price: 29, image: img(390) },
      { name: 'Computer Science eBook Bundle', price: 19, image: img(400) },
    ],
    testimonial: { quote: 'Clear, practical lessons — I built my first website in a week.', authorName: 'Derek L.', authorRole: 'Verified Student', rating: 4 },
  },
};
