import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui';
import { apiGetFeeEstimate, type FeeEstimate } from '@/api/services/finance';
import { formatPrice } from '@/utils/formatPrice';

type FeeType = 'digital' | 'physical';

/**
 * Read-only fee estimate. The numbers come from the backend (same helper the real sale credit uses);
 * no rate lives in this file. Fee is on the item price only - shipping is never part of it.
 */
export function FeeEstimateCard({ storeId, currency }: { storeId: string; currency: string }) {
  const [priceText, setPriceText] = useState('');
  const [type, setType] = useState<FeeType>('digital');
  const [result, setResult] = useState<FeeEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const price = Number(priceText);
  const valid = priceText.trim() !== '' && Number.isFinite(price) && price > 0;

  useEffect(() => {
    if (!valid) { setResult(null); setError(''); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError('');
    const t = setTimeout(() => {
      apiGetFeeEstimate(storeId, price, type)
        .then(res => { if (!cancelled) setResult(res); })
        .catch(err => { if (!cancelled) { setResult(null); setError(err instanceof Error ? err.message : 'Could not calculate the estimate.'); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [storeId, price, type, valid, attempt]);

  const cur = result?.currency ?? currency;

  return (
    <section className="bg-white border border-bone rounded-[10px] px-5 py-4" aria-label="Fee estimate">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-[13px] font-bold text-carbon m-0">Fee estimate</h2>
        <span className="text-[12px] font-semibold px-2 py-[2px] rounded-full bg-bone text-slate">Estimate</span>
      </div>
      <p className="text-[12px] text-slate mb-3">See what Edudeen keeps from one sale. The fee is taken from the item price only, never from shipping.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[520px]">
        <label className="flex flex-col gap-1 text-[12px] text-slate">
          Sale price ({currency})
          <input
            inputMode="decimal" type="number" min={0} step="any" value={priceText}
            onChange={e => setPriceText(e.target.value)} placeholder="e.g. 1500"
            className="h-[40px] px-3 rounded-lg border border-bone bg-white text-[13px] text-carbon"
          />
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-slate">
          Product type
          <select value={type} onChange={e => setType(e.target.value as FeeType)} className="h-[40px] px-3 rounded-lg border border-bone bg-white text-[13px] text-carbon">
            <option value="digital">Digital (files, courses)</option>
            <option value="physical">Physical</option>
          </select>
        </label>
      </div>

      <div className="mt-3 min-h-[64px]" aria-live="polite">
        {!valid ? (
          <p className="text-[12px] text-slate">Enter a sale price to see the fee.</p>
        ) : loading ? (
          <SkeletonBox height={56} rounded="8px" />
        ) : error ? (
          <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-error">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => setAttempt(a => a + 1)}>Retry</Button>
          </div>
        ) : result ? (
          result.fee == null ? (
            <p className="text-[13px] font-semibold text-carbon">
              {result.reason === 'rate_unavailable' ? 'Not available right now - try again later.' : 'Set by Edudeen'}
              <span className="block text-[12px] font-normal text-slate mt-0.5">
                {result.reason === 'rate_unavailable' ? 'The fee needs a currency rate that is not loaded yet.' : `Edudeen has not published a fee for ${type} products yet.`}
              </span>
            </p>
          ) : (
            <dl className="grid grid-cols-3 gap-3 m-0 max-w-[520px]">
              <div><dt className="text-[12px] text-slate">Sale price</dt><dd className="m-0 text-[14px] font-bold text-carbon">{formatPrice(result.price, cur)}</dd></div>
              <div><dt className="text-[12px] text-slate">Platform fee</dt><dd className="m-0 text-[14px] font-bold text-error">- {formatPrice(result.fee, cur)}</dd></div>
              <div><dt className="text-[12px] text-slate">You receive</dt><dd className="m-0 text-[14px] font-bold text-success">{formatPrice(result.net ?? 0, cur)}</dd></div>
            </dl>
          )
        ) : null}
      </div>

      <p className="text-[12px] text-slate mt-3">
        This is an estimate. Card processing and clearing time are shown on your <Link to={`/store/${storeId}/finance`} className="font-semibold text-brand-orange hover:underline">Earnings</Link> page.
      </p>
    </section>
  );
}
