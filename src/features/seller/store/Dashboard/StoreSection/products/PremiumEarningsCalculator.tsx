import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Crown } from 'lucide-react';
import { apiGetPremiumTerms, type PremiumTerms } from '@/api/services/premium';
import { formatMoney } from '@/utils/currency';

// One shared cache per (type, currency): the terms rarely change and every product form asks for them.
const cache = new Map<string, PremiumTerms>();
const inflight = new Map<string, Promise<PremiumTerms>>();

/** The admin's Premium terms (platform offer %, fee on premium sales, min gap, normal fee of this product type). */
export function usePremiumTerms(productType: string, currency?: string | null) {
  const type = productType === 'physical' ? 'physical' : 'digital';
  const cur = currency === 'PKR' ? 'PKR' : 'USD';
  const key = `${type}:${cur}`;
  const [terms, setTerms] = useState<PremiumTerms | null>(cache.get(key) ?? null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) { setTerms(hit); return; }
    let alive = true;
    setError(false);
    const p = inflight.get(key) ?? apiGetPremiumTerms({ type, currency: cur }).then(r => r.data);
    inflight.set(key, p);
    p.then(t => { cache.set(key, t); if (alive) setTerms(t); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => inflight.delete(key));
    return () => { alive = false; };
  }, [key, type, cur]);
  return { terms, error };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtPct = (n: number) => String(Math.round(n * 10) / 10);

/** The seller's Premium percent that applies to this product: the product's own value, else the store setting (0 = none). */
export function effectiveSellerPercent(productValue: string, storePercent: number): number {
  const own = Number(productValue);
  if (productValue.trim() && Number.isFinite(own) && own >= 1 && own <= 50) return own;
  return storePercent > 0 ? storePercent : 0;
}

/** Same rule and wording as the API (premiumGapViolation): normal sale must be at least `gap` points below Premium. null = fine. */
export function premiumGapMessage(price: number, compareAt: number, sellerPct: number, gap: number): string | null {
  if (!(sellerPct > 0) || !(compareAt > price) || !(price >= 0)) return null;
  const sale = (1 - price / compareAt) * 100;
  const maxSale = Math.max(0, sellerPct - gap);
  if (sale <= maxSale + 1e-9) return null;
  const raiseTo = Math.ceil((sale + gap) * 10) / 10;
  return `Your normal sale is ${fmtPct(sale)}% but your Premium discount is ${fmtPct(sellerPct)}%. Premium must be at least ${fmtPct(gap)} points better - lower the sale to ${fmtPct(maxSale)}% or raise Premium to ${fmtPct(raiseTo)}%.`;
}

interface Calc {
  list: number; normalPays: number; normalFee: number; normalFeeLabel: string; normalGets: number;
  premiumApplies: boolean; premiumPays: number; edudeenAdds: number; sellerSideS: number; premiumFee: number; premiumGets: number;
  sellerPct: number; platformPct: number;
}

function calculate(price: number, compareAt: number, sellerPct: number, terms: PremiumTerms): Calc {
  const list = compareAt > price ? compareAt : price;
  const normalFee = !terms.normalFee ? 0
    : terms.normalFee.mode === 'percentage' ? r2(price * terms.normalFee.value / 100)
    : Math.min(price, terms.normalFee.fixedAmountInCurrency ?? 0);
  const normalFeeLabel = !terms.normalFee ? 'platform fee'
    : terms.normalFee.mode === 'percentage' ? `${fmtPct(terms.normalFee.value)}%` : 'fixed fee';
  const platformPct = terms.platformPercent;
  const unit = r2(Math.max(0, list * (1 - (sellerPct + platformPct) / 100)));
  const premiumApplies = sellerPct > 0 && unit < price;
  const edudeenAdds = premiumApplies ? Math.min(r2(list * platformPct / 100), r2(list - unit)) : 0;
  const sellerSideS = premiumApplies ? r2(unit + edudeenAdds) : price;
  const premiumFee = premiumApplies ? r2(sellerSideS * terms.premiumSellerFeePercent / 100) : normalFee;
  return {
    list, normalPays: price, normalFee, normalFeeLabel, normalGets: r2(price - normalFee),
    premiumApplies, premiumPays: premiumApplies ? unit : price, edudeenAdds, sellerSideS, premiumFee, premiumGets: r2(sellerSideS - premiumFee),
    sellerPct, platformPct,
  };
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3 text-[12.5px]"><span className="text-slate">{k}</span><span className={strong ? 'font-bold text-carbon' : 'font-medium text-charcoal'}>{v}</span></div>;
}

/**
 * Live "Your earnings" calculator for the product form: what a normal buyer and a Premium member pay for this product,
 * the platform fee on each, what lands in the seller's wallet, and the sale-vs-Premium rule alert.
 */
export function PremiumEarningsCalculator({ price, compareAtPrice, premiumValue, storePercent, productType, currency }: {
  price: string; compareAtPrice: string; premiumValue: string; storePercent: number; productType: string; currency?: string | null;
}) {
  const { terms, error } = usePremiumTerms(productType, currency);
  const priceN = Number(price);
  const compareN = Number(compareAtPrice);
  const sellerPct = effectiveSellerPercent(premiumValue, storePercent);
  const cur = currency ?? 'PKR';
  const money = (n: number) => formatMoney(n, cur);
  const calc = useMemo(() => (terms && priceN > 0 ? calculate(priceN, compareN > 0 ? compareN : 0, sellerPct, terms) : null), [terms, priceN, compareN, sellerPct]);
  const gapMsg = terms ? premiumGapMessage(priceN, compareN, sellerPct, terms.minGapPercent) : null;

  if (error) return <p className="text-[12px] text-slate mt-3">Earnings preview is unavailable right now.</p>;
  if (!terms) return <p className="text-[12px] text-slate mt-3">Loading your earnings preview...</p>;
  if (!calc) return <p className="text-[12px] text-slate mt-3">Enter a price to see what you earn from normal and Premium buyers.</p>;

  return (
    <div className="mt-4 rounded-xl border border-bone bg-white p-4" aria-live="polite">
      <p className="text-[13px] font-semibold text-carbon m-0 mb-2 flex items-center gap-1.5"><Crown size={14} className="text-[#C79A00]" aria-hidden /> Your earnings</p>
      {gapMsg && (
        <div role="alert" className="flex items-start gap-2 px-3 py-2 mb-3 rounded-lg border border-red-200 bg-red-50 text-[12.5px] text-red-700">
          <AlertTriangle size={14} className="shrink-0 mt-[2px]" aria-hidden /> <span>{gapMsg}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-bone bg-cream/60 p-3 flex flex-col gap-1">
          <p className="text-[12px] font-bold text-carbon m-0">Normal buyer</p>
          <Row k="Buyer pays" v={money(calc.normalPays)} />
          <Row k={`Platform charges ${calc.normalFeeLabel}`} v={`- ${money(calc.normalFee)}`} />
          <Row k="You receive" v={money(calc.normalGets)} strong />
        </div>
        <div className="rounded-lg border border-[#f1d98a] bg-[#fffaf0] p-3 flex flex-col gap-1">
          <p className="text-[12px] font-bold text-[#8a6100] m-0">Premium member</p>
          {sellerPct > 0 ? (
            calc.premiumApplies ? (
              <>
                <Row k={`Member pays (list ${money(calc.list)} less ${fmtPct(calc.sellerPct)}% + ${fmtPct(calc.platformPct)}%)`} v={money(calc.premiumPays)} />
                <Row k="Edudeen adds from its own pocket" v={`+ ${money(calc.edudeenAdds)}`} />
                <Row k={`You give ${fmtPct(calc.sellerPct)}% - your price`} v={money(calc.sellerSideS)} />
                <Row k={`Platform charges ${fmtPct(terms.premiumSellerFeePercent)}%`} v={`- ${money(calc.premiumFee)}`} />
                <Row k="You receive" v={money(calc.premiumGets)} strong />
              </>
            ) : (
              <p className="text-[12px] text-slate m-0">With these prices a Premium member would not pay less than a normal buyer, so they pay {money(priceN)}. Raise your Premium discount.</p>
            )
          ) : (
            <p className="text-[12px] text-slate m-0">Set a Premium discount (here or in Store settings) to see what Premium members pay and what you receive.</p>
          )}
        </div>
      </div>
      <p className="text-[12px] text-slate mt-2 mb-0">Premium members pay the list price less your discount{terms.platformPercent > 0 ? ` and Edudeen's extra ${fmtPct(terms.platformPercent)}%; Edudeen pays its part, you never do` : ''}, and do not also get your normal sale. The platform fee on a Premium sale is {fmtPct(terms.premiumSellerFeePercent)}% of your price instead of the usual fee.</p>
    </div>
  );
}
