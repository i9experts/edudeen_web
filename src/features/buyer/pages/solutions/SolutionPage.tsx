import type { ReactElement } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowRight, Check, Store, BarChart3, PackageCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Button, Footer } from '@/components/comman/ui';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { unsplashUrl } from '@/assets/stockPhotos';
import { getSolution } from '@/features/buyer/data/solutions';
import { getPlatformProduct } from '@/features/buyer/data/platformProducts';
import {
  StorefrontPreview, AnalyticsPreview, OrdersTimelinePreview, InventoryPreview,
} from '@/components/comman/mockups/ProductMockups';

const SERIF = "Georgia, 'Times New Roman', serif";

// Each solution gets a different real product preview matched to what its
// own highlights actually emphasize — not the same dashboard mockup shown
// several times across several audience pages.
const SOLUTION_PREVIEW: Record<string, () => ReactElement> = {
  'teachers-tutors':      () => <StorefrontPreview />,
  'islamic-scholars':     () => <OrdersTimelinePreview />,
  'schools-academies':    () => <AnalyticsPreview />,
  'publishers-bookshops': () => <InventoryPreview />,
  creators:               () => <StorefrontPreview />,
};

const PRODUCT_ICONS: Record<string, LucideIcon> = {
  'store-builder': Store,
  analytics: BarChart3,
  inventory: PackageCheck,
  'orders-customers': Users,
};

// Which real platform products this industry actually leans on most —
// genuine cross-links into /products/:slug, not invented per-industry copy.
const RELATED_PRODUCTS: Record<string, string[]> = {
  'teachers-tutors':      ['store-builder', 'orders-customers', 'analytics'],
  'islamic-scholars':     ['store-builder', 'inventory', 'orders-customers'],
  'schools-academies':    ['store-builder', 'orders-customers', 'analytics'],
  'publishers-bookshops': ['inventory', 'orders-customers', 'analytics'],
  creators:               ['store-builder', 'analytics', 'orders-customers'],
};

export function SolutionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const sellEntry = useSellEntry();
  const solution = getSolution(slug);
  usePageTitle(solution?.name ?? 'Solutions');

  if (!solution) return <Navigate to="/solutions" replace />;

  return (
    <div className="bg-white min-h-full">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={unsplashUrl(solution.image, 1200)} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-carbon/90 via-carbon/70 to-carbon/40" />
        </div>
        <div className="relative z-[1] px-4 md:px-8 lg:px-12 pt-20 md:pt-28 pb-16 md:pb-20 max-w-[640px]">
          <Reveal delay={0}>
            <p className="text-[11px] font-semibold text-brand-orange uppercase tracking-[0.12em] mb-3">Built for {solution.name}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-[26px] sm:text-[36px] lg:text-[42px] font-bold text-white leading-[1.15] mb-4" style={{ fontFamily: SERIF }}>
              {solution.headline}
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="text-[14px] sm:text-[15.5px] text-[#d8d6d0] leading-[1.7] mb-7">
              {solution.subtext}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <MagneticButton>
              <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
                Start Selling Free <ArrowRight size={14} className="inline align-middle ms-1" />
              </Button>
            </MagneticButton>
          </Reveal>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 py-14 md:py-16 max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <Reveal>
          <p className="text-[11px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">What you get</p>
          <div className="flex flex-col gap-3">
            {solution.highlights.map(h => (
              <div key={h} className="flex items-start gap-2.5">
                <Check size={15} className="text-success shrink-0 mt-[2px]" />
                <span className="text-[14px] text-charcoal leading-[1.65]">{h}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-6" onClick={() => navigate('/products')}>
            See every product <ArrowRight size={14} className="inline align-middle ms-1" />
          </Button>
        </Reveal>
        <Reveal delay={0.1}>
          {(SOLUTION_PREVIEW[solution.slug] ?? SOLUTION_PREVIEW['teachers-tutors'])()}
        </Reveal>
      </div>

      {/* ── The real products this industry leans on most — genuine
         cross-links, not repeated marketing copy. ── */}
      <div className="bg-cream px-4 md:px-8 lg:px-12 py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto">
          <SectionHeading kicker="Built on" title={`What powers ${solution.name.toLowerCase()} on Edudeen`} align="center" className="mb-10" />
          <RevealStagger className="grid grid-cols-1 sm:grid-cols-3 gap-5" step={0.08} y={16}>
            {(RELATED_PRODUCTS[solution.slug] ?? []).map(slug => {
              const product = getPlatformProduct(slug);
              if (!product) return null;
              const Icon = PRODUCT_ICONS[slug] ?? Store;
              return (
                <PremiumCard key={slug} onClick={() => navigate(`/products/${slug}`)} className="p-6">
                  <span className="w-10 h-10 rounded-lg bg-brand-pale-orange flex items-center justify-center mb-3.5">
                    <Icon size={18} className="text-brand-orange" />
                  </span>
                  <p className="text-[14.5px] font-bold text-carbon mb-1">{product.name}</p>
                  <p className="text-[12.5px] text-slate leading-[1.6] mb-3">{product.tagline}</p>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-orange">
                    Learn more <ArrowRight size={12} />
                  </span>
                </PremiumCard>
              );
            })}
          </RevealStagger>
        </div>
      </div>

      <div className="bg-carbon px-4 md:px-8 lg:px-12 py-14 text-center">
        <SectionHeading title={`Start selling in ${solution.name.toLowerCase()} today.`} tone="dark" align="center" size="lg" className="mb-8" />
        <Reveal>
          <MagneticButton>
            <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
              Start Selling Free <ArrowRight size={14} className="inline align-middle ms-1" />
            </Button>
          </MagneticButton>
        </Reveal>
      </div>

      <Footer />
    </div>
  );
}
