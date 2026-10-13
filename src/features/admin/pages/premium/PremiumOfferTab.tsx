import { useEffect, useState } from 'react';
import { Gift, CheckCircle2 } from 'lucide-react';
import { Button, Input, Toggle } from '@/components/comman/ui';
import { apiAdminGetPremiumSettings, apiAdminUpdatePremiumSettings } from '@/api/services/adminPremium';
import { useLoad } from './useLoad';

const r2 = (n: number) => Math.round(n * 100) / 100;
const pctText = (n: number) => String(Math.round(n * 10) / 10);

interface Form { enabled: boolean; percent: string; fee: string; gap: string }

function validate(f: Form): Record<string, string> {
  const e: Record<string, string> = {};
  const check = (key: string, raw: string, max: number, label: string) => {
    const n = raw.trim() === '' ? NaN : Number(raw);
    if (!(n >= 0 && n <= max)) e[key] = `${label} must be a number from 0 to ${max}.`;
  };
  check('percent', f.percent, 30, 'The Edudeen discount');
  check('fee', f.fee, 30, 'The fee');
  check('gap', f.gap, 50, 'The gap');
  return e;
}

/** Worked example from the form values: list 100, seller normal sale 10% (price 90), seller Premium 15%. */
function Example({ f }: { f: Form }) {
  const platform = f.enabled ? Number(f.percent) || 0 : 0;
  const fee = Number(f.fee) || 0;
  const list = 100;
  const sellerPct = 15;
  const unit = r2(list * (1 - (sellerPct + platform) / 100));
  const edudeenAdds = r2(list * platform / 100);
  const sellerPrice = r2(list * (1 - sellerPct / 100));
  const sellerGets = r2(sellerPrice * (1 - fee / 100));
  return (
    <div className="rounded-lg border border-bone bg-cream/60 p-4 text-[12.5px] text-charcoal leading-relaxed">
      <p className="font-semibold text-carbon mb-1">Worked example</p>
      <p className="m-0">A product listed at 100. The seller runs a normal 10% sale (normal buyers pay 90) and offers Premium members 15%.</p>
      <ul className="m-0 mt-2 ps-5 list-disc">
        <li>Premium member pays <strong>{unit}</strong> (100 less 15% seller{f.enabled ? ` less ${pctText(platform)}% Edudeen` : ''}). They do not get the normal sale on top.</li>
        <li>{f.enabled ? <>Edudeen pays <strong>{edudeenAdds}</strong> of that from its own pocket; the seller is credited as if the member paid <strong>{sellerPrice}</strong>.</> : <>The offer is off, so the seller is credited exactly what the member pays (<strong>{sellerPrice}</strong>).</>}</li>
        <li>Platform fee on this Premium sale: {pctText(fee)}% of {sellerPrice} = {r2(sellerPrice * fee / 100)}. The seller's wallet gets <strong>{sellerGets}</strong>.</li>
      </ul>
    </div>
  );
}

export function PremiumOfferTab() {
  const { data, loading, error, refetch } = useLoad(() => apiAdminGetPremiumSettings().then(r => r.data), []);
  const [f, setF] = useState<Form>({ enabled: true, percent: '5', fee: '5', gap: '5' });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!data) return;
    setF({ enabled: data.platformDiscount.enabled, percent: String(data.platformDiscount.percent), fee: String(data.premiumSellerFeePercent), gap: String(data.minGapPercent) });
  }, [data]);

  const errors = validate(f);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setF(s => ({ ...s, [k]: v })); setSaved(false); };
  const show = (k: string) => (touched ? errors[k] : undefined);

  async function save() {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      await apiAdminUpdatePremiumSettings({
        platformDiscount: { enabled: f.enabled, percent: Number(f.percent) },
        premiumSellerFeePercent: Number(f.fee),
        minGapPercent: Number(f.gap),
      });
      setSaved(true);
      void refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save the settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <p className="text-[13px] text-slate py-6 text-center">Loading...</p>;
  if (error && !data) {
    return (
      <div className="bg-white border border-bone rounded-xl px-5 py-6 text-center">
        <p className="text-[13px] text-error mb-2">{error}</p>
        <button type="button" onClick={() => refetch()} className="text-[13px] font-semibold text-brand-orange cursor-pointer bg-transparent border-0">Try again</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[760px]">
      <div className="bg-white border border-bone rounded-xl p-5 flex flex-col gap-5">
        <div className="flex items-start gap-2">
          <Gift size={16} className="text-brand-orange mt-[2px]" />
          <div>
            <p className="text-[13.5px] font-semibold text-charcoal m-0">Edudeen's extra Premium discount</p>
            <p className="text-[12.5px] text-slate m-0 mt-0.5">
              On top of the discount each seller gives, Edudeen takes extra money off the LIST price for Premium members and pays that part itself. Sellers never pay for it.
              Members pay the list price less the seller's % less this %, and they do not also get the seller's normal sale.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border border-bone bg-cream">
          <p className="text-[13px] font-medium text-charcoal m-0">Edudeen adds an extra discount for Premium members</p>
          <Toggle label="Edudeen extra Premium discount" checked={f.enabled} onChange={v => set('enabled', v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Edudeen discount (% of list price, 0 to 30)" type="number" min={0} max={30} step="0.5" value={f.percent} disabled={!f.enabled}
            onChange={e => set('percent', e.target.value)} error={show('percent')} />
          <Input label="Platform fee on a Premium sale (%, 0 to 30)" type="number" min={0} max={30} step="0.5" value={f.fee}
            onChange={e => set('fee', e.target.value)} error={show('fee')} />
          <Input label="Premium must beat a normal sale by (points)" type="number" min={0} max={50} step="0.5" value={f.gap}
            onChange={e => set('gap', e.target.value)} error={show('gap')} />
        </div>
        <ul className="m-0 ps-5 list-disc text-[12px] text-slate leading-relaxed">
          <li><strong>Platform fee on a Premium sale</strong> replaces the normal platform fee for that sale. It is charged on the price the seller is credited, never on shipping.</li>
          <li><strong>Premium must beat a normal sale by</strong>: sellers cannot save a product whose normal sale is within this many points of its Premium discount (Premium 15% and a gap of 5 means the normal sale can be at most 10%). Existing products and store-level changes are not blocked.</li>
        </ul>

        <Example f={f} />

        <div className="flex items-center gap-3 flex-wrap">
          <Button size="md" loading={saving} onClick={save}>Save settings</Button>
          {saved && <span className="inline-flex items-center gap-1 text-[12.5px] text-green-700"><CheckCircle2 size={14} /> Saved. New checkouts use these settings now.</span>}
          {saveError && <span role="alert" className="text-[12.5px] text-red-600">{saveError}</span>}
        </div>
      </div>
    </div>
  );
}
