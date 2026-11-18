import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';
import { apiGetMyLibrary, type LibraryItem } from '@/api/services/orders';
import { TokenStorage } from '@/api/services/auth';
import { DigitalFileDownloads } from './DigitalFileDownloads';
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

/** How this bought item is delivered (file / course), read from My Library; undefined while loading or unknown. */
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

/** True once every given product is known (from My Library) to be an online course. */
export function useAllCourses(productIds: string[]): boolean {
  const key = productIds.join(',');
  const [all, setAll] = useState(false);
  useEffect(() => {
    if (!key) { setAll(false); return; }
    let alive = true;
    loadLibrary().then(m => { if (alive) setAll(key.split(',').every(id => m.get(id)?.deliveryFormat === 'course')); }).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  return all;
}

/** Cart note for a digital/free item the buyer already owns (the API rejects a second order for it). */
export function AlreadyInLibraryNote({ productId }: { productId: string }) {
  const { item } = useDeliveryFormat(TokenStorage.isLoggedIn() ? productId : '');
  if (!item) return null;
  const course = item.deliveryFormat === 'course';
  return (
    <p role="alert" className="mb-2 flex flex-wrap items-center gap-1.5 rounded-md bg-[#e3f4ea] border border-[#a3d9b5] px-2 py-1 text-[12px] font-semibold text-[#1a6b35]">
      Already in your library
      <Link to={course ? `/course/${item.slug ?? productId}` : '/account/downloads'} className="underline text-brand-royal">{course ? 'Start learning' : 'Open My Library'}</Link>
      <span className="font-normal">Remove it from the cart to check out.</span>
    </p>
  );
}

/** Small format pill for a bought item; nothing for plain file downloads or while unknown. */
export function BoughtFormatBadge({ productId }: { productId: string }) {
  const { format } = useDeliveryFormat(productId);
  return format === 'course' ? <DeliveryFormatBadge format={format} /> : null;
}

/**
 * The action for a bought digital item: files -> download buttons, online course -> Start learning,
 * Falls back to downloads when unknown.
 */
export function DigitalItemAccess({ orderId, productId }: { orderId: string; productId: string }) {
  const { format, item, loading } = useDeliveryFormat(productId);
  if (loading) return <span className="text-[12px] text-slate">Loading…</span>;
  if (item?.unavailable) {
    return <span className="text-[12px] text-slate">{item.unavailable === 'expired' ? 'Access ended' : 'No longer available'}</span>;
  }
  if (format === 'course') {
    return (
      <Link to={`/course/${item?.slug ?? productId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-royal text-white px-3 py-[7px] text-[12.5px] font-bold no-underline">
        <PlayCircle size={13} /> Start learning
      </Link>
    );
  }
  return <DigitalFileDownloads orderId={orderId} productId={productId} />;
}
