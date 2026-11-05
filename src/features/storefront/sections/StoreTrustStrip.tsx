import type { ReactNode } from 'react';
import { CalendarDays, Clock, MapPin, Star, Truck } from 'lucide-react';
import type { PublicStoreData } from '@/api/services/store';
import { memberSinceLabel, trustPctLabel, TRUST_MIN_SAMPLES } from '@/utils/sellerTrust';

function Item({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string | null; hint?: string }) {
  return (
    <div className="flex items-start gap-2 min-w-0" title={hint}>
      <span className="mt-[2px] text-brand-royal shrink-0" aria-hidden>{icon}</span>
      <div className="min-w-0">
        <dt className="text-[12px] text-slate">{label}</dt>
        <dd className={value ? 'text-[13.5px] font-semibold text-carbon' : 'text-[13px] text-slate'}>
          {value ?? 'Not enough data'}
        </dd>
      </div>
    </div>
  );
}

/**
 * Store trust strip under the store banner. Every number comes cached from the API (hourly job); a number with fewer
 * than TRUST_MIN_SAMPLES data points is hidden and reads "Not enough data".
 */
export function StoreTrustStrip({ store }: { store: Pick<PublicStoreData, 'averageRating' | 'reviewCount' | 'trust' | 'createdAt'> }) {
  const reviews = store.reviewCount ?? 0;
  const ratingValue = reviews >= TRUST_MIN_SAMPLES ? `${(store.averageRating ?? 0).toFixed(1)} (${reviews.toLocaleString()} reviews)` : null;
  const trust = store.trust;
  const since = memberSinceLabel(store.createdAt);
  const city = trust?.city ?? null;
  const responseHours = trust?.responseHours ?? 24;
  const dispatchHours = trust?.dispatchHours ?? 48;

  return (
    <section aria-label="Store trust" className="border-b border-bone bg-white">
      <dl className="px-4 sm:px-6 lg:px-10 max-w-[1480px] mx-auto w-full py-3.5 grid grid-cols-2 lg:grid-cols-5 gap-x-5 gap-y-3">
        <Item
          icon={<Star size={15} />}
          label="Rating"
          value={ratingValue}
          hint={reviews > 0 && !ratingValue ? `${reviews} review${reviews === 1 ? '' : 's'} so far` : undefined}
        />
        <Item
          icon={<Clock size={15} />}
          label={`Replies within ${responseHours}h`}
          value={trustPctLabel(trust?.responseRate)}
          hint={`Share of buyer messages answered within ${responseHours} hours (last 90 days)`}
        />
        <Item
          icon={<Truck size={15} />}
          label={`Dispatched within ${dispatchHours}h`}
          value={trustPctLabel(trust?.dispatch)}
          hint={`Share of physical orders marked shipped within ${dispatchHours} hours of payment (last 90 days)`}
        />
        {since && <Item icon={<CalendarDays size={15} />} label="Member since" value={since} />}
        {city && <Item icon={<MapPin size={15} />} label="Based in" value={city} />}
      </dl>
    </section>
  );
}
