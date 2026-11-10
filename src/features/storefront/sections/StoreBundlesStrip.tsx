import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package2 } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { ProductImage } from '@/components/comman/marketplace/ProductCard';
import { useAddAllToCart } from '@/hooks/marketplace/useAddAllToCart';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { useLanguage } from '@/contexts/languageCtx';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { formatPrice } from '@/utils/formatPrice';
import { apiGetStoreBundles, type PublicBundle } from '@/api/services/classroom';
import { useStorefront } from '../StorefrontContext';

/** Buyer store page: the store's live bundles ("Save Rs X"). Tapping Add all uses the normal cart flow, one item at a time. */
export function StoreBundlesStrip() {
  const { store } = useStorefront();
  const { lang } = useLanguage();
  const { currency: display, convert } = useCurrencyPreference();
  const { addAll, adding } = useAddAllToCart();
  const [bundles, setBundles] = useState<PublicBundle[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGetStoreBundles(store.storeId).then(res => setBundles(res.data ?? [])).catch(() => {});
  }, [store.storeId]);
  useEffect(() => { setBundles([]); load(); }, [load]);
  useLiveRefresh(['catalog', 'products', 'storefront'], load);

  if (bundles.length === 0) return null; // optional block: no skeleton, no error line

  return (
    <section aria-label="Bundles" className="px-4 sm:px-6 lg:px-10 pt-6 max-w-[1480px] mx-auto w-full">
      <h2 className="text-[18px] font-bold text-carbon mb-3 flex items-center gap-2"><Package2 size={18} className="text-brand-orange" aria-hidden /> Bundle deals</h2>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {bundles.map(b => {
          const title = lang === 'ur' && b.nameUr ? b.nameUr : b.name;
          return (
            <article key={b._id} className="shrink-0 w-[280px] sm:w-[320px] rounded-2xl border border-bone bg-white p-3 flex flex-col gap-2 min-w-0">
              <Link to={`/bundles/${b.slug}`} className="no-underline text-inherit block min-w-0">
                {b.coverImage
                  ? <img src={b.coverImage} alt="" loading="lazy" className="w-full h-[120px] object-cover rounded-lg border border-bone" />
                  : (
                    <div className="flex gap-1.5 overflow-hidden">
                      {b.products.slice(0, 3).map(p => <ProductImage key={p._id} images={p.images ?? []} name={p.name} className="h-[88px] w-[88px] shrink-0 rounded-lg border border-bone" />)}
                    </div>
                  )}
                <h3 translate="no" className="text-[14px] font-bold text-carbon mt-2 mb-0 line-clamp-2">{title}</h3>
              </Link>
              <p className="text-[12px] text-slate m-0">{`${b.products.length} items · ${b.discountPercent}% off`}</p>
              <p className="m-0 flex items-baseline gap-2 flex-wrap">
                <b className="text-[16px] text-carbon">{formatPrice(convert(b.bundlePrice, b.currency), display)}</b>
                <span className="line-through text-[12px] text-slate">{formatPrice(convert(b.totalPrice, b.currency), display)}</span>
                <span className="text-[12.5px] font-semibold text-success">{`Save ${formatPrice(convert(b.savings, b.currency), display)}`}</span>
              </p>
              <Button variant="primary" size="sm" className="mt-auto" loading={adding && addingId === b._id}
                onClick={async () => { setAddingId(b._id); await addAll(b.products, `Bundle added — ${b.discountPercent}% comes off at checkout`); setAddingId(null); }}>
                {`Add all ${b.products.length} to cart`}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
