import { useEffect, useState } from 'react';
import { buildShippingPayload, dispatchDaysError, DISPATCH_DAYS_DEFAULT } from '@/features/seller/dashboard/shippingRules';
import { apiUpdateStore, type StoreDeliveryMethod, type StoreDeliverySettings, type StoreGiftWrap, type StoreShipFrom } from '@/api/services/store';
import { apiGetDeliveryOptions, type DeliveryOptions } from '@/api/services/couriers';
import { Toggle } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));
const badMoney = (s: string) => { const n = toNum(s); return !Number.isFinite(n) || n < 0 || n > 10_000_000; };

interface MethodChoice { value: StoreDeliveryMethod | null; label: string; hint: string; available: boolean; reason: string | null }

/** Seller picks how they deliver, and sets their own delivery charge and gift-wrap charge (store currency). */
export function DeliveryGiftCard({ storeId, delivery, giftWrap, shipFrom, deliveryMethod, dispatchDays, currency, refetch }: {
  storeId: string;
  dispatchDays?: number;
  deliveryMethod?: StoreDeliveryMethod | null;
  delivery: StoreDeliverySettings | null | undefined;
  giftWrap: StoreGiftWrap | null | undefined;
  shipFrom?: StoreShipFrom | null;
  currency?: string;
  refetch: () => void;
}) {
  const [fromCity, setFromCity] = useState(shipFrom?.city ?? '');
  const [fromProvince, setFromProvince] = useState(shipFrom?.province ?? '');
  const [delOn, setDelOn] = useState(delivery?.enabled ?? false);
  const [fee, setFee] = useState(String(delivery?.fee ?? 0));
  const [freeOver, setFreeOver] = useState(delivery?.freeOverAmount != null ? String(delivery.freeOverAmount) : '');
  const [wrapOn, setWrapOn] = useState(giftWrap?.enabled ?? true);
  const [wrapFee, setWrapFee] = useState(String(giftWrap?.fee ?? 0));
  const [dispatch, setDispatch] = useState(String(dispatchDays ?? DISPATCH_DAYS_DEFAULT));
  useEffect(() => { setDispatch(String(dispatchDays ?? DISPATCH_DAYS_DEFAULT)); }, [dispatchDays]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [method, setMethod] = useState<StoreDeliveryMethod | null>(deliveryMethod ?? null);
  const [options, setOptions] = useState<DeliveryOptions | null>(null);

  useEffect(() => { setMethod(deliveryMethod ?? null); }, [deliveryMethod]);
  useEffect(() => {
    let alive = true;
    apiGetDeliveryOptions()
      .then(res => { if (alive) setOptions(res.data); })
      .catch(() => { /* options stay hidden; standard + self-delivery always work */ });
    return () => { alive = false; };
  }, []);

  // Courier options are only listed when they can really be used (hidden while couriers are switched off).
  const courierChoices: MethodChoice[] = (['tcs', 'leopards', 'postex'] as const).flatMap(id => {
    const o = options?.couriers.find(c => c.id === id);
    if (!o?.available) return [];
    return [{ value: id, label: `Edudeen books ${o.label}`, hint: `Buyers pay ${o.label}'s delivery charge. Edudeen books and tracks the parcel.`, available: true, reason: null } as MethodChoice];
  });
  const methodChoices: MethodChoice[] = [
    { value: null, label: 'Edudeen standard delivery', hint: 'Buyers pay the standard Edudeen delivery fee for their city.', available: true, reason: null },
    { value: 'self', label: 'I deliver myself', hint: 'You arrange the delivery yourself. Edudeen does not book a courier.', available: true, reason: null },
    ...courierChoices,
    ...(options?.auto.available ? [{ value: 'auto', label: 'Cheapest available courier', hint: 'Edudeen uses whichever courier is cheapest for each order.', available: true, reason: null } as MethodChoice] : []),
  ];
  const showFlat = method === null || method === 'self';
  const weightBased = options?.weightBasedRates === true;

  useEffect(() => {
    setDelOn(delivery?.enabled ?? false);
    setFee(String(delivery?.fee ?? 0));
    setFreeOver(delivery?.freeOverAmount != null ? String(delivery.freeOverAmount) : '');
    setWrapOn(giftWrap?.enabled ?? true);
    setWrapFee(String(giftWrap?.fee ?? 0));
    setFromCity(shipFrom?.city ?? '');
    setFromProvince(shipFrom?.province ?? '');
  }, [delivery?.enabled, delivery?.fee, delivery?.freeOverAmount, giftWrap?.enabled, giftWrap?.fee, shipFrom?.city, shipFrom?.province]);

  const feeError = delOn && badMoney(fee) ? 'Enter the delivery charge (0 or more).' : null;
  const freeError = delOn && freeOver.trim() !== '' && badMoney(freeOver) ? 'Enter an amount (0 or more) or leave it empty.' : null;
  const wrapError = wrapOn && badMoney(wrapFee) ? 'Enter the gift wrap charge (0 or more).' : null;
  const dispatchError = dispatchDaysError(dispatch);
  const cur = currency ?? '';

  async function save() {
    if (feeError || freeError || wrapError || dispatchError) return;
    setSaving(true); setMsg(null);
    try {
      await apiUpdateStore(buildShippingPayload(storeId, { fromCity, fromProvince, delOn, fee, freeOver, wrapOn, wrapFee, method, dispatchDays: dispatch }));
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

      <p className="text-[13px] font-medium text-charcoal mb-1">Ships from</p>
      <p className="text-[12px] text-slate mb-2">Used to work out delivery charges (same city / same province / rest of Pakistan).</p>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <div>
          <label htmlFor="ship-city" className="text-[12px] font-semibold text-charcoal block mb-1.5">City</label>
          <input id="ship-city" type="text" maxLength={80} value={fromCity} onChange={e => setFromCity(e.target.value)} placeholder="e.g. Lahore" className={inputCls} />
        </div>
        <div>
          <label htmlFor="ship-province" className="text-[12px] font-semibold text-charcoal block mb-1.5">Province (optional)</label>
          <input id="ship-province" type="text" maxLength={80} value={fromProvince} onChange={e => setFromProvince(e.target.value)} placeholder="e.g. Punjab" className={inputCls} />
        </div>
      </div>

      <p className="text-[13px] font-medium text-charcoal mb-1">Dispatch time</p>
      <div className="mb-4 sm:max-w-[50%]">
        <label htmlFor="dispatch-days" className="text-[12px] font-semibold text-charcoal block mb-1.5">Ship within (working days)</label>
        <input id="dispatch-days" type="number" inputMode="numeric" min={1} max={7} step={1} value={dispatch} onChange={e => setDispatch(e.target.value)} className={inputCls} aria-invalid={!!dispatchError} />
        <p className="text-[12px] text-slate mt-1">Sundays are not counted. Applies to new orders only; orders you already have keep their ship-by date.</p>
        {dispatchError && <p role="alert" className="text-[12px] text-red-600 mt-1">{dispatchError}</p>}
      </div>

      <p className="text-[13px] font-medium text-charcoal mb-1">How do you deliver?</p>
      <div role="radiogroup" aria-label="How do you deliver?" className="flex flex-col gap-2 mb-4">
        {methodChoices.map(c => {
          const disabled = !c.available;
          return (
            <label key={c.value ?? 'default'} className={`flex items-start gap-2.5 px-[14px] py-2.5 rounded-[9px] border text-[13px] ${method === c.value ? 'border-brand-royal bg-cream' : 'border-bone bg-white'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input type="radio" name="delivery-method" className="mt-1" disabled={disabled} checked={method === c.value} onChange={() => setMethod(c.value)} />
              <span className="min-w-0">
                <span className="font-medium text-charcoal block">{c.label}</span>
                <span className="text-[12px] text-slate block">{disabled ? (c.reason ?? 'Not available yet') : c.hint}</span>
              </span>
            </label>
          );
        })}
      </div>

      {showFlat && (<>
      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream mb-3">
        <p className="text-[13px] font-medium text-charcoal">Set my own delivery charge</p>
        <Toggle label="Set my own delivery charge" checked={delOn} onChange={setDelOn} />
      </div>
      {weightBased && !delOn && <p className="text-[12px] text-slate mb-3">Edudeen’s standard rate depends on parcel weight and distance.</p>}
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
        <p className="text-[12px] text-slate mb-4">Off: buyers pay Edudeen’s standard delivery fee for their city.</p>
      )}
      </>)}

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
        <Button size="sm" loading={saving} disabled={!!feeError || !!freeError || !!wrapError || !!dispatchError} onClick={save}>Save charges</Button>
        {msg && <span className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
