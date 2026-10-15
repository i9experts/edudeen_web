import type { PrivateUploadData } from '@/api/upload';
import { classIndex, levelForClass } from '@/constants/classLevels';
import { descriptionError, premiumConflict, stockError, validatePrices, weightError, type PremiumConflict, type WeightUnit } from './priceRules';

/** Pure helpers + types for the seller bulk upload (kept UI-free so they are easy to test). */

export const MAX_BULK_FILES = 50; // products (rows) per batch
export const MAX_BULK_PHOTOS = 100;
export const MAX_DOC_BYTES = 500 * 1024 * 1024; // same cap as the digital product upload endpoint
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // same cap as the product photo uploader
export const MAX_ROW_PHOTOS = 20;

// Mirror of the API's private upload allow-list (edudeen_api upload.service.ts) minus video/audio, which make no sense as a product file here.
export const DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'epub', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'key', 'pages', 'numbers'];
// Same types the product photo uploader accepts.
export const PHOTO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export type BulkType = 'digital' | 'educational' | 'physical';
/** 'none' = a row without a file (manual row, or a physical product). */
export type UploadState = 'none' | 'queued' | 'uploading' | 'done' | 'failed';
export type CreateState = 'idle' | 'creating' | 'created' | 'failed';
export type DetailGroup = 'price' | 'photos' | 'tags' | 'inventory' | 'download';

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
  /** Seller explicitly chose a free product (the only way a price of 0 is accepted). */
  free: boolean;
  compareAt: string;
  categoryId: string;
  subCategoryId: string;
  classFrom: string;
  classTo: string;
  educationLevel: string;
  images: string[];
  // Physical
  stock: string;
  unlimitedStock: boolean;
  sku: string;
  /** Shipping weight as typed (number) + its unit; stored on the product normalized to kg. */
  weight: string;
  weightUnit: WeightUnit;
  /** Seller confirmed a stock of 0 on purpose (the product will show as out of stock). */
  zeroStockOk: boolean;
  // Digital / educational
  downloadLimit: string;
  linkExpiryDays: string;
  buyerMessage: string;
  tags: string[];
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
  state: 'queued' | 'uploading' | 'done' | 'failed';
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

const SMALL_WORDS = new Set(['for', 'and', 'of', 'the', 'in', 'to', 'a', 'an']);

/** "grade_5-maths_worksheet.pdf" -> "Grade 5 Maths Worksheet"; "Islamic-Manners-for-Kids.pdf" -> "Islamic Manners for Kids". */
export function titleFromFileName(name: string): string {
  const i = name.lastIndexOf('.');
  const base = i <= 0 ? name : name.slice(0, i);
  return base
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w, idx) => {
      const lower = w.toLowerCase();
      return idx > 0 && SMALL_WORDS.has(lower) ? lower : w ? w.charAt(0).toUpperCase() + lower.slice(1) : w;
    })
    .join(' ')
    .slice(0, 200);
}

export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A new row. With a file name the title is prefilled from it; without one it is a blank manual row. */
export function blankRow(file?: { name: string; size: number }, hasFile = true): BulkRow {
  return {
    id: newId(), fileName: file?.name ?? '', fileSize: file?.size ?? 0, upload: null,
    uploadState: file && hasFile ? 'queued' : 'none', uploadPct: 0, uploadError: '',
    title: file ? titleFromFileName(file.name) : '', description: '', price: '', free: false, compareAt: '', categoryId: '', subCategoryId: '',
    classFrom: '', classTo: '', educationLevel: '', images: [],
    stock: '', unlimitedStock: false, sku: '', weight: '', weightUnit: 'kg', zeroStockOk: false,
    downloadLimit: 'unlimited', linkExpiryDays: '', buyerMessage: '', tags: [],
    createState: 'idle', createError: '', productId: '', createdStatus: '',
  };
}

/** Old saved batches lack newer fields; fill them with defaults. */
export function normalizeRow(r: Partial<BulkRow>): BulkRow {
  return { ...blankRow(), ...r } as BulkRow;
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
  /** Store currency code ('PKR' = whole rupees) and its symbol. */
  currency?: string | null;
  symbol?: string;
  /** Premium member discount that applies to bulk rows (the store-wide %) and the admin's minimum gap. null = not loaded / none. */
  premium?: { sellerPct: number; gap: number } | null;
}

/** The Premium conflict of a row (with the highest compare-at that works), or null. */
export function rowPremiumConflict(row: Pick<BulkRow, 'price' | 'compareAt'>, ctx: RowContext): PremiumConflict | null {
  if (!ctx.premium || row.compareAt.trim() === '') return null;
  const price = Number(row.price), compareAt = Number(row.compareAt);
  if (!Number.isFinite(price) || !Number.isFinite(compareAt)) return null;
  return premiumConflict({ price, compareAt, sellerPct: ctx.premium.sellerPct, gap: ctx.premium.gap, currency: ctx.currency, symbol: ctx.symbol ?? '' });
}

export const ZERO_STOCK_MESSAGE = 'Stock is 0 - product will show as out of stock. Tick the box under Stock to publish it as out of stock.';
export function rowIssue(row: BulkRow, ctx: RowContext): string | null {
  if (ctx.type !== 'physical') {
    if (row.uploadState === 'failed') return 'File upload failed';
    if (row.uploadState === 'queued' || row.uploadState === 'uploading') return 'File is still uploading';
    if (row.uploadState !== 'done' || !row.upload) return 'Add the file buyers will receive';
  }
  if (!row.title.trim()) return 'Add a title';
  const dErr = descriptionError(row.description);
  if (dErr) return dErr;
  const pc = validatePrices({ price: row.free ? '0' : row.price, compareAt: row.compareAt, currency: ctx.currency, free: row.free });
  if (pc.price) return pc.price;
  if (ctx.type === 'physical') {
    const sErr = stockError(row.stock, row.unlimitedStock);
    if (sErr) return sErr;
    if (!row.unlimitedStock && Number(row.stock) === 0 && !row.zeroStockOk) return ZERO_STOCK_MESSAGE;
    const wErr = weightError(row.weight, row.weightUnit);
    if (wErr) return wErr;
  }
  if (pc.compareAt) return pc.compareAt;
  if (!row.categoryId && !ctx.hasDefaultCategory) return 'Pick a category';
  if (row.classFrom && row.classTo && classIndex(row.classFrom) > classIndex(row.classTo)) return '"From class" comes after "To class"';
  if (ctx.type === 'educational' && !effectiveLevel(row)) return 'Choose an education level';
  if (row.linkExpiryDays.trim() !== '' && (!Number.isInteger(Number(row.linkExpiryDays)) || Number(row.linkExpiryDays) < 1)) return 'Link expiry must be a whole number of days';
  const pr = rowPremiumConflict(row, ctx);
  if (pr) return pr.short;
  return null;
}

/** Which optional detail groups apply to a product type. */
export function groupsFor(type: BulkType): { key: DetailGroup; label: string; hint: string }[] {
  return [
    { key: 'price', label: 'Compare-at price', hint: 'The old price, shown crossed out' },
    { key: 'photos', label: 'Photos', hint: 'Cover and more photos' },
    ...(type === 'physical'
      ? [{ key: 'inventory' as const, label: 'SKU', hint: 'Your own product code (made for you if empty)' }]
      : [{ key: 'download' as const, label: 'Download settings', hint: 'Download limit, link expiry, thank-you message' }]),
    { key: 'tags', label: 'Tags', hint: 'Words buyers might search for' },
  ];
}

/** Optional groups the seller has filled in on this row (shown as chips). */
export function filledGroups(r: BulkRow, type: BulkType): DetailGroup[] {
  const out: DetailGroup[] = [];
  if (r.compareAt.trim()) out.push('price');
  if (r.images.length) out.push('photos');
  if (type === 'physical') { if (r.sku.trim()) out.push('inventory'); }
  else if (r.downloadLimit !== 'unlimited' || r.linkExpiryDays.trim() || r.buyerMessage.trim()) out.push('download');
  if (r.tags.length) out.push('tags');
  return out;
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

/** Tray photos whose file name matches a row's file name (ignoring extension and case): they become that product's cover. */
export function findPhotoMatches(rows: BulkRow[], tray: TrayPhoto[]): PhotoMatch[] {
  const byBase = new Map<string, BulkRow>();
  rows.forEach(r => { const b = baseOf(r.fileName); if (b && r.createState !== 'created' && !byBase.has(b)) byBase.set(b, r); });
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
