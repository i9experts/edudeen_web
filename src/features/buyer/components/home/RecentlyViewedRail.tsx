import { useEffect, useState } from 'react';
import { ScrollRow } from '@/components/comman/ui/ScrollRow';
import { Link } from 'react-router-dom';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { getRecentlyViewed } from '@/components/comman/ui/BuyerNavbar';
import { fetchRecentlyViewed, type SyncedRecentlyViewedItem } from '@/utils/recentlyViewedSync';
import { formatMoney } from '@/utils/currency';

function Cover({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <ProductCoverFallback name={name} size="xs" className="w-full aspect-[4/3] rounded-[10px]" />;
  return <img loading="lazy" decoding="async" src={src} alt="" onError={() => setErr(true)} className="w-full aspect-[4/3] rounded-[10px] object-cover border border-[#edebe2]" />;
}

/**
 * Recently viewed: the browser's own list first (instant, works for guests), merged with the account-synced list for
 * signed-in buyers. Renders nothing while empty. (Not de-duplicated against the shelves above on purpose: it shows
 * what THIS visitor looked at, which is personal, not a merchandising shelf.)
 */
export function RecentlyViewedRail() {
  const [items, setItems] = useState<SyncedRecentlyViewedItem[]>(() => getRecentlyViewed());
  useEffect(() => {
    let alive = true;
    fetchRecentlyViewed(8).then(remote => {
      if (!alive || remote.length === 0) return;
      setItems(prev => {
        const seen = new Set<string>();
        return [...remote, ...prev].filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true))).slice(0, 8);
      });
    });
    return () => { alive = false; };
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="mb-12" aria-label="Recently viewed">
      <SectionHead eyebrow="Pick up where you left off" title="Recently viewed" />
      <ScrollRow><ul className="flex gap-3 pb-1 list-none p-0 m-0 w-max">
        {items.map(i => (
          <li key={i.id} className="w-[150px] md:w-[170px] shrink-0">
            <Link to={`/product/${i.slug ?? i.id}`} className="group block no-underline">
              <Cover src={i.image} name={i.name} />
              <p className="text-[13px] font-semibold text-charcoal mt-2 mb-0 line-clamp-2 group-hover:text-brand-orange">{i.name}</p>
              {i.price != null && <p className="text-[13px] font-bold text-carbon mt-[2px] mb-0">{formatMoney(i.price, i.currency ?? undefined)}</p>}
            </Link>
          </li>
        ))}
      </ul></ScrollRow>
    </section>
  );
}
