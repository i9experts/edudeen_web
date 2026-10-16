import { formatPrice } from '@/utils/formatPrice';
import { useEffect, useState } from 'react';
import { useHasSellerAccount, useSwitchToStore } from '@/hooks/auth/useSellerAccount';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Loader2, ArrowRight, ChevronDown, BookOpen, Headphones, Users } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/comman/ui/Button';
import { Footer } from '@/components/comman/ui';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { TokenStorage, apiBecomeSeller, type AppRole } from '@/api/services/auth';
import { apiBrowsePlatformPlans, apiFreeTrialEligibility, type PlatformPlan } from '@/api/services/platformPlans';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { apiGetAllProducts, type MarketplaceProduct } from '@/api/services/marketplace';
import { invalidateProfileCache } from '@/hooks/auth/useGetProfile';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';
import { planPriceFor, planYearlySavePct, type PlanInterval } from '@/utils/planPricing';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { EditableSellerSection } from '@/components/admin-edit/EditableSellerSection';
import { effectiveSellerPage, FROM_PRICE_TOKEN } from '@/components/seller-page/sellerPageDefaults';
import { FeatureVisual } from '@/components/seller-page/SellerPageMocks';
import { sellerIcon } from '@/components/seller-page/sellerPageIcons';

const SERIF = "Georgia, 'Times New Roman', serif";
const NAVY = '#174771';
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactUsd = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });
const SUPPORT_ICONS = [BookOpen, Headphones, Users];

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export function BecomeSellerPage() {
  usePageTitle('Sell on Edudeen');
  const navigate = useNavigate();
  const { hash } = useLocation();
  const toast = useToast();
  const [plans, setPlans] = useState<PlatformPlan[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [interval, setInterval] = useState<PlanInterval>('monthly');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const [topProducts, setTopProducts] = useState<MarketplaceProduct[]>([]);
  const { config } = usePublicPlatformConfig();
  const page = effectiveSellerPage(config?.sellerPage);
  // A buyer who already has a seller account should go to their store, not through plans again.
  const hasSellerAccount = useHasSellerAccount();
  const { switchToStore, busy: switching, error: switchError } = useSwitchToStore(navigate);

  useEffect(() => {
    let cancelled = false;
    // A signed-in seller who already used the one-time free trial only sees paid plans.
    const eligible = TokenStorage.isLoggedIn() ? apiFreeTrialEligibility().then(r => r.data.eligible).catch(() => true) : Promise.resolve(true);
    Promise.all([apiBrowsePlatformPlans(), eligible])
      .then(([res, canTrial]) => {
        if (cancelled) return;
        setPlans((res.data ?? []).filter(p => canTrial || !(p.isFree && p.trialDays > 0))
          .filter(p => !p.isCustomPricing && ((p.isFree && p.trialDays > 0) || (!p.isFree && (p.monthlyPriceUSD ?? 0) > 0)))
          .sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch(() => { if (!cancelled) { setPlans([]); setError('Could not load plans. Please refresh and try again.'); } });
    apiGetPlatformStats().then(res => { if (!cancelled) setStats(res.data); }).catch(() => { if (!cancelled) setStatsFailed(true); });
    // Real popular resources for the store preview; the preview falls back to sample cards without them.
    apiGetAllProducts(1, 3, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'popularity')
      .then(res => { if (!cancelled) setTopProducts(res.data?.products ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hash === '#plansSection' && plans) go('plansSection');
  }, [hash, plans]);

  async function choose(plan: PlatformPlan) {
    try { sessionStorage.setItem('sellPlanId', plan._id); sessionStorage.setItem('sellPlanInterval', interval); } catch { /* storage blocked */ }
    const role = TokenStorage.getUser<{ role?: AppRole }>()?.role;
    // Not signed in → create a normal account first, then come back here.
    if (!TokenStorage.isLoggedIn()) {
      try { sessionStorage.setItem('afterAuthPath', '/become-a-seller#plansSection'); } catch { /* storage blocked */ }
      navigate('/register');
      return;
    }
    setBusyId(plan._id);
    try {
      if (role === 'user') {
        const res = await apiBecomeSeller();
        TokenStorage.save(res.data.token.accessToken, res.data.token.refreshToken);
        TokenStorage.saveUser(res.data.user);
        invalidateProfileCache(); // the menu must now show the seller account, not the buyer one
      }
      // Store details form first; the chosen plan is paid for in its "Plan & Payment" step.
      navigate(await resolveSellerDestinationRemote(), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open your seller account.');
    } finally {
      setBusyId(null);
    }
  }

  const statItems = stats
    ? [
        { v: compact.format(stats.buyersCount), l: page.stats.buyers, n: stats.buyersCount },
        { v: compact.format(stats.storesCount), l: page.stats.stores, n: stats.storesCount },
        { v: compactUsd.format(stats.gmv), l: page.stats.sales, n: stats.gmv },
      ].filter(s => s.n > 0)
    : [];
  const paidPrices = (plans ?? []).filter(p => !p.isFree).map(p => p.monthlyPriceUSD ?? 0);
  const minPrice = paidPrices.length ? Math.min(...paidPrices) : null;
  const fromPrice = minPrice != null ? ` starting at ${formatPrice(minPrice, 'USD')} a month` : '';

  const V = page.visible;
  const hero = page.hero;
  const hasBenefitRows = V.featureRows && page.featureRows.length > 0;
  const hasBenefitCards = V.benefits && page.benefits.length > 0;
  const navItems: [string, string][] = [
    ...(hasBenefitRows ? [['benefits', 'Benefits']] : hasBenefitCards ? [['benefit-cards', 'Benefits']] : []),
    ...(V.whoSells && page.whoSells.length ? [['community', 'Who sells']] : []),
    ...(V.supportCards && page.supportCards.length ? [['support', 'Support']] : []),
    ...(V.faqs && page.faqs.length ? [['faqs', 'FAQs']] : []),
  ] as [string, string][];

  return (
    <div className="bg-cream">
      {hasSellerAccount && (
        <div className="px-4 md:px-10 pt-5">
          <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-orange/30 bg-brand-pale-orange px-5 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-carbon">You already have a seller account</p>
              <p className="text-[12.5px] text-slate">Go straight to your store — no new plan or sign-up needed.</p>
              {switchError && <p className="text-[12px] text-error mt-1" role="alert">{switchError}</p>}
            </div>
            <Button variant="primary" size="md" loading={switching} onClick={switchToStore}>Switch to your store</Button>
          </div>
        </div>
      )}

      {/* Hero */}
      <EditableSellerSection section="hero" visible={V.hero}>
        <section className="px-4 md:px-10 pt-12 md:pt-16 pb-12 text-white" style={{ background: NAVY }}>
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 items-center">
            <div>
              {hero.eyebrow && <p className="text-[12px] font-bold tracking-[0.1em] uppercase text-white/70 mb-3">{hero.eyebrow}</p>}
              <h1 className="text-[34px] md:text-[48px] font-bold leading-[1.1]" style={{ fontFamily: SERIF }}>
                {hero.title}{hero.highlight && <> <span className="text-[#FFD27A]">{hero.highlight}</span></>}
              </h1>
              <p className="text-[15px] text-white/80 mt-5 max-w-[480px] leading-[1.7]">{hero.text}</p>
              <div className="flex flex-wrap items-center gap-3 mt-7">
                <Button variant="primary" size="lg" onClick={() => go('plansSection')}>
                  {hero.primaryCta} <ArrowRight size={14} className="inline align-middle ms-1" />
                </Button>
                {hero.secondaryCta && (
                  <button type="button" onClick={() => go(navItems[0]?.[0] ?? 'plansSection')} className="text-[14px] font-semibold text-white underline underline-offset-4 cursor-pointer bg-transparent border-none">{hero.secondaryCta}</button>
                )}
              </div>
            </div>
            {hero.imageUrl ? (
              <img src={hero.imageUrl} alt="" className="w-full rounded-2xl object-cover max-h-[320px]" />
            ) : (
              <div className="grid grid-cols-2 gap-3" aria-hidden>
                {[
                  { t: 'Worksheets', c: '#FFF4DC' }, { t: 'Quran & Islamic', c: '#E3F4EA' },
                  { t: 'Courses', c: '#E4EEF9' }, { t: 'Books & supplies', c: '#FCE8EE' },
                ].map(x => (
                  <div key={x.t} className="rounded-2xl p-5 h-[120px] flex items-end text-carbon text-[14px] font-bold" style={{ background: x.c }}>{x.t}</div>
                ))}
              </div>
            )}
          </div>
        </section>
      </EditableSellerSection>

      {/* Stats (numbers are live from the marketplace; labels are editable) */}
      <EditableSellerSection section="stats" visible={V.stats}>
        {stats === null && !statsFailed ? (
          <section className="px-4 md:px-10 py-8" style={{ background: '#0f3555' }} aria-busy="true">
            <div className="max-w-[1000px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">{[1, 2, 3].map(i => <SkeletonBox key={i} className="h-[64px] w-full" />)}</div>
          </section>
        ) : statItems.length > 0 ? (
          <section className="px-4 md:px-10 py-8 text-white" style={{ background: '#0f3555' }}>
            <div className={`max-w-[1000px] mx-auto grid gap-6 text-center ${statItems.length === 1 ? 'grid-cols-1' : statItems.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {statItems.map(s => (
                <div key={s.l}>
                  <p className="text-[32px] md:text-[40px] font-extrabold leading-none">{s.v}</p>
                  <p className="text-[12.5px] text-white/75 mt-2">{s.l}</p>
                </div>
              ))}
            </div>
          </section>
        ) : <div className="h-8" aria-hidden />}
      </EditableSellerSection>

      {/* Plans (always from the platform plans API) */}
      <EditableSellerSection section="plans" visible={V.plans}>
        <section id="plansSection" className="px-4 md:px-10 pt-14 pb-12 scroll-mt-20">
          <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>
            {page.headings.plans} {page.headings.plansHighlight && <span className="text-brand-orange">{page.headings.plansHighlight}</span>}
          </h2>
          <div className="max-w-[820px] mx-auto">
            {plans && plans.some(p => !p.isFree) && (
              <div role="group" aria-label="Billing interval" className="flex w-fit mx-auto rounded-full border border-bone p-[3px] mb-6">
                {(['monthly', 'yearly'] as const).map(iv => (
                  <button key={iv} type="button" aria-pressed={interval === iv} onClick={() => setInterval(iv)}
                    className={'px-5 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer border-none transition-colors ' + (interval === iv ? 'bg-brand-orange text-white' : 'bg-transparent text-slate hover:text-carbon')}>
                    {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>
            )}
            {plans === null ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[1, 2].map(i => <SkeletonBox key={i} className="w-full h-[320px]" rounded="16px" />)}</div>
            ) : plans.length === 0 ? (
              <p className="text-center text-[13px] text-slate">{error || 'Plans are not available yet. Please contact support@edudeen.com.'}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
                {plans.map(p => (
                  <div key={p._id} className="relative rounded-2xl bg-white border border-bone p-7 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-slate">{p.name}</p>
                      {p.badge && <span className="text-[12px] font-bold bg-brand-pale-orange text-brand-deep-orange px-2 py-[2px] rounded">{p.badge}</span>}
                    </div>
                    <p className="mb-1">
                      <span className="text-[34px] font-extrabold text-carbon" style={{ fontFamily: SERIF }}>{p.isFree ? 'Free' : `${formatPrice(planPriceFor(p, interval), 'USD')}`}</span>
                      <span className="text-[13px] text-slate"> {p.isFree ? `for ${p.trialDays} days · no card needed` : interval === 'yearly' ? 'yearly' : 'monthly'}</span>
                      {!p.isFree && interval === 'yearly' && planYearlySavePct(p) > 0 && <span className="ms-2 text-[12px] font-bold text-success">Save {planYearlySavePct(p)}%</span>}
                    </p>
                    {p.description && <p className="text-[12px] text-slate leading-[1.6] mb-4">{p.description}</p>}
                    <ul className="flex flex-col gap-2.5 my-4 flex-1">
                      {p.featureBullets.map(b => (
                        <li key={b} className="flex items-start gap-2 text-[12.5px] text-charcoal"><Check size={14} className="text-success mt-[2px] shrink-0" />{b}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-4 mt-2">
                      <Button variant="primary" size="md" disabled={busyId !== null} onClick={() => choose(p)}>
                        {busyId === p._id ? <Loader2 size={14} className="animate-spin" /> : p.isFree ? 'Start free trial' : 'Join now'}
                      </Button>
                      {navItems[0] && <button onClick={() => go(navItems[0][0])} className="text-[12.5px] font-semibold text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">Learn more</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </EditableSellerSection>

      {/* Sub-navigation */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-y border-bone">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-center gap-6 md:gap-10 text-[12.5px] text-charcoal overflow-x-auto scrollbar-hide">
          {navItems.map(([id, l]) => (
            <button key={id} onClick={() => go(id)} className="hover:text-brand-orange cursor-pointer bg-transparent border-none whitespace-nowrap">{l}</button>
          ))}
          <Button variant="primary" size="sm" onClick={() => go('plansSection')}>Start your store</Button>
        </div>
      </nav>

      {/* How it works */}
      <EditableSellerSection section="steps" visible={V.steps && page.steps.length > 0}>
        <section id="how-it-works" className="px-4 md:px-10 pt-14 scroll-mt-16">
          <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>{page.headings.steps}</h2>
          <ol className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 list-none p-0 m-0">
            {page.steps.map((s, i) => {
              const Icon = sellerIcon(s.icon);
              return (
                <li key={i} className="rounded-2xl bg-white border border-bone p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-full bg-brand-orange text-white text-[13px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <Icon size={18} className="text-brand-orange" aria-hidden />
                  </div>
                  <p className="text-[15px] font-bold text-carbon mb-1">{s.title}</p>
                  <p className="text-[12.5px] text-slate leading-[1.65]">{s.text}</p>
                </li>
              );
            })}
          </ol>
        </section>
      </EditableSellerSection>

      {/* Benefits: feature rows */}
      <EditableSellerSection section="featureRows" visible={V.featureRows && page.featureRows.length > 0}>
        <section id="benefits" className="px-4 md:px-10 py-14 scroll-mt-16">
          <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-12 max-w-[640px] mx-auto leading-tight" style={{ fontFamily: SERIF }}>
            {page.headings.featureRows}
          </h2>
          <div className="max-w-[1000px] mx-auto flex flex-col gap-14">
            {page.featureRows.map((row, i) => {
              const hasVisual = !!row.imageUrl || row.mockKind !== 'none';
              return (
                <div key={i} className={`grid grid-cols-1 gap-8 items-center ${hasVisual ? 'md:grid-cols-2' : ''} ${hasVisual && i % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}>
                  {hasVisual && (
                    <div className="rounded-3xl p-5 md:p-6 flex items-center" style={{ background: row.mockKind === 'sales' ? '#E4EEF9' : row.mockKind === 'followers' ? '#F1E9FB' : '#E3F4EA' }}>
                      <div className="w-full"><FeatureVisual kind={row.mockKind} imageUrl={row.imageUrl} alt={row.title} products={topProducts} avgRating={stats?.ratingCount ? stats.avgRating : null} /></div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-[20px] font-bold text-carbon mb-2" style={{ fontFamily: SERIF }}>{row.title}</h3>
                    <p className="text-[13.5px] text-slate leading-[1.75]">{row.text}</p>
                    {row.bullets.length > 0 && (
                      <ul className="flex flex-col gap-2 mt-3 list-none p-0">
                        {row.bullets.map(b => <li key={b} className="flex items-start gap-2 text-[13px] text-charcoal"><Check size={14} className="text-success mt-[3px] shrink-0" />{b}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </EditableSellerSection>

      {/* Benefit cards (optional, empty by default) */}
      <EditableSellerSection section="benefits" visible={V.benefits && page.benefits.length > 0}>
        <section id="benefit-cards" className="px-4 md:px-10 pb-14 scroll-mt-16">
          <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>{page.headings.benefits}</h2>
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {page.benefits.map((b, i) => {
              const Icon = sellerIcon(b.icon);
              return (
                <div key={i} className="rounded-2xl bg-white border border-bone p-6">
                  <div className="w-10 h-10 rounded-xl bg-brand-pale-orange flex items-center justify-center mb-3"><Icon size={18} className="text-brand-orange" aria-hidden /></div>
                  <p className="text-[15px] font-bold text-carbon mb-1">{b.title}</p>
                  <p className="text-[12.5px] text-slate leading-[1.65]">{b.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </EditableSellerSection>

      {/* Who sells */}
      <EditableSellerSection section="whoSells" visible={V.whoSells && page.whoSells.length > 0}>
        <section id="community" className="px-4 md:px-10 py-14 text-white scroll-mt-16" style={{ background: NAVY }}>
          <h2 className="text-[26px] md:text-[32px] font-bold text-center mb-8" style={{ fontFamily: SERIF }}>{page.headings.whoSells}</h2>
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {page.whoSells.map((w, i) => {
              const Icon = sellerIcon(w.icon);
              return (
                <div key={i} className="rounded-2xl bg-white/10 border border-white/15 p-6">
                  <Icon size={20} className="text-[#FFD27A] mb-3" aria-hidden />
                  <p className="text-[15px] font-bold mb-1">{w.title}</p>
                  <p className="text-[12.5px] text-white/75 leading-[1.6]">{w.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </EditableSellerSection>

      {/* Support */}
      <EditableSellerSection section="supportCards" visible={V.supportCards && page.supportCards.length > 0}>
        <section id="support" className="px-4 md:px-10 py-14 scroll-mt-16">
          <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>{page.headings.support}</h2>
          <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
            {page.supportCards.map((c, i) => {
              const Icon = SUPPORT_ICONS[i % SUPPORT_ICONS.length];
              const external = /^https?:\/\//i.test(c.ctaLink);
              const body = (
                <>
                  <div className="w-10 h-10 rounded-xl bg-brand-pale-orange flex items-center justify-center mb-3"><Icon size={18} className="text-brand-orange" aria-hidden /></div>
                  <p className="text-[12px] font-bold tracking-[0.06em] uppercase text-slate mb-1">{c.title}</p>
                  <p className="text-[13px] text-charcoal leading-[1.6]">{c.text}</p>
                  {c.ctaLabel && <p className="text-[12.5px] font-semibold text-brand-orange mt-3">{c.ctaLabel}</p>}
                </>
              );
              const cls = 'block w-full text-start rounded-2xl bg-white border border-bone p-6 cursor-pointer hover:border-brand-orange/40 transition-colors';
              return external
                ? <a key={i} href={c.ctaLink} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
                : c.ctaLink
                  ? <button key={i} onClick={() => navigate(c.ctaLink)} className={cls}>{body}</button>
                  : <div key={i} className={cls.replace('cursor-pointer hover:border-brand-orange/40', '')}>{body}</div>;
            })}
          </div>
        </section>
      </EditableSellerSection>

      {/* FAQ */}
      <EditableSellerSection section="faqs" visible={V.faqs && page.faqs.length > 0}>
        <section id="faqs" className="px-4 md:px-10 pb-16 scroll-mt-16">
          <div className="max-w-[760px] mx-auto">
            <h2 className="text-[26px] md:text-[30px] font-bold text-carbon text-center mb-2" style={{ fontFamily: SERIF }}>{page.headings.faqs}</h2>
            <p className="text-[12.5px] text-slate text-center mb-6">Have more questions? <button onClick={() => navigate('/help')} className="text-brand-orange font-semibold cursor-pointer bg-transparent border-none">Visit our Help Centre</button></p>
            <div className="flex flex-col gap-3">
              {page.faqs.map((f, i) => (
                <details key={i} className="bg-white rounded-xl border border-bone px-5 py-4 group">
                  <summary className="flex items-center justify-between gap-3 text-[13.5px] font-semibold text-carbon cursor-pointer list-none">
                    {f.q}<ChevronDown size={16} className="text-slate shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="text-[12.5px] text-slate mt-2 leading-[1.7]">{f.a.split(FROM_PRICE_TOKEN).join(fromPrice)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </EditableSellerSection>

      {/* Closing banner (empty title = hidden) */}
      <EditableSellerSection section="finalCta" visible={V.finalCta && !!page.finalCta.title}>
        <section className="px-4 md:px-10 pb-16">
          <div className="max-w-[900px] mx-auto rounded-3xl text-white text-center px-6 py-12" style={{ background: NAVY }}>
            <h2 className="text-[26px] md:text-[32px] font-bold mb-3" style={{ fontFamily: SERIF }}>{page.finalCta.title}</h2>
            {page.finalCta.text && <p className="text-[14px] text-white/80 max-w-[560px] mx-auto mb-6 leading-[1.7]">{page.finalCta.text}</p>}
            <Button variant="primary" size="lg" onClick={() => go('plansSection')}>{page.finalCta.button}</Button>
          </div>
        </section>
      </EditableSellerSection>

      <Footer />
    </div>
  );
}
