import { ArrowRight, Store, BookOpen, Sparkles, BarChart3 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
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

const PILLARS = [
  { Icon: Store, title: 'One workspace', desc: 'A store, orders, inventory and analytics that all read from the same real data — not five separate tools stitched together.' },
  { Icon: BookOpen, title: 'Printed and digital', desc: 'Sell printed books and school supplies alongside courses, eBooks and worksheets, from one catalog.' },
  { Icon: Sparkles, title: 'AI where it helps', desc: 'Real, metered AI tools for the writing and analysis work that eats an educator\'s time — not a decorative label.' },
  { Icon: BarChart3, title: 'Numbers you can trust', desc: 'Every figure a seller sees is computed from their actual orders and payments, never a simulated placeholder.' },
];

export function AboutPage() {
  usePageTitle('About');
  const sellEntry = useSellEntry();
  // Admin-editable copy (Admin -> Platform Config -> Homepage content -> About page); blank = the text below.
  const { config } = usePublicPlatformConfig();
  const ab = config?.homeContent?.about ?? {};
  const pillars = PILLARS.map((d, i) => { const o = ab.pillars?.[i]; return o?.title ? { ...d, title: o.title, desc: o.desc || d.desc } : d; });

  return (
    <div className="bg-white min-h-full">
      <div className="px-4 md:px-8 lg:px-12 pt-14 md:pt-20 pb-12 max-w-[760px] mx-auto text-center">
        <Reveal delay={0}>
          <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.12em] mb-3">{ab.eyebrow || 'About Edudeen'}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-[28px] sm:text-[40px] font-bold text-carbon leading-[1.15] mb-5" style={{ fontFamily: SERIF }}>
            {ab.heading || "Sharing knowledge shouldn't need five different logins."}
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-[14px] sm:text-[16px] text-slate leading-[1.7]">
            {ab.intro || "Edudeen exists because teachers, scholars, academies and publishers who sell learning materials online usually end up juggling a store builder, a file-delivery service, an inventory tracker and an analytics tool that don't talk to each other. We built one education marketplace where they all share the same real data instead."}
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
            <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">{ab.approachEyebrow || 'Our approach'}</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-carbon leading-[1.3] mb-4" style={{ fontFamily: SERIF }}>
              {ab.approachHeading || 'Easy to start, verified to trust.'}
            </h2>
            <p className="text-[14px] text-slate leading-[1.75]">
              {ab.approachText || "Educators can set up a store and start listing quickly. Sellers who complete Edudeen's verification earn a verified badge, so learners and parents can see at a glance which stores have been checked — and buyers always pay through Edudeen's own checkout."}
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
            <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">{ab.headedEyebrow || "Where we're headed"}</p>
            <h2 className="text-[22px] sm:text-[26px] font-bold text-carbon leading-[1.3] mb-4" style={{ fontFamily: SERIF }}>
              {ab.headedHeading || 'More independence for every seller.'}
            </h2>
            <p className="text-[14px] text-slate leading-[1.75]">
              {ab.headedText || "Sellers' own payment gateways and custom domains per store are real items on our roadmap — the direction is always toward an educator owning more of their own teaching business, not less."}
            </p>
          </Reveal>
        </div>
      </div>

      {/* Seller CTA — not shown to a signed-in buyer. */}
      {!isBuyerSession() && (
        <div className="bg-carbon px-4 md:px-8 lg:px-12 py-14 text-center">
          <SectionHeading title={ab.ctaHeading || 'Share what you teach on Edudeen.'} tone="dark" align="center" size="lg" className="mb-8" />
          <Reveal>
            <MagneticButton>
              <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
                {ab.ctaButton || 'Start Selling Free'} <ArrowRight size={14} className="inline align-middle ms-1" />
              </Button>
            </MagneticButton>
          </Reveal>
        </div>
      )}

      <Footer />
    </div>
  );
}
