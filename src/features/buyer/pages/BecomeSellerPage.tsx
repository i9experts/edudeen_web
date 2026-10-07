import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Loader2, ArrowRight, ChevronDown, Star, BarChart2, Bell, Store, BookOpen, Headphones, Users } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/comman/ui/Button';
import { Footer } from '@/components/comman/ui';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { TokenStorage, apiBecomeSeller, type AppRole } from '@/api/services/auth';
import { apiBrowsePlatformPlans, apiFreeTrialEligibility, type PlatformPlan } from '@/api/services/platformPlans';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';

const SERIF = "Georgia, 'Times New Roman', serif";
const NAVY = '#174771';
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactUsd = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export function BecomeSellerPage() {
  usePageTitle('Sell on Edudeen');
  const navigate = useNavigate();
  const { hash } = useLocation();
  const toast = useToast();
  const [plans, setPlans] = useState<PlatformPlan[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);

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
    apiGetPlatformStats().then(res => { if (!cancelled) setStats(res.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hash === '#plansSection' && plans) go('plansSection');
  }, [hash, plans]);

  async function choose(plan: PlatformPlan) {
    try { sessionStorage.setItem('sellPlanId', plan._id); } catch { /* storage blocked */ }
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
        { v: compact.format(stats.buyersCount), l: 'Learners and parents on Edudeen', n: stats.buyersCount },
        { v: compact.format(stats.storesCount), l: 'Stores selling educational resources', n: stats.storesCount },
        { v: compactUsd.format(stats.gmv), l: 'In sales made through Edudeen', n: stats.gmv },
      ].filter(s => s.n > 0)
    : [];
  const paidPrices = (plans ?? []).filter(p => !p.isFree).map(p => p.monthlyPriceUSD ?? 0);
  const minPrice = paidPrices.length ? Math.min(...paidPrices) : null;

  const faqs = [
    { q: 'How do I become an Edudeen seller?', a: 'Sign up for a free Edudeen account, choose a seller plan, then add your store details and payment to open your store. You can set your own prices, upload digital or printed resources, and promote your store.' },
    { q: 'What kinds of resources can I sell?', a: 'Educational resources such as worksheets, lesson plans, printables, eBooks, courses, and Islamic and educational books and supplies. Please follow the content guidelines.' },
    { q: 'How much can I earn?', a: 'Edudeen takes no commission on your sales, so you keep what buyers pay (card processing fees may apply). Earnings depend on your resources, pricing and how well you promote them.' },
    { q: 'Are there any fees?', a: minPrice != null
        ? `You pay a monthly plan fee starting at $${minPrice.toLocaleString()}. There is no commission on sales. Bank-transfer sales go straight to your own account.`
        : 'You pay a monthly plan fee. There is no commission on sales. Bank-transfer sales go straight to your own account.' },
    { q: 'How do I get paid?', a: 'Buyers can pay by bank transfer directly to the account you add in Finance. Card payments are paid out to you from your Finance page.' },
    { q: 'Can I change or cancel my plan?', a: 'Yes. You can change your plan any time from Plan & Billing in your store dashboard.' },
  ];

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="px-4 md:px-10 pt-12 md:pt-16 pb-12 text-white" style={{ background: NAVY }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <h1 className="text-[34px] md:text-[48px] font-bold leading-[1.1]" style={{ fontFamily: SERIF }}>
              Sell your resources where educators and learners shop
            </h1>
            <p className="text-[15px] text-white/80 mt-5 max-w-[480px] leading-[1.7]">
              Edudeen is the marketplace for educational and Islamic resources. Bring your ideas to our community and get paid.
            </p>
            <Button variant="primary" size="lg" className="mt-7" onClick={() => go('plansSection')}>
              Start earning <ArrowRight size={14} className="inline align-middle ms-1" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3" aria-hidden>
            {[
              { t: 'Worksheets', c: '#FFF4DC' }, { t: 'Quran & Islamic', c: '#E3F4EA' },
              { t: 'Courses', c: '#E4EEF9' }, { t: 'Books & supplies', c: '#FCE8EE' },
            ].map(x => (
              <div key={x.t} className="rounded-2xl p-5 h-[120px] flex items-end text-carbon text-[14px] font-bold" style={{ background: x.c }}>{x.t}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      {statItems.length > 0 && (
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
      )}

      {/* Plans */}
      <section id="plansSection" className="px-4 md:px-10 pt-14 pb-12 scroll-mt-20">
        <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>
          Choose the seller plan <span className="text-brand-orange">for you</span>
        </h2>
        <div className="max-w-[820px] mx-auto">
          {plans === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[1, 2].map(i => <SkeletonBox key={i} className="w-full h-[320px]" rounded="16px" />)}</div>
          ) : plans.length === 0 ? (
            <p className="text-center text-[13px] text-slate">{error || 'Plans are not available yet. Please contact support@edudeen.com.'}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
              {plans.map(p => (
                <div key={p._id} className="relative rounded-2xl bg-white border border-bone p-7 flex flex-col shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <p className="text-[11px] font-bold tracking-[0.08em] uppercase text-slate">{p.name}</p>
                    {p.badge && <span className="text-[10px] font-bold bg-brand-pale-orange text-brand-deep-orange px-2 py-[2px] rounded">{p.badge}</span>}
                  </div>
                  <p className="mb-1">
                    <span className="text-[34px] font-extrabold text-carbon" style={{ fontFamily: SERIF }}>{p.isFree ? 'Free' : `$${(p.monthlyPriceUSD ?? 0).toLocaleString()}`}</span>
                    <span className="text-[13px] text-slate"> {p.isFree ? `for ${p.trialDays} days · no card needed` : 'monthly'}</span>
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
                    <button onClick={() => go('benefits')} className="text-[12.5px] font-semibold text-slate hover:text-brand-orange cursor-pointer bg-transparent border-none">Learn more</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sub-navigation */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-y border-bone">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-center gap-6 md:gap-10 text-[12.5px] text-charcoal overflow-x-auto scrollbar-hide">
          {[['benefits', 'Benefits'], ['community', 'Who sells'], ['support', 'Support'], ['faqs', 'FAQs']].map(([id, l]) => (
            <button key={id} onClick={() => go(id)} className="hover:text-brand-orange cursor-pointer bg-transparent border-none whitespace-nowrap">{l}</button>
          ))}
          <Button variant="primary" size="sm" onClick={() => go('plansSection')}>Start your store</Button>
        </div>
      </nav>

      {/* Benefits */}
      <section id="benefits" className="px-4 md:px-10 py-14 scroll-mt-16">
        <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-12 max-w-[640px] mx-auto leading-tight" style={{ fontFamily: SERIF }}>
          Reach educators and learners. Earn from your expertise.
        </h2>
        <div className="max-w-[1000px] mx-auto flex flex-col gap-14">
          {[
            { Icon: Store, title: 'Easily create your own store', desc: 'We give you everything you need to sell on Edudeen — a store, a theme, product pages and secure checkout — so you can focus on creating great resources.', tag: 'My Edudeen Store', bg: '#E3F4EA' },
            { Icon: BarChart2, title: 'Grow your business', desc: 'Use sales data, marketing tools, discounts and AI Studio to see what is working and boost your earnings.', tag: 'My Sales & Earnings', bg: '#E4EEF9' },
            { Icon: Bell, title: 'Connect with buyers in your niche', desc: 'No matter your teaching specialty, find buyers who are eager for your ideas. Followers hear about your new resources and sales.', tag: 'Note to my followers', bg: '#F1E9FB' },
          ].map(({ Icon, title, desc, tag, bg }, i) => (
            <div key={title} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${i % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}>
              <div className="rounded-3xl p-8 min-h-[220px] flex flex-col justify-center gap-4" style={{ background: bg }} aria-hidden>
                <span className="inline-flex w-fit items-center gap-2 bg-white rounded-full px-4 py-2 text-[12.5px] font-bold text-carbon shadow-sm"><Icon size={15} className="text-brand-orange" />{tag}</span>
                <div className="flex gap-3">{[1, 2, 3].map(n => <div key={n} className="flex-1 h-[70px] rounded-xl bg-white/80" />)}</div>
              </div>
              <div>
                <h3 className="text-[20px] font-bold text-carbon mb-2" style={{ fontFamily: SERIF }}>{title}</h3>
                <p className="text-[13.5px] text-slate leading-[1.75]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who sells */}
      <section id="community" className="px-4 md:px-10 py-14 text-white scroll-mt-16" style={{ background: NAVY }}>
        <h2 className="text-[26px] md:text-[32px] font-bold text-center mb-8" style={{ fontFamily: SERIF }}>Who sells on Edudeen</h2>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { Icon: Star, t: 'Teachers & educators', d: 'Worksheets, lesson plans, bundles and courses for every grade and subject.' },
            { Icon: BookOpen, t: 'Quran & Islamic teachers', d: 'Quran, Tajweed, Arabic and Islamic studies material and classes.' },
            { Icon: Users, t: 'Creators & publishers', d: 'Printables, eBooks, flashcards, and printed books and stationery.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-2xl bg-white/10 border border-white/15 p-6">
              <Icon size={20} className="text-[#FFD27A] mb-3" />
              <p className="text-[15px] font-bold mb-1">{t}</p>
              <p className="text-[12.5px] text-white/75 leading-[1.6]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Support */}
      <section id="support" className="px-4 md:px-10 py-14 scroll-mt-16">
        <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>Get support along every step of your journey</h2>
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { Icon: BookOpen, t: 'Edudeen Blog', d: 'Discover tips and updates for sellers and educators.', to: '/blog' },
            { Icon: Headphones, t: 'Help Centre', d: 'Guides and answers on setting up and running your store.', to: '/help' },
            { Icon: Users, t: 'Seller support', d: 'Focus on creating resources and leave the technical support to us.', to: '/contact' },
          ].map(({ Icon, t, d, to }) => (
            <button key={t} onClick={() => navigate(to)} className="text-start rounded-2xl bg-white border border-bone p-6 cursor-pointer hover:border-brand-orange/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-brand-pale-orange flex items-center justify-center mb-3"><Icon size={18} className="text-brand-orange" /></div>
              <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-slate mb-1">{t}</p>
              <p className="text-[13px] text-charcoal leading-[1.6]">{d}</p>
            </button>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faqs" className="px-4 md:px-10 pb-16 scroll-mt-16">
        <div className="max-w-[760px] mx-auto">
          <h2 className="text-[26px] md:text-[30px] font-bold text-carbon text-center mb-2" style={{ fontFamily: SERIF }}>FAQs</h2>
          <p className="text-[12.5px] text-slate text-center mb-6">Have more questions? <button onClick={() => navigate('/help')} className="text-brand-orange font-semibold cursor-pointer bg-transparent border-none">Visit our Help Centre</button></p>
          <div className="flex flex-col gap-3">
            {faqs.map(f => (
              <details key={f.q} className="bg-white rounded-xl border border-bone px-5 py-4 group">
                <summary className="flex items-center justify-between gap-3 text-[13.5px] font-semibold text-carbon cursor-pointer list-none">
                  {f.q}<ChevronDown size={16} className="text-slate shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-[12.5px] text-slate mt-2 leading-[1.7]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
