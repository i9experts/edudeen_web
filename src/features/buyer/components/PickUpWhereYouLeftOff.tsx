import { useEffect, useMemo, useState } from 'react';
import { ScrollRow } from '@/components/comman/ui/ScrollRow';
import { Link } from 'react-router-dom';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { fetchRecentlyViewed, type SyncedRecentlyViewedItem } from '@/utils/recentlyViewedSync';
import { apiGetMyLibrary } from '@/api/services/orders';
import { formatMoney } from '@/utils/currency';

// Account dashboard rail: what the buyer looked at or saved but has not bought.
// Reuses the account-synced recently-viewed list and the wishlist context;
// "bought" comes from My Library so owned digital items never show up here.

interface Card { id: string; slug: string; name: string; image: string | null; price: number | null; currency?: string | null; tag: 'Viewed' | 'Saved' }

function Cover({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <ProductCoverFallback name={name} size="xs" className="w-full aspect-[4/3] rounded-[10px]" />;
  return <img loading="lazy" decoding="async" src={src} alt={name} onError={() => setErr(true)} className="w-full aspect-[4/3] rounded-[10px] object-cover border border-[#edebe2]" />;
}

export function PickUpWhereYouLeftOff() {
  const { wishlistItems } = useWishlistContext();
  const [viewed, setViewed] = useState<SyncedRecentlyViewedItem[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    fetchRecentlyViewed(8).then(r => { if (alive) setViewed(r); });
    apiGetMyLibrary()
      .then(res => { if (alive) setOwned(new Set((res.data.items ?? []).map(i => i.productId))); })
      .catch(() => { /* best-effort: worst case an owned item is still listed */ });
    return () => { alive = false; };
  }, []);

  const cards = useMemo<Card[]>(() => {
    const out: Card[] = [];
    const seen = new Set<string>(owned);
    for (const w of wishlistItems) {
      const p = w.product; const v = w.variants?.[0];
      if (seen.has(p._id)) continue;
      seen.add(p._id);
      out.push({ id: p._id, slug: p.slug, name: p.name, image: p.images?.[0] ?? null, price: v?.price ?? null, currency: v?.currency, tag: 'Saved' });
    }
    for (const r of viewed) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ id: r.id, slug: r.slug ?? r.id, name: r.name, image: r.image, price: r.price, currency: r.currency, tag: 'Viewed' });
    }
    return out.slice(0, 8);
  }, [wishlistItems, viewed, owned]);

  if (cards.length === 0) return null;
  return (
    <section aria-label="Pick up where you left off" className="bg-white rounded-2xl border border-bone px-4 md:px-5 py-4">
      <h2 className="text-[15px] font-bold text-carbon mb-3">Pick up where you left off</h2>
      <ScrollRow><ul className="flex gap-3 pb-1 list-none p-0 m-0 w-max">
        {cards.map(c => (
          <li key={c.id} className="w-[150px] shrink-0">
            <Link to={`/product/${c.slug}`} className="group block no-underline">
              <Cover src={c.image} name={c.name} />
              <p className="text-[12px] font-semibold text-charcoal mt-2 line-clamp-2 group-hover:text-brand-orange">{c.name}</p>
              {c.price != null && <p className="text-[12px] font-bold text-carbon mt-[2px]">{formatMoney(c.price, c.currency ?? undefined)}</p>}
              <p className="text-[12px] text-slate mt-[2px]">{c.tag}</p>
            </Link>
          </li>
        ))}
      </ul></ScrollRow>
    </section>
  );
}
