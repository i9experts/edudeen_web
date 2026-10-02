import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui';
import { ArrowRight, GraduationCap, Palette, Store, BookOpen, Library, Building2, Gift, Hammer, Download, Sparkles, BarChart2, PackageCheck, CreditCard, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { ClipReveal } from '@/components/comman/motion/ClipReveal';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';

const compactNumber   = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

const SERIF = "Georgia, 'Times New Roman', serif";

const SELLER_TYPES: { Icon: LucideIcon; title: string; desc: string; cta: string }[] = [
  { Icon: GraduationCap, title: 'Educators',            desc: 'Sell lesson plans, worksheets, bundles, and courses to teachers and students worldwide.',    cta: 'Sell as Educator'   },
  { Icon: Palette,       title: 'Educational Creators',  desc: 'Printables, flashcards, eBooks and study templates with instant digital delivery.',          cta: 'Start Creating'     },
  { Icon: Store,         title: 'Bookshops & Stationers', desc: 'Put your books, school supplies and stationery online and deliver to students everywhere.',    cta: 'Open Your Store'    },
  { Icon: BookOpen,      title: 'Quran & Islamic Teachers', desc: 'Offer Quran, Tajweed, Arabic and Islamic studies courses and materials from your own storefront.', cta: 'Start Teaching'  },
  { Icon: Library,       title: 'Publishers',            desc: 'List your whole catalogue with per-edition stock, sales analytics and printed and digital formats.', cta: 'List Your Titles'  },
  { Icon: Building2,     title: 'Schools & Districts',   desc: 'Institutional accounts with volume pricing and centralized resource management.',              cta: 'Contact Us'         },
];

const FEATURES: { Icon: LucideIcon; title: string; desc: string }[] = [
  { Icon: Gift,        title: 'Loyalty & Rewards',    desc: 'Give buyers points, tiers and perks that keep them coming back.' },
  { Icon: Hammer,      title: 'Custom Storefront',    desc: 'Your brand, your domain, your store.'              },
  { Icon: Download,    title: 'Digital Delivery',     desc: 'Instant file delivery for digital products.'       },
  { Icon: Sparkles,    title: 'AI Tools',             desc: 'AI-powered listing optimization and pricing.'      },
  { Icon: BarChart2,   title: 'Analytics',            desc: 'Real-time sales data and customer insights.'       },
  { Icon: PackageCheck, title: 'Inventory Tracking',  desc: 'Per-edition stock for printed books and supplies.' },
  { Icon: CreditCard,  title: 'Fast Payouts',         desc: 'Get paid within 2 business days, every time.'     },
  { Icon: Lock,        title: 'Seller Protection',    desc: 'Fraud protection and dispute resolution support.'  },
];

export function ForSellersPage() {
  const navigate = useNavigate();
  const sellEntry = useSellEntry();
  usePageTitle('For Sellers');

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGetPlatformStats()
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(() => { /* non-critical — stat strip just stays hidden */ })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const statItems = stats ? [
    { value: stats.sellersCount, format: (n: number) => `${compactNumber.format(n)}+`, label: 'Active Sellers' },
    { value: stats.gmv,          format: (n: number) => `${compactCurrency.format(n)}+`, label: 'GMV Processed' },
    { value: stats.buyersCount,  format: (n: number) => `${compactNumber.format(n)}+`,  label: 'Registered Buyers' },
    { value: stats.ratingCount > 0 ? stats.avgRating : null, format: (n: number) => `${n.toFixed(1)} ★`, label: 'Average Rating' },
  ] : [];

  return (
    <div className="bg-white min-h-full">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 md:px-8 lg:px-12 pt-12 md:pt-20 pb-10 md:pb-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #141413 0%, #2C2A28 100%)' }}
      >
        <div className="absolute rounded-full w-[400px] h-[400px] bg-brand-orange opacity-[0.08] -top-[80px] -end-[80px]" />
        <div className="absolute rounded-full w-[300px] h-[300px] bg-brand-deep-orange opacity-[0.06] -bottom-[60px] start-[40%]" />

        <div className="max-w-[760px] mx-auto text-center relative z-[1]">
          <Reveal delay={0}>
            {/* Only a real count — no invented fallback number. */}
            {stats && stats.sellersCount > 0 ? (
              <div className="inline-flex items-center gap-2 bg-[rgba(23,71,113,0.15)] border border-[rgba(23,71,113,0.3)] rounded-[20px] px-[14px] py-[5px] mb-6">
                <span className="text-[12px] text-brand-orange font-medium">
                  Trusted by {compactNumber.format(stats.sellersCount)}+ educators and sellers
                </span>
              </div>
            ) : <div className="mb-6" />}
          </Reveal>

          <h1 className="block text-3xl md:text-5xl lg:text-[48px] font-bold text-white leading-[1.15] mb-5" style={{ fontFamily: SERIF }}>
            <ClipReveal as="div" delay={0.06}>Sell more. Do less.</ClipReveal>
            <ClipReveal as="div" delay={0.18}>With Edu<span className="text-brand-green">deen</span>.</ClipReveal>
          </h1>

          <Reveal delay={0.16}>
            <p className="text-sm md:text-[17px] text-[#b0aea8] leading-[1.7] max-w-[580px] mx-auto mb-9">
              The all-in-one commerce platform for educators, creators, and independent sellers.
              Get your store live in minutes. Start selling today.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton>
                <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
                  Start for Free <ArrowRight size={14} className="inline align-middle ms-1" />
                </Button>
              </MagneticButton>
              <button
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center justify-center gap-2 px-5 py-[10px] rounded-lg text-[13px] font-medium text-white border border-[rgba(255,255,255,0.25)] bg-transparent hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
              >
                See Pricing
              </button>
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── Seller Types ─────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 lg:px-12 py-12 md:py-[72px] bg-cream">
        <div className="max-w-[1100px] mx-auto">
          <SectionHeading kicker="Built for you" title="Whatever you sell, we've got you covered" align="center" className="mb-12" size="lg" />
          <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" step={0.08} y={20}>
            {SELLER_TYPES.map(s => (
              <PremiumCard key={s.title} className="p-7">
                <s.Icon size={36} className="block mb-4 text-brand-orange" />
                <p className="text-[17px] font-bold text-carbon mb-2">{s.title}</p>
                <p className="text-[13px] text-slate leading-[1.7] mb-5">{s.desc}</p>
                <Button
                  variant="secondary" size="sm"
                  onClick={() => s.cta === 'Contact Us'
                    ? (window.location.href = 'mailto:support@edudeen.com?subject=Institutional%20Account%20Inquiry')
                    : sellEntry.go()}
                >
                  {s.cta} <ArrowRight size={14} className="inline align-middle ms-1" />
                </Button>
              </PremiumCard>
            ))}
          </RevealStagger>
        </div>
      </div>

      {/* ── Feature Highlights ───────────────────────────────────────────── */}
      <div className="px-4 md:px-8 lg:px-12 py-12 md:py-[72px] bg-white">
        <div className="max-w-[1100px] mx-auto">
          <SectionHeading title="Everything you need to sell what you teach" subtitle="One subscription. Every tool. Zero technical headaches." align="center" className="mb-12" size="lg" />
          <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" step={0.05} y={16}>
            {FEATURES.map(f => (
              <PremiumCard key={f.title} className="px-[18px] py-5">
                <f.Icon size={28} className="block mb-3 text-brand-orange" />
                <p className="text-[13px] font-bold text-carbon mb-[6px]">{f.title}</p>
                <p className="text-[12px] text-slate leading-[1.6]">{f.desc}</p>
              </PremiumCard>
            ))}
          </RevealStagger>
        </div>
      </div>

      {/* ── Social Proof ─────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 lg:px-12 py-12 md:py-[72px] bg-cream border-t border-bone">
        <div className="max-w-[1100px] mx-auto">
          {(statsLoading || statItems.length > 0) && (
            <RevealStagger className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center mb-12" step={0.08} y={14}>
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="text-center">
                      <SkeletonBox width={70} height={32} className="mb-2 mx-auto" />
                      <SkeletonBox width={90} height={13} className="mx-auto" />
                    </div>
                  ))
                : statItems.map(s => (
                    <div key={s.label} className="text-center">
                      {s.value === null
                        ? <p className="block text-[32px] font-bold text-brand-orange">—</p>
                        : <AnimatedCounter value={s.value} format={s.format} className="block text-[32px] font-bold text-brand-orange" />}
                      <p className="text-[13px] text-slate">{s.label}</p>
                    </div>
                  ))}
            </RevealStagger>
          )}
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className="bg-carbon px-4 md:px-8 lg:px-12 py-12 md:py-[72px] text-center">
        <SectionHeading title="Start selling for free today" subtitle="No credit card required. Get your store live in minutes. Upgrade when you're ready." tone="dark" align="center" size="lg" className="mb-9" />
        <Reveal>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <MagneticButton>
              <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
                Create Free Account <ArrowRight size={14} className="inline align-middle ms-1" />
              </Button>
            </MagneticButton>
            <button
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center justify-center gap-2 px-5 py-[10px] rounded-lg text-[13px] font-medium text-white border border-[rgba(255,255,255,0.25)] bg-transparent hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
            >
              See All Plans
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
