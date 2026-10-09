import { useState, useId } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Button } from '@/components/comman/ui/Button';
import { Footer } from '@/components/comman/ui';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { mockupForProductSlug } from '@/components/comman/mockups/ProductMockups';
import { getPlatformProduct } from '@/features/buyer/data/platformProducts';

const SERIF = "Georgia, 'Times New Roman', serif";

function ProductFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-bone last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between gap-4 py-[16px] text-start bg-transparent border-none cursor-pointer group"
      >
        <span className={clsx('text-[13.5px] font-semibold transition-colors', open ? 'text-brand-orange' : 'text-carbon group-hover:text-brand-orange')}>
          {question}
        </span>
        <ChevronDown size={15} className={clsx('shrink-0 text-slate transition-transform duration-200', open && 'rotate-180')} />
      </button>
      <div className={clsx('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p id={id} className="text-[12.5px] text-slate leading-[1.7] pb-4 pe-8">{answer}</p>
        </div>
      </div>
    </div>
  );
}

export function PlatformProductPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const sellEntry = useSellEntry();
  const product = getPlatformProduct(slug);
  usePageTitle(product?.name ?? 'Products');

  if (!product) return <Navigate to="/products" replace />;

  return (
    <div className="bg-white min-h-full">
      {/* ── Hero ── */}
      <div className="px-4 md:px-8 lg:px-12 pt-12 md:pt-16 pb-10 md:pb-14 bg-cream">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Reveal delay={0}>
              <p className="text-[12px] font-semibold text-brand-deep-orange uppercase tracking-[0.12em] mb-3">{product.tagline}</p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="text-[28px] sm:text-[36px] lg:text-[42px] font-bold text-carbon leading-[1.15] mb-4" style={{ fontFamily: SERIF }}>
                {product.heroHeadline}
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="text-[14px] sm:text-[15.5px] text-slate leading-[1.7] mb-7 max-w-[480px]">
                {product.heroSubtext}
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="flex flex-wrap gap-3">
                <MagneticButton>
                  <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading}>
                    Start Selling Free <ArrowRight size={14} className="inline align-middle ms-1" />
                  </Button>
                </MagneticButton>
                <Button variant="outline" size="lg" onClick={() => navigate('/products')}>
                  Explore other products
                </Button>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="w-full">
            {mockupForProductSlug(product.slug)}
          </Reveal>
        </div>
      </div>

      {/* ── Benefits ── */}
      <div className="px-4 md:px-8 lg:px-12 py-14 md:py-16 max-w-[1100px] mx-auto">
        <SectionHeading title="Why it works this way" align="left" className="mb-9" />
        <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 gap-5" step={0.08} y={18}>
          {product.benefits.map(b => (
            <PremiumCard key={b.title} className="p-6">
              <p className="text-[14.5px] font-bold text-carbon mb-1.5">{b.title}</p>
              <p className="text-[13px] text-slate leading-[1.7]">{b.desc}</p>
            </PremiumCard>
          ))}
        </RevealStagger>
      </div>

      {/* ── Feature list + use cases ── */}
      <div className="bg-cream px-4 md:px-8 lg:px-12 py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Reveal>
            <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">What's included</p>
            <div className="flex flex-col gap-2.5">
              {product.features.map(f => (
                <div key={f} className="flex items-start gap-2.5">
                  <Check size={14} className="text-success shrink-0 mt-[2px]" />
                  <span className="text-[13.5px] text-charcoal leading-[1.6]">{f}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[12px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">Common use cases</p>
            <div className="flex flex-col gap-2.5">
              {product.useCases.map(u => (
                <div key={u} className="flex items-start gap-2.5">
                  <ArrowRight size={13} className="text-brand-orange shrink-0 mt-[2px]" />
                  <span className="text-[13.5px] text-charcoal leading-[1.6]">{u}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* ── FAQ ── */}
      {product.faq.length > 0 && (
        <div className="px-4 md:px-8 lg:px-12 py-14 md:py-16 max-w-[720px] mx-auto">
          <SectionHeading title={`Questions about ${product.name}`} align="left" className="mb-6" />
          <div>
            {product.faq.map(f => <ProductFaqItem key={f.q} question={f.q} answer={f.a} />)}
          </div>
        </div>
      )}

      {/* ── CTA ── */}
      <div className="bg-carbon px-4 md:px-8 lg:px-12 py-14 md:py-16 text-center">
        <SectionHeading title={`Ready to use ${product.name}?`} subtitle="Start free — no credit card required." tone="dark" align="center" size="lg" className="mb-8" />
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
