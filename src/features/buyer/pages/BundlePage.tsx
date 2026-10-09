import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Package2 } from 'lucide-react';
import { BuyerNavbar, Breadcrumb, Footer, Button, EmptyState } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAddAllToCart } from '@/hooks/marketplace/useAddAllToCart';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { apiGetBundle, type PublicBundle } from '@/api/services/classroom';

/** `/bundles/:slug` — a seller's "buy together and save" set. */
export function BundlePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<PublicBundle | null>(null);
  const [error, setError] = useState(false);
  const { addAll, adding } = useAddAllToCart();
  const { currency: display, convert } = useCurrencyPreference();
  const sym = currencySymbol(display);

  usePageTitle(bundle?.name ?? 'Bundle');
  usePageMeta(bundle ? `${bundle.name}: ${bundle.products.length} resources, save ${bundle.discountPercent}% when bought together on Edudeen.` : null);

  useEffect(() => {
    setBundle(null); setError(false);
    apiGetBundle(slug).then(res => setBundle(res.data)).catch(() => setError(true));
  }, [slug]);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>
      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12">
        <Breadcrumb className="mb-1" items={[{ label: 'Home', path: '/' }, { label: bundle?.name ?? 'Bundle' }]} />
        {error ? (
          <EmptyState icon={<Package2 size={22} />} title="This bundle isn't available" description="The seller may have ended it. The individual resources might still be on sale." action={{ label: 'Browse resources', onClick: () => navigate('/search') }} />
        ) : (
          <>
            <header className="mb-6 rounded-2xl bg-brand-pale-orange/30 border border-brand-orange/20 p-5 md:p-7 flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">Bundle · save {bundle?.discountPercent ?? '…'}%</p>
                <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon">{bundle?.name ?? '…'}</h1>
                {bundle?.description && <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch] whitespace-pre-line">{bundle.description}</p>}
                {bundle?.storeName && <p className="text-[12.5px] text-slate mt-1">From {bundle.storeSlug ? <Link to={getStorePagePath(bundle.storeSlug)} className="text-slate">{bundle.storeName}</Link> : bundle.storeName}</p>}
              </div>
              {bundle && (
                <div className="flex flex-col items-start md:items-end gap-2">
                  <p className="m-0 text-[14px]">
                    <span className="line-through text-slate me-2">{sym}{convert(bundle.totalPrice, bundle.currency).toLocaleString()}</span>
                    <b className="text-[22px] text-carbon">{sym}{convert(bundle.bundlePrice, bundle.currency).toLocaleString()}</b>
                  </p>
                  <Button variant="primary" size="md" loading={adding} onClick={() => addAll(bundle.products, `Bundle added — ${bundle.discountPercent}% comes off at checkout`)}>
                    Add all {bundle.products.length} to cart
                  </Button>
                  <p className="text-[12px] text-slate m-0">Discount applies at checkout with every item in your cart.</p>
                </div>
              )}
            </header>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
              {!bundle
                ? Array.from({ length: 4 }, (_, i) => <ResourceCardSkeleton key={i} />)
                : bundle.products.map((p, i) => <ResourceCard key={p._id} product={p} index={i} onClick={s => navigate(`/product/${s}`)} />)}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
