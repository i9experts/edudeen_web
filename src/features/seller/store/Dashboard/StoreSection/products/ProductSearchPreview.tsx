import { useEffect, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { apiDraftSearchText, apiSeoProductGetById, apiUpdateSeoProduct } from '@/api/services/seo/seller/products.service';
import { apiGetAiStudioCredits } from '@/api/services/aiStudio';
import { searchVisibility, SEARCH_TITLE_MAX } from './productQuality';

const DESC_MAX = 160;
const field = 'w-full rounded-lg border border-bone bg-white px-3 py-2 text-[13px] text-carbon outline-none focus:border-brand-royal';
const plain = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Maps a failed AI call to a plain message (no credits / plan without the feature / switched off / anything else). */
function aiFailMessage(e: unknown): string {
  const x = e as { response?: { status?: number; data?: { message?: string | string[] } }; message?: string };
  const status = x?.response?.status;
  const raw = x?.response?.data?.message;
  const msg = (Array.isArray(raw) ? raw.join(', ') : raw) || x?.message || '';
  if (status === 402 || /not enough ai credits/i.test(msg)) return 'You do not have enough AI credits. Buy more in AI Studio, then try again.';
  if (status === 403 || /not included|plan|switched off|disabled/i.test(msg)) return 'AI writing is not available on your current plan. You can still write the text yourself.';
  return msg || 'Could not write the text. Please try again.';
}

interface Props {
  storeId: string;
  productId: string;
  /** current form values, so the preview updates while the seller edits the product */
  name: string;
  description: string;
  image?: string | null;
  storeName?: string;
  /** values that decide the "findability" hint under the previews */
  facts: { isPhysical: boolean; imageCount: number; classFrom?: string | null; classTo?: string | null; hasSubject: boolean; language?: string | null; boardCount: number };
}

/** Collapsible "How it looks in search" box (Google + WhatsApp preview, optional custom title/description, AI draft). */
export function ProductSearchPreview({ storeId, productId, name, description, image, storeName, facts }: Props) {
  const toast = useToast();
  // Opens by itself when the seller arrives from a "Fix" link that points at this box.
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('field') === 'fld-seo');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saved, setSaved] = useState({ title: '', desc: '' });
  const [loadError, setLoadError] = useState('');
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [credits, setCredits] = useState<number | null>(null);
  const [busy, setBusy] = useState<'ai' | 'save' | null>(null);
  const [error, setError] = useState('');

  // Load once the box is opened (keeps the edit page light).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    apiSeoProductGetById(storeId, productId)
      .then(r => { if (!alive) return; const t = r.data?.metaTitle ?? ''; const d = r.data?.metaDescription ?? ''; setTitle(t); setDesc(d); setSaved({ title: t, desc: d }); setLoadError(''); })
      .catch(() => { if (alive) setLoadError('Could not load your saved search text.'); });
    apiGetAiStudioCredits(storeId).then(r => { if (alive) setCredits(r.data.balance); }).catch(() => { if (alive) setCredits(null); });
    return () => { alive = false; };
  }, [open, storeId, productId]);

  const shownTitle = title.trim() || name.trim() || 'Your product title';
  const shownDesc = desc.trim() || plain(description) || 'Your product description will appear here.';
  const dirty = title !== saved.title || desc !== saved.desc;
  const vis = searchVisibility({ name, description, seoTitle: title, seoDescription: desc, ...facts });
  const aiOff = credits === null || credits < 1;

  async function writeWithAi() {
    setBusy('ai'); setError('');
    try {
      const r = await apiDraftSearchText(storeId, productId, lang);
      setTitle(r.data.metaTitle.slice(0, 70)); setDesc(r.data.metaDescription.slice(0, 320));
      setCredits(c => (c === null ? c : Math.max(0, c - (r.data.creditsCost ?? 1))));
      toast.success('Draft ready. Edit it if you like, then press Save.');
    } catch (e) { setError(aiFailMessage(e)); } finally { setBusy(null); }
  }

  async function save() {
    setBusy('save'); setError('');
    try {
      await apiUpdateSeoProduct(storeId, productId, { metaTitle: title.trim(), metaDescription: desc.trim() });
      setSaved({ title: title.trim(), desc: desc.trim() });
      setTitle(title.trim()); setDesc(desc.trim());
      toast.success('Search text saved.');
    } catch (e) { setError((e as Error)?.message || 'Could not save. Please try again.'); } finally { setBusy(null); }
  }

  return (
    <div id="fld-seo" className="bg-white border border-bone rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 min-h-[56px] text-start">
        <span className="min-w-0">
          <span className="block text-[14px] font-bold text-carbon">How it looks in search</span>
          <span className="block text-[12px] text-slate">Google and WhatsApp preview. Optional: write your own title and description.</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4">
          {loadError && <p role="alert" className="text-[12.5px] text-error m-0">{loadError}</p>}

          <div>
            <p className="text-[12px] font-semibold text-slate m-0 mb-1.5">Google</p>
            <div className="border border-bone rounded-lg px-3 py-2.5 bg-white min-w-0">
              <p className="text-[12px] text-[#4d5156] m-0 truncate">edudeen.com › product</p>
              <p className="text-[17px] leading-snug text-[#1a0dab] m-0 break-words">{clip(shownTitle, SEARCH_TITLE_MAX)}</p>
              <p className="text-[13px] leading-snug text-[#4d5156] m-0 break-words">{clip(shownDesc, DESC_MAX)}</p>
            </div>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-slate m-0 mb-1.5">WhatsApp</p>
            <div className="border border-bone rounded-lg overflow-hidden bg-[#f0f2f5] max-w-[340px]">
              {image && <img src={image} alt="" loading="lazy" className="w-full h-[150px] object-cover" />}
              <div className="px-3 py-2">
                <p className="text-[13px] font-semibold text-carbon m-0 break-words line-clamp-2">{clip(shownTitle, 70)}</p>
                <p className="text-[12px] text-slate m-0 break-words line-clamp-2">{clip(shownDesc, DESC_MAX)}</p>
                <p className="text-[12px] text-slate m-0">edudeen.com{storeName ? ` · ${storeName}` : ''}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="block text-[12.5px] font-semibold text-carbon">
              Search title <span className="font-normal text-slate">(optional, {title.trim().length}/{SEARCH_TITLE_MAX})</span>
              <input value={title} maxLength={70} onChange={e => setTitle(e.target.value)} placeholder={name || 'Uses your product title'} className={`${field} mt-1`} />
            </label>
            <label className="block text-[12.5px] font-semibold text-carbon">
              Search description <span className="font-normal text-slate">(optional, {desc.trim().length}/{DESC_MAX})</span>
              <textarea value={desc} maxLength={320} rows={3} onChange={e => setDesc(e.target.value)} placeholder="Uses your product description" className={`${field} mt-1`} />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={lang} onChange={e => setLang(e.target.value as 'en' | 'ur')} aria-label="Language of the AI text"
              className="min-h-[44px] rounded-lg border border-bone bg-white px-3 text-[13px] text-carbon">
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </select>
            <button type="button" onClick={writeWithAi} disabled={busy !== null || aiOff}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-brand-royal text-brand-royal px-4 text-[13px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              <Sparkles size={14} /> {busy === 'ai' ? 'Writing…' : 'Write with AI (1 credit)'}
            </button>
            <button type="button" onClick={save} disabled={busy !== null || !dirty}
              className="min-h-[44px] rounded-lg bg-brand-royal text-white px-5 text-[13px] font-semibold disabled:opacity-50">
              {busy === 'save' ? 'Saving…' : 'Save'}
            </button>
          </div>
          {aiOff && (
            <p className="text-[12px] text-slate m-0">
              {credits === null ? 'AI credits could not be checked, so AI writing is off. You can still write the text yourself.' : 'You have no AI credits left. Buy more in AI Studio to use AI writing.'}
            </p>
          )}
          {error && <p role="alert" className="text-[12.5px] text-error m-0">{error}</p>}
          <p className="text-[12px] text-slate m-0">AI text can contain mistakes, so read it before you save. Leave both boxes empty to use your product title and description.</p>

          {vis.missing.length > 0 && (
            <p className="text-[12.5px] text-[#8a6100] bg-[#fff6d6] border border-[#f1d98a] rounded-lg px-3 py-2 m-0">
              Search score {vis.score}/100. To improve: {vis.missing.map(m => m.label).join('; ')}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
