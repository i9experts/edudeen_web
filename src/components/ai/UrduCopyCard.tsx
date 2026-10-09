import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { useToast } from '@/contexts/ToastContext';
import { apiGetMyProductById } from '@/api/services/product';
import { aiErrorInfo, apiSaveUrdu, apiTranslateProduct } from '@/api/services/aiFeatures';

const field = 'w-full rounded-lg border border-bone bg-white px-3 py-2 text-[13px] text-carbon outline-none focus:border-brand-royal';

/** Product form: Urdu title/description. One click drafts it with AI; the seller edits it and saves (nothing publishes automatically). */
export function UrduCopyCard({ storeId, productId }: { storeId: string; productId: string }) {
  const { enabled } = useAiFeatures(storeId);
  const toast = useToast();
  const [nameUr, setNameUr] = useState('');
  const [descUr, setDescUr] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState<'translate' | 'save' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiGetMyProductById(productId)
      .then(res => {
        const p = (res.data as { product?: { nameUr?: string | null; descriptionUr?: string | null } }).product;
        if (alive && p) { setNameUr(p.nameUr ?? ''); setDescUr(p.descriptionUr ?? ''); }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [productId]);

  const canTranslate = enabled('translate_listing');

  async function translate() {
    setBusy('translate'); setError('');
    try {
      // Uses the SAVED product text; save your English edits first.
      const res = await apiTranslateProduct(storeId, productId);
      setNameUr(res.data.title); setDescUr(res.data.description); setNotes(res.data.needsReview ?? []);
    } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }
  async function save() {
    setBusy('save'); setError('');
    try { await apiSaveUrdu(storeId, productId, { nameUr, descriptionUr: descUr }); toast.success('Urdu copy saved.'); }
    catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(null); }
  }

  if (!canTranslate && !nameUr && !descUr) return null;
  return (
    <div className="bg-white border border-bone rounded-xl px-5 py-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[14px] font-bold text-carbon flex items-center gap-2"><Languages size={15} /> Urdu version</p>
        {canTranslate && (
          <button type="button" onClick={translate} disabled={busy !== null} className="text-[12px] font-semibold text-brand-royal underline disabled:opacity-50">
            {busy === 'translate' ? 'Translating…' : 'Translate with AI'}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <input dir="rtl" value={nameUr} onChange={e => setNameUr(e.target.value)} placeholder="اردو عنوان" className={field} aria-label="Urdu title" />
        <textarea dir="rtl" rows={4} value={descUr} onChange={e => setDescUr(e.target.value)} placeholder="اردو تفصیل" className={field} aria-label="Urdu description" />
        {notes.length > 0 && <ul className="list-disc ps-4 text-[11px] text-warning">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={busy !== null || (!nameUr.trim() && !descUr.trim())} className="rounded-lg bg-brand-royal text-white px-4 py-2 text-[12px] font-semibold disabled:opacity-50">
            {busy === 'save' ? 'Saving…' : 'Save Urdu copy'}
          </button>
          <p className="text-[11px] text-slate">Shown to buyers browsing in Urdu. AI text can contain mistakes: please review.</p>
        </div>
      </div>
    </div>
  );
}
