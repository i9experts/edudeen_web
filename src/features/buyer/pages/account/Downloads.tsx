import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Clock, Star } from 'lucide-react';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { Card, EmptyState, SkeletonBox, PageHeader, Button } from '@/components/comman/ui';
import { apiGetMyOrders, type OrderSummary, type OrderLineItem } from '@/api/services/orders';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';

// Pulls every page of the buyer's orders — the downloads list must cover the
// whole purchase history, not just the latest page.
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

interface DownloadEntry {
  key:         string;
  item:        OrderLineItem;
  orderId:     string;
  orderNumber: string;
  orderStatus: string;
  isPaid:      boolean;
  createdAt:   string;
}

function toEntries(orders: OrderSummary[]): DownloadEntry[] {
  return orders.flatMap(order =>
    (order.stores ?? [])
      .flatMap(s => s.items ?? [])
      .filter(i => i.type === 'digital' && i.status !== 'cancelled' && !!i.productId)
      .map((item, idx) => ({
        key:         `${order.orderId}-${item.itemId ?? idx}`,
        item,
        orderId:     order.orderId,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        isPaid:      order.isPaid,
        createdAt:   order.createdAt,
      })),
  );
}

function ItemImg({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return <ProductCoverFallback name={name} size="sm" className="w-[64px] h-[64px] rounded-[10px] shrink-0" />;
  }
  return (
    <img loading="lazy" decoding="async" src={src} alt={name} onError={() => setErr(true)}
      className="w-[64px] h-[64px] rounded-[10px] object-cover shrink-0 border border-[#edebe2]" />
  );
}

export function Downloads() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DownloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const all: OrderSummary[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await apiGetMyOrders({ page, limit: PAGE_SIZE });
          const batch = res.data.orders ?? [];
          all.push(...batch);
          const totalPages = res.data.pagination?.totalPages ?? 1;
          if (batch.length < PAGE_SIZE || page >= totalPages) break;
        }
        if (!cancelled) setEntries(toEntries(all));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your downloads.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const readyCount = entries.filter(e => e.isPaid).length;

  return (
    <div>
      <Card padding="none">
        {/* Header — desktop only; mobile's AccountLayout top bar already shows "Downloads". */}
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader
            eyebrow="Account"
            title="Downloads"
            description={loading ? 'Your digital purchases' : `${readyCount} digital item${readyCount !== 1 ? 's' : ''} ready to download`}
          />
        </div>

        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {[1, 2, 3].map(i => <SkeletonBox key={i} height={88} rounded="12px" />)}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-[13px] text-error text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Download size={28} className="text-brand-orange opacity-55" />}
            title="No downloads yet"
            description="Worksheets, e-books, courses and other digital resources you buy will appear here, ready to download anytime."
            action={{ label: 'Browse resources', onClick: () => navigate('/') }}
            className="py-12"
          />
        ) : (
          <ul className="divide-y divide-[#f5f4ef] list-none p-0 m-0">
            {entries.map(entry => {
              const { item } = entry;
              // Backend accepts a review once the item is delivered/completed.
              const reviewable = entry.isPaid
                && (['delivered', 'completed'].includes(item.status) || ['delivered', 'completed'].includes(entry.orderStatus));
              return (
                <li key={entry.key} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-4 md:px-5 py-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <ItemImg src={item.image} name={item.name} />
                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.productId}`}
                        className="block text-[13px] font-semibold text-charcoal hover:text-brand-orange truncate"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[11px] text-slate mt-[2px]">
                        Order <span className="font-mono">{entry.orderNumber}</span>
                        {' · '}
                        {new Date(entry.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {reviewable && (
                        <Link
                          to={`/product/${item.productId}#write-review`}
                          className="inline-flex items-center gap-[5px] mt-1.5 text-[11px] font-semibold text-brand-orange hover:underline"
                        >
                          <Star size={11} /> Write a review
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 sm:pl-0 pl-[76px]">
                    {entry.isPaid ? (
                      <DigitalFileDownloads orderId={entry.orderId} productId={item.productId} />
                    ) : (
                      <span className="inline-flex items-center gap-[5px] px-2.5 py-[5px] rounded-[7px] text-[11px] font-semibold bg-[#fff4dc] text-[#b36200]">
                        <Clock size={11} /> Available once payment is confirmed
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
