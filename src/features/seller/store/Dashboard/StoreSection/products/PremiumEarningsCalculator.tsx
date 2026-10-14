import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Crown, Flame } from 'lucide-react';
import { apiGetPremiumTerms, type PremiumTerms } from '@/api/services/premium';
import type { JoinableCampaign } from '@/api/services/marketing';
import { formatMoney } from '@/utils/currency';

// One shared cache per (type, currency, store): the terms rarely change and every product form asks for them.
const cache = new Map<string, PremiumTerms>();
const inflight = new Map<string, Promise<PremiumTerms>>();

/** The admin's Premium terms (platform offer %, fee on premium sales, min gap, the normal fee that is really charged). */
export function usePremiumTerms(productType: string, currency?: string | null, storeId?: string | null) {
  const type = productType === 'physical' ? 'physical' : 'digital';
  const cur = currency === 'PKR' ? 'PKR' : 'USD';
  const key = `${type}:${cur}:${storeId ?? ''}`;
  const [terms, setTerms] = useState<PremiumTerms | null>(cache.get(key) ?? null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const hit = cache.get(key);
    if (hit) { setTerms(hit); return; }
    let alive = true;
    setError(false);
    const p = inflight.get(key) ?? apiGetPremiumTerms({ type, currency: cur, ...(storeId ? { storeId } : {}) }).then(r => r.data);
    inflight.set(key, p);
    p.then(t => { cache.set(key, t); if (alive) setTerms(t); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => inflight.delete(key));
    return () => { alive = false; };
  }, [key, type, cur, storeId]);
  return { terms, error };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmtPct = (n: number) => String(Math.round(n * 10) / 10);

/** The seller's Premium percent that applies to this product: opted out = 0; else the product's own value, else the store setting. */
export function effectiveSellerPercent(productValue: string, storePercent: number, optOut = false): number {
  if (optOut) return 0;
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

/** Fee on an amount. null = the platform fee is not set yet (never shown as 0). */
function feeOn(amount: number, terms: PremiumTerms): number | null {
  const f = terms.normalFee;
  if (!f) return null;
  return f.mode === 'percentage' ? r2(amount * f.value / 100) : Math.min(amount, f.fixedAmountInCurrency ?? 0);
}

/** Owner rule R1: a platform sale is computed from the LIST price and only applies when strictly cheaper than the seller's price. */
export function campaignCalc(price: number, compareAt: number, c: Pick<JoinableCampaign, 'discountType' | 'discountValue' | 'sponsorType'>) {
  if (!c.discountType || c.discountValue == null || !(price > 0)) return null;
  const list = compareAt > price ? compareAt : price;
  const off = c.discountType === 'percentage' ? r2(list * Math.min(c.discountValue, 100) / 100) : Math.min(c.discountValue, list);
  const unit = r2(Math.max(0, list - off));
  if (!(unit < price)) return { applies: false as const, list, unit };
  const platform = c.sponsorType === 'platform';
  const covered = platform ? r2(price - unit) : 0; // Edudeen reimburses the difference to the seller's own price
  return { applies: true as const, list, unit, platform, covered, settle: r2(unit + covered) };
}

interface Calc {
  list: number; normalPays: number; normalFee: number | null; normalFeeLabel: string; normalGets: number | null;
  premiumApplies: boolean; premiumPays: number; edudeenAdds: number; sellerSideS: number; premiumFee: number; premiumGets: number;
  sellerPct: number; platformPct: number;
}

function calculate(price: number, compareAt: number, sellerPct: number, terms: PremiumTerms): Calc {
  const list = compareAt > price ? compareAt : price;
  const normalFee = feeOn(price, terms);
  const normalFeeLabel = !terms.normalFee ? 'not set yet'
    : terms.normalFee.mode === 'percentage' ? `${fmtPct(terms.normalFee.value)}%` : 'fixed fee';
  const platformPct = terms.platformPercent;
  const unit = r2(Math.max(0, list * (1 - (sellerPct + platformPct) / 100)));
  const premiumApplies = sellerPct > 0 && unit < price;
  const edudeenAdds = premiumApplies ? Math.min(r2(list * platformPct / 100), r2(list - unit)) : 0;
  const sellerSideS = premiumApplies ? r2(unit + edudeenAdds) : price;
  const premiumFee = r2(sellerSideS * terms.premiumSellerFeePercent / 100);
  return {
    list, normalPays: price, normalFee, normalFeeLabel, normalGets: normalFee == null ? null : r2(price - normalFee),
    premiumApplies, premiumPays: premiumApplies ? unit : price, edudeenAdds, sellerSideS, premiumFee, premiumGets: r2(sellerSideS - premiumFee),
    sellerPct, platformPct,
  };
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3 text-[12.5px]"><span className="text-slate">{k}</span><span className={strong ? 'font-bold text-carbon' : 'font-medium text-charcoal'}>{v}</span></div>;
}

/**
 * Live "Your earnings" calculator for the product form: what a normal buyer, a Premium member and (when a platform sale is
 * picked) a sale buyer pay, the platform fee on each, what lands in the seller's wallet, and the sale-vs-Premium rule alert.
 * Premium and a platform sale are exclusive per product, so only one of the two extra columns shows.
 */
export function PremiumEarningsCalculator({ price, compareAtPrice, premiumValue, storePercent, productType, currency, storeId, premiumOptOut = false, campaign = null, availableCampaigns = [], onJoinCampaign }: {
  price: string; compareAtPrice: string; premiumValue: string; storePercent: number; productType: string; currency?: string | null;
  storeId?: string | null; premiumOptOut?: boolean; campaign?: JoinableCampaign | null;
  /** Running / upcoming platform sales the seller could join instead of Premium: each one's result is worked out here. */
  availableCampaigns?: JoinableCampaign[]; onJoinCampaign?: (id: string) => void;
}) {
  const { terms, error } = usePremiumTerms(productType, currency, storeId);
  const priceN = Number(price);
  const compareN = Number(compareAtPrice);
  const sellerPct = effectiveSellerPercent(premiumValue, storePercent, premiumOptOut);
  const cur = currency ?? 'PKR';
  const money = (n: number) => formatMoney(n, cur);
  const calc = useMemo(() => (terms && priceN > 0 ? calculate(priceN, compareN > 0 ? compareN : 0, sellerPct, terms) : null), [terms, priceN, compareN, sellerPct]);
  const camp = useMemo(() => (campaign && priceN > 0 ? campaignCalc(priceN, compareN > 0 ? compareN : 0, campaign) : null), [campaign, priceN, compareN]);
  const gapMsg = terms ? premiumGapMessage(priceN, compareN, sellerPct, terms.minGapPercent) : null;

  if (error) return <p className="text-[12px] text-slate mt-3">Earnings preview is unavailable right now.</p>;
  if (!terms) return <p className="text-[12px] text-slate mt-3">Loading your earnings preview...</p>;
  if (!calc) return <p className="text-[12px] text-slate mt-3">Enter a price to see what you earn from normal and Premium buyers.</p>;

  const campaignOn = !!campaign;
  const campaignLabel = campaign ? `${campaign.name} ${campaign.discountType === 'percentage' ? `${campaign.discountValue}%` : 'sale'}` : '';
  const campaignFee = camp && camp.applies ? feeOn(camp.settle, terms) : null;

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
          {calc.normalFee == null ? (
            <>
              <Row k="Platform fee" v="not set yet" />
              <Row k="You receive" v="after the platform fee" strong />
            </>
          ) : (
            <>
              <Row k={`Platform charges ${calc.normalFeeLabel}`} v={`- ${money(calc.normalFee)}`} />
              <Row k="You receive" v={money(calc.normalGets ?? 0)} strong />
            </>
          )}
        </div>
        {campaignOn ? (
          <div className="rounded-lg border border-brand-orange/40 bg-brand-pale-orange/60 p-3 flex flex-col gap-1">
            <p className="text-[12px] font-bold text-brand-deep-orange m-0 flex items-center gap-1"><Flame size={12} aria-hidden /> Platform sale</p>
            {!camp ? (
              <p className="text-[12px] text-slate m-0">{campaign!.name} has no price discount, so buyers pay {money(priceN)}.</p>
            ) : !camp.applies ? (
              <p className="text-[12px] text-slate m-0">{campaignLabel}: the sale price from the list price {money(camp.list)} would be {money(camp.unit)}, which is not lower than your price {money(priceN)}, so buyers keep paying {money(priceN)} and the sale does not apply.</p>
            ) : (
              <>
                <Row k={`${campaignLabel}: buyers pay (from the list price ${money(camp.list)})`} v={money(camp.unit)} />
                {camp.platform && <Row k="Edudeen adds from its own pocket" v={`+ ${money(camp.covered)}`} />}
                {campaignFee == null ? (
                  <Row k="Platform fee" v="not set yet" />
                ) : (
                  <Row k={`Platform charges ${calc.normalFeeLabel}`} v={`- ${money(campaignFee)}`} />
                )}
                <Row k={camp.platform ? `You receive (your price ${money(camp.settle)} before the fee)` : 'You receive'} v={campaignFee == null ? money(camp.settle) : money(r2(camp.settle - campaignFee))} strong />
              </>
            )}
          </div>
        ) : (
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
              <p className="text-[12px] text-slate m-0">{premiumOptOut ? 'Premium is off for this product.' : 'Set a Premium discount (here or in Store settings) to see what Premium members pay and what you receive.'}</p>
            )}
          </div>
        )}
      </div>
      {!campaignOn && availableCampaigns.length > 0 && (
        <div className="mt-3 rounded-lg border border-brand-orange/30 bg-brand-pale-orange/40 p-3">
          <p className="text-[12px] font-bold text-brand-deep-orange m-0 mb-2 flex items-center gap-1"><Flame size={12} aria-hidden /> If you join a platform sale instead of Premium</p>
          <div className="flex flex-col gap-2">
            {availableCampaigns.map(c => {
              const r = priceN > 0 ? campaignCalc(priceN, compareN > 0 ? compareN : 0, c) : null;
              const label = `${c.name}${c.discountType === 'percentage' && c.discountValue != null ? ` ${c.discountValue}%` : ''}`;
              const fee = r && r.applies ? feeOn(r.settle, terms) : null;
              return (
                <div key={c._id} className="rounded-md bg-white border border-bone px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 text-[12.5px]">
                    <p className="m-0 font-semibold text-carbon">{label} <span className="font-normal text-slate">{c.sponsorType === 'platform' ? '(Edudeen pays the discount)' : '(you pay the discount)'}</span></p>
                    {!r ? <p className="m-0 text-slate">No price discount - buyers pay {money(priceN)}.</p>
                      : !r.applies ? <p className="m-0 text-slate">From the list price {money(r.list)} this would be {money(r.unit)}, not lower than your {money(priceN)}, so it would not apply.</p>
                      : <p className="m-0 text-charcoal">Buyers pay <strong>{money(r.unit)}</strong>{r.platform ? <> · Edudeen adds {money(r.covered)}</> : null} · {fee == null ? 'platform fee not set yet' : <>platform {calc.normalFeeLabel} (- {money(fee)})</>} · <strong>you receive {money(fee == null ? r.settle : r2(r.settle - fee))}</strong></p>}
                  </div>
                  {onJoinCampaign && r && r.applies && (
                    <button type="button" onClick={() => onJoinCampaign(c._id)} className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-brand-royal text-brand-royal text-[12px] font-semibold cursor-pointer">Join this sale</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="text-[12px] text-slate mt-2 mb-0">
        {campaignOn
          ? 'A platform sale is worked out from your list price (the compare-at price when you set one) and only applies when it is lower than the price buyers already pay. A product is in a platform sale or has a Premium offer, not both.'
          : `Premium members pay the list price less your discount${terms.platformPercent > 0 ? ` and Edudeen's extra ${fmtPct(terms.platformPercent)}%; Edudeen pays its part, you never do` : ''}, and do not also get your normal sale. The platform fee on a Premium sale is ${fmtPct(terms.premiumSellerFeePercent)}% of your price instead of the usual fee.`}
      </p>
    </div>
  );
}
