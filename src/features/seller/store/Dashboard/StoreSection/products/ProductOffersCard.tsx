import { useEffect, useState } from 'react';
import { Crown, Flame } from 'lucide-react';
import { Toggle } from '@/components/comman/ui';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import { CampaignPicker } from './CampaignPicker';
import { premiumPercentError } from './PremiumPriceField';
import { PremiumEarningsCalculator, campaignCalc, effectiveSellerPercent, ownSalePercent, premiumGapMessage, premiumMinPercent, usePremiumTerms } from './PremiumEarningsCalculator';
import { AlertTriangle } from 'lucide-react';

export interface OfferFlags { premiumBlank: boolean; conflict: boolean }
export const PREMIUM_BLANK_MESSAGE = 'Enter a Premium discount %, or switch Premium off';
export const OFFER_CONFLICT_MESSAGE = 'Premium and a platform sale cannot run together on one product. Choose one in the Offers step';

const inputCls ='w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

/**
 * What the product form sends for the two offers. A product has a Premium offer OR a platform sale, never both: when it is
 * in a platform sale the Premium offer is switched off (premiumOptOut = true, own percent cleared).
 * `premiumPct` / `premiumOptOut` null = not loaded yet (edit page) -> leave them out so a save never overwrites them.
 */
export function offersPayload(s: { premiumPct: string | null; premiumOptOut: boolean | null; campaignIds: string[] | null }) {
  const out: { premiumDiscountPercent?: number | null; premiumOptOut?: boolean; campaignIds?: string[] } = {};
  if (s.campaignIds) out.campaignIds = s.campaignIds;
  if (s.campaignIds && s.campaignIds.length > 0) {
    out.premiumDiscountPercent = null;
    out.premiumOptOut = true;
    return out;
  }
  if (s.premiumPct !== null) out.premiumDiscountPercent = s.premiumPct.trim() ? Number(s.premiumPct) : null;
  if (s.premiumOptOut !== null) out.premiumOptOut = s.premiumOptOut;
  return out;
}

/**
 * "Offers" card of the seller product form (Add + Edit, physical + digital): two switches that exclude each other.
 *  (a) Premium member discount - store default / custom % / off for this product
 *  (b) Edudeen's platform sales - the admin's running or upcoming campaigns (hidden while the Premium offer is on)
 * plus the live "Your earnings" calculator.
 */
export function ProductOffersCard({
  storeId, currency, productType, price, compareAtPrice, storePremiumPct, onEditPrice,
  premiumPct, setPremiumPct, premiumOptOut, setPremiumOptOut, campaignIds, setCampaignIds, onFlags,
}: {
  /** reports the two blocking states to the form: Premium switched on without a usable %, and Premium + platform sale together */
  onFlags?: (f: OfferFlags) => void;
  storeId: string; currency?: string | null; productType: string; price: string; compareAtPrice: string;
  /** the store-wide Premium percent (0 = none) */
  storePremiumPct: number;
  /** jumps to the price fields (Price step) so the seller can change their own sale */
  onEditPrice?: () => void;
  premiumPct: string | null; setPremiumPct: (v: string) => void;
  premiumOptOut: boolean | null; setPremiumOptOut: (v: boolean) => void;
  campaignIds: string[] | null; setCampaignIds: (v: string[]) => void;
}) {
  const { campaigns } = useStoreCampaigns(storeId);
  // A choice the seller has not made yet: nothing is applied until they pick a side; Cancel / Esc leaves everything as it was.
  const [pending, setPending] = useState<null | { kind: 'pick'; next: string[] } | { kind: 'premium' }>(null);
  const loaded = premiumPct !== null && premiumOptOut !== null && campaignIds !== null;
  const pct = premiumPct ?? '';
  const optOut = premiumOptOut ?? false;
  const picked = campaignIds ?? [];
  // editing / customMode keep the Premium section and the Custom input on screen while the seller clears or types a
  // value that is not (yet) valid - they must not be derived from the typed value, or the input unmounts mid-typing.
  const [editing, setEditing] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const { terms } = usePremiumTerms(productType, currency, storeId);
  const gap = terms?.minGapPercent ?? 5;
  const priceN = Number(price);
  const compareN = Number(compareAtPrice);
  const premiumOn = !optOut && (editing || effectiveSellerPercent(pct, storePremiumPct, optOut) > 0);
  const custom = !optOut && (customMode || pct.trim() !== '');
  const minReq = premiumMinPercent(priceN, compareN, gap);
  const sellerPct = effectiveSellerPercent(pct, storePremiumPct, optOut);
  const rangeError = premiumPercentError(pct);
  const minError = !rangeError && premiumOn ? premiumGapMessage(priceN, compareN, sellerPct, gap) : null;
  const premiumBlank = loaded && premiumOn && sellerPct <= 0;
  const error = rangeError ?? minError ?? (premiumBlank ? PREMIUM_BLANK_MESSAGE : null);
  const conflict = loaded && premiumOn && picked.length > 0;
  useEffect(() => { onFlags?.({ premiumBlank, conflict }); }, [premiumBlank, conflict]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPending(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);
  // Keep Premium: the platform sale is dropped. Keep the sale: Premium is switched off (an explicit opt-out beats a store default).
  const keepPremium = () => { setCampaignIds([]); if (!premiumOn) turnPremiumOn(); setPending(null); };
  const keepSale = () => { const next = pending?.kind === 'pick' ? pending.next : picked; turnPremiumOff(); setPremiumOptOut(true); setCampaignIds(next); setPending(null); };
  // Picking a sale while Premium is on asks first; with Premium off it just applies (explicit opt-out beats a store default).
  const pickCampaigns = (next: string[]) => {
    if (next.length > 0 && premiumOn && next.some(id => !picked.includes(id))) { setPending({ kind: 'pick', next }); return; }
    if (next.length > 0) { setPremiumPct(''); setPremiumOptOut(true); }
    setCampaignIds(next);
  };
  const choice = (title: string) => (
    <div role="alertdialog" aria-label={title} className="mt-3 rounded-lg border border-[#f1d98a] bg-[#fffaf0] px-3 py-2.5 text-[12.5px] text-charcoal">
      <p className="m-0 flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-[2px] text-[#8a6100]" aria-hidden /> <span>Premium and a platform sale cannot run together on one product. Choose one:</span></p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={keepPremium} className="px-3 py-1.5 rounded-lg bg-brand-royal text-white text-[12px] font-semibold border-none cursor-pointer">Keep Premium (remove platform sale)</button>
        <button type="button" onClick={keepSale} className="px-3 py-1.5 rounded-lg bg-white border border-brand-royal text-brand-royal text-[12px] font-semibold cursor-pointer">Keep platform sale (turn Premium off)</button>
        {pending && <button type="button" onClick={() => setPending(null)} className="px-3 py-1.5 rounded-lg bg-white border border-bone text-[12px] cursor-pointer">Cancel</button>}
      </div>
    </div>
  );
  const pickedCampaign = campaigns.find(c => picked.includes(c._id)) ?? null;
  const combined = pickedCampaign ? combinedSaleInfo(priceN, compareN, pickedCampaign) : null;
  // Turning Premium off: store default present -> explicit opt-out (otherwise the store default would still apply).
  const turnPremiumOff = () => { setEditing(false); setCustomMode(false); setPremiumPct(''); setPremiumOptOut(storePremiumPct > 0); };
  // Default = the store default (or 10), raised to what the seller's own sale requires (sale + gap).
  const turnPremiumOn = () => {
    setEditing(true);
    setPremiumOptOut(false);
    const base = storePremiumPct > 0 ? storePremiumPct : 10;
    const def = Math.max(base, minReq ?? 0);
    if (!pct.trim() && (storePremiumPct <= 0 || def > storePremiumPct)) { setCustomMode(true); setPremiumPct(String(def)); }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* (a) Premium member discount */}
      <div className="rounded-xl border border-bone bg-cream/60 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-carbon flex items-center gap-1.5 m-0">
              <Crown size={14} className="text-[#C79A00]" aria-hidden /> Premium member discount
            </p>
            <p className="text-[12px] text-slate mt-0.5 mb-0">
              Edudeen Premium members get a % off this product, paid from your side - you keep the rest.
              {storePremiumPct > 0 && <> Your store-wide default is {storePremiumPct}%.</>}
            </p>
          </div>
          <Toggle
            label="Premium member discount on this product"
            checked={premiumOn}
            disabled={!loaded}
            onChange={next => {
              if (!next) { turnPremiumOff(); setPending(null); return; }
              if (picked.length > 0) { setPending({ kind: 'premium' }); return; }
              turnPremiumOn();
            }}
          />
        </div>

        {(pending?.kind === 'premium' || conflict) && choice('Premium or platform sale')}

        {premiumOn && (
          <div className="mt-3 flex flex-col gap-2">
            {storePremiumPct > 0 && (
              <div role="radiogroup" aria-label="Premium discount for this product" className="flex flex-wrap gap-2">
                <button type="button" role="radio" aria-checked={!custom} onClick={() => { setCustomMode(false); setPremiumPct(''); }} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer ${!custom ? 'border-brand-royal bg-brand-royal/10 text-brand-royal' : 'border-bone bg-white text-charcoal'}`}>Store default ({storePremiumPct}%)</button>
                <button type="button" role="radio" aria-checked={custom} onClick={() => { setCustomMode(true); setPremiumPct(pct.trim() ? pct : String(Math.max(storePremiumPct, minReq ?? 0))); }} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer ${custom ? 'border-brand-royal bg-brand-royal/10 text-brand-royal' : 'border-bone bg-white text-charcoal'}`}>Custom %</button>
                <button type="button" role="radio" aria-checked={false} onClick={() => { turnPremiumOff(); }} className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-bone bg-white text-charcoal cursor-pointer">Off for this product</button>
              </div>
            )}
            {(custom || storePremiumPct <= 0) && (
              <div className="max-w-[260px]">
                <label htmlFor="premium-price-pct" className="text-[12px] font-semibold text-charcoal block mb-1.5">Discount for Premium members (%)</label>
                <input
                  id="premium-price-pct" type="number" min={1} max={50} step="any" inputMode="decimal"
                  value={pct} onChange={e => setPremiumPct(e.target.value)} placeholder="e.g. 10" className={inputCls}
                />
                {error && <p role="alert" className="text-[12px] text-red-600 mt-1">{error}</p>}
              </div>
            )}
            {!custom && storePremiumPct > 0 && minError && <p role="alert" className="text-[12px] text-red-600 m-0">{minError}</p>}
            {minReq != null && !error && <p className="text-[12px] text-slate m-0">Minimum {String(Math.round(minReq * 10) / 10)}% (your sale {String(Math.round(ownSalePercent(priceN, compareN) * 10) / 10)}% + {String(gap)}% gap). You can set it higher.</p>}
          </div>
        )}
        {!premiumOn && optOut && storePremiumPct > 0 && (
          <p className="text-[12px] text-slate mt-2 mb-0">Off for this product (your store default of {storePremiumPct}% does not apply here).</p>
        )}
      </div>

      {/* (b) Edudeen's platform sales */}
      <div className="rounded-xl border border-bone bg-white p-3.5">
        <p className="text-[13px] font-semibold text-carbon flex items-center gap-1.5 m-0 mb-1">
          <Flame size={14} className="text-brand-orange" aria-hidden /> Join Edudeen&apos;s platform sales
        </p>
        {pending?.kind === 'pick' && choice('Premium or platform sale')}
        <CampaignPicker storeId={storeId} value={campaignIds} onChange={pickCampaigns} />
        {pickedCampaign && combined && !premiumOn && (
          <div role="alert" className="mt-3 rounded-lg border border-[#f1d98a] bg-[#fffaf0] px-3 py-2.5 text-[12.5px] text-charcoal">
            <p className="m-0 flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-[2px] text-[#8a6100]" aria-hidden /> <span>{combined.text}</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {onEditPrice && <button type="button" onClick={onEditPrice} className="px-3 py-1.5 rounded-lg bg-white border border-bone text-[12px] font-semibold cursor-pointer">Change my sale price</button>}
              <button type="button" onClick={() => { setCampaignIds(picked.filter(id => id !== pickedCampaign._id)); }} className="px-3 py-1.5 rounded-lg bg-white border border-brand-royal text-brand-royal text-[12px] font-semibold cursor-pointer">Unselect platform sale</button>
            </div>
          </div>
        )}
      </div>

      <PremiumEarningsCalculator
        price={price} compareAtPrice={compareAtPrice} premiumValue={pct} storePercent={storePremiumPct}
        productType={productType} currency={currency} storeId={storeId} premiumOptOut={optOut} campaign={conflict ? null : pickedCampaign}
        availableCampaigns={pickedCampaign ? [] : campaigns}
        onJoinCampaign={id => pickCampaigns([id])}
      />
    </div>
  );
}

const pc = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Own sale (compare-at > price) AND a platform sale picked: the platform sale is worked out from the LIST price and only
 * applies when cheaper than the buyer's normal price (same rule as the API), so the two are NOT added together.
 */
export function combinedSaleInfo(price: number, compareAt: number, c: Parameters<typeof campaignCalc>[2] & { name?: string }): { text: string } | null {
  const own = ownSalePercent(price, compareAt);
  if (!(own > 0) || !(price > 0)) return null;
  const r = campaignCalc(price, compareAt, c);
  if (!r) return null;
  const platformPct = r.list > 0 ? (1 - r.unit / r.list) * 100 : 0;
  if (!r.applies) {
    return { text: `Your own sale (${pc(own)}%) is already lower than the platform sale (${pc(platformPct)}% off the list price), so buyers keep your sale price - the platform sale does not apply to this product.` };
  }
  return { text: `Your own sale (${pc(own)}%) and the platform sale (${pc(platformPct)}%) together give buyers about ${pc(platformPct)}% off the list price. The platform sale replaces your own sale price while it runs - the two are not added together.` };
}