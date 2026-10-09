import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { apiSetListingTrustBadges, type TrustBadges } from '@/api/services/marketplace/adminMarketplace';

const INPUT = 'w-[80px] py-[7px] px-2 text-[13px] border border-bone rounded-lg outline-none bg-white text-charcoal focus:border-brand-orange';

/** Reviewer sets the trust badges buyers see on the card and product page. Saves on its own (before or after approving). */
export function TrustBadgesEditor({ listingId, initial, sellerAgeHint }: { listingId: string; initial?: TrustBadges | null; sellerAgeHint?: string | null }) {
  const [scholar, setScholar] = useState(!!initial?.scholarReviewed);
  const [min, setMin] = useState(initial?.ageAppropriateMin != null ? String(initial.ageAppropriateMin) : '');
  const [max, setMax] = useState(initial?.ageAppropriateMax != null ? String(initial.ageAppropriateMax) : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setBusy(true); setMsg(''); setError('');
    try {
      await apiSetListingTrustBadges(listingId, {
        scholarReviewed: scholar,
        ageAppropriateMin: min.trim() === '' ? null : Number(min),
        ageAppropriateMax: max.trim() === '' ? null : Number(max),
      });
      setMsg('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the badges.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-bone px-3 py-3 flex flex-col gap-2.5">
      <p className="text-[12px] uppercase tracking-[0.06em] text-slate font-semibold flex items-center gap-1.5"><ShieldCheck size={12} /> Trust badges</p>
      <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer">
        <input type="checkbox" checked={scholar} onChange={e => setScholar(e.target.checked)} className="w-[15px] h-[15px] accent-brand-orange" />
        Scholar reviewed (content checked for accuracy and suitability)
      </label>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-charcoal">
        <span>Age appropriate</span>
        <input aria-label="Minimum age" inputMode="numeric" placeholder="From" value={min} onChange={e => setMin(e.target.value)} className={INPUT} />
        <span>to</span>
        <input aria-label="Maximum age" inputMode="numeric" placeholder="To" value={max} onChange={e => setMax(e.target.value)} className={INPUT} />
        {sellerAgeHint && <span className="text-[12px] text-slate">Seller says: {sellerAgeHint}</span>}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={save} loading={busy}>Save badges</Button>
        {msg && <span role="status" className="text-[12.5px] text-success">{msg}</span>}
        {error && <span role="alert" className="text-[12.5px] text-error">{error}</span>}
      </div>
    </div>
  );
}
