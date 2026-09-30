// Curated, verified-reachable Unsplash photo ids for the education imagery
// used across the redesigned public marketing pages — approved as a
// deliberate exception to this app's normal "local asset or nothing"
// convention (see Homepage/ForSellersPage decision log). Every id below was
// checked with a live HTTP request (and visually reviewed) before being added
// here; if Unsplash ever retires one of these ids, `unsplashUrl` still
// degrades to a normal broken-image case (browser alt text), not a build
// failure.
const PHOTO_IDS = {
  libraryHall:      '1481627834876-b7833e8f5570',
  bookStack:        '1512820790803-83ca734da794',
  schoolDesk:       '1503676260728-1c00da094a0b',
  bookSpines:       '1497633762265-9d179a990aa6',
  libraryShelves:   '1524995997946-a1c2e315a42f',
  openBooks:        '1456513080510-7bf3a84b82f8',
  classroom:        '1509062522246-3755977927d7',
  quran:            '1609599006353-e629aaabfeae',
  studyGroup:       '1522202176988-66273c2fd55f',
  studentWriting:   '1434030216411-0b793f4b4173',
  bookshelfRow:     '1495446815901-a7297e633e8d',
  libraryAisle:     '1427504494785-3a9ca7044f45',
  emptyClassroom:   '1580582932707-520aed937b7b',
  examPaper:        '1606326608606-aa0b62935f2b',
  onlineStudy:      '1501504905252-473c47e087f8',
  stationery:       '1456735190827-d1262f71b8a3',
  notebookPen:      '1471107340929-a87cd0f5b5f3',
  bookshop:         '1550399105-c4db5fb85c18',
  workspaceLaptop:  '1472099645785-5658abf4ff4e',
} as const;

export type StockPhotoKey = keyof typeof PHOTO_IDS;

export function unsplashUrl(key: StockPhotoKey, width = 480, quality = 75): string {
  return `https://images.unsplash.com/photo-${PHOTO_IDS[key]}?w=${width}&q=${quality}&auto=format&fit=crop`;
}
