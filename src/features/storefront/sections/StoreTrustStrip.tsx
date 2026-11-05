import type { ReactNode } from 'react';
import { CalendarDays, Clock, MapPin, Star, Truck } from 'lucide-react';
import type { PublicStoreData } from '@/api/services/store';
import { memberSinceLabel, trustPctLabel, TRUST_MIN_SAMPLES } from '@/utils/sellerTrust';

function Item({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0 shrink-0" title={hint}>
      <span className="text-brand-royal shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0 leading-tight">
        <dt className="text-[12px] text-slate whitespace-nowrap">{label}</dt>
        <dd className="text-[13px] font-semibold text-carbon whitespace-nowrap">{value}</dd>
      </div>
    </div>
  );
}

/**
 * Compact trust strip under the store banner. Every number comes cached from the API (hourly job). A number with
 * fewer than TRUST_MIN_SAMPLES data points is simply not shown (no "Not enough data" clutter); if nothing is
 * available the strip is hidden.
 */
export function StoreTrustStrip({ store }: { store: Pick<PublicStoreData, 'averageRating' | 'reviewCount' | 'trust' | 'createdAt'> }) {
  const reviews = store.reviewCount ?? 0;
  const trust = store.trust;
  const since = memberSinceLabel(store.createdAt);
  const city = trust?.city ?? null;
  const responseHours = trust?.responseHours ?? 24;
  const dispatchHours = trust?.dispatchHours ?? 48;
  const response = trustPctLabel(trust?.responseRate);
  const dispatch = trustPctLabel(trust?.dispatch);

  const items: ReactNode[] = [];
  if (reviews >= TRUST_MIN_SAMPLES)
    items.push(<Item key="r" icon={<Star size={15} />} label="Rating" value={`${(store.averageRating ?? 0).toFixed(1)} (${reviews.toLocaleString()})`} />);
  if (response)
    items.push(<Item key="rp" icon={<Clock size={15} />} label={`Replies within ${responseHours}h`} value={response}
      hint={`Share of buyer messages answered within ${responseHours} hours (last 90 days)`} />);
  if (dispatch)
    items.push(<Item key="d" icon={<Truck size={15} />} label={`Dispatched within ${dispatchHours}h`} value={dispatch}
      hint={`Share of physical orders marked shipped within ${dispatchHours} hours of payment (last 90 days)`} />);
  if (since) items.push(<Item key="s" icon={<CalendarDays size={15} />} label="Member since" value={since} />);
  if (city) items.push(<Item key="c" icon={<MapPin size={15} />} label="Based in" value={city} />);
  if (items.length === 0) return null;

  return (
    <section aria-label="Store trust" className="border-b border-bone bg-white">
      <dl className="px-4 sm:px-6 lg:px-10 max-w-[1480px] mx-auto w-full py-2.5 flex items-center gap-x-8 gap-y-2 overflow-x-auto scrollbar-none">
        {items}
      </dl>
    </section>
  );
}
