import { Link } from 'react-router-dom';
import { Package2 } from 'lucide-react';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';
import type { PublicBundle } from '@/api/services/classroom';

function BundleCard({ bundle }: { bundle: PublicBundle }) {
  const t = useT();
  const { currency: display, convert } = useCurrencyPreference();
  const covers = bundle.products.slice(0, 3);
  return (
    <Link to={`/bundles/${bundle.slug}`} className="group block rounded-[14px] border border-bone bg-white p-4 no-underline hover:border-brand-royal/30 hover:shadow-[0_6px_20px_rgba(19,57,86,0.08)] transition-all">
      <div className="flex -space-x-5 mb-3" aria-hidden>
        {covers.map((p, i) => (
          <div key={p._id} className="size-[64px] rounded-[10px] overflow-hidden border-2 border-white bg-[#eaf2f8] shrink-0" style={{ zIndex: covers.length - i }}>
            {p.images?.[0]
              ? <img src={p.images[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              : <ProductCoverFallback name={p.name} size="xs" className="w-full h-full" />}
          </div>
        ))}
      </div>
      <span className="inline-block rounded-full bg-[#F4DC4C] text-[#152D43] text-[12px] font-bold px-2.5 py-[2px] mb-2">
        {t('Save')} {bundle.discountPercent}%
      </span>
      <h3 className="font-serif font-normal text-[18px] leading-[1.25] text-carbon m-0 mb-1 line-clamp-2 group-hover:text-brand-orange">{bundle.name}</h3>
      <p className="text-[12.5px] text-slate m-0 mb-2">
        {bundle.products.length} {t('resources')}
        {bundle.storeName && <> · <span translate="no">{bundle.storeName}</span></>}
      </p>
      <p className="m-0 text-[14px]">
        <span className="line-through text-slate me-2">{formatPrice(convert(bundle.totalPrice, bundle.currency), display)}</span>
        <b className="text-[17px] text-carbon">{formatPrice(convert(bundle.bundlePrice, bundle.currency), display)}</b>
      </p>
    </Link>
  );
}

/** Bundles / complete course packs (existing Bundle model): newest active bundles whose products are all live. Hidden when there are none. */
export function BundlesShelf({ bundles, loading }: { bundles: PublicBundle[]; loading: boolean }) {
  if (!loading && bundles.length === 0) return null;
  return (
    <section className="mb-12">
      <SectionHead eyebrow="Save when you buy together" title="Bundles and course packs" icon={<Package2 size={20} className="text-brand-royal" aria-hidden />} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px] md:gap-[22px]">
        {loading && bundles.length === 0
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={190} className="rounded-[14px]" />)
          : bundles.slice(0, 3).map(b => <BundleCard key={b._id} bundle={b} />)}
      </div>
    </section>
  );
}
