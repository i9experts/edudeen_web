import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowRight, Sparkles, Puzzle, Star, Receipt, MessageSquare, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useFaqs } from '@/hooks/useFaqs';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import {
  apiBrowsePlatformPlans, apiGetPublicAddonCatalog,
  type PlatformPlan, type PublicAddonCatalogItem,
} from '@/api/services/platformPlans';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';

const SERIF = "Georgia, 'Times New Roman', serif";

// ── Add-ons — names/prices come from the live catalog (the same table a
// purchase charges); only the icon is chosen here. ───────────────────────────
const ADDON_ICONS: Record<string, LucideIcon> = {
  extra_ai_credits:               Sparkles,
  priority_marketplace_placement: Star,
  advanced_tax_compliance:        Receipt,
  sms_notifications:              MessageSquare,
};

function formatUSD(n: number) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

function addonUnit(a: PublicAddonCatalogItem) {
  return a.recurring ? `per ${a.unitLabel}` : `one-time · ${a.unitLabel}`;
}

// FAQs shown here are only the admin-authored ones filed under a pricing /
// billing / plans category — never generic or hard-coded answers.
const PRICING_FAQ_CATEGORY = /pricing|billing|plan|subscription/i;

// ── Component ─────────────────────────────────────────────────────────────────
export function PricingPage() {
  const navigate  = useNavigate();
  const sellEntry = useSellEntry();
  usePageTitle('Pricing');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    apiBrowsePlatformPlans()
      .then(res => setPlans(res.data ?? []))
      .catch(() => {}) // non-critical — page still works, just without live plan cards
      .finally(() => setPlansLoading(false));
  }, []);

  const [addons, setAddons] = useState<PublicAddonCatalogItem[]>([]);
  useEffect(() => {
    apiGetPublicAddonCatalog()
      .then(res => setAddons(res.data ?? []))
      .catch(() => {}); // non-critical — the add-ons section just stays hidden
  }, []);

  const { faqs: liveFaqs } = useFaqs();
  const faqs = liveFaqs
    .filter(f => PRICING_FAQ_CATEGORY.test(f.category ?? ''))
    .map(f => ({ q: f.question, a: f.answer }));

  // `yearlyPriceUSD` is the full annual charge (not a monthly-equivalent) — the
  // toggle shows a per-month figure either way, with the real annual total below it.
  // A plan with no yearly price is never shown an invented "×12" annual figure.
  const hasYearly = (plan: PlatformPlan) => plan.yearlyPriceUSD != null && plan.yearlyPriceUSD > 0;
  const monthlyEquivalent = (plan: PlatformPlan): number =>
    billing === 'annual' && hasYearly(plan)
      ? Math.round((plan.yearlyPriceUSD as number) / 12)
      : (plan.monthlyPriceUSD ?? 0);

  const paidPlans = plans.filter(p => !p.isFree && !p.isCustomPricing);
  const anyYearly = paidPlans.some(hasYearly);
  // Real annual saving vs paying monthly for 12 months — the best across plans.
  const maxAnnualSavingPct = paidPlans.reduce((best, p) => {
    if (!hasYearly(p) || !p.monthlyPriceUSD) return best;
    const pct = Math.round((1 - (p.yearlyPriceUSD as number) / (p.monthlyPriceUSD * 12)) * 100);
    return pct > best ? pct : best;
  }, 0);
  const maxTrialDays = paidPlans.reduce((m, p) => Math.max(m, p.trialDays ?? 0), 0);
  const hasFreePlan = plans.some(p => p.isFree);

  // Fall back to monthly if annual billing isn't offered by any plan.
  useEffect(() => {
    if (!plansLoading && !anyYearly && billing === 'annual') setBilling('monthly');
  }, [plansLoading, anyYearly, billing]);

  return (
    <div className="bg-cream min-h-full">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center px-4 md:px-8 lg:px-12 pt-10 md:pt-16 pb-12 max-w-[720px] mx-auto">
        {/* Top pill badge */}
        <Reveal delay={0}>
          <div className="inline-flex items-center gap-2 bg-brand-pale-orange border border-[rgba(23,71,113,0.3)] rounded-[20px] px-[14px] py-[5px] mb-5">
            <span className="text-[12px] text-brand-deep-orange font-medium">
              {maxTrialDays > 0 ? `Up to ${maxTrialDays}-day free trial on paid plans • Cancel anytime` : 'Cancel anytime'}
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="block text-2xl md:text-4xl lg:text-[42px] font-bold text-carbon leading-[1.2] mb-[14px]" style={{ fontFamily: SERIF }}>
            Simple, transparent pricing
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="block text-sm md:text-[16px] text-slate leading-[1.6] mb-8">
            {hasFreePlan ? 'Start free. ' : ''}Scale as you grow. Every plan includes your own storefront, digital delivery, and AI-powered tools.
          </p>
        </Reveal>

        {/* Billing toggle — pill selector style (exact reference) */}
        {/* Only offered when at least one plan has a real yearly price. */}
        {anyYearly && (
        <Reveal delay={0.24}>
          <div className="inline-flex bg-bone rounded-[10px] p-1 mb-12" role="group" aria-label="Billing interval">
            {(['monthly', 'annual'] as const).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                aria-pressed={billing === b}
                className={clsx(
                  'px-6 py-2 rounded-lg cursor-pointer flex items-center gap-[6px] transition-all duration-200 border-0',
                  billing === b ? 'bg-white' : 'bg-transparent',
                )}
              >
                <span className={clsx('text-[13px] capitalize', billing === b ? 'font-semibold text-carbon' : 'font-normal text-slate')}>
                  {b}
                </span>
                {b === 'annual' && maxAnnualSavingPct > 0 && (
                  <span className="text-[12px] font-semibold text-success">Save up to {maxAnnualSavingPct}%</span>
                )}
              </button>
            ))}
          </div>
        </Reveal>
        )}
      </div>

      {/* ── Plan Cards — live from the admin-managed platform-plan catalog.
          A flex-wrap row (not a fixed 4-column grid) so however many real
          plans exist — 2 today, maybe more later — always sit centered as a
          deliberate row instead of start-aligned with a lopsided dead gap
          where the missing columns would have been. ── */}
      <RevealStagger className="flex flex-wrap justify-center gap-4 px-4 md:px-8 lg:px-12 pb-16 max-w-[1200px] mx-auto" step={0.1} y={22}>
        {plansLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full sm:w-[300px] rounded-[20px] p-7 bg-white border-2 border-bone animate-pulse h-[420px]" />
          ))
        ) : plans.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-slate">
            Pricing is being updated — check back shortly, or <a href="mailto:support@edudeen.com" className="text-brand-orange underline">contact sales</a>.
          </div>
        ) : plans.map(plan => {
          const isFeatured = !!plan.badge;
          return (
            <PremiumCard
              key={plan._id}
              tone={isFeatured ? 'dark' : 'light'}
              className={clsx('w-full sm:w-[300px] p-7', isFeatured && 'border-brand-orange!')}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 bg-brand-orange text-white rounded-[20px] px-[14px] py-1 text-[12px] font-bold whitespace-nowrap">
                  {plan.badge}
                </div>
              )}

              {/* Plan name */}
              <p className={clsx('text-[15px] font-bold mb-2', isFeatured ? 'text-white' : 'text-carbon')}>
                {plan.name}
              </p>
              <p className={clsx('text-[12px] mb-5 leading-[1.5]', isFeatured ? 'text-[#b0aea8]' : 'text-slate')}>
                {plan.description ?? ' '}
              </p>

              {/* Price */}
              <div className="mb-6">
                {plan.isCustomPricing ? (
                  <p className={clsx('text-[28px] font-bold', isFeatured ? 'text-white' : 'text-carbon')}>Custom</p>
                ) : plan.isFree ? (
                  <p className={clsx('text-[36px] font-bold', isFeatured ? 'text-white' : 'text-carbon')}>Free</p>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className={clsx('text-[36px] font-bold', isFeatured ? 'text-brand-orange' : 'text-carbon')}>
                      <AnimatedCounter value={monthlyEquivalent(plan)} format={n => `$${Math.round(n)}`} duration={0.8} />
                    </span>
                    <span className={clsx('text-[13px]', isFeatured ? 'text-[#b0aea8]' : 'text-slate')}>
                      /month
                    </span>
                  </div>
                )}
                {billing === 'annual' && !plan.isFree && !plan.isCustomPricing && (
                  <p className={clsx('text-[12px] mt-1', isFeatured ? 'text-brand-orange' : 'text-success')}>
                    {hasYearly(plan) ? `Billed $${plan.yearlyPriceUSD}/year` : 'Monthly billing only'}
                  </p>
                )}
                {plan.trialDays > 0 && !plan.isFree && !plan.isCustomPricing && (
                  <p className={clsx('text-[12px] mt-1', isFeatured ? 'text-[#b0aea8]' : 'text-slate')}>
                    {plan.trialDays}-day free trial
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <MagneticButton className="block mb-6">
                <button
                  onClick={() => plan.isCustomPricing
                    ? (window.location.href = `mailto:support@edudeen.com?subject=${encodeURIComponent(`${plan.name} Plan Inquiry`)}`)
                    : sellEntry.go()}
                  className={clsx(
                    'w-full py-[10px] rounded-lg text-[13px] font-semibold cursor-pointer flex justify-center transition-all duration-[180ms] border',
                    isFeatured ? 'border-brand-orange bg-brand-orange text-white' : 'border-bone bg-transparent text-charcoal',
                  )}
                >
                  {plan.isCustomPricing ? 'Contact Sales' : plan.isFree ? 'Start Free' : plan.trialDays > 0 ? 'Start Free Trial' : 'Get Started'}
                </button>
              </MagneticButton>

              {/* Divider */}
              <div className={clsx('h-px mb-5', isFeatured ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-bone')} />

              {/* Features — admin-authored bullets for this plan */}
              <div className="flex flex-col gap-[10px]">
                {(plan.featureBullets ?? []).map(f => (
                  <div key={f} className="flex gap-2 items-start">
                    <Check size={13} className="text-success flex-shrink-0 mt-[1px]" />
                    <span className={clsx('text-[12px] leading-[1.5]', isFeatured ? 'text-[#d0cec8]' : 'text-charcoal')}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </PremiumCard>
          );
        })}
      </RevealStagger>

      {/* ── Add-ons — live catalog; hidden when there are none ─────────────── */}
      {addons.length > 0 && (
      <div className="px-4 md:px-8 lg:px-12 pb-16 max-w-[1200px] mx-auto">
        <SectionHeading title="Add-ons & extras" subtitle="Extend your plan with exactly what you need." className="mb-7" />
        <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" step={0.05} y={14}>
          {addons.map(a => {
            const Icon = ADDON_ICONS[a.addonType] ?? Puzzle;
            return (
              <PremiumCard key={a.addonType} className="px-5 py-[18px] flex gap-[14px] items-center">
                <Icon size={28} className="text-brand-orange flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-carbon mb-[2px]">{a.name}</p>
                  <p className="text-[12px] text-slate">{addonUnit(a)}</p>
                </div>
                <span className="text-[14px] font-bold text-brand-orange flex-shrink-0">
                  {formatUSD(a.priceUSD)}
                </span>
              </PremiumCard>
            );
          })}
        </RevealStagger>
      </div>
      )}

      {/* ── FAQ — admin-authored pricing FAQs only; hidden when none ───────── */}
      {faqs.length > 0 && (
      <div className="bg-white px-4 md:px-8 lg:px-12 py-16 border-t border-bone">
        <div className="max-w-[720px] mx-auto">
          <SectionHeading title="Frequently asked questions" align="center" size="lg" className="mb-10" />
          <RevealStagger className="flex flex-col gap-0" step={0.05} y={10}>
            {faqs.map((faq, i) => (
              <div
                key={faq.q}
                className={clsx('py-5', i < faqs.length - 1 && 'border-b border-bone')}
              >
                <p className="text-[14px] font-semibold text-carbon mb-2">
                  {faq.q}
                </p>
                <p className="text-[13px] text-slate leading-[1.7]">
                  {faq.a}
                </p>
              </div>
            ))}
          </RevealStagger>
        </div>
      </div>
      )}

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <div className="bg-carbon px-4 md:px-8 lg:px-12 py-16 text-center">
        <SectionHeading
          title={hasFreePlan ? "Start selling today — it's free" : 'Start selling today'}
          subtitle={maxTrialDays > 0
            ? `Paid plans include up to a ${maxTrialDays}-day free trial. Cancel or upgrade anytime.`
            : 'Cancel or upgrade anytime.'}
          tone="dark" align="center" size="lg" className="mb-8"
        />
        <Reveal>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <MagneticButton>
              <button
                onClick={() => sellEntry.go()}
                className="px-6 py-[13px] rounded-lg text-[15px] font-medium cursor-pointer bg-brand-orange text-white border-none transition-all duration-[180ms] w-full sm:w-auto"
              >
                {hasFreePlan ? 'Create Free Account' : 'Create Seller Account'} <ArrowRight size={14} className="inline align-middle ms-1" />
              </button>
            </MagneticButton>
            <button
              onClick={() => navigate('/sellers')}
              className="px-6 py-[13px] rounded-lg text-[15px] font-medium cursor-pointer bg-transparent text-white border border-[rgba(255,255,255,0.2)] transition-all duration-[180ms]"
            >
              See How It Works
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
