import { useState } from 'react';
import { Gift } from 'lucide-react';
import client from '@/api/client';

const MAX = 300;

/** Optional gift note + gift wrap (free) for the physical items. Saved to the checkout and copied onto the order. */
export function GiftOptions({ checkoutId }: { checkoutId: string }) {
  const [wrap, setWrap] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const save = async (next: { wrap?: boolean; message?: string }) => {
    setStatus('saving');
    setError('');
    try {
      await client.post('/api/checkout/gift-options', {
        checkoutId,
        giftWrap: next.wrap ?? wrap,
        giftMessage: next.message ?? message,
      });
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Could not save the gift options.');
    }
  };

  return (
    <div className="rounded-xl border border-bone bg-white px-4 py-3 mb-4">
      <p className="flex items-center gap-2 text-[13px] font-bold text-carbon mb-2"><Gift size={14} aria-hidden="true" /> Sending this as a gift?</p>
      <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={wrap}
          onChange={e => { setWrap(e.target.checked); void save({ wrap: e.target.checked }); }}
          className="w-[15px] h-[15px] accent-brand-orange"
        />
        Gift wrap my order (free)
      </label>
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
