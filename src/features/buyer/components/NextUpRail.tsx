import { useEffect, useState } from 'react';
import { ScrollRow } from '@/components/comman/ui/ScrollRow';
import { Link } from 'react-router-dom';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { apiGetAlsoBought, apiGetProductById, apiBrowseProducts } from '@/api/services/marketplace';
import { apiGetPublicStoreProducts } from '@/api/services/store';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { formatMoney } from '@/utils/currency';

// "Next up" suggestions after a purchase: one shared rail, no second recommender.
// It only combines what already exists, in this order, then de-duplicates and
// drops anything the buyer already owns:
//   1. GET /api/products/also-bought/:id  (teachers who bought this also bought)
//   2. same subject, next education level (marketplace browse, EDUCATION_LEVELS order)
//   3. the seller's other items (public store products)

// Levels that really form a ladder (the rest — Islamic, professional, other — have no "next").
const LADDER = ['preschool', 'primary_school', 'middle_school', 'secondary_school', 'college', 'university'];
const LEVEL_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));
const nextLevel = (level?: string | null) => {
  const i = level ? LADDER.indexOf(level) : -1;
  return i >= 0 && i < LADDER.length - 1 ? LADDER[i + 1] : null;
};

interface Suggestion {
  id: string; slug: string; name: string; image: string | null;
  price: number | null; currency?: string | null; reason: string;
}

function Cover({ src, name }: { src: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <ProductCoverFallback name={name} size="sm" className="w-full aspect-[4/3] rounded-[10px]" />;
  return <img loading="lazy" decoding="async" src={src} alt="" onError={() => setErr(true)} className="w-full aspect-[4/3] rounded-[10px] object-cover border border-[#edebe2]" />;
}

export function NextUpRail({
  seedProductId, ownedProductIds = [], title = 'Next up for you', limit = 8,
}: {
  /** Product (id or slug) the suggestions are built around, usually the latest purchase. */
  seedProductId: string | null | undefined;
  /** Never suggest what the buyer already owns. */
  ownedProductIds?: string[];
  title?: string;
  limit?: number;
}) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const ownedKey = ownedProductIds.join(',');

  useEffect(() => {
    if (!seedProductId) { setItems([]); return; }
    let alive = true;
    const owned = new Set(ownedKey ? ownedKey.split(',') : []);
    (async () => {
      const out: Suggestion[] = [];
      const seen = new Set<string>([seedProductId, ...owned]);
      const push = (s: Suggestion) => { if (!seen.has(s.id) && out.length < limit) { seen.add(s.id); out.push(s); } };

      const [also, detail] = await Promise.all([
        apiGetAlsoBought(seedProductId, limit).catch(() => null),
        apiGetProductById(seedProductId).catch(() => null),
      ]);
      const seed = detail?.data?.product;
      if (seed?._id) seen.add(seed._id);
      for (const p of also?.data?.products ?? []) {
        const v = p.variants?.find(x => x.isDefault) ?? p.variants?.[0];
        push({ id: p._id, slug: p.slug, name: p.name, image: p.images?.[0] ?? null, price: v?.price ?? null, currency: v?.currency, reason: also?.data?.basis === 'bought_together' ? 'Teachers also bought' : 'Similar level' });
      }

      const next = nextLevel(seed?.educationLevel);
      const [nextRes, storeRes] = await Promise.all([
        next && seed?.categoryId && out.length < limit
          ? apiBrowseProducts({ categoryId: seed.categoryId, educationLevel: next, sortBy: 'popularity', limit: 6 }).catch(() => null)
          : Promise.resolve(null),
        seed?.storeId && out.length < limit
          ? apiGetPublicStoreProducts(seed.storeId, { limit: 6, sort: 'best_rated' }).catch(() => null)
          : Promise.resolve(null),
      ]);
      for (const p of nextRes?.data?.products ?? []) {
        const v = p.variants?.find(x => x.isDefault) ?? p.variants?.[0];
        push({ id: p._id, slug: p.slug, name: p.name, image: p.images?.[0] ?? null, price: v?.price ?? null, currency: v?.currency, reason: `Next level: ${LEVEL_LABEL.get(next!) ?? ''}` });
      }
      for (const p of storeRes?.data?.products ?? []) {
        push({ id: p._id, slug: p.slug, name: p.name, image: p.images?.[0] ?? null, price: null, currency: undefined, reason: 'More from this seller' });
      }
      if (alive) setItems(out);
    })().catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [seedProductId, ownedKey, limit]);

  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="bg-white rounded-[14px] border border-bone px-4 md:px-5 py-4">
      <h2 className="text-[15px] font-bold text-carbon mb-3">{title}</h2>
      <ScrollRow><ul className="flex gap-3 pb-1 list-none p-0 m-0 w-max">
        {items.map(s => (
          <li key={s.id} className="w-[160px] shrink-0">
            <Link to={`/product/${s.slug || s.id}`} className="group block no-underline">
              <Cover src={s.image} name={s.name} />
              <p className="text-[12px] font-semibold text-charcoal mt-2 line-clamp-2 group-hover:text-brand-orange">{s.name}</p>
              {s.price != null && <p className="text-[12px] font-bold text-carbon mt-[2px]">{formatMoney(s.price, s.currency ?? undefined)}</p>}
              <p className="text-[12px] text-slate mt-[2px] line-clamp-1">{s.reason}</p>
            </Link>
          </li>
        ))}
      </ul></ScrollRow>
    </section>
  );
}
