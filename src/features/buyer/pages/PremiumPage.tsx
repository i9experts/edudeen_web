import { formatPrice } from '@/utils/formatPrice';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Baby, BadgeDollarSign, Check, Crown, Gift, Headphones, RotateCcw, ShieldCheck, Timer, type LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/comman/ui/Button';
import { Footer, Accordion } from '@/components/comman/ui';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { TokenStorage } from '@/api/services/auth';
import { apiGetPremiumPlans, type PremiumBenefits, type PremiumInterval, type PremiumPlan } from '@/api/services/premium';
import { usePremium } from '@/hooks/usePremium';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { PremiumCheckoutModal } from '@/features/buyer/components/PremiumCheckoutModal';

const SERIF = "Georgia, 'Times New Roman', serif";
const NAVY = '#174771';
const GOLD = '#F4DC4C';

/** "10%" / "$5" — value comes from the plan, never hard-coded. */
const couponText = (b: PremiumBenefits) => (b.monthlyCouponType === 'fixed' ? formatPrice(b.monthlyCouponValue, 'USD') : `${b.monthlyCouponValue}%`);

/** Short, plan-driven benefit lines (only the ones the plan actually gives). */
function planBenefitLines(b: PremiumBenefits): string[] {
  const lines = ['Member prices: extra savings on selected products'];
  if (b.earlyAccessHours > 0) lines.push(`${b.earlyAccessHours} hour${b.earlyAccessHours === 1 ? '' : 's'} early access to every sale`);
  if (b.monthlyCouponValue > 0) lines.push(`A personal ${couponText(b)} coupon every month`);
  lines.push(`Up to ${b.childrenLimit} children profiles`);
  if (b.prioritySupport) lines.push('Priority support');
  return lines;
}

export function PremiumPage() {
  usePageTitle('Edudeen Premium');
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { currency } = useCurrencyPreference();
  const { isPremium, pendingPayment, membership } = usePremium();
  const [plans, setPlans] = useState<PremiumPlan[] | null>(null);
  const [error, setError] = useState('');
  const [interval, setInterval] = useState<PremiumInterval>('monthly');
  const [buying, setBuying] = useState<PremiumPlan | null>(null);
  const [resuming, setResuming] = useState(false);

  const role = TokenStorage.getRole();
  const loggedIn = TokenStorage.isLoggedIn();
  const isStaff = loggedIn && role !== 'user';

  useEffect(() => {
    let cancelled = false;
    apiGetPremiumPlans()
      .then(res => { if (!cancelled) setPlans((res.data ?? []).filter(p => p.isActive)); })
      .catch(() => { if (!cancelled) { setPlans([]); setError('Could not load Premium plans. Please refresh and try again.'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hash === '#premiumPlans' && plans) document.getElementById('premiumPlans')?.scrollIntoView({ behavior: 'smooth' });
  }, [hash, plans]);

  // The headline benefits come from the best plan on offer (highest values), so the page never claims more than a plan gives.
  const top = useMemo<PremiumBenefits | null>(() => {
    if (!plans?.length) return null;
    return plans.reduce<PremiumBenefits>((a, p) => ({
      childrenLimit: Math.max(a.childrenLimit, p.benefits.childrenLimit),
      earlyAccessHours: Math.max(a.earlyAccessHours, p.benefits.earlyAccessHours),
      monthlyCouponValue: Math.max(a.monthlyCouponValue, p.benefits.monthlyCouponValue),
      monthlyCouponType: p.benefits.monthlyCouponValue >= a.monthlyCouponValue ? p.benefits.monthlyCouponType : a.monthlyCouponType,
      prioritySupport: a.prioritySupport || p.benefits.prioritySupport,
    }), plans[0].benefits);
  }, [plans]);

  const benefitCards = useMemo(() => {
    if (!top) return [];
    const cards: { Icon: LucideIcon; title: string; text: string }[] = [
      { Icon: BadgeDollarSign, title: 'Premium prices', text: 'Sellers on Edudeen offer members extra savings on selected products. Look for the Premium price on products and at checkout.' },
    ];
    if (top.earlyAccessHours > 0) cards.push({ Icon: Timer, title: 'Early access to sales', text: `Shop every Edudeen sale up to ${top.earlyAccessHours} hour${top.earlyAccessHours === 1 ? '' : 's'} before everyone else.` });
    if (top.monthlyCouponValue > 0) cards.push({ Icon: Gift, title: 'A coupon every month', text: `Get a personal ${couponText(top)} coupon each month you are a member, ready to use at checkout.` });
    cards.push({ Icon: Baby, title: 'More children profiles', text: `Save up to ${top.childrenLimit} children so Edudeen can suggest the right resources for each of them.` });
    if (top.prioritySupport) cards.push({ Icon: Headphones, title: 'Priority support', text: 'Your questions go to the front of the support queue.' });
    return cards;
  }, [top]);

  const priceOf = (p: PremiumPlan, iv: PremiumInterval = interval) => {
    const usd = iv === 'yearly' ? p.yearlyPriceUSD : p.monthlyPriceUSD;
    const pkr = iv === 'yearly' ? p.yearlyPricePKR : p.monthlyPricePKR;
    const main = currency === 'PKR' && pkr != null ? `${formatPrice(pkr, 'PKR')}` : `${formatPrice(usd, 'USD')}`;
    const alt = currency === 'PKR' && pkr != null ? `${formatPrice(usd, 'USD')} USD` : pkr != null ? `${formatPrice(pkr, 'PKR')}` : null;
    return { main, alt };
  };

  function choose(plan: PremiumPlan) {
    if (!loggedIn) {
      try { sessionStorage.setItem('afterAuthPath', '/premium'); } catch { /* storage blocked */ }
      navigate('/login');
      return;
    }
    if (isStaff) return;
    setBuying(plan);
  }

  const underReview = pendingPayment?.status === 'pending';
  const needsProof = pendingPayment && (pendingPayment.status === 'awaiting_proof' || pendingPayment.status === 'rejected');

  const faqs = [
    { id: 'what', title: 'What is Edudeen Premium?', content: <p className="text-[13px] text-slate leading-[1.7]">A membership for parents, teachers and learners. Members get extra savings from sellers, early access to sales and more.</p> },
    { id: 'prices', title: 'How do Premium prices work?', content: <p className="text-[13px] text-slate leading-[1.7]">Sellers on Edudeen choose to offer members extra savings on selected products, and Edudeen adds a little more on top. When a product has a member price you will see it on the product page, in your cart and at checkout, together with how much comes from the seller and how much from Edudeen. Not every product has one.</p> },
    { id: 'pay', title: 'How do I pay?', content: <p className="text-[13px] text-slate leading-[1.7]">By bank transfer or mobile wallet to Edudeen. Choose a plan, transfer the amount shown in PKR and upload your receipt. We check it and activate your membership, usually within 24 hours.</p> },
    { id: 'cancel', title: 'Can I cancel?', content: <p className="text-[13px] text-slate leading-[1.7]">Yes. Cancel any time from Account, Premium. You keep your benefits until the end of the period you paid for.</p> },
    { id: 'renew', title: 'How do I renew?', content: <p className="text-[13px] text-slate leading-[1.7]">Just buy again before it ends. The new period is added after your current one, so you lose no days.</p> },
  ];

  const ctaLabel = isPremium ? 'Renew Premium' : 'Get Premium';

  return (
    <div className="bg-cream">
      {/* Hero */}
      <section className="px-4 md:px-10 pt-12 md:pt-16 pb-12 text-white" style={{ background: NAVY }}>
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em]" style={{ background: GOLD, color: '#152D43' }}>
              <Crown size={13} aria-hidden /> Edudeen Premium
            </span>
            <h1 className="text-[34px] md:text-[48px] font-bold leading-[1.1] mt-4" style={{ fontFamily: SERIF }}>
              Learn more, <span style={{ color: GOLD }}>pay less</span>
            </h1>
            <p className="text-[15px] text-white/80 mt-5 max-w-[500px] leading-[1.7]">
              Member prices from sellers, early access to every sale and a personal coupon each month. One simple membership for your family or classroom.
            </p>
            {!isPremium && !isStaff && (
              <Button variant="primary" size="lg" className="mt-7" onClick={() => document.getElementById('premiumPlans')?.scrollIntoView({ behavior: 'smooth' })}>
                See plans
              </Button>
            )}
            {isPremium && (
              <Button variant="primary" size="lg" className="mt-7" to={'/account/premium'}>
                You are a member - open my Premium
              </Button>
            )}
          </div>
          <div className="relative" aria-hidden>
            <div className="absolute -inset-6 rounded-[32px] opacity-30 blur-2xl" style={{ background: GOLD }} />
            <div className="relative rounded-3xl bg-white text-carbon p-6 shadow-[0_30px_60px_-24px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#8a6100]"><Crown size={13} /> Member</span>
                <span className="text-[12px] font-semibold text-success bg-success-bg px-2 py-[2px] rounded-full">Active</span>
              </div>
              <div className="mt-4 rounded-2xl border border-bone p-4">
                <p className="text-[12px] text-slate">Example product</p>
                <p className="text-[15px] font-bold mt-0.5">Grade 5 Maths Worksheets</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[24px] font-extrabold" style={{ fontFamily: SERIF }}>Member price</span>
                  <span className="text-[12px] bg-[#fff6d6] text-[#8a6100] font-bold px-2 py-[2px] rounded">Extra savings</span>
                </div>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-2.5 text-[12.5px] text-charcoal">
                {['Member prices', 'Early access', 'Monthly coupon', 'Priority support'].map(t => (
                  <li key={t} className="flex items-center gap-1.5"><Check size={14} className="text-success shrink-0" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <div className="bg-white border-b border-bone px-4 md:px-10 py-4">
        <ul className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px] text-charcoal">
          {[{ Icon: ShieldCheck, t: 'Secure bank / wallet payment' }, { Icon: Timer, t: 'Activated within 24 hours' }, { Icon: RotateCcw, t: 'Cancel any time' }].map(({ Icon, t }) => (
            <li key={t} className="flex items-center justify-center gap-2 font-semibold"><Icon size={16} className="text-brand-royal" aria-hidden />{t}</li>
          ))}
        </ul>
      </div>

      {/* Status banners */}
      {(isStaff || needsProof || underReview || (isPremium && membership)) && (
        <div className="px-4 md:px-10 pt-5">
          <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f1d98a] bg-[#fff6d6] px-5 py-3">
            {isStaff ? (
              <>
                <div><p className="text-[14px] font-bold text-carbon">Premium is for buyer accounts</p><p className="text-[12.5px] text-slate">Switch to your buyer account to join Edudeen Premium.</p></div>
              </>
            ) : needsProof ? (
              <>
                <div>
                  <p className="text-[14px] font-bold text-carbon">{pendingPayment?.status === 'rejected' ? 'Your payment proof was not accepted' : 'Finish your Premium payment'}</p>
                  <p className="text-[12.5px] text-slate">{pendingPayment?.status === 'rejected' ? (pendingPayment.rejectionReason || 'Please upload a new receipt.') : 'Upload your transfer receipt to activate your membership.'}</p>
                </div>
                <Button variant="primary" size="md" onClick={() => setResuming(true)}>{pendingPayment?.status === 'rejected' ? 'Upload a new receipt' : 'Continue'}</Button>
              </>
            ) : underReview ? (
              <div><p className="text-[14px] font-bold text-carbon">Payment received - we are checking it</p><p className="text-[12.5px] text-slate">Usually within 24 hours. We will notify you once your membership is active.</p></div>
            ) : (
              <>
                <div><p className="text-[14px] font-bold text-carbon">You are an Edudeen Premium member</p><p className="text-[12.5px] text-slate">{membership?.daysLeft != null ? `${membership.daysLeft} days left in your current period.` : 'Thank you for being a member.'}</p></div>
                <Button variant="outline" size="md" to={'/account/premium'}>Manage membership</Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Benefits */}
      <section className="px-4 md:px-10 py-14">
        <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-10 max-w-[640px] mx-auto leading-tight" style={{ fontFamily: SERIF }}>
          Everything members get
        </h2>
        {plans === null ? (
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{[1, 2, 3].map(i => <SkeletonBox key={i} className="w-full h-[130px]" rounded="16px" />)}</div>
        ) : (
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefitCards.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white border border-bone p-6">
                <div className="size-10 rounded-xl bg-[#fff6d6] flex items-center justify-center mb-3"><Icon size={18} className="text-[#8a6100]" /></div>
                <p className="text-[15px] font-bold text-carbon mb-1">{title}</p>
                <p className="text-[13px] text-slate leading-[1.65]">{text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="px-4 md:px-10 pb-14">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-10" style={{ fontFamily: SERIF }}>How it works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { n: 1, t: 'Choose a plan', d: 'Pick monthly or yearly. Yearly costs less per month.' },
              { n: 2, t: 'Pay and upload your receipt', d: 'Transfer to Edudeen by bank or wallet and upload the receipt.' },
              { n: 3, t: 'Start saving', d: 'We activate your membership and member prices appear everywhere you shop.' },
            ].map(s => (
              <li key={s.n} className="relative rounded-2xl bg-white border border-bone p-6">
                <span className="size-9 rounded-full flex items-center justify-center text-[15px] font-bold text-white mb-3" style={{ background: NAVY }}>{s.n}</span>
                <p className="text-[15px] font-bold text-carbon mb-1">{s.t}</p>
                <p className="text-[13px] text-slate leading-[1.65]">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Plans */}
      <section id="premiumPlans" className="px-4 md:px-10 pb-14 scroll-mt-20">
        <h2 className="text-[26px] md:text-[32px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>
          Choose your <span className="text-brand-orange">plan</span>
        </h2>
        <div className="max-w-[820px] mx-auto">
          {plans === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">{[1, 2].map(i => <SkeletonBox key={i} className="w-full h-[300px]" rounded="16px" />)}</div>
          ) : plans.length === 0 ? (
            <p className="text-center text-[13px] text-slate">{error || 'Edudeen Premium is not available yet. Please check back soon.'}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
              {plans.map(p => {
                return (
                  <div key={p._id} className="relative rounded-2xl bg-white border border-[#f1d98a] p-7 flex flex-col shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <p className="text-[12px] font-bold tracking-[0.08em] uppercase text-slate flex items-center gap-1.5"><Crown size={13} className="text-[#8a6100]" aria-hidden /> {p.name}</p>
                      {interval === 'yearly' && p.yearlySavingsPercent > 0 && <span className="text-[12px] font-bold bg-success-bg text-success px-2 py-[2px] rounded">{`Save ${p.yearlySavingsPercent}%`}</span>}
                    </div>
                    {/* Both billing options are shown side by side; the chosen one is what the button buys. */}
                    <div role="radiogroup" aria-label={`${p.name} billing`} className="grid grid-cols-2 gap-3">
                      {(['monthly', 'yearly'] as const).map(iv => {
                        const { main: m, alt: a2 } = priceOf(p, iv);
                        const selected = interval === iv;
                        const perMonth = iv === 'yearly' && (currency === 'PKR' && p.yearlyPricePKR != null ? `${formatPrice(Math.round(p.yearlyPricePKR / 12), 'PKR')}` : `${formatPrice((p.yearlyPriceUSD / 12), 'USD')}`);
                        return (
                          <button key={iv} type="button" role="radio" aria-checked={selected} onClick={() => setInterval(iv)}
                            className={'relative text-start rounded-xl border-2 px-3.5 py-3 cursor-pointer transition-colors bg-white ' + (selected ? 'border-brand-orange shadow-[0_6px_16px_-10px_rgba(23,71,113,0.6)]' : 'border-bone hover:border-brand-orange/40')}>
                            {iv === 'yearly' && p.yearlySavingsPercent > 0 && (
                              <span className="absolute -top-2.5 end-2 text-[12px] font-bold bg-[#F4DC4C] text-[#152D43] px-2 py-[1px] rounded-full">{`Save ${p.yearlySavingsPercent}%`}</span>
                            )}
                            <span className="block text-[12px] font-bold uppercase tracking-[0.06em] text-slate mb-1">{iv === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                            <span className="block text-[22px] font-extrabold text-carbon leading-tight" style={{ fontFamily: SERIF }}>{m}</span>
                            <span className="block text-[12px] text-slate">{iv === 'monthly' ? 'per month' : 'per year'}</span>
                            {iv === 'yearly' && perMonth && <span className="block text-[12px] text-success font-semibold mt-0.5">{`≈ ${perMonth} / month`}</span>}
                            {a2 && <span className="block text-[12px] text-slate/80 mt-0.5">{`≈ ${a2}`}</span>}
                          </button>
                        );
                      })}
                    </div>
                    {p.description && <p className="text-[12.5px] text-slate leading-[1.6] mt-3">{p.description}</p>}
                    <ul className="flex flex-col gap-2.5 my-5 flex-1">
                      {planBenefitLines(p.benefits).map(b => (
                        <li key={b} className="flex items-start gap-2 text-[12.5px] text-charcoal"><Check size={14} className="text-success mt-[2px] shrink-0" />{b}</li>
                      ))}
                    </ul>
                    <Button variant="primary" size="md" fullWidth disabled={isStaff || underReview} onClick={() => choose(p)}>{`${ctaLabel} · ${interval === 'yearly' ? 'Yearly' : 'Monthly'}`}</Button>
                    {!loggedIn && <p className="text-[12px] text-slate text-center mt-2">You will be asked to log in first.</p>}
                    {isStaff && <p className="text-[12px] text-slate text-center mt-2">Switch to your buyer account to join.</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Free vs Premium */}
      {top && (
        <section className="px-4 md:px-10 pb-14">
          <div className="max-w-[820px] mx-auto">
            <h2 className="text-[24px] md:text-[28px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>Free vs Premium</h2>
            <div className="rounded-2xl bg-white border border-bone overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#f6f8fb] text-start">
                    <th scope="col" className="text-start px-5 py-3 font-semibold text-slate">Feature</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-slate">Free</th>
                    <th scope="col" className="px-4 py-3 font-bold text-[#8a6100]">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: 'Member prices on selected products', free: false, pro: true },
                    { f: 'Early access to sales', free: false, pro: top.earlyAccessHours > 0 },
                    { f: 'Personal monthly coupon', free: false, pro: top.monthlyCouponValue > 0 },
                    { f: 'Children profiles', free: '8', pro: String(top.childrenLimit) },
                    { f: 'Priority support', free: false, pro: top.prioritySupport },
                  ].filter(r => r.pro).map(r => (
                    <tr key={r.f} className="border-t border-bone">
                      <td className="px-5 py-3 text-charcoal">{r.f}</td>
                      <td className="px-4 py-3 text-center text-slate">{typeof r.free === 'string' ? r.free : r.free ? <Check size={16} className="inline text-success" /> : '—'}</td>
                      <td className="px-4 py-3 text-center font-semibold text-carbon">{typeof r.pro === 'string' ? r.pro : <Check size={16} className="inline text-success" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="px-4 md:px-10 pb-16">
        <h2 className="text-[24px] md:text-[28px] font-bold text-carbon text-center mb-8" style={{ fontFamily: SERIF }}>Questions</h2>
        <div className="max-w-[760px] mx-auto"><Accordion items={faqs} /></div>
        {!isPremium && !isStaff && plans && plans.length > 0 && (
          <div className="text-center mt-10">
            <Button variant="primary" size="lg" onClick={() => document.getElementById('premiumPlans')?.scrollIntoView({ behavior: 'smooth' })}>Get Premium</Button>
          </div>
        )}
      </section>

      <Footer />

      {buying && <PremiumCheckoutModal plan={buying} interval={interval} onClose={() => setBuying(null)} />}
      {resuming && pendingPayment && <PremiumCheckoutModal payment={pendingPayment} onClose={() => setResuming(false)} />}
    </div>
  );
}
