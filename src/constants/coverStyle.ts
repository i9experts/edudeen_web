// How a product card is drawn on the marketplace. 'book' = book-cover shape, 'flat' = plain photo (toys, stationery...).
export type CoverStyle = 'book' | 'flat';

export const COVER_STYLES: { value: CoverStyle; label: string; hint: string }[] = [
  { value: 'book', label: 'Book / printed material', hint: 'Books, workbooks, worksheets, notes, Quran, PDFs - shown as a book cover.' },
  { value: 'flat', label: 'Toy / item / other', hint: 'Toys, stationery, kits, bags, art supplies - shown as a plain photo.' },
];

const BOOK_WORDS = /\b(book|books|quran|qaida|tajweed|worksheet|worksheets|workbook|notes|novel|story|stories|guide|textbook|past papers?|paper|ebook|pdf|reading|handwriting|dictionary|course)\b/i;
const FLAT_WORDS = /\b(toy|toys|game|games|puzzle|puzzles|stationery|pen|pens|pencil|pencils|bag|bags|kit|kits|craft|art supplies|colou?rs?|crayons?|blocks?|lego|model|globe|abacus|flash ?cards?|poster|charts?)\b/i;

/** Best guess from the category names the seller picked; null when unsure. */
export function suggestCoverStyle(names: (string | null | undefined)[]): CoverStyle | null {
  const text = names.filter(Boolean).join(' ');
  if (!text) return null;
  if (FLAT_WORDS.test(text)) return 'flat';
  if (BOOK_WORDS.test(text)) return 'book';
  return null;
}
