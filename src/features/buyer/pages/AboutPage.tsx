import { ArrowRight, Store, BookOpen, Sparkles, BarChart3 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { effectiveAbout } from '@/components/admin-edit/homeDefaults';
import { EditableHomeSection } from '@/components/admin-edit/EditableHomeSection';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { isBuyerSession } from '@/hooks/auth/useIsBuyer';
import { Button, Footer } from '@/components/comman/ui';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import aboutImg1 from '@/assets/about/about-1.jfif';
import aboutImg2 from '@/assets/about/about-2.jfif';

const SERIF = "Georgia, 'Times New Roman', serif";

// Text lives in admin-edit/homeDefaults.ts (shared with the inline editor); only the icons are here.
const PILLAR_ICONS = [Store, BookOpen, Sparkles, BarChart3];

export function AboutPage() {
  usePageTitle('About');
  const sellEntry = useSellEntry();
  // Admin-editable copy (Admin -> Platform Config -> Homepage content -> About page); blank = the text below.
  const { config } = usePublicPlatformConfig();
  const ab = effectiveAbout(config?.homeContent?.about);
  const pillars = ab.pillars.map((d, i) => ({ ...d, Icon: PILLAR_ICONS[i] ?? PILLAR_ICONS[0] }));

  return (
    <div className="bg-white min-h-full">
      <EditableHomeSection section="about" label="About page text">
      <div className="px-4 md:px-8 lg:px-12 pt-14 md:pt-20 pb-12 max-w-[760px] mx-auto text-center">
        <Reveal delay={0}>
          <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.12em] mb-3">{ab.eyebrow}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-[28px] sm:text-[40px] font-bold text-carbon leading-[1.15] mb-5" style={{ fontFamily: SERIF }}>
            {ab.heading}
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-[14px] sm:text-[16px] text-slate leading-[1.7]">
            {ab.intro}
          </p>
        </Reveal>
      </div>

      <RevealStagger className="px-4 md:px-8 lg:px-12 pb-14 max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" step={0.06} y={16}>
        {pillars.map(p => (
          <PremiumCard key={p.title} className="p-6">
            <p.Icon size={26} className="text-brand-orange mb-3" />
            <p className="text-[13.5px] font-bold text-carbon mb-1.5">{p.title}</p>
            <p className="text-[12.5px] text-slate leading-[1.6]">{p.desc}</p>
          </PremiumCard>
        ))}
      </RevealStagger>

      <div className="bg-cream px-4 md:px-8 lg:px-12 py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <Reveal>
            <img src={aboutImg1} alt="" className="rounded-2xl w-full object-cover aspect-[4/3]" loading="lazy" />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">{ab.approachEyebrow}</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-carbon leading-[1.3] mb-4" style={{ fontFamily: SERIF }}>
              {ab.approachHeading}
            </h2>
            <p className="text-[14px] text-slate leading-[1.75]">
              {ab.approachText}
            </p>
          </Reveal>
        </div>
      </div>

      <div className="px-4 md:px-8 lg:px-12 py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <Reveal className="lg:order-2">
            <img src={aboutImg2} alt="" className="rounded-2xl w-full object-cover aspect-[4/3]" loading="lazy" />
          </Reveal>
          <Reveal delay={0.1} className="lg:order-1">
            <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">{ab.headedEyebrow}</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-carbon leading-[1.3] mb-4" style={{ fontFamily: SERIF }}>
              {ab.headedHeading}
            </h2>
            <p className="text-[14px] text-slate leading-[1.75]">
              {ab.headedText}
            </p>
          </Reveal>
        </div>
      </div>

      </EditableHomeSection>
      {/* Seller CTA — not shown to a signed-in buyer. */}
      {!isBuyerSession() && (
        <div className="bg-carbon px-4 md:px-8 lg:px-12 py-14 text-center">
          <SectionHeading title={ab.ctaHeading} tone="dark" align="center" size="lg" className="mb-8" />
          <Reveal>
            <MagneticButton>
              <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
                {ab.ctaButton} <ArrowRight size={14} className="inline align-middle ms-1" />
              </Button>
            </MagneticButton>
          </Reveal>
        </div>
      )}

      <Footer />
    </div>
  );
}
