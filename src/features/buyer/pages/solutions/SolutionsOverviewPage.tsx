import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Button, Footer } from '@/components/comman/ui';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { Check } from 'lucide-react';
import { unsplashUrl } from '@/assets/stockPhotos';
import { SOLUTIONS } from '@/features/buyer/data/solutions';

export function SolutionsOverviewPage() {
  usePageTitle('Solutions');
  const navigate = useNavigate();
  const sellEntry = useSellEntry();

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-8 lg:px-12 pt-14 md:pt-18 pb-10 max-w-[760px] mx-auto">
        <SectionHeading
          kicker="Built for the way you teach"
          title="Edudeen, tailored to how you educate."
          subtitle="The same real platform underneath — store, digital delivery, inventory, AI tools — applied to how teachers, scholars, academies and publishers actually sell."
          align="center"
          size="lg"
        />
      </div>

      <RevealStagger className="px-4 md:px-8 lg:px-12 pb-16 max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" step={0.06} y={18}>
        {SOLUTIONS.map(s => (
          <PremiumCard key={s.slug} onClick={() => navigate(`/solutions/${s.slug}`)} className="group overflow-hidden p-0">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={unsplashUrl(s.image, 400)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </div>
            <div className="p-5">
              <p className="text-[14.5px] font-bold text-carbon mb-1">{s.name}</p>
              <p className="text-[12.5px] text-slate leading-[1.6] mb-3">{s.headline}</p>
              <div className="flex flex-col gap-1.5 mb-4">
                {s.highlights.slice(0, 2).map(h => (
                  <div key={h} className="flex items-start gap-1.5">
                    <Check size={12} className="text-success shrink-0 mt-[2px]" />
                    <span className="text-[11.5px] text-charcoal leading-snug">{h}</span>
                  </div>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-orange">
                Explore <ArrowRight size={12} />
              </span>
            </div>
          </PremiumCard>
        ))}
      </RevealStagger>

      <div className="bg-carbon px-4 md:px-8 lg:px-12 py-14 text-center">
        <SectionHeading title="Not sure which fits? Start free and find out." tone="dark" align="center" size="lg" className="mb-8" />
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
