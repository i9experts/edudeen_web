import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, ChevronRight } from 'lucide-react';
import { apiGetSellerConversationContext, type ConversationContext } from '@/api/services/messaging';
import { formatPrice } from '@/utils/formatPrice';
import { statusLabel } from '@/constants/statusLabels';
import { Button } from '@/components/comman/ui';

/** Buyer context of one seller chat: the product/order the buyer asked about + this store's orders from them. */
export function useBuyerContext(conversationId: string | null) {
  const [data, setData] = useState<ConversationContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(() => {
    if (!conversationId) { setData(null); return; }
    const mine = ++seq.current;
    setLoading(true); setError('');
    apiGetSellerConversationContext(conversationId)
      .then(r => { if (seq.current === mine) setData(r); })
      .catch(e => { if (seq.current === mine) { setData(null); setError(e instanceof Error ? e.message : 'Could not load buyer details.'); } })
      .finally(() => { if (seq.current === mine) setLoading(false); });
  }, [conversationId]);

  useEffect(() => { setData(null); load(); }, [load]);
  return { data, loading, error, retry: load };
}

const fmtDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Small card under the chat header. Hidden when the product/order no longer exists (never crashes). */
export function ChatContextCard({ ctx, storeId }: { ctx: ConversationContext | null; storeId: string }) {
  if (!ctx || (!ctx.product && !ctx.order)) return null;
  const { product, order } = ctx;
  const row = 'flex items-center gap-3 min-h-[44px] px-3 py-1.5 no-underline text-inherit hover:bg-cream';
  return (
    <div className="border-b border-[#eeece4] bg-white shrink-0 divide-y divide-[#f1efe8]">
      {product && (
        <a href={product.slug ? `/product/${encodeURIComponent(product.slug)}` : undefined} target="_blank" rel="noopener noreferrer" className={row}>
          {product.image
            ? <img src={product.image} alt="" loading="lazy" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            : <span className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center shrink-0"><ShoppingBag size={15} /></span>}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-slate">Asking about this product</span>
            <span className="block text-[13px] font-semibold text-charcoal truncate">{product.title}</span>
          </span>
          <span className="text-[12.5px] font-semibold text-charcoal shrink-0">{product.currency ? formatPrice(product.price, product.currency) : product.price}</span>
        </a>
      )}
      {order && (
        <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(order.number)}`} className={row}>
          <span className="w-9 h-9 rounded-lg bg-cream flex items-center justify-center shrink-0"><Package size={15} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-slate">Asking about this order</span>
            <span className="block text-[13px] font-semibold text-charcoal truncate">#{order.number}</span>
          </span>
          <span className="text-[12px] text-slate shrink-0">{statusLabel(order.status)} · {fmtDate(order.date)}</span>
          <ChevronRight size={14} className="text-slate shrink-0 rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}

/** Body of the "Buyer details" panel (desktop side panel and mobile sheet share it). */
export function BuyerDetailsBody({ state, storeId, buyerName }: { state: ReturnType<typeof useBuyerContext>; storeId: string; buyerName: string }) {
  const { data, loading, error, retry } = state;
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3 animate-pulse" aria-busy="true">
        <div className="h-4 w-1/2 rounded bg-cream" /><div className="h-4 w-2/3 rounded bg-cream" />
        <div className="h-16 rounded-lg bg-cream" /><div className="h-16 rounded-lg bg-cream" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p className="text-[13px] text-error">{error}</p>
        <Button variant="outline" size="sm" onClick={retry}>Retry</Button>
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[14px] font-bold text-charcoal truncate">{buyerName}</p>
        <p className="text-[12px] text-slate">Member since {fmtDate(data.stats.memberSince)}</p>
      </div>
      <div className="rounded-lg bg-cream px-3 py-2.5 flex items-center justify-between">
        <span className="text-[12.5px] text-slate">Orders from your store</span>
        <span className="text-[16px] font-bold text-charcoal">{data.stats.totalOrders}</span>
      </div>
      <div>
        <p className="text-[12px] font-semibold text-slate uppercase tracking-wide mb-1.5">Recent orders</p>
        {data.recentOrders.length === 0 ? (
          <p className="text-[13px] text-slate">This buyer hasn't placed any orders yet.</p>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col divide-y divide-[#f1efe8] border border-[#eeece4] rounded-lg overflow-hidden bg-white">
            {data.recentOrders.map(o => (
              <li key={o.id}>
                <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(o.number)}`} className="flex items-center justify-between gap-2 min-h-[44px] px-3 py-1.5 no-underline text-inherit hover:bg-cream">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-charcoal truncate">#{o.number}{o.isFree ? ' (free)' : ''}</span>
                    <span className="block text-[11.5px] text-slate">{fmtDate(o.date)}</span>
                  </span>
                  <span className={`text-[12px] shrink-0 ${o.status === 'cancelled' ? 'text-error font-semibold' : 'text-slate'}`}>{statusLabel(o.status)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link to={`/store/${storeId}/orders?tab=all&buyer=${encodeURIComponent(data.buyerId)}`} className="no-underline">
        <Button variant="outline" size="sm" className="w-full justify-center">View orders</Button>
      </Link>
    </div>
  );
}
