import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package2 } from 'lucide-react';
import { BUNDLES_ENABLED } from '@/utils/appLive';
import { apiGetBundlesForProduct, type PublicBundle } from '@/api/services/classroom';

/**
 * One quiet line in the buy box: "Also in: <bundle name> - save N%". Off unless BUNDLES_ENABLED. It only links to the bundle page;
 * the price/discount shown are the bundle's own (computed by the API with the same rule the cart uses). Renders nothing while
 * loading, on error, or when the product is in no bundle.
 */
export function AlsoInBundleLine({ productId }: { productId: string }) {
  const [bundle, setBundle] = useState<PublicBundle | null>(null);

  useEffect(() => {
    if (!BUNDLES_ENABLED) return;
    let alive = true;
    setBundle(null);
    apiGetBundlesForProduct(productId)
      .then(res => { if (alive) setBundle((res.data ?? [])[0] ?? null); })
      .catch(() => { /* optional line: no bundle info = no line */ });
    return () => { alive = false; };
  }, [productId]);

  if (!BUNDLES_ENABLED || !bundle) return null;
  return (
    <p className="flex items-center gap-2 text-[12px] text-charcoal m-0">
      <Package2 size={14} className="text-slate shrink-0" aria-hidden />
      <span className="min-w-0 break-words">
        <span>Also in: </span>
        <Link to={`/bundles/${bundle.slug}`} className="font-semibold text-brand-royal no-underline hover:underline" translate="no">{bundle.name}</Link>
        <span>{` - save ${bundle.discountPercent}%`}</span>
      </span>
    </p>
  );
}
