import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, SkeletonBox } from '@/components/comman/ui';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { apiGetMyOrders, type OrderLineItem, type ReturnStatus } from '@/api/services/orders';
import { formatPrice } from '@/utils/formatPrice';
import { AccountPageHeader } from './AccountPageHeader';

const RETURN_LABEL: Record<Exclude<ReturnStatus, 'none'>, { label: string; color: 'orange' | 'blue' | 'green' | 'red' }> = {
  requested: { label: 'Requested', color: 'orange' },
  partial_requested: { label: 'Requested', color: 'orange' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
};

interface ReturnRow { key: string; orderId: string; orderNumber: string; currency: string; date: string; item: OrderLineItem; status: Exclude<ReturnStatus, 'none'> }

/** Account → Returns: every item the buyer asked to return, with its status (built from the orders API, which carries `returnStatus` per item). */
export function ReturnsPage() {
  const [rows, setRows] = useState<ReturnRow[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: ReturnRow[] = [];
      let page = 1;
      let pages: number;
      do {
        const res = await apiGetMyOrders({ page, limit: 50 });
        pages = res.data.pagination?.totalPages ?? 1;
        for (const o of res.data.orders ?? []) {
          for (const s of o.stores ?? []) {
            for (const it of s.items ?? []) {
              if (it.returnStatus && it.returnStatus !== 'none') {
                out.push({ key: `${o.orderId}-${it.itemId}`, orderId: o.orderId, orderNumber: o.orderNumber, currency: o.currency, date: o.createdAt, item: it, status: it.returnStatus });
              }
            }
          }
        }
        page += 1;
      } while (page <= pages && page <= 6);
      if (alive) { setRows(out); setError(''); }
    })().catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your returns.'); });
    return () => { alive = false; };
  }, [reload]);

  return (
    <div className="flex flex-col gap-5">
      <AccountPageHeader title="Returns" description="Items you asked to return and where each request stands." />
      {error ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[13px] text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>Try again</Button>
          </div>
        </Card>
      ) : rows === null ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map(i => <SkeletonBox key={i} height={64} rounded="12px" />)}</div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Undo2 size={26} className="text-brand-orange opacity-55" />}
            title="No return requests"
            description="When you request a return from one of your delivered orders, it will show up here."
          />
        </Card>
      ) : (
        <Card padding="none" className="rounded-2xl overflow-hidden">
          <ul className="list-none p-0 m-0 divide-y divide-[#f5f4ef]">
            {rows.map(r => {
              const st = RETURN_LABEL[r.status];
              return (
                <li key={r.key} className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3">
                  {r.item.image
                    ? <img loading="lazy" decoding="async" src={r.item.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-bone shrink-0" />
                    : <ProductCoverFallback name={r.item.name} size="xs" className="w-12 h-12 rounded-lg shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-charcoal truncate">{r.item.name}</p>
                    <p className="text-[12px] text-slate">
                      Order <Link to={`/account/orders/${r.orderId}`} className="text-brand-orange font-semibold no-underline hover:underline">{r.orderNumber}</Link>
                      {' · '}{new Date(r.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}Qty {r.item.quantity} · {formatPrice(r.item.totalPrice, r.currency)}
                    </p>
                  </div>
                  <Badge color={st.color} size="sm">{st.label}</Badge>
                  <Button variant="ghost" size="sm" to={`/account/orders/${r.orderId}`}>View order</Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
