import { useNavigate } from 'react-router-dom';
import { ArrowRight, Store, BarChart3, PackageCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Button, Footer } from '@/components/comman/ui';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { mockupForProductSlug } from '@/components/comman/mockups/ProductMockups';
import { PLATFORM_PRODUCTS } from '@/features/buyer/data/platformProducts';

const ICONS: Record<string, LucideIcon> = {
  'store-builder': Store,
  analytics: BarChart3,
  inventory: PackageCheck,
  'orders-customers': Users,
};

export function ProductsOverviewPage() {
  usePageTitle('Products');
  const navigate = useNavigate();
  const sellEntry = useSellEntry();

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-8 lg:px-12 pt-14 md:pt-18 pb-10 max-w-[760px] mx-auto">
        <SectionHeading
          kicker="One platform"
          title="Everything you need to sell what you teach."
          subtitle="Store builder, inventory, orders and analytics — under one login, sharing the same real data."
          align="center"
          size="lg"
        />
      </div>

      <RevealStagger className="px-4 md:px-8 lg:px-12 pb-16 max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5" step={0.08} y={20}>
        {PLATFORM_PRODUCTS.map(p => {
          const Icon = ICONS[p.slug] ?? Store;
          return (
            <PremiumCard key={p.slug} onClick={() => navigate(`/products/${p.slug}`)} className="overflow-hidden p-0">
              {/* Real product UI, not a decorative icon panel — cropped to a
                 peek so the card teases the actual interface. */}
              <div className="h-[168px] overflow-hidden bg-cream p-4 pointer-events-none flex items-start justify-center">
                <div className="w-full" style={{ transform: 'scale(0.86)', transformOrigin: 'top center' }}>
                  {mockupForProductSlug(p.slug)}
                </div>
              </div>
              <div className="p-7">
                <span className="w-11 h-11 rounded-xl bg-brand-pale-orange flex items-center justify-center mb-4">
                  <Icon size={20} className="text-brand-orange" />
                </span>
                <p className="text-[17px] font-bold text-carbon mb-1.5">{p.name}</p>
                <p className="text-[13px] text-slate leading-[1.65] mb-4">{p.heroSubtext}</p>
                <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-orange">
                  Explore {p.name} <ArrowRight size={13} />
                </span>
              </div>
            </PremiumCard>
          );
        })}
      </RevealStagger>

      <div className="bg-carbon px-4 md:px-8 lg:px-12 py-14 text-center">
        <SectionHeading title="Start with the free plan, add what you need." tone="dark" align="center" size="lg" className="mb-8" />
        <Reveal>
          <MagneticButton>
            <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
              Start Selling Free <ArrowRight size={14} className="inline align-middle ml-1" />
            </Button>
          </MagneticButton>
        </Reveal>
      </div>

      <Footer />
    </div>
  );
}
