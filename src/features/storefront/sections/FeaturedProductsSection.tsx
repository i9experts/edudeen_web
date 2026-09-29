import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { ProductImage, StarRating } from '@/components/comman/marketplace/ProductCard';
import { useStorefrontProductSection } from '@/hooks/useStorefrontProductSections';
import { apiGetPublicStoreProducts, type PublicStoreProduct } from '@/api/services/store';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { getMainAppUrl } from '@/utils/storefrontUrl';
import { useStorefront } from '../StorefrontContext';
import { ProductCardShell, ProductCardImage } from '../ProductCard';

export interface FeaturedProductsSectionSettings {
  heading?:      string;
  source:        'manual' | 'category' | 'collection' | 'bestsellers' | 'newArrivals' | 'trending' | 'pinned' | 'onSale';
  categoryId?:   string;
  collectionId?: string;
  productIds?:   string[];
  limit?:        number;
}

const HOOK_SOURCE: Record<string, 'pinned' | 'bestSellers' | 'newArrivals' | 'trending'> = {
  pinned: 'pinned', bestsellers: 'bestSellers', newArrivals: 'newArrivals', trending: 'trending',
};

function useCuratedProducts(storeId: string | undefined, settings: FeaturedProductsSectionSettings) {
  const [manualOrCategory, setManualOrCategory] = useState<PublicStoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const hookSource = HOOK_SOURCE[settings.source];
  const { products: hookProducts } = useStorefrontProductSection(hookSource ? storeId : undefined, hookSource ?? 'pinned');

  useEffect(() => {
    if (hookSource || !storeId) return;
    setLoading(true);
    if (settings.source === 'category' && settings.categoryId) {
      apiGetPublicStoreProducts(storeId, { categoryId: settings.categoryId, limit: settings.limit ?? 8 })
        .then(res => setManualOrCategory(res.data?.products ?? []))
        .finally(() => setLoading(false));
    } else if (settings.source === 'collection' && settings.collectionId) {
      apiGetPublicStoreProducts(storeId, { collectionId: settings.collectionId, limit: settings.limit ?? 8 })
        .then(res => setManualOrCategory(res.data?.products ?? []))
        .finally(() => setLoading(false));
    } else if (settings.source === 'onSale') {
      apiGetPublicStoreProducts(storeId, { onSale: true, limit: settings.limit ?? 8 })
        .then(res => setManualOrCategory(res.data?.products ?? []))
        .finally(() => setLoading(false));
    } else if (settings.source === 'manual' && settings.productIds?.length) {
      // No dedicated "fetch by ids" endpoint exists yet — fetch a wider page of
      // the store's own catalog and filter/reorder client-side by the seller's
      // chosen ids, rather than pretending a not-yet-built endpoint exists.
      apiGetPublicStoreProducts(storeId, { limit: 50 })
        .then(res => {
          const byId = new Map((res.data?.products ?? []).map(p => [p._id, p]));
          setManualOrCategory(settings.productIds!.map(id => byId.get(id)).filter(Boolean) as PublicStoreProduct[]);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [storeId, hookSource, settings.source, settings.categoryId, settings.collectionId, JSON.stringify(settings.productIds), settings.limit]);

  if (hookSource) return { products: hookProducts.slice(0, settings.limit ?? 8), loading: false };
  return { products: manualOrCategory.slice(0, settings.limit ?? 8), loading };
}

// A horizontal strip of curated products — pinned/best-sellers/trending/new
// arrivals (reusing the same endpoints the old fixed storefront always
// showed), a specific category, or a hand-picked list. Distinct from
// `ProductCatalogSection`, which is the full paginated browse grid.
export function FeaturedProductsSection({ settings }: { settings: FeaturedProductsSectionSettings }) {
  const { store, cfg } = useStorefront();
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const displaySymbol = currencySymbol(displayCurrency);
  const { products, loading } = useCuratedProducts(store.storeId, settings);

  if (!loading && products.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 24 * cfg.sectionSpacingScale, paddingBottom: 24 * cfg.sectionSpacingScale }}>
      {settings.heading && <h2 className="font-bold mb-4" style={{ color: cfg.textColor, fontSize: Math.round(20 * cfg.typeScaleFactor) }}>{settings.heading}</h2>}
      <div className="flex overflow-x-auto scrollbar-none pb-1" style={{ gap: cfg.productGridDensity === 'relaxed' ? 16 : 12 }}>
        {products.map(p => {
          const pType = p.productType ?? p.type ?? 'physical';
          const isDigital = pType !== 'physical';
          return (
            <ProductCardShell key={p._id} onClick={() => { window.location.href = getMainAppUrl(`/product/${p.slug}`); }} className="shrink-0 w-[160px] text-left">
              <div className="relative p-2">
                <ProductCardImage>
                  {p.images?.[0]
                    ? <ProductImage images={p.images} name={p.name} className="w-full h-full object-cover" />
                    : <Package size={24} className="text-brand-orange" />}
                </ProductCardImage>
                <span className={`absolute top-3 left-3 px-[6px] py-[1px] rounded-[4px] text-[9px] font-semibold border ${isDigital ? 'bg-accent-violet-bg text-accent-violet border-accent-violet/25' : 'bg-[#edf5e7] text-[#3b6720] border-[#c7e0b5]'}`}>
                  {isDigital ? (pType === 'educational' ? 'Educational' : 'Digital') : 'Physical'}
                </span>
              </div>
              <div className="px-[10px] pb-[10px]">
                <p className="text-[12px] font-semibold text-carbon mb-[3px] line-clamp-2 leading-[1.3]">{p.name}</p>
                <StarRating rating={p.averageRating ?? 0} />
                {p.defaultVariantPrice != null && (
                  <p className="text-[14px] font-bold text-carbon mt-[6px]">{displaySymbol}{convert(p.defaultVariantPrice, store.baseCurrency).toLocaleString()}</p>
                )}
              </div>
            </ProductCardShell>
          );
        })}
      </div>
    </div>
  );
}
