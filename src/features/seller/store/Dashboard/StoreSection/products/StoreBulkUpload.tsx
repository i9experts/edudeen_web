import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, ChevronDown, Copy, ExternalLink, FileText, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud, X,
} from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { apiCreateDigitalProduct, EDUCATION_LEVELS, type EducationLevel } from '@/api/services/product';
import { apiUploadPrivateFile, apiUploadPublicFile } from '@/api/upload';
import { useSellerCategories } from '@/hooks/store/useSellerCategories';
import type { CategoryNode } from '@/api/services/categories';
import { currencySymbol as symbolForCurrency } from '@/utils/currency';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { EMPTY_DELIVERY, deliveryPayload } from '@/features/seller/components/products/DeliveryFormatField';
import { learningPayload } from '@/features/seller/components/products/LearningFields';
import { ProductPhotosUploader } from './ProductPhotosUploader';
import { effectiveSellerPercent, premiumGapMessage, usePremiumTerms } from './PremiumEarningsCalculator';
import { timeAgo, useDraftAutosave, useLeaveGuard } from './ProductWizard';
import { inp } from './ProductFormKit';
import {
  DOC_EXTENSIONS, MAX_BULK_FILES, MAX_BULK_PHOTOS, MAX_DOC_BYTES, MAX_PHOTO_BYTES, MAX_ROW_PHOTOS,
  baseOf, blankRow, duplicateTitles, effectiveLevel, extOf, isDocName, isPhotoName, findPhotoMatches, newId, rowIssue,
  type BulkRow, type BulkType, type TrayPhoto,
} from './bulkUtils';

const CONCURRENCY = 3;
const sel = `${inp} !py-[8px] !text-[13px] cursor-pointer`;
const lab = 'block text-[12px] font-semibold text-graphite mb-1';

interface Saved { type: BulkType; rows: BulkRow[]; tray: TrayPhoto[] }
interface RunSummary { created: number; published: number; inReview: number; drafts: number; failed: number; skipped: number }

// ── Compact category cascade (same data + rules as the Add Product form) ─────────────────────
function pathTo(nodes: CategoryNode[], id: string): CategoryNode[] {
  for (const n of nodes) {
    if (n._id === id) return [n];
    const rest = pathTo(n.children ?? [], id);
    if (rest.length) return [n, ...rest];
  }
  return [];
}

function CategoryCascade({ categories, loading, categoryId, subId, onChange, idPrefix, disabled }: {
  categories: CategoryNode[]; loading: boolean; categoryId: string; subId: string; idPrefix: string; disabled?: boolean;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <label htmlFor={`${idPrefix}-cat`} className={lab}>Category</label>
        <select id={`${idPrefix}-cat`} className={sel} disabled={loading || disabled} value={categoryId} onChange={e => onChange(e.target.value, '')}>
          {loading && <option value={categoryId}>Loading…</option>}
          {!loading && !categories.some(c => c._id === categoryId) && <option value="">Choose a category</option>}
          {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>
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
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [lastMode, setLastMode] = useState<'draft' | 'publish'>('draft');
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState('');

  const supportsDigital = !store || (store.productTypes ?? []).includes('digital_downloads');
  const supportsEducational = !store || (store.productTypes ?? []).includes('educational_resources');
  const defaultCategoryId = store?.categoryId ?? '';
  const storePremiumPct = store?.premiumDiscount?.enabled ? store.premiumDiscount.percent : 0;
  const { terms: premiumTerms } = usePremiumTerms('digital', store?.baseCurrency, storeId);

  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(t); }, []);
  useEffect(() => {
    if (!store) return;
    if (type === 'digital' && !supportsDigital && supportsEducational) setType('educational');
    if (type === 'educational' && !supportsEducational && supportsDigital) setType('digital');
  }, [store, type, supportsDigital, supportsEducational]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

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
      const finish = () => { active.current -= 1; filesRef.current.delete(job.id); pump(); };
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
        void finish;
      }
    }
  }, [patchRow, patchPhoto]);

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
      } else if (isDocName(f.name)) {
        if (f.size > MAX_DOC_BYTES) msgs.push(`${f.name}: file is larger than 500 MB.`);
        else if (f.size === 0) msgs.push(`${f.name}: the file is empty.`);
        else docs.push(f);
      } else {
        msgs.push(`${f.name}: ".${extOf(f.name) || '?'}" files are not supported.`);
      }
    }
    const current = rowsRef.current;
    const fresh = docs.filter(f => !current.some(r => r.fileName === f.name && r.fileSize === f.size));
    if (fresh.length < docs.length) msgs.push(`${docs.length - fresh.length} file${docs.length - fresh.length > 1 ? 's were' : ' was'} already added.`);
    const room = Math.max(0, MAX_BULK_FILES - current.length);
    const takeDocs = fresh.slice(0, room);
    if (fresh.length > takeDocs.length) msgs.push(`You can add up to ${MAX_BULK_FILES} files in one batch - ${fresh.length - takeDocs.length} extra file${fresh.length - takeDocs.length > 1 ? 's were' : ' was'} not added. Upload them in a second batch.`);
    const photoRoom = Math.max(0, MAX_BULK_PHOTOS - tray.length);
    const takePhotos = photos.slice(0, photoRoom);
    if (photos.length > takePhotos.length) msgs.push(`Up to ${MAX_BULK_PHOTOS} unassigned photos at a time - some were not added.`);
    setNotice(msgs.join(' '));

    const newRows = takeDocs.map(f => { const r = blankRow(f); filesRef.current.set(r.id, f); return r; });
    const newPhotos: TrayPhoto[] = takePhotos.map(f => ({ id: newId(), name: f.name, url: '', state: 'queued', pct: 0, error: '' }));
    takePhotos.forEach((f, i) => filesRef.current.set(newPhotos[i].id, f));
    if (newRows.length) { rowsRef.current = [...rowsRef.current, ...newRows]; setRows(rowsRef.current); }
    if (newPhotos.length) setTray(prev => [...prev, ...newPhotos]);
    queue.current.push(...newRows.map(r => ({ kind: 'doc' as const, id: r.id })), ...newPhotos.map(p => ({ kind: 'photo' as const, id: p.id })));
    summaryClear();
    pump();
  };
  const summaryClear = () => setSummary(null);

  const retryUpload = (kind: 'doc' | 'photo', id: string) => {
    if (!filesRef.current.has(id)) { setNotice('That file is no longer in memory (the page was reloaded). Remove this row and drop the file again.'); return; }
    queue.current.push({ kind, id });
    if (kind === 'doc') patchRow(id, { uploadState: 'queued', uploadError: '' }); else patchPhoto(id, { state: 'queued', error: '' });
    pump();
  };

  // Photos whose file name matches a document (ignoring extension/case) become that product's cover.
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
    const restored = (d.rows ?? []).map<BulkRow>(r => (r.uploadState === 'done' ? { ...r, createState: r.createState === 'creating' ? 'idle' : r.createState }
      : { ...r, uploadState: 'failed', uploadError: 'This file was not finished uploading. Remove the row and drop the file again.', createState: r.createState === 'creating' ? 'idle' : r.createState }));
    setType(d.type === 'educational' ? 'educational' : 'digital');
    setRows(restored);
    setTray((d.tray ?? []).filter(t => t.state === 'done'));
    draft.accept();
  };

  // ── Row helpers ──────────────────────────────────────────────────────────────────────────────
  const ctx = useMemo(() => ({
    type, hasDefaultCategory: !!defaultCategoryId,
    premiumGap: premiumTerms ? (price: number, compareAt: number) => premiumGapMessage(price, compareAt, effectiveSellerPercent('', storePremiumPct, false), premiumTerms.minGapPercent) : undefined,
  }), [type, defaultCategoryId, premiumTerms, storePremiumPct]);
  const issueOf = (r: BulkRow) => rowIssue(r, ctx);
  const dups = useMemo(() => duplicateTitles(rows), [rows]);
  const editable = rows.filter(r => r.createState !== 'created');
  const readyRows = editable.filter(r => !issueOf(r));
  const uploadingCount = rows.filter(r => r.uploadState === 'queued' || r.uploadState === 'uploading').length + tray.filter(t => t.state === 'queued' || t.state === 'uploading').length;

  const toggleSel = (id: string) => setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleOpen = (id: string) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = editable.length > 0 && editable.every(r => selected.has(r.id));

  const removeRow = (id: string) => {
    queue.current = queue.current.filter(j => j.id !== id);
    filesRef.current.delete(id);
    setRows(prev => prev.filter(r => r.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };
  const duplicateRow = (r: BulkRow) => {
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
  const [ap, setAp] = useState({ categoryId: '', subCategoryId: '', classFrom: '', classTo: '', level: '', price: '', compareAt: '', description: '', mode: 'replace' as 'replace' | 'append' });
  const [apOpen, setApOpen] = useState(true);
  const apFilled = !!(ap.categoryId || ap.classFrom || ap.classTo || ap.level || ap.price.trim() || ap.compareAt.trim() || ap.description.trim());
  const selectedRows = editable.filter(r => selected.has(r.id));
  const applyToSelected = () => {
    if (!selectedRows.length || !apFilled) return;
    const ids = new Set(selectedRows.map(r => r.id));
    setRows(prev => prev.map(r => {
      if (!ids.has(r.id)) return r;
      const n = { ...r };
      if (ap.categoryId) { n.categoryId = ap.categoryId; n.subCategoryId = ap.subCategoryId; }
      if (ap.classFrom || ap.classTo) { n.classFrom = ap.classFrom; n.classTo = ap.classTo; }
      if (ap.level) n.educationLevel = ap.level;
      if (ap.price.trim()) n.price = ap.price.trim();
      if (ap.compareAt.trim()) n.compareAt = ap.compareAt.trim();
      if (ap.description.trim()) n.description = ap.mode === 'append' && n.description.trim() ? `${n.description.trim()}\n${ap.description.trim()}` : ap.description.trim();
      if (n.createState === 'failed') { n.createState = 'idle'; n.createError = ''; }
      return n;
    }));
    setToast(`Applied to ${selectedRows.length} ${selectedRows.length === 1 ? 'product' : 'products'}.`);
  };

  // ── Create ───────────────────────────────────────────────────────────────────────────────────
  const createOne = async (r: BulkRow, mode: 'draft' | 'publish') => {
    patchRow(r.id, { createState: 'creating', createError: '' });
    try {
      const res = await apiCreateDigitalProduct({
        storeId, name: r.title.trim(), description: r.description.trim(),
        productType: type,
        categoryId: r.categoryId || undefined, subCategoryId: r.subCategoryId || null,
        images: r.images, tags: [],
        educationLevel: type === 'educational' ? (effectiveLevel(r) as EducationLevel) : null,
        customLevel: null,
        isListedOnEdudeen: true, status: mode === 'publish' ? 'active' : 'draft',
        price: Number(r.price), compareAtPrice: r.compareAt.trim() ? Number(r.compareAt) : null,
        ...learningPayload({ curricula: [], ageMin: '', ageMax: '', classFrom: r.classFrom, classTo: r.classTo }),
        ...deliveryPayload(EMPTY_DELIVERY),
        licenseTiers: [],
        digital: {
          files: [{ url: r.upload!.publicId, name: r.upload!.fileName, size: r.upload!.fileSize, mimeType: r.upload!.mimeType }],
          downloadLimit: 'unlimited', linkExpiryDays: null, pdfStampingEnabled: false, licenseType: 'personal', buyerDeliveryMessage: '',
          preview: { enabled: false, sourceFileIndex: 0 }, sampleFile: null,
        },
      });
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
    let next = 0; let done = 0; const results: { ok: boolean; id: string }[] = [];
    const worker = async () => {
      while (next < targets.length) {
        const r = targets[next++];
        const ok = await createOne(r, mode);
        results.push({ ok, id: r.id });
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
    setRows([]); setTray([]); setSelected(new Set()); setOpen(new Set()); setSummary(null); setNotice('');
    window.location.reload();
  };
  const clearCreated = () => setRows(prev => prev.filter(r => r.createState !== 'created'));
  const goProducts = () => { guard.allow.current = true; draft.clear(); navigate(`/store/${storeId}/products`); };

  // ── Drag & drop ──────────────────────────────────────────────────────────────────────────────
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };
  const inputRef = useRef<HTMLInputElement>(null);
  const dropAccept = [...DOC_EXTENSIONS, 'png', 'jpg', 'jpeg', 'webp'].map(x => `.${x}`).join(',');

  const showEmpty = rows.length === 0 && tray.length === 0;
  const failedCount = rows.filter(r => r.createState === 'failed').length;
  const createdRows = rows.filter(r => r.createState === 'created');
  const pendingPhotos = tray.length;
  const canType = { digital: supportsDigital || !store, educational: supportsEducational || !store };
  const noTypes = !!store && !supportsDigital && !supportsEducational;

  return (
    <div className="min-h-full">
      <StorePageHeader
        title="Bulk upload"
        subtitle="Add many digital or educational products at once."
        actions={<Link to={`/store/${storeId}/products/add`} className="text-[13px] font-bold text-brand-royal no-underline hover:underline">Add one product instead</Link>}
      />
      {guard.dialog}

      <div className="px-4 md:px-8 py-5 pb-28">
        <div className="mx-auto max-w-[1400px] flex flex-col gap-4">
          {/* How it works */}
          <ol className="m-0 p-0 list-none grid sm:grid-cols-3 gap-2 text-[13px] text-graphite" aria-label="How bulk upload works">
            {['Drop all your files (and cover photos) here. A photo named like its file becomes the cover.', 'Check the table. Fill the red items, or select rows and use Apply to selected.', 'Save all as drafts, or publish the ready ones. Nothing is lost if a row fails.'].map((t, i) => (
              <li key={i} className="flex gap-2 items-start rounded-xl bg-white border border-bone px-3 py-2.5">
                <span className="size-5 shrink-0 rounded-full bg-brand-royal text-white text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>

          {draft.restorable && !summary && (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-info/30 bg-info-bg px-4 py-3 text-[13px] text-carbon">
              <span className="flex-1 min-w-[200px]"><b>Continue your bulk upload?</b> You have {draft.restorable.data?.rows?.length ?? 0} product{(draft.restorable.data?.rows?.length ?? 0) === 1 ? '' : 's'} saved from {timeAgo(draft.restorable.savedAt, now)}. Files that were already uploaded will not upload again.</span>
              <button type="button" onClick={restore} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-brand-royal text-white border-none cursor-pointer">Continue</button>
              <button type="button" onClick={draft.dismiss} className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-white text-graphite border border-bone cursor-pointer">Start fresh</button>
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

          {noTypes && <p role="alert" className="m-0 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-4 py-3">Your store sells physical products only. Bulk upload is for digital and educational products.</p>}

          {/* Type choice + drop zone */}
          <div className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] font-bold text-carbon">These are:</span>
              <div role="radiogroup" aria-label="Product type" className="inline-flex gap-2">
                {(['digital', 'educational'] as const).map(t => (
                  <button key={t} type="button" role="radio" aria-checked={type === t} disabled={!canType[t] || rows.some(r => r.createState === 'created')}
                    onClick={() => setType(t)}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-bold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${type === t ? 'bg-brand-royal text-white border-brand-royal' : 'bg-white text-graphite border-bone hover:bg-cream'}`}>
                    {t === 'digital' ? 'Digital downloads' : 'Educational resources'}
                  </button>
                ))}
              </div>
              <span className="text-[12px] text-slate">Physical products with stock and shipping are not part of bulk upload - add those one by one.</span>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              className={`rounded-xl border-2 border-dashed text-center transition-colors ${drag ? 'border-brand-royal bg-info-bg' : 'border-bone bg-cream/50'} ${showEmpty ? 'py-12 px-4' : 'py-4 px-4'}`}
              data-testid="bulk-dropzone"
            >
              <UploadCloud size={showEmpty ? 40 : 24} className="mx-auto text-brand-royal" />
              <p className="m-0 mt-2 text-[15px] font-bold text-carbon">{showEmpty ? 'Drag and drop your files here' : 'Drop more files here'}</p>
              <p className="m-0 mt-1 text-[12.5px] text-slate">PDF, Word, PowerPoint, Excel, ZIP and more (up to 500 MB each), plus cover photos (PNG, JPG, WebP, up to 10 MB). Up to {MAX_BULK_FILES} files per batch.</p>
              <button type="button" onClick={() => inputRef.current?.click()} disabled={noTypes}
                className="mt-3 px-4 py-2 rounded-lg text-[14px] font-bold bg-brand-royal text-white border-none cursor-pointer disabled:opacity-50">Select files</button>
              <input ref={inputRef} data-testid="bulk-input" type="file" multiple accept={dropAccept} className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
            </div>
            {notice && (
              <p role="alert" className="m-0 flex items-start gap-2 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> <span className="flex-1">{notice}</span>
                <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')} className="bg-transparent border-none cursor-pointer text-error p-0"><X size={14} /></button>
              </p>
            )}
            {catError && <p role="alert" className="m-0 text-[13px] text-error">Could not load categories. <button type="button" onClick={refetchCats} className="underline bg-transparent border-none cursor-pointer text-error p-0">Try again</button></p>}
          </div>

          {/* Unmatched photos */}
          {pendingPhotos > 0 && (
            <div className="rounded-xl border border-bone bg-white p-4" data-testid="bulk-tray">
              <h2 className="m-0 text-[14px] font-bold text-carbon">Unmatched photos ({pendingPhotos})</h2>
              <p className="m-0 mt-0.5 mb-3 text-[12.5px] text-slate">These photos did not match a file name. Pick the product each one belongs to, or leave them out.</p>
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
                        {editable.map(r => <option key={r.id} value={r.id}>{r.title || r.fileName}</option>)}
                      </select>
                    ) : p.state === 'failed' ? (
                      <p className="m-0 text-[12px] text-error">{p.error} <button type="button" onClick={() => retryUpload('photo', p.id)} className="underline bg-transparent border-none cursor-pointer text-error p-0">Retry</button></p>
                    ) : <p className="m-0 text-[12px] text-slate">{p.state === 'uploading' ? `Uploading ${p.pct}%` : 'Waiting…'}</p>}
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
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(editable.map(r => r.id)))} className="size-4 accent-brand-royal" aria-label="Select all products" />
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
                  <div className="grid lg:grid-cols-2 gap-3">
                    <CategoryCascade idPrefix="ap" categories={categories} loading={catLoading} categoryId={ap.categoryId} subId={ap.subCategoryId} onChange={(c, s) => setAp(a => ({ ...a, categoryId: c, subCategoryId: s }))} />
                    <ClassRange idPrefix="ap" from={ap.classFrom} to={ap.classTo} onChange={(f, t) => setAp(a => ({ ...a, classFrom: f, classTo: t }))} />
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
                    {toast && <span role="status" className="text-[13px] text-success font-semibold">{toast}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review rows */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-3" data-testid="bulk-rows">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-graphite">
                <span className="font-bold text-carbon">{rows.length} product{rows.length === 1 ? '' : 's'}</span>
                <span>· {readyRows.length} ready</span>
                {editable.length - readyRows.length > 0 && <span className="text-error">· {editable.length - readyRows.length} need details</span>}
                {createdRows.length > 0 && <span className="text-success">· {createdRows.length} created</span>}
                {uploadingCount > 0 && <span className="inline-flex items-center gap-1 text-slate"><Loader2 size={13} className="animate-spin" /> uploading {uploadingCount}…</span>}
              </div>
              {rows.map((r, idx) => {
                const issue = r.createState === 'created' ? null : issueOf(r);
                return (
                  <RowCard
                    key={r.id} row={r} index={idx} issue={issue} dupOf={dups.get(r.id)} currency={currency} type={type}
                    categories={categories} catLoading={catLoading} defaultCategoryId={defaultCategoryId}
                    selected={selected.has(r.id)} expanded={open.has(r.id)} tray={tray.filter(t => t.state === 'done')}
                    onSelect={() => toggleSel(r.id)} onToggle={() => toggleOpen(r.id)}
                    onChange={p => patchRow(r.id, p.createState === undefined && r.createState === 'failed' ? { ...p, createState: 'idle', createError: '' } : p)}
                    onRemove={() => removeRow(r.id)} onDuplicate={() => duplicateRow(r)}
                    onRetryUpload={() => retryUpload('doc', r.id)} onAssign={pid => assignPhoto(r.id, pid)}
                    storeId={storeId}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create bar */}
      {rows.length > 0 && (
        <div className="sticky bottom-[56px] lg:bottom-0 z-10 bg-white/95 backdrop-blur-md border-t border-bone px-4 md:px-8 py-2.5">
          <div className="mx-auto max-w-[1400px] flex flex-wrap items-center gap-2 sm:gap-3 pe-16 md:pe-20">
            <div className="min-w-0 basis-full sm:basis-0 sm:flex-1 text-[12.5px] text-slate leading-snug" role="status" data-testid="bulk-progress">
              {creating ? <span className="inline-flex items-center gap-1.5 font-bold text-carbon"><Loader2 size={14} className="animate-spin" /> Creating {progress.done}/{progress.total}…</span>
                : <span className="hidden sm:inline">{draft.savedAt ? `Saved on this device ${timeAgo(draft.savedAt, now)}` : 'Your table is saved on this device as you go.'}</span>}
              {!creating && editable.length - readyRows.length > 0 && <span className="block text-error font-semibold">{editable.length - readyRows.length} product{editable.length - readyRows.length === 1 ? '' : 's'} need details<span className="hidden sm:inline"> and will be left out until fixed</span>.</span>}
            </div>
            {failedCount > 0 && !creating && (
              <button type="button" onClick={() => runCreate(lastMode, true)} className="px-3 sm:px-4 py-[10px] rounded-lg text-[14px] font-bold text-error bg-white border border-error-border cursor-pointer inline-flex items-center gap-1.5"><RefreshCw size={14} /> Retry failed ({failedCount})</button>
            )}
            <button type="button" onClick={() => runCreate('draft')} disabled={creating || uploadingCount > 0 || readyRows.length === 0} data-testid="bulk-save-drafts"
              className="max-sm:flex-1 px-3 sm:px-4 py-[10px] rounded-lg text-[14px] font-bold text-brand-orange bg-white border border-bone cursor-pointer hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              Save all as drafts
            </button>
            <button type="button" onClick={() => runCreate('publish')} disabled={creating || uploadingCount > 0 || readyRows.length === 0} data-testid="bulk-publish"
              className="max-sm:flex-1 px-3 sm:px-5 py-[10px] rounded-lg text-[14px] font-bold bg-brand-orange text-white border-none cursor-pointer hover:bg-brand-deep-orange disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              Publish ready ({readyRows.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── One product row ───────────────────────────────────────────────────────────────────────────
function RowCard({ row: r, index, issue, dupOf, currency, type, categories, catLoading, defaultCategoryId, selected, expanded, tray, storeId, onSelect, onToggle, onChange, onRemove, onDuplicate, onRetryUpload, onAssign }: {
  row: BulkRow; index: number; issue: string | null; dupOf?: number; currency: string; type: BulkType;
  categories: CategoryNode[]; catLoading: boolean; defaultCategoryId: string; selected: boolean; expanded: boolean; tray: TrayPhoto[]; storeId: string;
  onSelect: () => void; onToggle: () => void; onChange: (p: Partial<BulkRow>) => void; onRemove: () => void; onDuplicate: () => void; onRetryUpload: () => void; onAssign: (photoId: string) => void;
}) {
  const created = r.createState === 'created';
  const busy = r.createState === 'creating';
  const lock = created || busy;
  const catId = r.categoryId || defaultCategoryId;
  const statusLabel = created
    ? (r.createdStatus === 'draft' ? 'Saved as draft' : r.createdStatus === 'pending_review' ? 'Sent for review' : 'Published')
    : r.createState === 'creating' ? 'Creating…' : r.createState === 'failed' ? 'Failed' : issue ? issue : 'Ready';
  const tone = created ? 'bg-success-bg text-success border-success/30'
    : r.createState === 'failed' || issue ? 'bg-error-bg text-error border-error-border'
    : r.createState === 'creating' ? 'bg-info-bg text-brand-royal border-info/30' : 'bg-success-bg text-success border-success/30';
  const uploading = r.uploadState === 'queued' || r.uploadState === 'uploading';

  return (
    <div className={`rounded-xl border bg-white p-3 sm:p-4 ${created ? 'border-success/30 opacity-90' : issue || r.createState === 'failed' ? 'border-error-border' : 'border-bone'}`} data-testid="bulk-row" data-row-title={r.title}>
      <div className="flex flex-wrap items-center gap-2">
        {!created && <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${r.title || r.fileName}`} className="size-4 accent-brand-royal" />}
        <span className="text-[12px] text-slate">#{index + 1}</span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-graphite min-w-0 max-w-full"><FileText size={13} className="shrink-0" /><span className="truncate" title={r.fileName}>{r.fileName}</span></span>
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-slate" role="status">
            <Loader2 size={12} className="animate-spin" /> {r.uploadState === 'uploading' ? `Uploading ${r.uploadPct}%` : 'Waiting to upload'}
            <span className="inline-block w-20 h-1.5 rounded bg-mist overflow-hidden"><span className="block h-full bg-brand-royal" style={{ width: `${r.uploadPct}%` }} /></span>
          </span>
        )}
        {r.uploadState === 'failed' && (
          <span className="text-[12px] text-error" role="alert">{r.uploadError} <button type="button" onClick={onRetryUpload} className="underline bg-transparent border-none cursor-pointer text-error p-0 font-semibold">Retry upload</button></span>
        )}
        <span className="ms-auto inline-flex items-center gap-1.5">
          <span data-testid="bulk-row-status" className={`px-2.5 py-1 rounded-full text-[12px] font-bold border ${tone}`}>{statusLabel}</span>
          {created && r.productId && <Link to={`/store/${storeId}/products/edit/${r.productId}`} className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-royal no-underline hover:underline">View <ExternalLink size={12} /></Link>}
          {!created && <button type="button" onClick={onDuplicate} disabled={busy || r.uploadState !== 'done'} aria-label={`Duplicate ${r.title || r.fileName}`} title="Duplicate" className="size-8 rounded-lg flex items-center justify-center text-slate hover:bg-cream border-none bg-transparent cursor-pointer disabled:opacity-40"><Copy size={15} /></button>}
          {!created && <button type="button" onClick={onRemove} disabled={busy} aria-label={`Remove ${r.title || r.fileName}`} title="Remove" className="size-8 rounded-lg flex items-center justify-center text-slate hover:text-error hover:bg-error-bg border-none bg-transparent cursor-pointer disabled:opacity-40"><Trash2 size={15} /></button>}
        </span>
      </div>
      {r.createState === 'failed' && r.createError && <p role="alert" className="m-0 mt-2 text-[13px] text-error bg-error-bg rounded-lg px-3 py-2">{r.createError}</p>}
      {dupOf !== undefined && !created && <p className="m-0 mt-2 text-[12.5px] text-[#8a5a00] bg-[#fff6e0] rounded-lg px-3 py-1.5">Same title as product #{dupOf}. Buyers may find it confusing - consider changing it.</p>}

      {!created && <div className="mt-3 grid grid-cols-12 gap-3">
        <div className="col-span-4 sm:col-span-2 lg:col-span-1">
          <span className={lab}>Cover</span>
          <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`Cover photos for ${r.title || r.fileName}`}
            className="relative size-[72px] rounded-lg border-2 border-dashed border-bone bg-cream flex items-center justify-center overflow-hidden cursor-pointer p-0">
            {r.images[0] ? <img src={r.images[0]} alt="" className="w-full h-full object-cover" /> : <ImagePlus size={22} className="text-slate" />}
            {r.images.length > 1 && <span className="absolute bottom-0.5 end-0.5 bg-black/70 text-white text-[12px] font-bold rounded px-1">{r.images.length}</span>}
          </button>
        </div>
        <div className="col-span-8 sm:col-span-10 lg:col-span-4">
          <label htmlFor={`t-${r.id}`} className={lab}>Title</label>
          <input id={`t-${r.id}`} className={inp} disabled={lock} maxLength={200} value={r.title} onChange={e => onChange({ title: e.target.value })} />
        </div>
        <div className="col-span-6 lg:col-span-2">
          <label htmlFor={`p-${r.id}`} className={lab}>Price ({currency})</label>
          <input id={`p-${r.id}`} className={inp} type="number" min={0} inputMode="decimal" disabled={lock} value={r.price} onChange={e => onChange({ price: e.target.value })} />
        </div>
        <div className="col-span-6 lg:col-span-2">
          <label htmlFor={`c-${r.id}`} className={lab}>Compare-at <span className="font-normal text-slate">(optional)</span></label>
          <input id={`c-${r.id}`} className={inp} type="number" min={0} inputMode="decimal" disabled={lock} value={r.compareAt} onChange={e => onChange({ compareAt: e.target.value })} />
        </div>
        {type === 'educational' && (
          <div className="col-span-12 lg:col-span-3">
            <label htmlFor={`l-${r.id}`} className={lab}>Education level</label>
            <select id={`l-${r.id}`} className={sel} disabled={lock} value={effectiveLevel(r)} onChange={e => onChange({ educationLevel: e.target.value })}>
              <option value="">Choose…</option>
              {LEVEL_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        )}
        <div className="col-span-12 lg:col-span-7">
          <CategoryCascade idPrefix={`r-${r.id}`} categories={categories} loading={catLoading} categoryId={catId} subId={r.subCategoryId} disabled={lock}
            onChange={(c, s) => onChange({ categoryId: c, subCategoryId: s })} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <ClassRange idPrefix={`r-${r.id}`} from={r.classFrom} to={r.classTo} disabled={lock} onChange={(f, t) => onChange({ classFrom: f, classTo: t })} />
        </div>
        <div className="col-span-12">
          <label htmlFor={`d-${r.id}`} className={lab}>Description</label>
          <textarea id={`d-${r.id}`} disabled={lock} rows={2} className={`${inp} resize-y min-h-[56px] focus:min-h-[130px]`} value={r.description} onChange={e => onChange({ description: e.target.value })} placeholder="Tell buyers what is inside (required)" />
        </div>
      </div>}
      {created && <p className="m-0 mt-2 text-[14px] font-semibold text-carbon">{r.title}</p>}

      {expanded && !created && (
        <div className="mt-3 border-t border-bone pt-3 flex flex-col gap-3">
          <div>
            <span className={lab}>Photos (the first one is the cover; up to {MAX_ROW_PHOTOS})</span>
            <ProductPhotosUploader value={r.images} onChange={urls => onChange({ images: urls })} />
          </div>
          {tray.length > 0 && (
            <div>
              <label htmlFor={`tp-${r.id}`} className={lab}>Or use an unmatched photo</label>
              <select id={`tp-${r.id}`} className={`${sel} max-w-[320px]`} value="" onChange={e => { if (e.target.value) onAssign(e.target.value); }}>
                <option value="">Choose a photo…</option>
                {tray.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          {baseOf(r.fileName) && <p className="m-0 text-[12px] text-slate">Tip: name a photo <b>{baseOf(r.fileName)}.jpg</b> and drop it in the box above - it attaches itself.</p>}
        </div>
      )}
    </div>
  );
}
