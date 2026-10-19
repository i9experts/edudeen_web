import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, Copy, FileText, ImagePlus, Loader2, Paperclip, Plus, RefreshCw, Trash2, UploadCloud, X,
} from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Modal } from '@/components/comman/ui';
import { normalizeTitle, POLICY_LINE } from './productQuality';
import { apiCreateDigitalProduct, apiCreatePhysicalProduct, EDUCATION_LEVELS, type EducationLevel } from '@/api/services/product';
import { apiUploadPrivateFile, apiUploadPublicFile } from '@/api/upload';
import { useSellerCategories } from '@/hooks/store/useSellerCategories';
import type { CategoryNode } from '@/api/services/categories';
import { currencySymbol as symbolForCurrency } from '@/utils/currency';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { EMPTY_DELIVERY, deliveryPayload } from '@/features/seller/components/products/DeliveryFormatField';
import { learningPayload } from '@/features/seller/components/products/LearningFields';
import { ProductPhotosUploader } from './ProductPhotosUploader';
import { usePremiumTerms } from './PremiumEarningsCalculator';
import { effectiveSellerPercent, validatePrices, toggleRemember, weightError, weightToStored, type PremiumConflict, type WeightUnit } from './priceRules';
import { timeAgo, useDraftAutosave, useLeaveGuard } from './ProductWizard';
import { inp } from './ProductFormKit';
import {
  DOC_EXTENSIONS, MAX_BULK_FILES, MAX_BULK_PHOTOS, MAX_DOC_BYTES, MAX_PHOTO_BYTES, MAX_ROW_PHOTOS, PHOTO_EXTENSIONS,
  baseOf, blankRow, rowWarnings, duplicateTitles, effectiveLevel, extOf, filledGroups, findPhotoMatches, groupsFor, isDocName, isPhotoName, newId, normalizeRow, rowIssue, rowPremiumConflict,
  titleFromFileName,
  type RowContext, type BulkRow, type BulkType, type DetailGroup, type TrayPhoto,
} from './bulkUtils';

const CONCURRENCY = 3;
const sel = `${inp} !py-[8px] !text-[13px] cursor-pointer`;
const lab = 'block text-[12px] font-semibold text-graphite mb-1';

interface Saved { type: BulkType; rows: BulkRow[]; tray: TrayPhoto[] }
interface RunSummary { created: number; published: number; inReview: number; drafts: number; failed: number; skipped: number }

const TYPE_LABEL: Record<BulkType, string> = { digital: 'Digital downloads', educational: 'Educational resources', physical: 'Physical products' };

// ── Compact category cascade (same data + rules as the Add Product form) ─────────────────────
function pathTo(nodes: CategoryNode[], id: string): CategoryNode[] {
  for (const n of nodes) {
    if (n._id === id) return [n];
    const rest = pathTo(n.children ?? [], id);
    if (rest.length) return [n, ...rest];
  }
  return [];
}

function CategoryCascade({ categories, loading, categoryId, subId, onChange, idPrefix, disabled, auto, onConfirmAuto }: {
  categories: CategoryNode[]; loading: boolean; categoryId: string; subId: string; idPrefix: string; disabled?: boolean;
  /** The category shown was filled in automatically (the store's own) - the seller should check it. */
  auto?: boolean; onConfirmAuto?: () => void;
  onChange: (categoryId: string, subId: string) => void;
}) {
  const root = categories.find(c => c._id === categoryId);
  const path = subId && root ? pathTo(root.children ?? [], subId) : [];
  const levels: { options: CategoryNode[]; selected: string }[] = [];
  let options = root?.children ?? [];
  for (let i = 0; i <= path.length; i++) {
    if (!options.length) break;
    levels.push({ options, selected: path[i]?._id ?? '' });
    options = path[i]?.children ?? [];
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      <div>
        <label htmlFor={`${idPrefix}-cat`} className={lab}>Category{auto && <span data-testid="category-auto" className="ms-1.5 font-semibold text-[#8a5a00]">(auto - please check)</span>}</label>
        <select id={`${idPrefix}-cat`} className={`${sel} ${auto ? '!border-[#e0b050] !bg-[#fff6e0]' : ''}`} disabled={loading || disabled} value={categoryId} onChange={e => onChange(e.target.value, '')}>
          {loading && <option value={categoryId}>Loading…</option>}
          {!loading && !categories.some(c => c._id === categoryId) && <option value="">Choose a category</option>}
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
      {auto && onConfirmAuto && (
        <div className="flex items-end">
          <button type="button" onClick={onConfirmAuto} disabled={disabled} className="px-2.5 py-2 rounded-lg text-[12.5px] font-bold text-brand-royal bg-white border border-bone cursor-pointer hover:bg-cream disabled:opacity-50">Category is correct</button>
        </div>
      )}
      {!root && !loading && (
        <div>
          <label htmlFor={`${idPrefix}-sub-none`} className={lab}>Subcategory</label>
          <select id={`${idPrefix}-sub-none`} className={sel} disabled value=""><option value="">Choose a category first</option></select>
        </div>
      )}
      {levels.map((lv, i) => (
        <div key={i}>
          <label htmlFor={`${idPrefix}-sub${i}`} className={lab}>{i === 0 ? 'Subcategory' : 'Sub-subcategory'}</label>
          <select id={`${idPrefix}-sub${i}`} className={sel} disabled={disabled} value={lv.selected}
            onChange={e => onChange(categoryId, e.target.value || (i > 0 ? path[i - 1]._id : ''))}>
            <option value="">None</option>
            {lv.options.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function ClassRange({ from, to, onChange, idPrefix, disabled }: { from: string; to: string; idPrefix: string; disabled?: boolean; onChange: (from: string, to: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label htmlFor={`${idPrefix}-from`} className={lab}>From class</label>
        <select id={`${idPrefix}-from`} className={sel} disabled={disabled} value={from} onChange={e => onChange(e.target.value, to)}>
          <option value="">Any</option>
          {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-to`} className={lab}>To class</label>
        <select id={`${idPrefix}-to`} className={sel} disabled={disabled} value={to} onChange={e => onChange(from, e.target.value)}>
          <option value="">Any</option>
          {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
    </div>
  );
}

const LEVEL_OPTIONS = EDUCATION_LEVELS.filter(l => l.value !== 'other');

export default function StoreBulkUpload() {
  const navigate = useNavigate();
  const { storeId, store } = useStoreWorkspace();
  const currency = symbolForCurrency(store?.baseCurrency);
  const { categories, loading: catLoading, error: catError, refetch: refetchCats } = useSellerCategories();

  const [type, setType] = useState<BulkType>('digital');
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [tray, setTray] = useState<TrayPhoto[]>([]);
  const [notice, setNotice] = useState('');
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [lastMode, setLastMode] = useState<'draft' | 'publish'>('draft');
  const [now, setNow] = useState(() => Date.now());
  const [applyUndo, setApplyUndo] = useState<{ prev: BulkRow[]; count: number } | null>(null);
  const pendingType = useRef<BulkType | null>(null);
  const [detail, setDetail] = useState<{ rowId: string; group: DetailGroup } | null>(null);
  const [undo, setUndo] = useState<{ row: BulkRow; index: number } | null>(null);
  // A product type the store isn't set up for: tapping it explains how to turn it on instead of doing nothing.
  const [lockedType, setLockedType] = useState<BulkType | null>(null);
  const [bannerConfirm, setBannerConfirm] = useState<null | 'continue' | 'fresh'>(null);

  const productTypes = store?.productTypes ?? [];
  // Same availability rules as the single Add Product form.
  const canType: Record<BulkType, boolean> = {
    digital: !store || productTypes.includes('digital_downloads'),
    educational: !store || productTypes.includes('educational_resources'),
    physical: !store || productTypes.includes('physical_products'),
  };
  const defaultCategoryId = store?.categoryId ?? '';
  const storePremiumPct = store?.premiumDiscount?.enabled ? store.premiumDiscount.percent : 0;
  const { terms: premiumTerms } = usePremiumTerms(type === 'physical' ? 'physical' : 'digital', store?.baseCurrency, storeId);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(t); }, []);
  useEffect(() => {
    if (!store || rows.length > 0) return;
    // A type tab clicked before the store finished loading is applied now instead of being lost.
    const want = pendingType.current; pendingType.current = null;
    if (want && canType[want]) { if (want !== type) setType(want); return; }
    if (!canType[type]) {
      const first = (['digital', 'educational', 'physical'] as const).find(t => canType[t]);
      if (first) setType(first);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, type, rows.length]);
  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), 8000);
    return () => window.clearTimeout(t);
  }, [undo]);

  const rowsRef = useRef(rows); rowsRef.current = rows;
  const filesRef = useRef(new Map<string, File>());
  const queue = useRef<{ kind: 'doc' | 'photo'; id: string }[]>([]);
  const active = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  // ── Uploads: documents go to the private (digital product) endpoint, photos to the public one, 3 at a time ──
  const patchRow = useCallback((id: string, p: Partial<BulkRow>) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...p } : r))), []);
  const patchPhoto = useCallback((id: string, p: Partial<TrayPhoto>) => setTray(prev => prev.map(t => (t.id === id ? { ...t, ...p } : t))), []);

  const pump = useCallback(() => {
    while (alive.current && active.current < CONCURRENCY && queue.current.length) {
      const job = queue.current.shift()!;
      const file = filesRef.current.get(job.id);
      if (!file) continue;
      active.current += 1;
      if (job.kind === 'doc') {
        patchRow(job.id, { uploadState: 'uploading', uploadPct: 0, uploadError: '' });
        apiUploadPrivateFile(file, undefined, pct => patchRow(job.id, { uploadPct: pct }))
          .then(res => { if (!res.data?.publicId) throw new Error('Upload failed'); patchRow(job.id, { upload: res.data, uploadState: 'done', uploadPct: 100 }); filesRef.current.delete(job.id); })
          .catch((e: unknown) => { filesRef.current.set(job.id, file); patchRow(job.id, { uploadState: 'failed', uploadError: e instanceof Error && e.message ? e.message : 'Upload failed' }); })
          .finally(() => { active.current -= 1; pump(); });
      } else {
        patchPhoto(job.id, { state: 'uploading', pct: 0, error: '' });
        apiUploadPublicFile(file, pct => patchPhoto(job.id, { pct }))
          .then(res => { if (!res.data?.url) throw new Error('Upload failed'); patchPhoto(job.id, { url: res.data.url, state: 'done', pct: 100 }); filesRef.current.delete(job.id); })
          .catch((e: unknown) => { filesRef.current.set(job.id, file); patchPhoto(job.id, { state: 'failed', error: e instanceof Error && e.message ? e.message : 'Upload failed' }); })
          .finally(() => { active.current -= 1; pump(); });
      }
    }
  }, [patchRow, patchPhoto]);

  const summaryClear = () => setSummary(null);

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    const msgs: string[] = [];
    const docs: File[] = [];
    const photos: File[] = [];
    for (const f of files) {
      if (isPhotoName(f.name)) {
        if (f.size > MAX_PHOTO_BYTES) msgs.push(`${f.name}: photo is larger than 10 MB.`);
        else photos.push(f);
      } else if (type === 'physical') {
        msgs.push(`${f.name}: physical products take photos only (PNG, JPG or WebP).`);
      } else if (isDocName(f.name)) {
        if (f.size > MAX_DOC_BYTES) msgs.push(`${f.name}: file is larger than 500 MB.`);
        else if (f.size === 0) msgs.push(`${f.name}: the file is empty.`);
        else docs.push(f);
      } else {
        msgs.push(`${f.name}: ".${extOf(f.name) || '?'}" files are not supported.`);
      }
    }
    const current = rowsRef.current;
    let room = Math.max(0, MAX_BULK_FILES - current.length);
    const newRows: BulkRow[] = [];
    if (type === 'physical') {
      // One new product per distinct photo name (photos named alike end up on the same product).
      const bases = new Set(current.map(r => baseOf(r.fileName)).filter(Boolean));
      let skipped = 0;
      for (const f of photos) {
        const b = baseOf(f.name);
        if (bases.has(b)) continue;
        if (newRows.length >= room) { skipped += 1; continue; }
        bases.add(b);
        newRows.push(blankRow({ name: f.name, size: f.size }, false));
      }
      if (skipped) msgs.push(`You can add up to ${MAX_BULK_FILES} products in one batch - ${skipped} extra photo${skipped > 1 ? 's were' : ' was'} not added. Use a second batch.`);
    } else {
      const fresh = docs.filter(f => !current.some(r => r.fileName === f.name && r.fileSize === f.size));
      if (fresh.length < docs.length) msgs.push(`${docs.length - fresh.length} file${docs.length - fresh.length > 1 ? 's were' : ' was'} already added.`);
      const takeDocs = fresh.slice(0, room);
      if (fresh.length > takeDocs.length) msgs.push(`You can add up to ${MAX_BULK_FILES} files in one batch - ${fresh.length - takeDocs.length} extra file${fresh.length - takeDocs.length > 1 ? 's were' : ' was'} not added. Upload them in a second batch.`);
      takeDocs.forEach(f => { const r = blankRow(f); filesRef.current.set(r.id, f); newRows.push(r); });
    }
    room = Math.max(0, MAX_BULK_PHOTOS - tray.length);
    const takePhotos = photos.slice(0, room);
    if (photos.length > takePhotos.length) msgs.push(`Up to ${MAX_BULK_PHOTOS} unassigned photos at a time - some were not added.`);
    setNotice(msgs.join(' '));

    const newPhotos: TrayPhoto[] = takePhotos.map(f => ({ id: newId(), name: f.name, url: '', state: 'queued', pct: 0, error: '' }));
    takePhotos.forEach((f, i) => filesRef.current.set(newPhotos[i].id, f));
    if (newRows.length) { rowsRef.current = [...rowsRef.current, ...newRows]; setRows(rowsRef.current); }
    if (newPhotos.length) setTray(prev => [...prev, ...newPhotos]);
    queue.current.push(...newRows.filter(r => r.uploadState === 'queued').map(r => ({ kind: 'doc' as const, id: r.id })), ...newPhotos.map(p => ({ kind: 'photo' as const, id: p.id })));
    summaryClear();
    pump();
  };

  const retryUpload = (kind: 'doc' | 'photo', id: string) => {
    if (!filesRef.current.has(id)) { setNotice('That file is no longer in memory (the page was reloaded). Choose the file again.'); return; }
    queue.current.push({ kind, id });
    if (kind === 'doc') patchRow(id, { uploadState: 'queued', uploadError: '' }); else patchPhoto(id, { state: 'queued', error: '' });
    pump();
  };

  /** Attach (or replace) the file of one row. */
  const attachFile = (rowId: string, f: File) => {
    if (!isDocName(f.name)) { setNotice(`${f.name}: ".${extOf(f.name) || '?'}" files are not supported.`); return; }
    if (f.size > MAX_DOC_BYTES) { setNotice(`${f.name}: file is larger than 500 MB.`); return; }
    if (f.size === 0) { setNotice(`${f.name}: the file is empty.`); return; }
    setNotice('');
    filesRef.current.set(rowId, f);
    setRows(prev => prev.map(r => (r.id === rowId ? { ...r, fileName: f.name, fileSize: f.size, upload: null, uploadState: 'queued', uploadPct: 0, uploadError: '', title: r.title.trim() ? r.title : titleFromFileName(f.name) } : r)));
    queue.current.push({ kind: 'doc', id: rowId });
    pump();
  };

  const addRow = () => {
    if (rowsRef.current.length >= MAX_BULK_FILES) { setNotice(`You can add up to ${MAX_BULK_FILES} products in one batch. Save these first, then start a new batch.`); return; }
    const r = blankRow();
    rowsRef.current = [...rowsRef.current, r];
    setRows(rowsRef.current);
    setSummary(null);
    window.setTimeout(() => {
      const el = document.getElementById(`t-${r.id}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      (el as HTMLInputElement | null)?.focus({ preventScroll: true });
    }, 60);
  };

  // Photos whose file name matches a product's file name (ignoring extension/case) become that product's cover.
  useEffect(() => {
    const m = findPhotoMatches(rows, tray);
    if (!m.length) return;
    const ids = new Set(m.map(x => x.photoId));
    setRows(prev => prev.map(r => { const mine = m.filter(x => x.rowId === r.id && !r.images.includes(x.url)); return mine.length ? { ...r, images: [...r.images, ...mine.map(x => x.url)] } : r; }));
    setTray(prev => prev.filter(t => !ids.has(t.id)));
  }, [rows, tray]);

  // ── Autosave / restore / leave guard ─────────────────────────────────────────────────────────
  const snapshot = useMemo<Saved>(() => ({ type, rows, tray: tray.filter(t => t.state === 'done') }), [type, rows, tray]);
  const draft = useDraftAutosave<Saved>(`edudeen:bulk-upload:${storeId}`, snapshot, rows.length > 0 || tray.length > 0, true);
  const hasUnsaved = rows.some(r => r.createState !== 'created') || tray.length > 0;
  const guard = useLeaveGuard(hasUnsaved && !creating);

  const restore = () => {
    const d = draft.restorable?.data;
    if (!d) return;
    const restored = (d.rows ?? []).map(normalizeRow).map<BulkRow>(r => {
      const base = r.createState === 'creating' ? { ...r, createState: 'idle' as const } : r;
      return base.uploadState === 'done' || base.uploadState === 'none' ? base
        : { ...base, uploadState: 'failed', uploadError: 'This file was not finished uploading. Choose the file again.' };
    });
    setType(d.type === 'educational' || d.type === 'physical' ? d.type : 'digital');
    setRows(restored);
    setTray((d.tray ?? []).filter(t => t.state === 'done'));
    draft.accept();
  };

  // ── Row helpers ──────────────────────────────────────────────────────────────────────────────
  const ctx = useMemo<RowContext>(() => ({
    type, hasDefaultCategory: !!defaultCategoryId, currency: store?.baseCurrency, symbol: currency,
    // Bulk rows carry the store-wide Premium %, so the same rule as the Add / Edit product pages applies to them.
    premium: premiumTerms ? { sellerPct: effectiveSellerPercent('', storePremiumPct, false), gap: premiumTerms.minGapPercent } : null,
  }), [type, defaultCategoryId, premiumTerms, storePremiumPct, store?.baseCurrency, currency]);
  const issueOf = (r: BulkRow) => rowIssue(r, ctx);
  const dups = useMemo(() => duplicateTitles(rows), [rows]);
  const editable = rows.filter(r => r.createState !== 'created');
  const readyRows = editable.filter(r => !issueOf(r));
  const uploadingCount = rows.filter(r => r.uploadState === 'queued' || r.uploadState === 'uploading').length + tray.filter(t => t.state === 'queued' || t.state === 'uploading').length;

  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = editable.length > 0 && editable.every(r => selected.has(r.id));

  const undoApply = () => {
    if (!applyUndo) return;
    const byId = new Map(applyUndo.prev.map(r => [r.id, r]));
    setRows(prev => prev.map(r => byId.get(r.id) ?? r));
    setApplyUndo(null);
  };
  /** Photos were dropped while a file-based type is selected: turn them into physical products (one per photo name). */
  const switchToPhysical = () => {
    const seen = new Set<string>();
    const fresh: BulkRow[] = [];
    for (const p of tray) { const b = baseOf(p.name); if (!b || seen.has(b) || fresh.length >= MAX_BULK_FILES) continue; seen.add(b); fresh.push(blankRow({ name: p.name, size: 0 }, false)); }
    setType('physical');
    rowsRef.current = fresh; setRows(fresh);
  };
  const removeRow = (id: string) => {
    setApplyUndo(null);
    const index = rowsRef.current.findIndex(r => r.id === id);
    if (index < 0) return;
    const row = rowsRef.current[index];
    queue.current = queue.current.filter(j => j.id !== id);
    setRows(prev => prev.filter(r => r.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    setUndo({ row, index });
  };
  const undoRemove = () => {
    if (!undo) return;
    const { row, index } = undo;
    const back: BulkRow = row.uploadState === 'queued' || row.uploadState === 'uploading'
      ? { ...row, uploadState: 'failed', uploadError: 'Upload was cancelled. Retry to upload it again.' } : row;
    setRows(prev => { const n = prev.slice(); n.splice(Math.min(index, n.length), 0, back); return n; });
    setUndo(null);
  };
  const duplicateRow = (r: BulkRow) => {
    if (rowsRef.current.length >= MAX_BULK_FILES) { setNotice(`You can add up to ${MAX_BULK_FILES} products in one batch.`); return; }
    const copy: BulkRow = { ...r, id: newId(), title: `${r.title} (copy)`, createState: 'idle', createError: '', productId: '', createdStatus: '' };
    setRows(prev => { const i = prev.findIndex(x => x.id === r.id); const n = prev.slice(); n.splice(i + 1, 0, copy); return n; });
  };
  const assignPhoto = (rowId: string, photoId: string) => {
    const p = tray.find(t => t.id === photoId);
    if (!p?.url) return;
    setRows(prev => prev.map(r => (r.id === rowId && r.images.length < MAX_ROW_PHOTOS ? { ...r, images: [...r.images, p.url] } : r)));
    setTray(prev => prev.filter(t => t.id !== photoId));
  };
  const dropPhoto = (id: string) => { queue.current = queue.current.filter(j => j.id !== id); filesRef.current.delete(id); setTray(prev => prev.filter(t => t.id !== id)); };

  // ── Apply to selected ────────────────────────────────────────────────────────────────────────
  const [ap, setAp] = useState({ categoryId: '', subCategoryId: '', classFrom: '', classTo: '', level: '', price: '', compareAt: '', stock: '', weight: '', weightUnit: 'kg' as WeightUnit, unlimited: false, savedStock: '', description: '', mode: 'replace' as 'replace' | 'append' });
  const [apOpen, setApOpen] = useState(true);
  const apFilled = !!(ap.categoryId || ap.classFrom || ap.classTo || ap.level || ap.price.trim() || ap.compareAt.trim() || ap.stock.trim() || ap.weight.trim() || ap.unlimited || ap.description.trim());
  const selectedRows = editable.filter(r => selected.has(r.id));
  const applyToSelected = () => {
    if (!selectedRows.length || !apFilled) return;
    const ids = new Set(selectedRows.map(r => r.id));
    setApplyUndo({ prev: rowsRef.current.filter(r => ids.has(r.id)), count: selectedRows.length });
    setRows(prev => prev.map(r => {
      if (!ids.has(r.id)) return r;
      const n = { ...r };
      if (ap.categoryId) { n.categoryId = ap.categoryId; n.subCategoryId = ap.subCategoryId; }
      if (ap.classFrom || ap.classTo) { n.classFrom = ap.classFrom; n.classTo = ap.classTo; }
      if (ap.level) n.educationLevel = ap.level;
      if (ap.price.trim()) { n.price = ap.price.trim(); n.free = false; }
      if (ap.compareAt.trim()) n.compareAt = ap.compareAt.trim();
      if (ap.stock.trim()) { n.stock = ap.stock.trim(); n.unlimitedStock = false; n.zeroStockOk = false; }
      if (ap.unlimited) { n.savedStock = n.stock.trim() !== '' ? n.stock : n.savedStock; n.unlimitedStock = true; n.stock = ''; n.zeroStockOk = false; }
      if (ap.weight.trim()) { n.weight = ap.weight.trim(); n.weightUnit = ap.weightUnit; }
      if (ap.description.trim()) n.description = ap.mode === 'append' && n.description.trim() ? `${n.description.trim()}\n${ap.description.trim()}` : ap.description.trim();
      if (n.createState === 'failed') { n.createState = 'idle'; n.createError = ''; }
      return n;
    }));
  };

  // ── Create ───────────────────────────────────────────────────────────────────────────────────
  const createOne = async (r: BulkRow, mode: 'draft' | 'publish') => {
    patchRow(r.id, { createState: 'creating', createError: '' });
    try {
      const common = {
        storeId, name: normalizeTitle(r.title), description: r.description.trim(),
        categoryId: r.categoryId || undefined, subCategoryId: r.subCategoryId || null,
        images: r.images, tags: r.tags,
        isListedOnEdudeen: true, status: (mode === 'publish' ? 'active' : 'draft') as 'active' | 'draft',
        ...learningPayload({ curricula: [], ageMin: '', ageMax: '', classFrom: r.classFrom, classTo: r.classTo }),
      };
      let res;
      if (type === 'physical') {
        res = await apiCreatePhysicalProduct({
          ...common,
          variants: [{
            price: Number(r.price),
            compareAtPrice: r.compareAt.trim() ? Number(r.compareAt) : null,
            options: [],
            stock: r.unlimitedStock ? 0 : Number(r.stock),
            ...(r.unlimitedStock ? { unlimitedStock: true } : {}),
            shippingWeight: weightToStored(r.weight, r.weightUnit),
            ...(r.sku.trim() ? { sku: r.sku.trim() } : {}),
          }],
        });
      } else {
        res = await apiCreateDigitalProduct({
          ...common,
          productType: type,
          educationLevel: type === 'educational' ? (effectiveLevel(r) as EducationLevel) : null,
          customLevel: null,
          price: r.free ? 0 : Number(r.price), compareAtPrice: r.compareAt.trim() ? Number(r.compareAt) : null,
          ...deliveryPayload(EMPTY_DELIVERY),
          licenseTiers: [],
          digital: {
            files: [{ url: r.upload!.publicId, name: r.upload!.fileName, size: r.upload!.fileSize, mimeType: r.upload!.mimeType }],
            downloadLimit: r.downloadLimit || 'unlimited', linkExpiryDays: r.linkExpiryDays.trim() ? Number(r.linkExpiryDays) : null, pdfStampingEnabled: false, licenseType: 'personal', buyerDeliveryMessage: r.buyerMessage.trim(),
            preview: { enabled: false, sourceFileIndex: 0 }, sampleFile: null,
          },
        });
      }
      patchRow(r.id, { createState: 'created', createError: '', productId: res.data.product._id, createdStatus: String(res.data.product.status ?? '') });
      return true;
    } catch (e) {
      patchRow(r.id, { createState: 'failed', createError: e instanceof Error && e.message ? e.message : 'Could not create this product.' });
      return false;
    }
  };

  const runCreate = async (mode: 'draft' | 'publish', retryOnly = false) => {
    if (creating) return;
    const targets = rowsRef.current.filter(r => r.createState !== 'created' && !rowIssue(r, ctx) && (!retryOnly || r.createState === 'failed'));
    if (!targets.length) { setNotice('Nothing is ready to save yet. Fix the red rows first.'); return; }
    const skipped = rowsRef.current.filter(r => r.createState !== 'created').length - targets.length;
    setNotice(''); setSummary(null); setLastMode(mode); setCreating(true);
    setProgress({ done: 0, total: targets.length });
    let next = 0; let done = 0;
    const worker = async () => {
      while (next < targets.length) {
        const r = targets[next++];
        await createOne(r, mode);
        done += 1;
        if (alive.current) setProgress({ done, total: targets.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    if (!alive.current) return;
    setCreating(false);
    // Read final row states (patchRow updates are queued; wait a tick).
    window.setTimeout(() => {
      const all = rowsRef.current;
      const created = all.filter(r => r.createState === 'created');
      setSummary({
        created: created.length,
        published: created.filter(r => r.createdStatus === 'active' || r.createdStatus === 'scheduled').length,
        inReview: created.filter(r => r.createdStatus === 'pending_review').length,
        drafts: created.filter(r => r.createdStatus === 'draft').length,
        failed: all.filter(r => r.createState === 'failed').length,
        skipped: all.filter(r => r.createState !== 'created' && r.createState !== 'failed').length || skipped,
      });
      if (!all.some(r => r.createState !== 'created')) draft.clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const resetAll = () => {
    try { localStorage.removeItem(`edudeen:bulk-upload:${storeId}`); } catch { /* ignore */ }
    queue.current = []; filesRef.current.clear();
    setRows([]); setTray([]); setSelected(new Set()); setSummary(null); setNotice('');
    window.location.reload();
  };
  const clearCreated = () => setRows(prev => prev.filter(r => r.createState !== 'created'));
  const goProducts = () => { guard.allow.current = true; draft.clear(); navigate(`/store/${storeId}/products`); };

  // ── Drag & drop ──────────────────────────────────────────────────────────────────────────────
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };
  const inputRef = useRef<HTMLInputElement>(null);
  const dropAccept = (type === 'physical' ? PHOTO_EXTENSIONS : [...DOC_EXTENSIONS, ...PHOTO_EXTENSIONS]).map(x => `.${x}`).join(',');

  const showEmpty = rows.length === 0 && tray.length === 0;
  const failedCount = rows.filter(r => r.createState === 'failed').length;
  const createdRows = rows.filter(r => r.createState === 'created');
  const pendingPhotos = tray.length;
  const noTypes = !!store && !canType.digital && !canType.educational && !canType.physical;
  const detailRow = detail ? rows.find(r => r.id === detail.rowId) : undefined;

  return (
    <div className="min-h-full tap-safe">
      <StorePageHeader
        title="Bulk upload"
        subtitle="Add many products at once - digital, educational or physical."
        actions={<Link to={`/store/${storeId}/products/add`} className="text-[13px] font-bold text-brand-royal no-underline hover:underline">Add one product instead</Link>}
      />
      {guard.dialog}
      {bannerConfirm && (
        <Modal title={bannerConfirm === 'continue' ? 'Replace what is on screen?' : 'Delete the saved batch?'} onClose={() => setBannerConfirm(null)} width={460}
          footer={<>
            <button type="button" onClick={() => setBannerConfirm(null)} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Cancel</button>
            <button type="button" data-testid="restore-confirm" onClick={() => { if (bannerConfirm === 'continue') restore(); else draft.dismiss(); setBannerConfirm(null); }} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">{bannerConfirm === 'continue' ? 'Replace with saved batch' : 'Delete saved batch'}</button>
          </>}>
          <p className="m-0 text-[13.5px] text-carbon">{bannerConfirm === 'continue'
            ? `The  product you are working on now will be replaced by the  saved ones. This cannot be undone.`
            : `The  product saved on this device will be deleted.`}</p>
        </Modal>
      )}

      <div className="px-4 md:px-8 py-5 pb-28">
        <div className="mx-auto max-w-[1400px] flex flex-col gap-4">
          {/* How it works */}
          <ol className="m-0 p-0 list-none grid sm:grid-cols-3 gap-2 text-[13px] text-graphite" aria-label="How bulk upload works">
            {[type === 'physical' ? 'Drop product photos (one product per photo name) or press + Add product to type each one in.' : 'Drop your files and cover photos here, or press + Add product. A photo named like its file becomes the cover.',
              'Fill the red items in each row. Extra details (compare-at price, tags, weight...) are under Add details. Or select rows and use Apply to selected.',
              'Save all as drafts, or publish the ready ones. Nothing is lost if a row fails.'].map((t, i) => (
              <li key={i} className="flex gap-2 items-start rounded-xl bg-white border border-bone px-3 py-2.5">
                <span className="size-5 shrink-0 rounded-full bg-brand-royal text-white text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className="m-0 text-[12.5px] text-slate">{POLICY_LINE}</p>

          {draft.restorable && !summary && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-info/30 bg-info-bg px-4 py-3 text-[13px] text-carbon">
              <span className="flex-1 min-w-[200px]"><b>Continue your bulk upload?</b> You have {draft.restorable.data?.rows?.length ?? 0} product{(draft.restorable.data?.rows?.length ?? 0) === 1 ? '' : 's'} saved from {timeAgo(draft.restorable.savedAt, now)}. Files that were already uploaded will not upload again.</span>
              <button type="button" data-testid="restore-continue" onClick={() => (rows.length > 0 || tray.length > 0 ? setBannerConfirm('continue') : restore())} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">Continue</button>
              <button type="button" data-testid="restore-fresh" onClick={() => setBannerConfirm('fresh')} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Start fresh</button>
            </div>
          )}

          {summary && (
            <div role="status" className="rounded-xl border border-success/30 bg-success-bg px-4 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-success mt-0.5 shrink-0" />
                <div className="text-[14px] text-carbon">
                  <p className="m-0 font-bold" data-testid="bulk-summary">
                    {summary.created} created
                    {summary.created > 0 && <> ({summary.published + summary.inReview} published, {summary.drafts} draft{summary.drafts === 1 ? '' : 's'})</>}
                    , {summary.failed} failed{summary.skipped > 0 ? `, ${summary.skipped} still need details` : ''}
                  </p>
                  {summary.inReview > 0 && <p className="m-0 mt-1 text-[13px] text-graphite">{summary.inReview} of the published product{summary.inReview === 1 ? ' is' : 's are'} waiting for Edudeen to review {summary.inReview === 1 ? 'it' : 'them'}. They go live once approved.</p>}
                  <p className="m-0 mt-1 text-[13px] text-graphite">Premium member discounts and platform sales are not set in bulk. Use the bulk offers bar on the Products list to add them to many products at once.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={goProducts} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">Go to products</button>
                {(summary.failed > 0 || summary.skipped > 0) && <button type="button" onClick={() => { setSummary(null); clearCreated(); }} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Fix failed rows</button>}
                <button type="button" onClick={() => { clearCreated(); setSummary(null); if (rowsRef.current.every(r => r.createState === 'created')) resetAll(); }} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Upload more</button>
              </div>
            </div>
          )}

          {noTypes && <p role="alert" className="m-0 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-4 py-3">Your store has no product type that bulk upload can create.</p>}

          {/* Type choice + drop zone */}
          <div className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-bold text-carbon">These are:</span>
              <div role="radiogroup" aria-label="Product type" className="inline-flex flex-wrap gap-2">
                {(['digital', 'educational', 'physical'] as const).map(t => (
                  <button key={t} type="button" role="radio" aria-checked={type === t} disabled={rows.length > 0 && type !== t} aria-disabled={!canType[t] || undefined}
                    onClick={() => { if (!canType[t]) { setLockedType(t); return; } setLockedType(null); if (!store) pendingType.current = t; setType(t); }}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-bold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${!canType[t] ? 'opacity-60' : ''} ${type === t ? 'bg-brand-royal text-white border-brand-royal' : 'bg-white text-graphite border-bone hover:bg-cream'}`}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              {rows.length > 0 && <span className="text-[12px] text-slate">To switch type, remove all rows first.</span>}
            </div>
            {lockedType && !canType[lockedType] && (
              <p role="alert" className="m-0 text-[13px] text-[#8a5a00] bg-[#fff6e0] border border-[#e0b050]/50 rounded-lg px-3 py-2">
                Your store is not set up for {TYPE_LABEL[lockedType].toLowerCase()} yet. Turn it on under <b>Product types</b> in{' '}
                <Link to={`/store/${storeId}/settings`} className="font-bold text-brand-royal underline">Store settings</Link>, then come back.
              </p>
            )}
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              className={`rounded-xl border-2 border-dashed text-center transition-colors ${drag ? 'border-brand-royal bg-info-bg' : 'border-bone bg-cream/50'} ${showEmpty ? 'py-10 px-4' : 'py-4 px-4'}`}
              data-testid="bulk-dropzone"
            >
              <UploadCloud size={showEmpty ? 40 : 24} className="mx-auto text-brand-royal" />
              <p className="m-0 mt-2 text-[15px] font-bold text-carbon">
                {type === 'physical' ? (showEmpty ? 'Drag and drop product photos here' : 'Drop more photos here') : (showEmpty ? 'Drag and drop your files here' : 'Drop more files here')}
              </p>
              <p className="m-0 mt-1 text-[12.5px] text-slate">
                {type === 'physical'
                  ? `Each photo name becomes a product (PNG, JPG, WebP, up to 10 MB). Or add products by hand. Up to ${MAX_BULK_FILES} products per batch.`
                  : `PDF, Word, PowerPoint, Excel, ZIP and more (up to 500 MB each), plus cover photos (PNG, JPG, WebP, up to 10 MB). Up to ${MAX_BULK_FILES} files per batch.`}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} disabled={noTypes}
                  className="px-4 py-2 rounded-lg text-[14px] font-bold bg-brand-royal text-white border-none cursor-pointer disabled:opacity-50">{type === 'physical' ? 'Select photos' : 'Select files'}</button>
                {showEmpty && (
                  <button type="button" onClick={addRow} disabled={noTypes} data-testid="bulk-add-row-empty"
                    className="px-4 py-2 rounded-lg text-[14px] font-bold bg-white text-brand-royal border border-brand-royal cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"><Plus size={15} /> Add product</button>
                )}
              </div>
              <input ref={inputRef} data-testid="bulk-input" type="file" multiple accept={dropAccept} className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
            {notice && (
              <p role="alert" className="m-0 flex items-start gap-2 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> <span className="flex-1">{notice}</span>
                <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')} className="bg-transparent border-none cursor-pointer text-error p-0"><X size={14} /></button>
              </p>
            )}
            {type !== 'physical' && canType.physical && rows.length === 0 && tray.length > 0 && (
              <p role="status" data-testid="photo-only-hint" className="m-0 flex flex-wrap items-center gap-2 text-[13px] text-[#8a5a00] bg-[#fff6e0] border border-[#e0b050]/50 rounded-lg px-3 py-2">
                <span className="flex-1 min-w-[200px]">Only photos added - are these physical products?</span>
                <button type="button" data-testid="switch-physical" onClick={switchToPhysical} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">Switch to Physical products</button>
              </p>
            )}
            {catError &&<p role="alert" className="m-0 text-[13px] text-error">Could not load categories. <button type="button" onClick={refetchCats} className="underline bg-transparent border-none cursor-pointer text-error p-0">Try again</button></p>}
          </div>

          {/* Unmatched photos */}
          {pendingPhotos > 0 && (
            <div className="rounded-xl border border-bone bg-white p-4" data-testid="bulk-tray">
              <h2 className="m-0 text-[14px] font-bold text-carbon">Unmatched photos ({pendingPhotos})</h2>
              <p className="m-0 mt-0.5 mb-3 text-[12.5px] text-slate">These photos did not match a product name. Pick the product each one belongs to, or leave them out.</p>
              <div className="flex flex-wrap gap-3">
                {tray.map(p => (
                  <div key={p.id} className="w-[150px] rounded-lg border border-bone p-2 flex flex-col gap-1.5">
                    <div className="h-[84px] rounded bg-mist flex items-center justify-center overflow-hidden">
                      {p.state === 'done' ? <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                        : p.state === 'failed' ? <AlertCircle size={20} className="text-error" /> : <Loader2 size={20} className="animate-spin text-slate" />}
                    </div>
                    <p className="m-0 text-[12px] text-carbon truncate" title={p.name}>{p.name}</p>
                    {p.state === 'done' ? (
                      <select aria-label={`Assign ${p.name} to a product`} className={sel} value="" onChange={e => { if (e.target.value) assignPhoto(e.target.value, p.id); }}>
                        <option value="">Use as cover for…</option>
                        {editable.map(r => <option key={r.id} value={r.id}>{r.title || r.fileName || 'Untitled product'}</option>)}
                      </select>
                    ) : p.state === 'failed' ? (
                      <p className="m-0 text-[12px] text-error">{p.error} <button type="button" onClick={() => retryUpload('photo', p.id)} className="underline bg-transparent border-none cursor-pointer text-error p-0">Retry</button></p>
                    ) : <p className="m-0 text-[12px] text-slate">{p.state === 'uploading' ? (p.pct >= 100 ? 'Processing…' : `Uploading ${p.pct}%`) : 'Waiting…'}</p>}
                    <button type="button" onClick={() => dropPhoto(p.id)} className="text-[12px] text-slate underline bg-transparent border-none cursor-pointer p-0 self-start">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply to selected */}
          {editable.length > 0 && (
            <div className="rounded-xl border border-bone bg-white">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <label className="inline-flex items-center gap-2 text-[13px] font-bold text-carbon cursor-pointer">
                  <label className="inline-flex items-center justify-center size-8 max-lg:size-10 -ms-2 cursor-pointer"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(editable.map(r => r.id)))} className="size-4 accent-brand-royal" aria-label="Select all products" /></label>
                  Select all
                </label>
                <span className="text-[13px] text-slate" data-testid="bulk-selected-count">{selectedRows.length} selected</span>
                <button type="button" onClick={() => setApOpen(o => !o)} aria-expanded={apOpen} className="ms-auto inline-flex items-center gap-1 text-[13px] font-bold text-brand-royal bg-transparent border-none cursor-pointer">
                  Apply to selected <ChevronDown size={14} className={apOpen ? 'rotate-180' : ''} />
                </button>
              </div>
              {apOpen && (
                <div className="border-t border-bone px-4 py-4 flex flex-col gap-3">
                  {selectedRows.length === 0 && <p className="m-0 text-[12.5px] text-slate">Tick the products you want to change, then fill only the fields to apply. Empty fields are left as they are.</p>}
                  <div className="flex flex-col gap-3">
                    <CategoryCascade idPrefix="ap" categories={categories} loading={catLoading} categoryId={ap.categoryId} subId={ap.subCategoryId} onChange={(c, s) => setAp(a => ({ ...a, categoryId: c, subCategoryId: s }))} />
                    <div className="lg:max-w-md"><ClassRange idPrefix="ap" from={ap.classFrom} to={ap.classTo} onChange={(f, t) => setAp(a => ({ ...a, classFrom: f, classTo: t }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label htmlFor="ap-price" className={lab}>Price ({currency})</label>
                      <input id="ap-price" type="number" min={0} inputMode="decimal" className={inp} value={ap.price} onChange={e => setAp(a => ({ ...a, price: e.target.value }))} />
                    </div>
                    <div>
                      <label htmlFor="ap-compare" className={lab}>Compare-at price</label>
                      <input id="ap-compare" type="number" min={0} inputMode="decimal" className={inp} value={ap.compareAt} onChange={e => setAp(a => ({ ...a, compareAt: e.target.value }))} />
                    </div>
                    {type === 'physical' && (
                      <div>
                        <label htmlFor="ap-stock" className={lab}>Stock quantity</label>
                        <input id="ap-stock" type="number" min={0} max={100000} inputMode="numeric" className={inp} value={ap.stock} disabled={ap.unlimited} onChange={e => setAp(a => ({ ...a, stock: e.target.value }))} />
                        <label className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] text-graphite cursor-pointer max-lg:py-2.5 max-lg:-my-1"><input type="checkbox" className="size-3.5 accent-brand-royal" checked={ap.unlimited} data-testid="ap-unlimited" onChange={e => setAp(a => { const n = toggleRemember({ value: a.stock, saved: a.savedStock }, e.target.checked); return { ...a, unlimited: e.target.checked, stock: n.value, savedStock: n.saved }; })} />Unlimited stock</label>
                      </div>
                    )}
                    {type === 'physical' && (
                      <div>
                        <label htmlFor="ap-weight" className={lab}>Shipping weight</label>
                        <div className="flex gap-1.5">
                          <input id="ap-weight" type="number" min={0} step="any" inputMode="decimal" className={inp} value={ap.weight} placeholder="e.g. 0.5" onChange={e => setAp(a => ({ ...a, weight: e.target.value }))} />
                          <select aria-label="Weight unit" id="ap-weight-unit" className={` !w-[72px] shrink-0`} value={ap.weightUnit} onChange={e => setAp(a => ({ ...a, weightUnit: e.target.value as WeightUnit }))}><option value="kg">kg</option><option value="g">g</option></select>
                        </div>
                      </div>
                    )}
                    {type === 'educational' && (
                      <div>
                        <label htmlFor="ap-level" className={lab}>Education level</label>
                        <select id="ap-level" className={sel} value={ap.level} onChange={e => setAp(a => ({ ...a, level: e.target.value }))}>
                          <option value="">Leave as is</option>
                          {LEVEL_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="ap-desc" className={lab}>Description</label>
                    <textarea id="ap-desc" rows={2} className={`${inp} resize-y`} value={ap.description} onChange={e => setAp(a => ({ ...a, description: e.target.value }))} placeholder="Same description for every selected product" />
                    <div className="mt-1.5 flex gap-4 text-[12.5px] text-graphite" role="radiogroup" aria-label="Description mode">
                      {(['replace', 'append'] as const).map(m => (
                        <label key={m} className="inline-flex items-center gap-1.5 cursor-pointer"><input type="radio" name="ap-mode" checked={ap.mode === m} onChange={() => setAp(a => ({ ...a, mode: m }))} className="accent-brand-royal" />{m === 'replace' ? 'Replace' : 'Add to the end'}</label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={applyToSelected} disabled={!selectedRows.length || !apFilled}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                      Apply to {selectedRows.length || ''} selected
                    </button>
                    {applyUndo && (
                      <span role="status" data-testid="apply-status" className="text-[13px] text-success font-semibold">Applied to {applyUndo.count} {applyUndo.count === 1 ? 'product' : 'products'}. <button type="button" data-testid="apply-undo" onClick={undoApply} className="ms-1 underline bg-transparent border-none cursor-pointer text-brand-royal font-bold p-0">Undo</button></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rows */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-3" data-testid="bulk-rows">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-graphite">
                <span className="font-bold text-carbon">{rows.length} product{rows.length === 1 ? '' : 's'}</span>
                <span>· {readyRows.length} ready</span>
                {editable.length - readyRows.length > 0 && <span className="text-error">· {editable.length - readyRows.length} {editable.length - readyRows.length === 1 ? 'product needs' : 'products need'} details</span>}
                {createdRows.length > 0 && <span className="text-success">· {createdRows.length} created</span>}
                {uploadingCount > 0 && <span className="inline-flex items-center gap-1 text-slate"><Loader2 size={13} className="animate-spin" /> uploading {uploadingCount}…</span>}
              </div>
              {rows.map((r, idx) => (
                <RowCard
                  key={r.id} row={r} index={idx} issue={r.createState === 'created' ? null : issueOf(r)} conflict={r.createState === 'created' ? null : rowPremiumConflict(r, ctx)} currencyCode={store?.baseCurrency} dupOf={dups.get(r.id)} currency={currency} type={type}
                  categories={categories} catLoading={catLoading} defaultCategoryId={defaultCategoryId}
                  selected={selected.has(r.id)}
                  onSelect={() => toggleSel(r.id)} onOpenDetail={g => setDetail({ rowId: r.id, group: g })}
                  onChange={p => { setApplyUndo(null); patchRow(r.id, p.createState === undefined && r.createState === 'failed' ? { ...p, createState: 'idle', createError: '' } : p); }}
                  onRemove={() => removeRow(r.id)} onDuplicate={() => duplicateRow(r)}
                  onRetryUpload={() => retryUpload('doc', r.id)} onAttach={f => attachFile(r.id, f)}
                  storeId={storeId}
                />
              ))}
              <button type="button" onClick={addRow} disabled={creating} data-testid="bulk-add-row"
                className="w-full rounded-xl border-2 border-dashed border-brand-royal/40 bg-white py-3 text-[14px] font-bold text-brand-royal cursor-pointer hover:bg-info-bg inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                <Plus size={16} /> Add product
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create bar */}
      {rows.length > 0 && (
        <div data-chat-avoid className="sticky bottom-[56px] lg:bottom-0 z-10 bg-white/95 backdrop-blur-md border-t border-bone px-4 md:px-8 py-2.5">
          <div className="mx-auto max-w-[1400px] flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1 text-[12.5px] text-slate leading-snug" role="status" data-testid="bulk-progress">
              {creating ? <span className="inline-flex items-center gap-1.5 font-bold text-carbon"><Loader2 size={14} className="animate-spin" /> Creating {progress.done}/{progress.total}…</span>
                : <span className="hidden sm:inline">{draft.savedAt ? `Saved on this device ${timeAgo(draft.savedAt, now)}` : 'Your table is saved on this device as you go.'}</span>}
              {!creating && editable.length - readyRows.length > 0 && <span className="block text-error font-semibold">{editable.length - readyRows.length} {editable.length - readyRows.length === 1 ? 'product needs' : 'products need'} details<span className="hidden sm:inline"> and will be left out until fixed</span>.</span>}
            </div>
            <button type="button" onClick={addRow} disabled={creating} aria-label="Add product" data-testid="bulk-add-row-bar"
              className="max-sm:flex-none px-3 py-[10px] rounded-lg text-[14px] font-bold text-brand-royal bg-white border border-brand-royal cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 whitespace-nowrap">
              <Plus size={15} /> <span className="hidden sm:inline">Add product</span><span className="sm:hidden">Add</span>
            </button>
            {failedCount > 0 && !creating && (
              <button type="button" onClick={() => runCreate(lastMode, true)} className="px-3 sm:px-4 py-[10px] rounded-lg text-[14px] font-bold text-error bg-white border border-error-border cursor-pointer inline-flex items-center gap-1.5"><RefreshCw size={14} /> Retry failed ({failedCount})</button>
            )}
            <button type="button" onClick={() => runCreate('draft')} disabled={creating || uploadingCount > 0 || readyRows.length === 0} data-testid="bulk-save-drafts"
              className="max-sm:flex-1 px-3 sm:px-4 py-[10px] rounded-lg text-[14px] font-bold text-brand-orange bg-white border border-bone cursor-pointer hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              <span className="sm:hidden">Save drafts</span><span className="hidden sm:inline">Save all as drafts</span>
            </button>
            <button type="button" onClick={() => runCreate('publish')} disabled={creating || uploadingCount > 0 || readyRows.length === 0} data-testid="bulk-publish"
              className="max-sm:flex-1 px-3 sm:px-5 py-[10px] rounded-lg text-[14px] font-bold bg-brand-orange text-white border-none cursor-pointer hover:bg-brand-deep-orange disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              Publish ready ({readyRows.length})
            </button>
          </div>
          {undo && (
            <div role="status" data-chat-avoid data-testid="bulk-undo" className="absolute bottom-full inset-x-4 mb-2 mx-auto max-w-[360px] rounded-xl bg-carbon text-white ps-4 pe-2 py-1 flex items-center gap-3 shadow-lg text-[13px]">
              <span className="flex-1">Product removed.</span>
              <button type="button" onClick={undoRemove} className="font-bold underline bg-transparent border-none text-white cursor-pointer px-2 min-h-[40px]">Undo</button>
            </div>
          )}
        </div>
      )}

      {undo && rows.length === 0 && (
        <div role="status" data-testid="bulk-undo" className="fixed z-30 bottom-[140px] lg:bottom-20 inset-x-4 mx-auto max-w-[360px] rounded-xl bg-carbon text-white px-4 py-2.5 flex items-center gap-3 shadow-lg text-[13px]">
          <span className="flex-1">Product removed.</span>
          <button type="button" onClick={undoRemove} className="font-bold underline bg-transparent border-none text-white cursor-pointer px-2 py-2.5 -my-2 min-h-[40px]">Undo</button>
        </div>
      )}

      {detail && detailRow && (
        <DetailModal
          key={`${detail.rowId}-${detail.group}`} row={detailRow} group={detail.group} type={type} currency={currency} currencyCode={store?.baseCurrency} tray={tray.filter(t => t.state === 'done')}
          onClose={() => setDetail(null)} onPatch={p => { setApplyUndo(null); patchRow(detail.rowId, p); }} onAssign={pid => assignPhoto(detail.rowId, pid)}
        />
      )}
    </div>
  );
}

// ── "Add details" dropdown + chips ────────────────────────────────────────────────────────────
function DetailsMenu({ row, type, onOpen, disabled }: { row: BulkRow; type: BulkType; onOpen: (g: DetailGroup) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h); document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const filled = filledGroups(row, type);
  return (
    <span ref={ref} className="relative inline-block">
      <button type="button" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)} data-testid="add-details"
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12.5px] font-bold text-brand-royal bg-white border border-bone cursor-pointer hover:bg-cream disabled:opacity-50">
        Add details <ChevronDown size={13} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full mt-1 z-20 w-[250px] rounded-xl border border-bone bg-white shadow-lg py-1">
          {groupsFor(type).map(g => (
            <button key={g.key} type="button" role="menuitem" onClick={() => { setOpen(false); onOpen(g.key); }}
              className="w-full text-start px-3 py-2 bg-transparent border-none cursor-pointer hover:bg-cream flex items-start gap-2">
              <span className="mt-0.5 size-4 shrink-0 text-success">{filled.includes(g.key) && <Check size={14} />}</span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold text-carbon">{g.label}</span><span className="block text-[12px] text-slate">{g.hint}</span></span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

const CHIP_LABEL = (g: DetailGroup, r: BulkRow) => ({
  price: 'Compare-at', download: 'Download settings', inventory: 'SKU',
  photos: `${r.images.length} photo${r.images.length === 1 ? '' : 's'}`, tags: `${r.tags.length} tag${r.tags.length === 1 ? '' : 's'}`,
}[g]);

// ── Modal that edits one optional group ───────────────────────────────────────────────────────
function DetailModal({ row, group, type, currency, currencyCode, tray, onClose, onPatch, onAssign }: {
  row: BulkRow; group: DetailGroup; type: BulkType; currency: string; currencyCode?: string | null; tray: TrayPhoto[];
  onClose: () => void; onPatch: (p: Partial<BulkRow>) => void; onAssign: (photoId: string) => void;
}) {
  const [d, setD] = useState({
    compareAt: row.compareAt, classFrom: row.classFrom, classTo: row.classTo, tags: row.tags, tagInput: '',
    sku: row.sku,
    downloadLimit: row.downloadLimit === 'unlimited' ? '' : row.downloadLimit, linkExpiryDays: row.linkExpiryDays, buyerMessage: row.buyerMessage,
  });
  const label = groupsFor(type).find(g => g.key === group)?.label ?? 'Details';
  const err = (() => {
    if (group === 'price' && d.compareAt.trim()) { const c = validatePrices({ price: row.free ? '0' : row.price, compareAt: d.compareAt, currency: currencyCode, free: row.free }).compareAt; if (c) return c; }
    if (group === 'download' && d.downloadLimit.trim() && !(Number.isInteger(Number(d.downloadLimit)) && Number(d.downloadLimit) >= 1)) return 'Download limit must be a whole number, or leave it empty for unlimited.';
    if (group === 'download' && d.linkExpiryDays.trim() && !(Number.isInteger(Number(d.linkExpiryDays)) && Number(d.linkExpiryDays) >= 1)) return 'Link expiry must be a whole number of days.';
    return '';
  })();
  const addTag = () => {
    const parts = d.tagInput.split(',').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setD(x => ({ ...x, tags: [...x.tags, ...parts.filter(p => !x.tags.includes(p))].slice(0, 30), tagInput: '' }));
  };
  const save = () => {
    if (err) return;
    if (group === 'price') onPatch({ compareAt: d.compareAt.trim() });
    if (group === 'tags') {
      const extra = d.tagInput.split(',').map(s => s.trim()).filter(Boolean);
      onPatch({ tags: [...d.tags, ...extra.filter(p => !d.tags.includes(p))].slice(0, 30) });
    }
    if (group === 'inventory') onPatch({ sku: d.sku.trim() });
    if (group === 'download') onPatch({ downloadLimit: d.downloadLimit.trim() || 'unlimited', linkExpiryDays: d.linkExpiryDays.trim(), buyerMessage: d.buyerMessage.trim() });
    onClose();
  };
  return (
    <Modal
      title={`${label} - ${row.title || 'Untitled product'}`} onClose={onClose} width={520} mobileSheet
      footer={group === 'photos'
        ? <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">Done</button>
        : <>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Cancel</button>
            <button type="button" onClick={save} disabled={!!err} data-testid="detail-save" className="px-4 py-2 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer disabled:opacity-50">Save</button>
          </>}
    >
      <div className="flex flex-col gap-3">
        {group === 'price' && (
          <div>
            <label htmlFor="dm-compare" className={lab}>Compare-at price ({currency})</label>
            <input id="dm-compare" type="number" min={0} step={currencyCode === 'PKR' ? 1 : 0.01} inputMode="decimal" className={inp} value={d.compareAt} onChange={e => setD(x => ({ ...x, compareAt: e.target.value }))} />
            <p className="m-0 mt-1.5 text-[12px] text-slate">Shown crossed out next to your price. Leave empty for no sale price.</p>
          </div>
        )}
        {group === 'photos' && (
          <>
            <p className="m-0 text-[12px] text-slate">The first photo is the cover (up to {MAX_ROW_PHOTOS}).</p>
            <ProductPhotosUploader value={row.images} onChange={urls => onPatch({ images: urls })} />
            {tray.length > 0 && (
              <div>
                <label htmlFor="dm-tray" className={lab}>Or use an unmatched photo</label>
                <select id="dm-tray" className={sel} value="" onChange={e => { if (e.target.value) onAssign(e.target.value); }}>
                  <option value="">Choose a photo…</option>
                  {tray.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            {baseOf(row.fileName) && <p className="m-0 text-[12px] text-slate">Tip: a photo named <b>{baseOf(row.fileName)}.jpg</b> dropped on the page attaches itself.</p>}
          </>
        )}
        {group === 'tags' && (
          <div>
            <label htmlFor="dm-tag" className={lab}>Tags (press Enter or comma)</label>
            <div className="flex gap-2">
              <input id="dm-tag" className={inp} value={d.tagInput} placeholder="e.g. phonics, ramadan" onChange={e => setD(x => ({ ...x, tagInput: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} />
              <button type="button" onClick={addTag} className="px-3 rounded-lg text-[13px] font-bold bg-white text-brand-royal border border-bone cursor-pointer">Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-[12.5px] text-carbon">{t}
                  <button type="button" aria-label={`Remove tag ${t}`} onClick={() => setD(x => ({ ...x, tags: x.tags.filter(y => y !== t) }))} className="bg-transparent border-none cursor-pointer p-0 text-slate"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>
        )}
        {group === 'inventory' && (
          <>
            <div>
              <label htmlFor="dm-sku" className={lab}>SKU <span className="font-normal text-slate">(optional, made for you if empty)</span></label>
              <input id="dm-sku" className={inp} value={d.sku} maxLength={60} onChange={e => setD(x => ({ ...x, sku: e.target.value }))} />
            </div>
          </>
        )}
        {group === 'download' && (
          <>
            <div>
              <label htmlFor="dm-limit" className={lab}>Download limit per buyer</label>
              <input id="dm-limit" type="number" min={1} inputMode="numeric" className={inp} value={d.downloadLimit} placeholder="Empty = unlimited" onChange={e => setD(x => ({ ...x, downloadLimit: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="dm-expiry" className={lab}>Download link expires after (days)</label>
              <input id="dm-expiry" type="number" min={1} inputMode="numeric" className={inp} value={d.linkExpiryDays} placeholder="Empty = never" onChange={e => setD(x => ({ ...x, linkExpiryDays: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="dm-msg" className={lab}>Message shown to the buyer after purchase</label>
              <textarea id="dm-msg" rows={3} className={`${inp} resize-y`} value={d.buyerMessage} onChange={e => setD(x => ({ ...x, buyerMessage: e.target.value }))} />
            </div>
          </>
        )}
        {err && <p role="alert" className="m-0 text-[13px] text-error">{err}</p>}
      </div>
    </Modal>
  );
}

// ── One product row ───────────────────────────────────────────────────────────────────────────
function RowCard({ row: r, index, issue, conflict, currencyCode, dupOf, currency, type, categories, catLoading, defaultCategoryId, selected, storeId, onSelect, onOpenDetail, onChange, onRemove, onDuplicate, onRetryUpload, onAttach }: {
  row: BulkRow; index: number; issue: string | null; conflict: PremiumConflict | null; currencyCode?: string | null; dupOf?: number; currency: string; type: BulkType;
  categories: CategoryNode[]; catLoading: boolean; defaultCategoryId: string; selected: boolean; storeId: string;
  onSelect: () => void; onOpenDetail: (g: DetailGroup) => void; onChange: (p: Partial<BulkRow>) => void; onRemove: () => void; onDuplicate: () => void; onRetryUpload: () => void; onAttach: (f: File) => void;
}) {
  const created = r.createState === 'created';
  const busy = r.createState === 'creating';
  const lock = created || busy;
  const catId = r.categoryId || defaultCategoryId;
  const needsFile = type !== 'physical';
  const statusLabel = created
    ? (r.createdStatus === 'draft' ? 'Saved as draft' : r.createdStatus === 'pending_review' ? 'Sent for review' : 'Published')
    : r.createState === 'creating' ? 'Creating…' : r.createState === 'failed' ? 'Failed' : issue ? issue : 'Ready';
  const tone = created ? 'bg-success-bg text-success border-success/30'
    : r.createState === 'failed' || issue ? 'bg-error-bg text-error border-error-border'
    : r.createState === 'creating' ? 'bg-info-bg text-brand-royal border-info/30' : 'bg-success-bg text-success border-success/30';
  const uploading = r.uploadState === 'queued' || r.uploadState === 'uploading';
  const fileRef = useRef<HTMLInputElement>(null);
  const chips = filledGroups(r, type);
  const name = r.title.trim() || r.fileName || `product ${index + 1}`;
  const moneyStep = currencyCode === 'PKR' ? 1 : 0.01;
  const priceErr = validatePrices({ price: r.free ? '0' : r.price, compareAt: r.compareAt, currency: currencyCode, free: r.free });
  return (
    <div className={`rounded-xl border bg-white p-3 sm:p-4 ${created ? 'border-success/30 opacity-90' : issue || r.createState === 'failed' ? 'border-error-border' : 'border-bone'}`} data-testid="bulk-row" data-row-title={r.title}>
      <div className="flex flex-wrap items-center gap-2">
        {!created && <label className="inline-flex items-center justify-center size-8 max-lg:size-10 -ms-2 shrink-0 cursor-pointer"><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${name}`} className="size-4 accent-brand-royal" /></label>}
        <span className="text-[12px] text-slate">#{index + 1}</span>
        {needsFile && r.fileName && <span className="inline-flex items-center gap-1.5 text-[12px] text-graphite min-w-0 max-w-full"><FileText size={13} className="shrink-0" /><span className="truncate" title={r.fileName}>{r.fileName}</span></span>}
        {needsFile && !created && (r.uploadState === 'none' || r.uploadState === 'done' || (r.uploadState === 'failed' && !r.fileName)) && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} data-testid="attach-file"
              className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-royal bg-transparent border-none cursor-pointer p-0 hover:underline">
              <Paperclip size={12} /> {r.uploadState === 'done' ? 'Replace file' : 'Choose file'}
            </button>
            <input ref={fileRef} type="file" accept={DOC_EXTENSIONS.map(x => `.${x}`).join(',')} className="hidden" aria-label={`File for ${name}`}
              onChange={e => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = ''; }} />
          </>
        )}
        {needsFile && uploading && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-slate" role="status">
            <Loader2 size={12} className="animate-spin" /> {r.uploadState === 'uploading' ? (r.uploadPct >= 100 ? 'Processing…' : `Uploading ${r.uploadPct}%`) : 'Waiting to upload'}
            <span className="inline-block w-20 h-1.5 rounded bg-mist overflow-hidden"><span className="block h-full bg-brand-royal" style={{ width: `${r.uploadPct}%` }} /></span>
          </span>
        )}
        {needsFile && !created && r.uploadState === 'done' && (
          <span className="inline-flex items-center gap-1 text-[12px] text-success font-semibold" data-testid="upload-done"><CheckCircle2 size={12} /> Uploaded</span>
        )}
        {needsFile && r.uploadState === 'failed' && (
          <span className="text-[12px] text-error" role="alert">{r.uploadError} {r.fileName && <button type="button" onClick={onRetryUpload} className="underline bg-transparent border-none cursor-pointer text-error p-0 font-semibold">Retry upload</button>}</span>
        )}
        <span className="ms-auto inline-flex items-center gap-1.5">
          <span data-testid="bulk-row-status" className={`px-2.5 py-1 rounded-full text-[12px] font-bold border ${tone}`}>{statusLabel}</span>
          {created && r.productId && <Link to={`/store/${storeId}/products/edit/${r.productId}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-royal no-underline hover:underline">Edit</Link>}
          {!created && <DetailsMenu row={r} type={type} onOpen={onOpenDetail} disabled={busy} />}
          {!created && <button type="button" onClick={onDuplicate} disabled={busy || r.uploadState === 'queued' || r.uploadState === 'uploading'} aria-label={`Duplicate ${name}`} title="Duplicate" className="size-8 shrink-0 max-lg:size-10 rounded-lg flex items-center justify-center text-slate hover:bg-cream border-none bg-transparent cursor-pointer disabled:opacity-40"><Copy size={15} /></button>}
          {!created && <button type="button" onClick={onRemove} disabled={busy} aria-label={`Remove ${name}`} title="Remove" className="size-8 shrink-0 max-lg:size-10 rounded-lg flex items-center justify-center text-slate hover:text-error hover:bg-error-bg border-none bg-transparent cursor-pointer disabled:opacity-40"><Trash2 size={15} /></button>}
        </span>
      </div>
      {chips.length > 0 && !created && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Details added">
          {chips.map(g => (
            <button key={g} type="button" onClick={() => onOpenDetail(g)} data-testid={`chip-${g}`} title="Edit"
              className="inline-flex items-center gap-1 rounded-full bg-info-bg text-brand-royal border border-info/30 px-2.5 py-0.5 text-[12px] font-semibold cursor-pointer">
              <span className="size-1.5 rounded-full bg-brand-royal" /> {CHIP_LABEL(g, r)}
            </button>
          ))}
        </div>
      )}
      {r.createState === 'failed' && r.createError && <p role="alert" className="m-0 mt-2 text-[13px] text-error bg-error-bg rounded-lg px-3 py-2">{r.createError}</p>}
      {!created && rowWarnings(r).map(w => <p key={w} role="status" className="m-0 mt-2 text-[12.5px] text-[#8a5a00] bg-[#fff6e0] rounded-lg px-3 py-1.5">{w}</p>)}
      {dupOf !== undefined && !created && <p className="m-0 mt-2 text-[12.5px] text-[#8a5a00] bg-[#fff6e0] rounded-lg px-3 py-1.5">Same title as product #{dupOf}. Buyers may find it confusing - consider changing it.</p>}

      {conflict && (
        <div role="alert" data-testid="premium-conflict" className="mt-2 rounded-lg border border-error-border bg-error-bg px-3 py-2 text-[12.5px] text-error flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex-1 min-w-[220px]"><b>{conflict.short}.</b> {conflict.detail}</span>
          <button type="button" data-testid="use-max-allowed" disabled={busy}
            onClick={() => onChange({ compareAt: conflict.max == null ? '' : String(conflict.max) })}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white text-brand-royal border border-brand-royal cursor-pointer disabled:opacity-50">
            {conflict.max == null ? 'Remove compare-at price' : `Use max allowed (${currency} ${conflict.max.toLocaleString('en-US')})`}
          </button>
        </div>
      )}

      {!created && (
        <div className="mt-3 grid grid-cols-12 gap-3">
          <div className="col-span-4 sm:col-span-2 lg:col-span-1">
            <span className={lab}>Cover</span>
            <button type="button" onClick={() => onOpenDetail('photos')} aria-label={`Photos for ${name}`}
              className="relative size-[72px] rounded-lg border-2 border-dashed border-bone bg-cream flex items-center justify-center overflow-hidden cursor-pointer p-0">
              {r.images[0] ? <img src={r.images[0]} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={22} className="text-slate" />}
              {r.images.length > 1 && <span className="absolute bottom-0.5 end-0.5 bg-black/70 text-white text-[12px] font-bold rounded px-1">{r.images.length}</span>}
            </button>
          </div>
          <div className="col-span-8 sm:col-span-10 lg:col-span-5">
            <label htmlFor={`t-${r.id}`} className={lab}>Title</label>
            <input id={`t-${r.id}`} className={inp} disabled={lock} maxLength={200} value={r.title} onChange={e => onChange({ title: e.target.value })} placeholder="Product title" />
          </div>
          <div className={`col-span-6 ${type === 'digital' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`p-${r.id}`} className={lab}>Price ({currency})</label>
              {type !== 'physical' && <label className="mb-1 inline-flex items-center gap-1 text-[12px] text-graphite cursor-pointer max-lg:py-2.5 max-lg:-my-2.5"><input type="checkbox" className="size-3.5 accent-brand-royal" disabled={lock} checked={r.free} data-testid="free-toggle" onChange={e => { const n = toggleRemember({ value: r.price, saved: r.savedPrice }, e.target.checked); onChange({ free: e.target.checked, price: n.value, savedPrice: n.saved }); }} />Free</label>}
            </div>
            <input id={`p-${r.id}`} className={inp} type="number" min={0} step={moneyStep} inputMode="decimal" disabled={lock || r.free} value={r.free ? '' : r.price} placeholder={r.free ? 'Free' : ''} onChange={e => onChange({ price: e.target.value })} aria-invalid={!r.free && r.price.trim() !== '' && !!priceErr.price} />
          </div>
          {type === 'physical' && (
            <div className="col-span-6 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`s-${r.id}`} className={lab}>Stock quantity</label>
                <label className="mb-1 inline-flex items-center gap-1 text-[12px] text-graphite cursor-pointer max-lg:py-2.5 max-lg:-my-2.5"><input type="checkbox" className="size-3.5 accent-brand-royal" disabled={lock} checked={r.unlimitedStock} data-testid="unlimited-toggle" onChange={e => { const n = toggleRemember({ value: r.stock, saved: r.savedStock }, e.target.checked); onChange({ unlimitedStock: e.target.checked, stock: n.value, savedStock: n.saved, zeroStockOk: false }); }} />Unlimited</label>
              </div>
              <input id={`s-${r.id}`} className={inp} type="number" min={0} max={100000} step={1} inputMode="numeric" disabled={lock || r.unlimitedStock} value={r.unlimitedStock ? '' : r.stock} placeholder={r.unlimitedStock ? 'Unlimited' : '0'} onChange={e => onChange({ stock: e.target.value, zeroStockOk: false })} />
              {!r.unlimitedStock && r.stock.trim() !== '' && Number(r.stock) === 0 && (
                <label className="mt-1.5 flex items-start gap-1.5 text-[12px] text-[#8a5a00] cursor-pointer" data-testid="zero-stock-warning">
                  <input type="checkbox" className="mt-0.5 size-3.5 accent-brand-royal" disabled={lock} checked={r.zeroStockOk} data-testid="zero-stock-ok" onChange={e => onChange({ zeroStockOk: e.target.checked })} />
                  <span>Stock is 0 - product will show as out of stock. Publish as out of stock</span>
                </label>
              )}
            </div>
          )}
          {type === 'physical' && (
            <div className="col-span-12 sm:col-span-6 lg:col-span-3">
              <label htmlFor={`w-${r.id}`} className={`${lab} flex items-center gap-1.5`}>Shipping weight {weightError(r.weight, r.weightUnit) && !created && <span data-testid="weight-badge" className="rounded-full bg-error-bg text-error border border-error-border px-1.5 text-[12px] font-bold">{r.weight.trim() === '' ? 'Missing' : 'Invalid'}</span>}</label>
              <div className="flex gap-1.5">
                <input id={`w-${r.id}`} className={inp} type="number" min={0} step="any" inputMode="decimal" disabled={lock} value={r.weight} placeholder="e.g. 0.5" aria-invalid={!!weightError(r.weight, r.weightUnit)} onChange={e => onChange({ weight: e.target.value })} />
                <select aria-label={`Weight unit for ${name}`} className={`${sel} !w-[72px] shrink-0`} disabled={lock} value={r.weightUnit} onChange={e => onChange({ weightUnit: e.target.value as WeightUnit })}>
                  <option value="kg">kg</option><option value="g">g</option>
                </select>
              </div>
            </div>
          )}
          {type === 'educational' && (
            <div className="col-span-6 lg:col-span-3">
              <label htmlFor={`l-${r.id}`} className={lab}>Education level</label>
              <select id={`l-${r.id}`} className={sel} disabled={lock} value={effectiveLevel(r)} onChange={e => onChange({ educationLevel: e.target.value })}>
                <option value="">Choose…</option>
                {LEVEL_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-12">
            <CategoryCascade idPrefix={`r-${r.id}`} categories={categories} loading={catLoading} categoryId={catId} subId={r.subCategoryId} disabled={lock}
              auto={!r.categoryId && !!defaultCategoryId} onConfirmAuto={() => onChange({ categoryId: catId })}
              onChange={(c, s) => onChange({ categoryId: c, subCategoryId: s })} />
          </div>
          <div className="col-span-12">
            <ClassRange idPrefix={`c-${r.id}`} from={r.classFrom} to={r.classTo} disabled={lock} onChange={(f, t2) => onChange({ classFrom: f, classTo: t2 })} />
          </div>
          <div className="col-span-12">
            <label htmlFor={`d-${r.id}`} className={lab}>Description</label>
            <textarea id={`d-${r.id}`} disabled={lock} rows={2} className={`${inp} resize-y min-h-[56px] focus:min-h-[130px]`} value={r.description} onChange={e => onChange({ description: e.target.value })} placeholder="Tell buyers what they get (required)" />
          </div>
        </div>
      )}
      {created && <p className="m-0 mt-2 text-[14px] font-semibold text-carbon">{r.title}</p>}
    </div>
  );
}
