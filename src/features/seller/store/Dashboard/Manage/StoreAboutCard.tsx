import { useEffect, useState } from 'react';
import { apiUpdateStore, type EducatorProfile } from '@/api/services/store';
import { Button } from '@/components/comman/ui/Button';
import { StoreAboutView } from '@/features/storefront/sections/StoreAboutTab';
import type { StoreReturnPolicy } from '@/utils/sellerTrust';

const MAX = 1500;
const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

/** Seller form for the store's About tab (bio) with a live preview of exactly what buyers will see. */
export function StoreAboutCard({ storeId, name, bio, educatorProfile, returnPolicy, refetch }: {
  storeId: string;
  name: string;
  bio: string | null | undefined;
  educatorProfile: EducatorProfile | null | undefined;
  returnPolicy: StoreReturnPolicy | null | undefined;
  refetch: () => void;
}) {
  const [text, setText] = useState(bio ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setText(bio ?? ''); }, [bio]);

  const error = text.length > MAX ? `Keep the About text to ${MAX} characters.` : null;
  const dirty = text.trim() !== (bio ?? '').trim();

  async function save() {
    if (error) return;
    setSaving(true); setMsg(null);
    try {
      await apiUpdateStore({ storeId, aboutBio: text.trim() || null });
      refetch();
      setMsg({ ok: true, text: 'About text saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save the About text.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-bone bg-white p-5">
      <p className="text-[13.5px] font-semibold text-charcoal mb-1">About your store</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-4">
        Shown on the About tab of your store page, next to your teacher profile and return notes (those are edited in Store page and Return policy).
      </p>
      <label htmlFor="store-about-bio" className="text-[12px] font-semibold text-charcoal block mb-1.5">About text</label>
      <textarea
        id="store-about-bio" rows={6} value={text} onChange={e => setText(e.target.value)}
        aria-invalid={!!error} aria-describedby="store-about-count"
        className={`${inputCls} ${error ? 'border-red-400' : ''}`}
        placeholder="Who you are, what you make and who it is for."
      />
      <p id="store-about-count" className={`text-[12px] mt-1 ${error ? 'text-red-600' : 'text-slate'}`}>{error ?? `${text.length}/${MAX}`}</p>

      <div className="flex items-center gap-3 mt-3">
        <Button size="sm" loading={saving} disabled={!!error || !dirty} onClick={save}>Save About text</Button>
        {msg && <span role="status" className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>

      <div className="mt-5 pt-4 border-t border-bone">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate mb-3">Preview — what buyers see</p>
        <div className="rounded-xl bg-cream/40 p-3">
          <StoreAboutView data={{ name, aboutBio: text, educatorProfile, returnPolicy }} />
        </div>
      </div>
    </div>
  );
}
