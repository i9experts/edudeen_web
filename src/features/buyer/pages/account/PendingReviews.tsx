import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Button, Card, SkeletonBox } from '@/components/comman/ui';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { ReviewFormModal } from '@/features/buyer/components/ReviewFormModal';
import { apiGetMyOrders, type OrderLineItem } from '@/api/services/orders';
import { apiGetMyReviewedIds } from '@/api/services/rating';

type Pending = Pick<OrderLineItem, 'productId' | 'name' | 'image'> & { orderNumber: string };

/** "Waiting for your review": delivered/completed items the buyer hasn't reviewed yet. Hidden when there are none. */
export function PendingReviews({ onReviewed }: { onReviewed: () => void }) {
  const [items, setItems] = useState<Pending[] | null>(null);
  const [writing, setWriting] = useState<Pending | null>(null);

  const load = useCallback(() => {
    Promise.all([
      apiGetMyOrders({ page: 1, limit: 50 }),
      apiGetMyReviewedIds().catch(() => null),
    ])
      .then(([orders, reviewed]) => {
        const done = new Set(reviewed?.data?.productIds ?? []);
        const seen = new Set<string>();
        const out: Pending[] = [];
        for (const o of orders.data.orders ?? []) {
          for (const s of o.stores ?? []) {
            for (const it of s.items ?? []) {
              if (!it.canReview || !it.productId || done.has(it.productId) || seen.has(it.productId)) continue;
              seen.add(it.productId);
              out.push({ productId: it.productId, name: it.name, image: it.image, orderNumber: o.orderNumber });
            }
          }
        }
        setItems(out);
      })
      .catch(() => setItems([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (items === null) return <SkeletonBox height={90} rounded="12px" />;
  if (items.length === 0) return null;

  return (
    <Card padding="none" className="rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-bone">
        <p className="text-[14px] font-bold text-charcoal">Waiting for your review</p>
        <p className="text-[12px] text-slate mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} you received but haven't reviewed yet.</p>
      </div>
      <ul className="list-none p-0 m-0 divide-y divide-[#f5f4ef]">
        {items.map(it => (
          <li key={it.productId} className="flex flex-wrap items-center gap-3 px-5 py-3">
            {it.image
              ? <img loading="lazy" decoding="async" src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-bone shrink-0" />
              : <ProductCoverFallback name={it.name} size="xs" className="w-12 h-12 rounded-lg shrink-0" />}
            <div className="flex-1 min-w-0">
              <Link to={`/product/${it.productId}`} className="text-[13px] font-semibold text-charcoal no-underline hover:text-brand-orange truncate block">{it.name}</Link>
              <p className="text-[12px] text-slate">Order {it.orderNumber}</p>
            </div>
            <Button variant="outline" size="sm" icon={<Star size={13} />} onClick={() => setWriting(it)}>Write a review</Button>
          </li>
        ))}
      </ul>
      {writing && (
        <ReviewFormModal
          mode="create"
          productId={writing.productId}
          onClose={() => setWriting(null)}
          onSaved={() => { setWriting(null); load(); onReviewed(); }}
        />
      )}
    </Card>
  );
}
