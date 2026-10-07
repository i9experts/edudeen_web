import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Loader2, UserPlus, CreditCard, Store, ArrowRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { TokenStorage, apiBecomeSeller, type AppRole } from '@/api/services/auth';
import { apiBrowsePlatformPlans, type PlatformPlan } from '@/api/services/platformPlans';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';

const STEPS = [
  { Icon: UserPlus,   title: 'Create a free account', desc: 'Sign up as a normal Edudeen user — the same account you use to buy.' },
  { Icon: CreditCard, title: 'Choose your plan',      desc: 'Pick the monthly plan that fits. Every sale is yours — no commission.' },
  { Icon: Store,      title: 'Set up your store',     desc: 'Tell us about your store and what you sell, then start listing.' },
];

const FAQ = [
  { q: 'Do I need a separate account to sell?', a: 'No. Sign up once; when you pick a plan we open your seller account on the same email and password.' },
  { q: 'Does Edudeen take a commission on sales?', a: 'No. You pay your plan fee, and sales are commission-free (card processing fees may apply).' },
  { q: 'What can I sell?', a: 'Digital resources, printables, courses and educational or Islamic books and supplies.' },
  { q: 'Can I change my plan later?', a: 'Yes, from Plan & Billing in your store dashboard.' },
];

export function BecomeSellerPage() {
  usePageTitle('Sell on Edudeen');
  const navigate = useNavigate();
  const { hash } = useLocation();
  const toast = useToast();
  const [plans, setPlans] = useState<PlatformPlan[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiBrowsePlatformPlans()
      .then(res => {
        if (cancelled) return;
        setPlans((res.data ?? [])
          .filter(p => p.status === 'active' && !p.isFree && !p.isCustomPricing && (p.monthlyPriceUSD ?? 0) > 0)
          .sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch(() => { if (!cancelled) { setPlans([]); setError('Could not load plans. Please refresh and try again.'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hash === '#plansSection' && plans) document.getElementById('plansSection')?.scrollIntoView({ behavior: 'smooth' });
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
      navigate(await resolveSellerDestinationRemote(), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open your seller account.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-cream">
      <section className="px-4 md:px-10 pt-14 pb-10 text-center">
        <h1 className="text-[34px] md:text-[44px] font-bold text-carbon leading-tight max-w-[720px] mx-auto" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
          Share your educational resources with the world
        </h1>
        <p className="text-[15px] text-slate mt-4 max-w-[560px] mx-auto leading-[1.7]">
          Open your own Edudeen store, keep every sale, and reach teachers, parents and students.
        </p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => document.getElementById('plansSection')?.scrollIntoView({ behavior: 'smooth' })}>
          Choose a plan <ArrowRight size={14} className="inline align-middle ms-1" />
        </Button>
      </section>

      <section className="px-4 md:px-10 pb-12">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map(({ Icon, title, desc }, i) => (
            <div key={title} className="bg-white rounded-2xl border border-bone p-5">
              <div className="w-10 h-10 rounded-full bg-brand-pale-orange flex items-center justify-center mb-3"><Icon size={18} className="text-brand-orange" /></div>
              <p className="text-[11px] font-bold text-brand-orange mb-1">STEP {i + 1}</p>
              <p className="text-[15px] font-bold text-carbon mb-1">{title}</p>
              <p className="text-[12.5px] text-slate leading-[1.6]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="plansSection" className="px-4 md:px-10 pb-14 scroll-mt-24">
        <h2 className="text-[26px] font-bold text-carbon text-center mb-2">Pick the plan that works for you</h2>
        <p className="text-[13px] text-slate text-center mb-8">Billed monthly. Sales are commission-free.</p>
        <div className="max-w-[960px] mx-auto">
          {plans === null ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <SkeletonBox key={i} className="w-full h-[320px]" rounded="16px" />)}</div>
          ) : plans.length === 0 ? (
            <p className="text-center text-[13px] text-slate">{error || 'Plans are not available yet. Please contact support@edudeen.com.'}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              {plans.map(p => (
                <div key={p._id} className="relative bg-white rounded-2xl border border-bone p-6 flex flex-col">
                  {p.badge && <span className="absolute -top-3 start-6 bg-brand-orange text-white text-[10.5px] font-bold px-3 py-1 rounded-full">{p.badge}</span>}
                  <p className="text-[16px] font-bold text-carbon">{p.name}</p>
                  {p.description && <p className="text-[12px] text-slate mt-1 leading-[1.6]">{p.description}</p>}
                  <p className="mt-4 mb-4"><span className="text-[32px] font-extrabold text-carbon">${(p.monthlyPriceUSD ?? 0).toLocaleString()}</span><span className="text-[12px] text-slate"> / month</span></p>
                  <ul className="flex flex-col gap-2 mb-6 flex-1">
                    {p.featureBullets.map(b => (
                      <li key={b} className="flex items-start gap-2 text-[12.5px] text-charcoal"><Check size={14} className="text-success mt-[2px] shrink-0" />{b}</li>
                    ))}
                  </ul>
                  <Button variant="primary" size="md" fullWidth className="justify-center" disabled={busyId !== null} onClick={() => choose(p)}>
                    {busyId === p._id ? <Loader2 size={14} className="animate-spin" /> : `Get started with ${p.name}`}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 md:px-10 pb-16">
        <div className="max-w-[720px] mx-auto">
          <h2 className="text-[22px] font-bold text-carbon text-center mb-5">Frequently asked questions</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map(f => (
              <details key={f.q} className="bg-white rounded-xl border border-bone px-5 py-4 group">
                <summary className="text-[13.5px] font-semibold text-carbon cursor-pointer">{f.q}</summary>
                <p className="text-[12.5px] text-slate mt-2 leading-[1.7]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
