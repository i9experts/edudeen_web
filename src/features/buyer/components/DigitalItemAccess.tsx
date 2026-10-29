import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import { apiGetMyLibrary, type LibraryItem } from '@/api/services/orders';
import { DigitalFileDownloads } from './DigitalFileDownloads';
import { JoinLiveClassButton } from './JoinLiveClassButton';
import { DeliveryFormatBadge } from '@/components/comman/ui/DeliveryFormatBadge';

// One shared library read per page load (order pages show several items); a failure falls back to the plain download button.
let cache: { at: number; promise: Promise<Map<string, LibraryItem>> } | null = null;
function loadLibrary(): Promise<Map<string, LibraryItem>> {
  if (cache && Date.now() - cache.at < 30_000) return cache.promise;
  const promise = apiGetMyLibrary().then(res => new Map((res.data.items ?? []).map(i => [i.productId, i])));
  cache = { at: Date.now(), promise };
  promise.catch(() => { if (cache?.promise === promise) cache = null; });
  return promise;
}

/** How this bought item is delivered (file / course / live class), read from My Library; undefined while loading or unknown. */
export function useDeliveryFormat(productId: string): { format: LibraryItem['deliveryFormat'] | undefined; item: LibraryItem | null; loading: boolean } {
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!productId) { setLoading(false); return; }
    let alive = true;
    loadLibrary().then(m => { if (alive) setItem(m.get(productId) ?? null); }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [productId]);
  return { format: item?.deliveryFormat, item, loading };
}

/** Small format pill for a bought item; nothing for plain file downloads or while unknown. */
export function BoughtFormatBadge({ productId }: { productId: string }) {
  const { format } = useDeliveryFormat(productId);
  return format === 'course' || format === 'live_class' ? <DeliveryFormatBadge format={format} /> : null;
}

/**
 * The action for a bought digital item: files -> download buttons, online course -> Start learning,
 * live class -> Join (inside the join window) / time info. Falls back to downloads when unknown.
 */
export function DigitalItemAccess({ orderId, productId }: { orderId: string; productId: string }) {
  const { format, item, loading } = useDeliveryFormat(productId);
  if (loading) return <span className="text-[12px] text-slate">Loading…</span>;
  if (format === 'course') {
    return (
      <Link to={`/course/${item?.slug ?? productId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold no-underline">
        <PlayCircle size={13} /> Start learning
      </Link>
    );
  }
  if (format === 'live_class') {
    return <JoinLiveClassButton productId={productId} startsAt={item?.liveStartsAt} endsAt={item?.liveEndsAt} status={item?.liveStatus} />;
  }
  return <DigitalFileDownloads orderId={orderId} productId={productId} />;
}
