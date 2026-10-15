import type { PrivateUploadData } from '@/api/upload';
import { classIndex, levelForClass } from '@/constants/classLevels';

/** Pure helpers + types for the seller bulk upload (kept UI-free so they are easy to test). */

export const MAX_BULK_FILES = 50;
export const MAX_BULK_PHOTOS = 100;
export const MAX_DOC_BYTES = 500 * 1024 * 1024; // same cap as the digital product upload endpoint
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // same cap as the product photo uploader
export const MAX_ROW_PHOTOS = 20;

// Mirror of the API's private upload allow-list (edudeen_api upload.service.ts) minus video/audio, which make no sense as a product file here.
export const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'epub', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'key', 'pages', 'numbers'];
// Same types the product photo uploader accepts.
export const PHOTO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export type BulkType = 'digital' | 'educational';
export type UploadState = 'queued' | 'uploading' | 'done' | 'failed';
export type CreateState = 'idle' | 'creating' | 'created' | 'failed';

export interface BulkRow {
  id: string;
  fileName: string;
  fileSize: number;
  upload: PrivateUploadData | null;
  uploadState: UploadState;
  uploadPct: number;
  uploadError: string;
  title: string;
  description: string;
  price: string;
  compareAt: string;
  categoryId: string;
  subCategoryId: string;
  classFrom: string;
  classTo: string;
  educationLevel: string;
  images: string[];
  createState: CreateState;
  createError: string;
  productId: string;
  /** Status the server gave the new product (draft / pending_review / active ...). */
  createdStatus: string;
}

export interface TrayPhoto {
  id: string;
  name: string;
  url: string;
  state: UploadState;
  pct: number;
  error: string;
}

export const extOf = (name: string) => {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
};
export const baseOf = (name: string) => {
  const i = name.lastIndexOf('.');
  return (i <= 0 ? name : name.slice(0, i)).trim().toLowerCase();
};
export const isPhotoName = (name: string) => PHOTO_EXTENSIONS.includes(extOf(name));
export const isDocName = (name: string) => DOC_EXTENSIONS.includes(extOf(name));

/** "grade_5-maths_worksheet.pdf" -> "Grade 5 Maths Worksheet". */
export function titleFromFileName(name: string): string {
  const i = name.lastIndexOf('.');
  const base = i <= 0 ? name : name.slice(0, i);
  return base
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
    .slice(0, 200);
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function blankRow(file: { name: string; size: number }): BulkRow {
  return {
    id: newId(), fileName: file.name, fileSize: file.size, upload: null, uploadState: 'queued', uploadPct: 0, uploadError: '',
    title: titleFromFileName(file.name), description: '', price: '', compareAt: '', categoryId: '', subCategoryId: '',
    classFrom: '', classTo: '', educationLevel: '', images: [],
    createState: 'idle', createError: '', productId: '', createdStatus: '',
  };
}

/** Education level the API needs for educational products: the chosen one, else derived from the class. */
export function effectiveLevel(row: Pick<BulkRow, 'educationLevel' | 'classFrom' | 'classTo'>): string {
  if (row.educationLevel && row.educationLevel !== 'other') return row.educationLevel;
  const c = row.classFrom || row.classTo;
  return (c ? levelForClass(c) : null) ?? '';
}

export interface RowContext {
  type: BulkType;
  /** Category the API will use when the row has none (the store's own). */
  hasDefaultCategory: boolean;
  premiumGap?: (price: number, compareAt: number) => string | null;
}

/** First reason a row can't be published yet, or null when it is ready. Mirrors the API's create rules. */
export function rowIssue(row: BulkRow, ctx: RowContext): string | null {
  if (row.uploadState === 'failed') return 'File upload failed';
  if (row.uploadState !== 'done' || !row.upload) return 'File is still uploading';
  if (!row.title.trim()) return 'Add a title';
  if (!row.description.trim()) return 'Add a description';
  if (row.price.trim() === '') return 'Add a price';
  const price = Number(row.price);
  if (!Number.isFinite(price) || price < 0) return 'Price must be a number';
  if (row.compareAt.trim() !== '' && (!Number.isFinite(Number(row.compareAt)) || Number(row.compareAt) < 0)) return 'Compare-at price must be a number';
  if (!row.categoryId && !ctx.hasDefaultCategory) return 'Pick a category';
  if (row.classFrom && row.classTo && classIndex(row.classFrom) > classIndex(row.classTo)) return '"From class" comes after "To class"';
  if (ctx.type === 'educational' && !effectiveLevel(row)) return 'Choose an education level';
  if (ctx.premiumGap && row.compareAt.trim() !== '') {
    const g = ctx.premiumGap(price, Number(row.compareAt));
    if (g) return 'Sale is too close to your Premium discount';
  }
  return null;
}

/** Row ids whose title repeats an earlier row's title (case-insensitive). */
export function duplicateTitles(rows: BulkRow[]): Map<string, number> {
  const seen = new Map<string, number>();
  const dup = new Map<string, number>();
  rows.forEach((r, i) => {
    const k = r.title.trim().toLowerCase();
    if (!k) return;
    if (seen.has(k)) dup.set(r.id, seen.get(k)! + 1);
    else seen.set(k, i);
  });
  return dup;
}

export interface PhotoMatch { photoId: string; rowId: string; url: string }

/** Tray photos whose file name matches a document's (ignoring extension and case): they become that product's cover. */
export function findPhotoMatches(rows: BulkRow[], tray: TrayPhoto[]): PhotoMatch[] {
  const byBase = new Map<string, BulkRow>();
  rows.forEach(r => { if (r.createState !== 'created') { const b = baseOf(r.fileName); if (!byBase.has(b)) byBase.set(b, r); } });
  const added = new Map<string, number>();
  const out: PhotoMatch[] = [];
  for (const p of tray) {
    if (p.state !== 'done' || !p.url) continue;
    const row = byBase.get(baseOf(p.name));
    if (!row) continue;
    const n = row.images.length + (added.get(row.id) ?? 0);
    if (n >= MAX_ROW_PHOTOS) continue;
    added.set(row.id, (added.get(row.id) ?? 0) + 1);
    out.push({ photoId: p.id, rowId: row.id, url: p.url });
  }
  return out;
}