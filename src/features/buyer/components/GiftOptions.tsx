import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import client from '@/api/client';
import { formatPrice } from '@/utils/formatPrice';

const MAX = 300;

export interface GiftTotals { shippingFee: number; totalAmount: number; shippingByStore?: unknown[] }

/** Optional gift note + gift wrap for the physical items (wrap price is each seller's own). Saved to the checkout and copied onto the order. */
export function GiftOptions({ checkoutId, onTotals }: { checkoutId: string; onTotals?: (t: GiftTotals) => void }) {
  const [wrap, setWrap] = useState(false);
  const [message, setMessage] = useState('');
  const [available, setAvailable] = useState(true);
  const [fee, setFee] = useState(0);
  const [currency, setCurrency] = useState('PKR');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    client.get('/api/checkout/gift-options', { params: { checkoutId } })
      .then(res => {
        if (cancelled) return;
        const d = res.data?.data;
        if (!d) return;
        setAvailable(!!d.available);
        setFee(d.fee ?? 0);
        setCurrency(d.currency ?? 'PKR');
        setWrap(!!d.giftWrap);
        setMessage(d.giftMessage ?? '');
      })
      .catch(() => { /* keep the defaults: the box still works, the price just isn't shown up front */ });
    return () => { cancelled = true; };
  }, [checkoutId]);

  const save = async (next: { wrap?: boolean; message?: string }) => {
    setStatus('saving');
    setError('');
    try {
      const res = await client.post('/api/checkout/gift-options', {
        checkoutId,
        giftWrap: next.wrap ?? wrap,
        giftMessage: next.message ?? message,
      });
      const d = res.data?.data;
      if (d && typeof d.totalAmount === 'number') onTotals?.({ shippingFee: d.shippingFee, totalAmount: d.totalAmount, shippingByStore: d.shippingByStore });
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      if (next.wrap !== undefined) setWrap(!next.wrap);
      setError(err instanceof Error ? err.message : 'Could not save the gift options.');
    }
  };

  return (
    <div className="rounded-xl border border-bone bg-white px-4 py-3 mb-4">
      <p className="flex items-center gap-2 text-[13px] font-bold text-carbon mb-2"><Gift size={14} aria-hidden="true" /> Sending this as a gift?</p>
      {available && (
        <label className="flex items-center gap-2 min-h-11 text-[13px] -mx-3 px-3 text-charcoal cursor-pointer mb-1">
          <input
            type="checkbox"
            checked={wrap}
            onChange={e => { setWrap(e.target.checked); void save({ wrap: e.target.checked }); }}
            className="w-[15px] h-[15px] accent-brand-orange"
          />
          Gift wrap my order ({fee > 0 ? `+${formatPrice(fee, currency)}` : 'free'})
        </label>
      )}
      <label htmlFor="gift-message" className="block text-[12px] text-slate mb-1">Gift message (optional)</label>
      <textarea
        id="gift-message"
        rows={2}
        maxLength={MAX}
        value={message}
        onChange={e => setMessage(e.target.value)}
        onBlur={() => { if (message.trim() || status === 'saved') void save({ message }); }}
        placeholder="Write a short note for the receiver"
        className="w-full py-2 px-3 text-[13px] border border-bone rounded-lg outline-none bg-white text-charcoal focus:border-brand-orange"
      />
      <div className="flex justify-between text-[12px] mt-1">
        <span role="status" className={status === 'error' ? 'text-error' : 'text-slate'}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? error : ''}
        </span>
        <span className="text-slate">{message.length}/{MAX}</span>
      </div>
    </div>
  );
}
