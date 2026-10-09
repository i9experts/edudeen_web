import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package2, Plus } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { ProductImage } from '@/components/comman/marketplace/ProductCard';
import { useAddAllToCart } from '@/hooks/marketplace/useAddAllToCart';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { apiGetBundlesForProduct, type PublicBundle } from '@/api/services/classroom';

/** "Buy together and save" — the bundles a product belongs to, on its page. */
export function BundleOffer({ productId }: { productId: string }) {
  const [bundles, setBundles] = useState<PublicBundle[]>([]);
  const { addAll, adding } = useAddAllToCart();
  const { currency: display, convert } = useCurrencyPreference();
  const sym = currencySymbol(display);

  useEffect(() => {
    let alive = true;
    apiGetBundlesForProduct(productId).then(res => { if (alive) setBundles(res.data ?? []); }).catch(() => {});
    return () => { alive = false; };
  }, [productId]);

  if (!bundles.length) return null;
  return (
    <section className="flex flex-col gap-3 mb-6" aria-label="Bundles">
      {bundles.map(b => (
        <div key={b._id} className="rounded-2xl border-2 border-brand-orange/25 bg-brand-pale-orange/20 p-4 md:p-5">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <Package2 size={16} className="text-brand-orange" />
            <h2 className="text-[15px] font-bold text-carbon m-0">Buy together and save {b.discountPercent}%</h2>
            <Link to={`/bundles/${b.slug}`} className="text-[12.5px] text-brand-orange font-semibold no-underline ms-auto">{b.name}</Link>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {b.products.map((p, i) => (
              <div key={p._id} className="flex items-center gap-2 shrink-0">
                {i > 0 && <Plus size={14} className="text-slate" />}
                <Link to={`/product/${p.slug}`} className="w-[92px] no-underline">
                  <ProductImage images={p.images ?? []} name={p.name} className="h-[92px] rounded-lg border border-bone" />
                  <p className="text-[12px] text-carbon mt-1 line-clamp-2">{p.name}</p>
                </Link>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <p className="text-[13px] text-graphite m-0">
              <span className="line-through text-slate me-1">{sym}{convert(b.totalPrice, b.currency).toLocaleString()}</span>
              <b className="text-[16px] text-carbon">{sym}{convert(b.bundlePrice, b.currency).toLocaleString()}</b>
              <span className="text-success font-semibold ms-2">You save {sym}{convert(b.savings, b.currency).toLocaleString()}</span>
            </p>
            <Button variant="primary" size="sm" className="ms-auto" loading={adding} onClick={() => addAll(b.products, `Bundle added — ${b.discountPercent}% comes off at checkout`)}>
              Add all {b.products.length} to cart
            </Button>
          </div>
          <p className="text-[12px] text-slate mt-2 mb-0">The discount is applied at checkout when every item in the bundle is in your cart.</p>
        </div>
      ))}
    </section>
  );
}
