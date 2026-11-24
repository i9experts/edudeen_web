import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ShoppingCart, Star } from 'lucide-react';
import { apiGetSeries, type MarketplaceProduct } from '@/api/services/marketplace';
import { classRangeLabel } from '@/constants/classLevels';
import { useCartContext } from '@/contexts/CartContext';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';
import { SkeletonBox } from '@/components/comman/ui';

/**
 * "More in this series" - the other books of the same series from the SAME store (API caps it at 8).
 * Renders nothing when the product has no series. Own loading / error (retry) states; the existing cart is reused as is.
 */
export function SeriesTable({ productId, currentId }: { productId: string; currentId: string }) {
  const [state, setState] = useState<{ status: 'loading' | 'error' | 'ready'; series: string | null; products: MarketplaceProduct[] }>({ status: 'loading', series: null, products: [] });
  const [tick, setTick] = useState(0);
  const [adding, setAdding] = useState<string | null>(null);
  const { addToCart } = useCartContext();
  const { convert, currency: displayCurrency } = useCurrencyPreference();

  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, status: 'loading' }));
    apiGetSeries(productId)
      .then(r => { if (alive) setState({ status: 'ready', series: r.data?.series ?? null, products: r.data?.products ?? [] }); })
      .catch(() => { if (alive) setState({ status: 'error', series: null, products: [] }); });
    return () => { alive = false; };
  }, [productId, tick]);

  if (state.status === 'ready' && (!state.series || state.products.length < 2)) return null;

  if (state.status === 'loading') return <SkeletonBox height={120} rounded="16px" />;
  if (state.status === 'error') {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-bone px-4 py-3 text-[13px] text-slate">
        <span className="flex-1 min-w-[160px]">Could not load the series.</span>
        <button type="button" onClick={() => setTick(t => t + 1)} className="font-semibold text-brand-orange bg-transparent border-0 cursor-pointer">Retry</button>
      </div>
    );
  }

  const add = async (p: MarketplaceProduct, variantId: string, type: 'physical' | 'digital') => {
    setAdding(p._id);
    try { await addToCart(p._id, variantId, type, 1); } finally { setAdding(null); }
  };

  return (
    <section aria-label={`Series: ${state.series}`} className="bg-white rounded-2xl border border-bone p-4 sm:p-6 min-w-0">
      <h2 className="text-[18px] font-bold text-carbon m-0 mb-3"><span>More in</span> <span translate="no">{state.series}</span></h2>
      {/* Horizontal scroll on phones so every column stays readable. */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[560px] text-[13px] text-start border-collapse">
          <thead>
            <tr className="text-[12px] text-slate uppercase tracking-[0.05em]">
              {['Title', 'Class', 'Ages', 'Pages', 'Price', 'Rating', ''].map(h => <th key={h || 'x'} scope="col" className="text-start font-semibold py-2 pe-3 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {state.products.map(p => {
              const variants = p.variants ?? [];
              const v = variants.find(x => x.isDefault) ?? variants[0];
              const price = v?.price != null ? convert(v.price, v.currency) : null;
              const ages = p.ageMin != null && p.ageMax != null ? `${p.ageMin}-${p.ageMax}` : p.ageMin != null ? `${p.ageMin}+` : '—';
              const isCurrent = p._id === currentId;
              const canAdd = variants.length === 1 && v && (v.stock ?? 1) > 0;
              return (
                <tr key={p._id} className={`border-t border-bone ${isCurrent ? 'bg-brand-pale-orange/40' : ''}`}>
                  <td className="py-2 pe-3 font-medium text-carbon">
                    {isCurrent ? <span>{p.name} <span className="text-[12px] text-slate">(this book)</span></span> : <Link to={`/product/${p.slug || p._id}`} className="text-inherit hover:underline">{p.name}</Link>}
                  </td>
                  <td className="py-2 pe-3 whitespace-nowrap">{classRangeLabel(p.classFrom, p.classTo) || '—'}</td>
                  <td className="py-2 pe-3 whitespace-nowrap">{ages}</td>
                  <td className="py-2 pe-3 whitespace-nowrap">{p.pages ?? '—'}</td>
                  <td className="py-2 pe-3 whitespace-nowrap font-semibold">{price != null ? formatPrice(price, displayCurrency) : '—'}</td>
                  <td className="py-2 pe-3 whitespace-nowrap">
                    {(p.totalRatings ?? 0) > 0 && p.averageRating > 0
                      ? <span className="inline-flex items-center gap-1"><Star size={12} className="text-brand-orange fill-brand-orange" aria-hidden />{p.averageRating.toFixed(1)}</span>
                      : <span className="text-slate">—</span>}
                  </td>
                  <td className="py-2 text-end">
                    {isCurrent ? null : canAdd ? (
                      <button
                        type="button" disabled={adding === p._id}
                        onClick={() => void add(p, v!._id, (p.productType ?? p.type) === 'physical' ? 'physical' : 'digital')}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-brand-orange/70 bg-brand-pale-orange/40 text-brand-deep-orange text-[12px] font-semibold cursor-pointer hover:bg-brand-orange hover:text-white disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {adding === p._id ? <Loader2 size={13} className="animate-spin" /> : <ShoppingCart size={13} />} Add to cart
                      </button>
                    ) : (
                      <Link to={`/product/${p.slug || p._id}`} className="text-[12px] font-semibold text-brand-royal whitespace-nowrap">View</Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
