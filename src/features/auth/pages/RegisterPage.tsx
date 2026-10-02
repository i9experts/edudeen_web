import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRegister } from '@/hooks/auth/useRegister';
import { useSocialLogin } from '@/hooks/auth/useSocialLogin';
import { Button }      from '@/components/comman/ui/Button';
import { Input }       from '@/components/comman/ui/Input';
import { Avatar }      from '@/components/comman/ui/Avatar';
import { SocialLoginRow } from '@/components/comman/ui/SocialIcons';
import { Eye, EyeOff, ArrowRight, ShoppingBag, Store, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useForm }     from '@/hooks/useForm';
import { registerSchema, type RegisterFormData } from '@/utils/validation/schemas';
import { TokenStorage, getRoleRedirect, RememberedAccount, type AppRole } from '@/api/services/auth';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';
import { AuthSplitLayout } from '@/features/auth/components/AuthSplitLayout';
import { MarketplaceMockup, DashboardMockup } from '@/features/auth/components/mockups/AuthMockups';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { motion } from 'motion/react';

const fadeSlide = { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } };

const HIGHLIGHTS = [
  { Icon: ShoppingBag, text: 'Shop from thousands of independent sellers' },
  { Icon: Store,       text: 'Launch your own store in minutes' },
  { Icon: TrendingUp,  text: 'Grow your business with built-in analytics' },
];

// One screen, not three — the account type is decided by HOW someone got
// here, never asked twice: a "Sell on Edudeen" CTA arrives as
// /register?role=seller (that click already WAS the role decision), any
// other visit is a plain buyer sign-up. Socials + the full detail form live
// together on the same screen, Amazon/Shopify-style, instead of a
// role-picker step followed by a "choose how to continue" step.
//
// Same progressive-disclosure pattern as LoginPage: only the email field
// shows up front, with stacked social pills above it; the rest of the
// details (name/phone/address/password) only reveal once an email has
// actually been typed, at which point the socials collapse into a single
// compact row below the form instead.
//
// Shopify/Google-style account recognition: if this device has a
// `RememberedAccount` (see api/services/auth.ts — survives logout, it's a
// pure UX shortcut, never an identity check) matching the role this page is
// for, an account-picker row replaces the whole form up front instead —
// "Add new account" falls through to the normal sign-up flow above.
//
// Like LoginPage, the current phase lives in the URL (`?step=details`,
// `?new=1`) rather than only in component state, so it's a real navigation
// (back button, bookmarks/shared links) instead of state that resets the
// instant the page reloads.
// Business rule (frontend-only, deliberately reversible — mirrors
// LoginPage's SELLER_ONLY_LOGIN): registration on the web is seller-only
// right now. A plain /register visit used to default to a buyer sign-up
// (only `?role=seller`, e.g. from a "Sell on Edudeen" CTA, went straight to
// seller); that buyer path is hidden, not deleted — the backend register
// endpoint still accepts role:'user' unchanged, so flipping this back to
// false fully restores it with no other changes.
const SELLER_ONLY_REGISTER = false;

export function RegisterPage() {
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  usePageTitle('Register');
  const register  = useRegister();
  const [showPass, setShowPass] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const role: AppRole = SELLER_ONLY_REGISTER ? 'seller' : (searchParams.get('role') === 'seller' ? 'seller' : 'user');
  const social    = useSocialLogin(role);
  const isSeller = role === 'seller';
  const remembered = RememberedAccount.get();
  const explicitNewAccount = searchParams.get('new') === '1';
  const showChooser = !!remembered && remembered.role === role && !explicitNewAccount;
  const onDetailsStep = searchParams.get('step') === 'details';

  const { values, errors, set, blur, handleSubmit } = useForm(
    registerSchema,
    { name: '', email: '', password: '', phone: '', address: '', role },
    {
      onSubmit: async (data: RegisterFormData) => {
        await register.execute({
          name:     data.name,
          email:    data.email,
          password: data.password,
          phone:    data.phone,
          address:  data.address,
          role:     (data.role === 'seller' ? 'seller' : 'user'),
        });
      },
    },
  );

  // Already signed in — send them to wherever they actually belong instead
  // of showing a registration form to someone who doesn't need one.
  useEffect(() => {
    if (!TokenStorage.isLoggedIn()) return;
    const user = TokenStorage.getUser<{ role?: AppRole }>();
    if (user?.role === 'seller') {
      resolveSellerDestinationRemote().then(dest => navigate(dest, { replace: true }));
    } else {
      navigate(getRoleRedirect((user?.role ?? 'user') as AppRole), { replace: true });
    }
  }, [navigate]);

  const emailEntered = values.email.trim().length > 0;

  // The URL follows the reactive email-typed reveal as a `replace` (not a
  // new history entry, since it fires on every keystroke transition) —
  // "Add new account" below still gets its own real navigation entry.
  useEffect(() => {
    if (showChooser) return;
    if (emailEntered === onDetailsStep) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (emailEntered) next.set('step', 'details'); else next.delete('step');
      return next;
    }, { replace: true });
  }, [showChooser, emailEntered, onDetailsStep, setSearchParams]);

  const addNewAccount = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('new', '1');
      next.delete('step');
      return next;
    });
  }, [setSearchParams]);

  // Avoid a flash of the registration form for the (rare) already-signed-in
  // visitor while the effect above resolves their real destination.
  if (TokenStorage.isLoggedIn()) return null;

  return (
    <AuthSplitLayout
      panelGradient="from-carbon via-[#241f1b] to-brand-deep-orange"
      heading={isSeller
        ? <>Launch your <span className="text-brand-orange">store</span> today</>
        : <>Start <span className="text-brand-orange">selling</span> or shopping today</>}
      subtext="Create your free Edudeen account and join a growing community of buyers and creators."
      highlights={HIGHLIGHTS}
      maxWidth="max-w-[520px]"
      visual={isSeller ? <DashboardMockup /> : <MarketplaceMockup />}
    >
      <h1 className="text-[22px] font-bold text-carbon mb-1 text-center lg:text-start">
        {showChooser
          ? <>Welcome <span className="text-brand-orange">back</span></>
          : isSeller
            ? <>Create your <span className="text-brand-orange">seller</span> account</>
            : <>Create your <span className="text-brand-orange">account</span></>}
      </h1>
      <p className="text-[13px] text-slate mb-3 lg:mb-5 text-center lg:text-start">
        {showChooser ? 'Looks like you\'ve used Edudeen on this device before' : 'Sign up with email, or continue with a social account'}
      </p>

      {showChooser && remembered ? (
        <>
          {/* The whole row is the "continue" action, Google-account-picker
             style — clicking it goes straight to LoginPage's password step
             for this account, not a separate confirm click. */}
          <button
            type="button"
            onClick={() => navigate(isSeller ? '/login?role=seller' : '/login')}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-bone bg-white cursor-pointer text-start hover:border-brand-orange hover:bg-brand-pale-orange/20 transition-colors mb-3"
          >
            <Avatar name={remembered.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-carbon truncate">{remembered.name}</p>
              <p className="text-[12px] text-slate truncate">{remembered.email}</p>
            </div>
            <ArrowRight size={16} className="text-slate shrink-0" />
          </button>

          <Button
            variant="outline" size="md" fullWidth
            onClick={addNewAccount}
            className="mb-3 lg:mb-4"
          >
            Add new account
          </Button>
        </>
      ) : (
      <>
      {!emailEntered && (
        <>
          <SocialLoginRow
            layout="stacked"
            mount={social.mount} onProvider={social.signIn}
            disabled={social.loading}
            className="mb-3 lg:mb-4"
          />

          {social.error && (
            <motion.div role="status" className="flex items-center gap-2 rounded-lg bg-info-bg px-[14px] py-[10px] mb-3 text-[13px] text-info" {...fadeSlide}>
              <Info size={14} className="shrink-0" />
              <span>{social.error}</span>
            </motion.div>
          )}

          <div className="flex items-center gap-3 mb-3 lg:mb-4">
            <div className="flex-1 h-px bg-bone" />
            <span className="text-[11px] text-slate">or continue with email</span>
            <div className="flex-1 h-px bg-bone" />
          </div>
        </>
      )}

      <Input
        label="Email Address" type="email" placeholder="Enter Your Email Address" autoComplete="email"
        value={values.email} onChange={set('email')} onBlur={blur('email')}
        onKeyDown={e => e.key === 'Enter' && nameRef.current?.focus()}
        error={errors.email}
        autoFocus
      />

      {/* The rest of the details only show up once an email has actually
         been typed — same reveal LoginPage uses for its password field. */}
      {emailEntered && (
        <motion.div {...fadeSlide}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 lg:gap-3 mt-3">
            <Input
              ref={nameRef}
              label="Full Name" placeholder="Enter Your Name" autoComplete="name"
              value={values.name} onChange={set('name')} onBlur={blur('name')}
              error={errors.name}
            />
            <Input
              label="Phone Number" type="tel" placeholder="Enter Your Phone Number" autoComplete="tel"
              value={values.phone} onChange={set('phone')} onBlur={blur('phone')}
              error={errors.phone}
            />
            <Input
              label="Address" placeholder="Enter Your Address" autoComplete="street-address"
              value={values.address} onChange={set('address')} onBlur={blur('address')}
              error={errors.address}
            />
            <Input
              label="Password" type={showPass ? 'text' : 'password'} placeholder="Create a Password" autoComplete="new-password"
              value={values.password} onChange={set('password')} onBlur={blur('password')}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              error={errors.password}
              rightIcon={
                <button type="button" onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          <MagneticButton className="block mt-3 lg:mt-4">
            <Button
              variant="primary" size="md" fullWidth
              onClick={handleSubmit}
              loading={register.loading}
              iconRight={!register.loading && <ArrowRight size={14} />}
            >
              {isSeller ? 'Create Seller Account' : 'Create Buyer Account'}
            </Button>
          </MagneticButton>
        </motion.div>
      )}

      {register.error && (
        <motion.div role="alert" className="flex items-center gap-2 rounded-lg bg-error-bg px-[14px] py-[10px] mt-3 text-[13px] text-error" {...fadeSlide}>
          <AlertTriangle size={14} className="shrink-0" />
          <span>{register.error}</span>
        </motion.div>
      )}
      {!register.error && social.error && emailEntered && (
        <motion.div role="status" className="flex items-center gap-2 rounded-lg bg-info-bg px-[14px] py-[10px] mt-3 text-[13px] text-info" {...fadeSlide}>
          <Info size={14} className="shrink-0" />
          <span>{social.error}</span>
        </motion.div>
      )}

      {emailEntered && (
        <motion.div {...fadeSlide}>
          <div className="flex items-center gap-3 my-2.5 lg:my-4">
            <div className="flex-1 h-px bg-bone" />
            <span className="text-[11px] text-slate">or continue with</span>
            <div className="flex-1 h-px bg-bone" />
          </div>

          <SocialLoginRow
            mount={social.mount} onProvider={social.signIn}
            disabled={social.loading || register.loading}
            className="mb-3 lg:mb-4"
          />
        </motion.div>
      )}
      </>
      )}

      <p className="text-center text-[12px] text-slate mt-3">
        Already have an account?{' '}
        <Button variant="link" size="sm" onClick={() => navigate('/login')} className="font-semibold!">
          Sign In
        </Button>
      </p>
    </AuthSplitLayout>
  );
}
