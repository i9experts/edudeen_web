import { CategoryArt } from '@/components/comman/art/CategoryArt';
import { cloudinaryDensitySrcSet, cloudinarySrcSet, cloudinaryUrl } from '@/utils/cloudinaryImage';
import { SkeletonBox } from '@/components/comman/ui';
import { useT } from '@/contexts/languageCtx';
import type { effectiveHomeContent } from '@/components/admin-edit/homeDefaults';

type Eff = ReturnType<typeof effectiveHomeContent>;

// The image side is a fixed box on every screen (16:9 on phones, as tall as the text column from md up) so the page
// never jumps while a picture loads. `object-position` keeps the middle-upper part of a photo in view when it is
// cropped, and the badge sits on the end edge (it flips in right-to-left), so nothing important is cut.
const IMAGE_BOX = 'relative aspect-[16/9] md:aspect-auto md:min-h-[360px] bg-[#ddeaf2] overflow-hidden';
const TEXT_BOX = 'p-[25px] md:p-[30px] lg:py-[35px] lg:px-[40px] md:min-h-[360px]';

/** Brand artwork shown when the admin has not uploaded a hero picture: a soft gradient with a few Edudeen subject illustrations. Never a stock photo. */
function BrandArt() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#eaf2f8] via-[#ddeaf2] to-[#f7f3d9]" aria-hidden>
      <div className="absolute inset-0 flex items-center justify-center gap-3 sm:gap-5 p-6">
        <CategoryArt art="quran" name="Quran" className="w-[26%] max-w-[150px] aspect-square rotate-[-6deg] drop-shadow-[0_8px_18px_rgba(19,57,86,0.15)]" />
        <CategoryArt art="books" name="Books" className="w-[30%] max-w-[170px] aspect-square translate-y-3 drop-shadow-[0_8px_18px_rgba(19,57,86,0.15)]" />
        <CategoryArt art="math" name="Maths" className="w-[26%] max-w-[150px] aspect-square rotate-[6deg] drop-shadow-[0_8px_18px_rgba(19,57,86,0.15)]" />
      </div>
    </div>
  );
}

/** Reserves the exact hero box (same grid, same min heights) until the public config is known, so there is no layout shift and no default-text flash. */
export function HomeHeroSkeleton() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] rounded-[18px] overflow-hidden bg-[#eaf2f8] mb-[25px]" aria-hidden>
      <div className={TEXT_BOX}>
        <SkeletonBox width={150} height={12} className="mb-[13px]" />
        <SkeletonBox width="80%" height={40} className="mb-3" />
        <SkeletonBox width="60%" height={40} className="mb-4" />
        <SkeletonBox width="90%" height={14} className="mb-2" />
        <SkeletonBox width="70%" height={14} className="mb-6" />
        <div className="flex gap-3"><SkeletonBox width={170} height={42} /><SkeletonBox width={140} height={42} /></div>
      </div>
      <div className={IMAGE_BOX} />
    </section>
  );
}

/** Hero: text from the admin's homepage content, desktop picture + optional phone picture, brand artwork when there is none. */
export function HomeHero({ eff, onPrimary, onSecondary }: { eff: Eff; onPrimary: () => void; onSecondary: () => void }) {
  const t = useT();
  const desktop = eff.heroImageUrl || eff.heroImageMobileUrl;
  const mobile = eff.heroImageMobileUrl || eff.heroImageUrl;
  return (
    <section className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] rounded-[18px] overflow-hidden bg-[#eaf2f8] mb-[25px]">
      <div className={TEXT_BOX}>
        <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">{eff.heroEyebrow}</p>
        <h1 className="font-serif font-normal text-[34px] md:text-[44px] leading-[1.12] tracking-[-1px] text-carbon mb-[14px]">
          {eff.heroTitle}<br />
          <span className="text-brand-royal">{eff.heroHighlight}</span>
        </h1>
        <p className="max-w-[450px] text-[15px] md:text-[16px] leading-[1.5] text-graphite mb-[21px]">{eff.heroText}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onPrimary} className="inline-block bg-brand-orange text-white border border-brand-orange rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer hover:brightness-95">
            {eff.heroPrimaryLabel}
          </button>
          <button onClick={onSecondary} className="inline-block bg-white text-brand-orange border border-[#c5d2db] rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer hover:brightness-95">
            {eff.heroSecondaryLabel}
          </button>
        </div>
      </div>
      <div className={IMAGE_BOX}>
        {desktop ? (
          <picture>
            {mobile && (
              <source media="(max-width: 767px)" srcSet={cloudinaryDensitySrcSet(mobile, 800) ?? mobile} />
            )}
            <img
              src={cloudinaryUrl(desktop, 1200)}
              srcSet={cloudinarySrcSet(desktop, [640, 960, 1200, 1600])}
              sizes="(min-width: 768px) 45vw, 100vw"
              alt={t('Edudeen learning resources')}
              // The hero picture is the first thing painted: load it eagerly, not lazily.
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain object-center" /* contain: images with baked-in text must never be cropped */
            />
          </picture>
        ) : <BrandArt />}
        <div className="absolute bottom-[22px] end-[22px] hidden sm:block bg-white px-[19px] py-3 rounded-[10px] text-[14px] text-carbon shadow-[0_8px_30px_rgba(19,57,86,0.09)]">
          {eff.heroBadge}
        </div>
      </div>
    </section>
  );
}
