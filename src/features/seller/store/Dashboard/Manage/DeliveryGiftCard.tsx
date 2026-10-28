import { useEffect, useState } from 'react';
import { apiUpdateStore, type StoreDeliverySettings, type StoreGiftWrap } from '@/api/services/store';
import { Toggle } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));
const badMoney = (s: string) => { const n = toNum(s); return !Number.isFinite(n) || n < 0 || n > 10_000_000; };

/** Seller sets their own delivery charge and gift-wrap charge (store currency). */
export function DeliveryGiftCard({ storeId, delivery, giftWrap, currency, refetch }: {
  storeId: string;
  delivery: StoreDeliverySettings | null | undefined;
  giftWrap: StoreGiftWrap | null | undefined;
  currency?: string;
  refetch: () => void;
}) {
  const [delOn, setDelOn] = useState(delivery?.enabled ?? false);
  const [fee, setFee] = useState(String(delivery?.fee ?? 0));
  const [freeOver, setFreeOver] = useState(delivery?.freeOverAmount != null ? String(delivery.freeOverAmount) : '');
  const [wrapOn, setWrapOn] = useState(giftWrap?.enabled ?? true);
  const [wrapFee, setWrapFee] = useState(String(giftWrap?.fee ?? 0));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setDelOn(delivery?.enabled ?? false);
    setFee(String(delivery?.fee ?? 0));
    setFreeOver(delivery?.freeOverAmount != null ? String(delivery.freeOverAmount) : '');
    setWrapOn(giftWrap?.enabled ?? true);
    setWrapFee(String(giftWrap?.fee ?? 0));
  }, [delivery?.enabled, delivery?.fee, delivery?.freeOverAmount, giftWrap?.enabled, giftWrap?.fee]);

  const feeError = delOn && badMoney(fee) ? 'Enter the delivery charge (0 or more).' : null;
  const freeError = delOn && freeOver.trim() !== '' && badMoney(freeOver) ? 'Enter an amount (0 or more) or leave it empty.' : null;
  const wrapError = wrapOn && badMoney(wrapFee) ? 'Enter the gift wrap charge (0 or more).' : null;
  const cur = currency ?? '';

  async function save() {
    if (feeError || freeError || wrapError) return;
    setSaving(true); setMsg(null);
    try {
      await apiUpdateStore({
        storeId,
        deliverySettings: { enabled: delOn, fee: delOn ? toNum(fee) : 0, freeOverAmount: delOn && freeOver.trim() !== '' ? toNum(freeOver) : null },
        giftWrap: { enabled: wrapOn, fee: wrapOn ? toNum(wrapFee) : 0 },
      });
      refetch();
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-bone bg-white p-5">
      <p className="text-[13.5px] font-semibold text-charcoal mb-1">Delivery &amp; gift wrap charges</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-4">
        Amounts are in your store currency{cur ? ` (${cur})` : ''}. They apply to physical items only; Edudeen still decides which cities you can deliver to.
      </p>

      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream mb-3">
        <p className="text-[13px] font-medium text-charcoal">Set my own delivery charge</p>
        <Toggle label="Set my own delivery charge" checked={delOn} onChange={setDelOn} />
      </div>
      {delOn ? (
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div>
            <label htmlFor="del-fee" className="text-[12px] font-semibold text-charcoal block mb-1.5">Delivery charge per order</label>
            <input id="del-fee" type="number" min={0} step="any" value={fee} onChange={e => setFee(e.target.value)} className={inputCls} />
            {feeError && <p className="text-[12px] text-red-600 mt-1">{feeError}</p>}
          </div>
          <div>
            <label htmlFor="del-free" className="text-[12px] font-semibold text-charcoal block mb-1.5">Free delivery above (optional)</label>
            <input id="del-free" type="number" min={0} step="any" value={freeOver} onChange={e => setFreeOver(e.target.value)} className={inputCls} placeholder="e.g. 3000" />
            {freeError && <p className="text-[12px] text-red-600 mt-1">{freeError}</p>}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-slate mb-4">Off: buyers pay the standard Edudeen delivery fee for their city.</p>
      )}

      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream mb-3">
        <p className="text-[13px] font-medium text-charcoal">Offer gift wrapping</p>
        <Toggle label="Offer gift wrapping" checked={wrapOn} onChange={setWrapOn} />
      </div>
      {wrapOn && (
        <div className="mb-4 sm:max-w-[50%]">
          <label htmlFor="wrap-fee" className="text-[12px] font-semibold text-charcoal block mb-1.5">Gift wrap charge (0 = free)</label>
          <input id="wrap-fee" type="number" min={0} step="any" value={wrapFee} onChange={e => setWrapFee(e.target.value)} className={inputCls} />
          {wrapError && <p className="text-[12px] text-red-600 mt-1">{wrapError}</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" loading={saving} disabled={!!feeError || !!freeError || !!wrapError} onClick={save}>Save charges</Button>
        {msg && <span className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
