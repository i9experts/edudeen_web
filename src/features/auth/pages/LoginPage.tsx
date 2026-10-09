import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { safeRedirectPath } from '@/utils/safeRedirect';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLogin } from '@/hooks/auth/useLogin';
import { useSocialLogin } from '@/hooks/auth/useSocialLogin';
import { Button } from '@/components/comman/ui/Button';
import { Input } from '@/components/comman/ui/Input';
import { Avatar } from '@/components/comman/ui/Avatar';
import { SocialLoginRow } from '@/components/comman/ui/SocialIcons';
import { Eye, EyeOff, ShieldCheck, Sparkles, Zap, AlertTriangle, Info, ArrowLeft, ChevronRight, UserPlus } from 'lucide-react';
import { useForm } from '@/hooks/useForm';
import { loginSchema, type LoginFormData } from '@/utils/validation/schemas';
import { TokenStorage, LastRolePreference, RememberedAccount, getRoleRedirect, type AppRole } from '@/api/services/auth';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';
import { AuthSplitLayout } from '@/features/auth/components/AuthSplitLayout';
import { MarketplaceMockup } from '@/features/auth/components/mockups/AuthMockups';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { motion } from 'motion/react';

const fadeSlide = { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } };

const HIGHLIGHTS = [
  { Icon: Sparkles,    text: 'Curated marketplace of independent creators' },
  { Icon: Zap,         text: 'Fast checkout, real-time order tracking' },
  { Icon: ShieldCheck, text: 'Secure payments on every purchase' },
];

// Three possible openings, exactly mirroring Google's real account-chooser
// flow (see RememberedAccount, api/services/auth.ts — a device-local UX
// shortcut, never an identity check). The current phase lives in the URL
// itself (`?step=password`, matching Google's own .../identifier vs .../pwd
// URL split) rather than only in component state — every explicit step
// change (picking an account, going back, adding a new account) is a real
// navigation with its own history entry, so the browser back button and a
// bookmarked/shared link both land on the right phase instead of always
// resetting to step one:
//  1. No `step` param, a RememberedAccount exists → an account-picker
//     screen: the account as one clickable row (avatar + name + email) plus
//     a real "Add new account" button below it — nothing else.
//  2. `?step=password` (that row was clicked) → the account becomes a small
//     locked summary at the top, with just the password field + Sign In
//     button below it.
//  3. `?new=1` (no remembered account, or "Add new account" was clicked) →
//     the fresh flow: stacked social pills, then a single email field, with
//     `?step=password` following automatically once an email has actually
//     been typed (Google-style progressive disclosure) rather than showing
//     both at once — that particular transition uses `replace` so typing
//     doesn't spam browser history.
// Business rule (frontend-only, deliberately reversible): the web login form
// only ever signs in as a seller today — buyer login is hidden, not deleted,
// since it may come back later. Flip SELLER_ONLY_LOGIN back to false to
// restore the old buyer/seller inline toggle below with zero other changes.
const SELLER_ONLY_LOGIN = false;

// Which account (buyer vs seller) to sign into is picked via a small inline
// toggle rather than a separate role-choice step, since it only matters for
// disambiguating which backend collection to query (a buyer and seller
// account can share the same email) — hidden while SELLER_ONLY_LOGIN is true.
export function LoginPage() {
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));
  usePageTitle('Login');
  const login      = useLogin();
  // Defaults to whichever role this device last registered/logged in as —
  // previously always hardcoded to "Buyer", so a seller who forgot to flip
  // the toggle got a misleading "Invalid email or password" (their account
  // lives in a different collection than the one being queried). A `?role=`
  // param (e.g. the "Continue as X" button on RegisterPage's account
  // chooser) wins over both when present. Locked to 'seller' while
  // SELLER_ONLY_LOGIN is true, regardless of any of the above.
  const queryRole = searchParams.get('role') === 'seller' ? 'seller' : searchParams.get('role') === 'user' ? 'user' : null;
  const remembered = RememberedAccount.get();
  const [role, setRole]           = useState<AppRole>(() => SELLER_ONLY_LOGIN ? 'seller' : (queryRole ?? remembered?.role ?? LastRolePreference.get()));
  const social     = useSocialLogin(role);
  const [showPass, setShowPass]   = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const explicitNewAccount = searchParams.get('new') === '1';
  // A remembered buyer account can't drive the chooser while SELLER_ONLY_LOGIN
  // is locked to 'seller' — the chooser would sign the password step in
  // against the wrong collection. Falls through to the normal fresh-email
  // seller flow instead.
  const showChooser = !!remembered && !explicitNewAccount && (!SELLER_ONLY_LOGIN || remembered.role === 'seller');
  const onPasswordStep = searchParams.get('step') === 'password';

  const { values, errors, set, setValue, blur, handleSubmit } = useForm(
    loginSchema,
    { email: remembered?.email ?? '', password: '' },
    {
      onSubmit: async (data: LoginFormData) => {
        await login.execute({ email: data.email, password: data.password, role }, redirectTo);
      },
    },
  );

  // Already signed in — send them to wherever they actually belong instead
  // of showing a login form to someone who doesn't need one.
  useEffect(() => {
    if (!TokenStorage.isLoggedIn()) return;
    const user = TokenStorage.getUser<{ role?: AppRole }>();
    if (user?.role === 'seller') {
      resolveSellerDestinationRemote().then(dest => navigate(dest, { replace: true }));
    } else {
      navigate(redirectTo || getRoleRedirect((user?.role ?? 'user') as AppRole), { replace: true });
    }
  }, [navigate, redirectTo]);

  const freshEmailEntered = values.email.trim().length > 0;
  // What actually gates rendering the password step: in the chooser flow
  // that's purely the URL (a click already fired before this renders, so
  // there's no lag); in the fresh-typing flow it's the raw typed value
  // directly, so the field appears on the very same keystroke instead of
  // waiting a render cycle for the URL-sync effect below to catch up.
  const showPasswordStep = showChooser ? onPasswordStep : freshEmailEntered;
  // The remembered account picked in the chooser might have no password at
  // all — it signed in via Google last time. Asking for a password it never
  // had would just strand the visitor, so this path skips straight to
  // "Continue with Google" instead of the password field.
  const socialMethod = remembered?.authMethod && remembered.authMethod !== 'password' ? remembered.authMethod : null;
  const googleOnlyContinue = showChooser && onPasswordStep && !!socialMethod;

  // Fresh flow only: the URL follows the reactive email-typed reveal (for
  // back-button/shareable-link purposes), as a `replace` (not a new history
  // entry) since it fires on every keystroke transition rather than a
  // deliberate click — an explicit navigation (picking an account, going
  // back, adding a new account) still gets its own real entry via the
  // handlers below.
  useEffect(() => {
    if (showChooser) return;
    if (freshEmailEntered === onPasswordStep) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (freshEmailEntered) next.set('step', 'password'); else next.delete('step');
      return next;
    }, { replace: true });
  }, [showChooser, freshEmailEntered, onPasswordStep, setSearchParams]);

  // The saved account remembers which kind of account it was; picking it signs in as that role
  // (the buyer/seller switch stays available on the password step for people with both).
  const selectAccount = useCallback(() => {
    if (remembered?.role) setRole(remembered.role);
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('step', 'password'); return next; });
  }, [setSearchParams, remembered?.role]);

  const backToPicker = useCallback(() => {
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('step'); return next; });
  }, [setSearchParams]);

  const useDifferentAccountHandler = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('new', '1');
      next.delete('step');
      return next;
    });
    setValue('email', '');
  }, [setSearchParams, setValue]);

  // "Sign in as" — a clear Buyer | Seller choice (one email can own both accounts).
  const roleSwitcher = !SELLER_ONLY_LOGIN ? (
    <div className="mb-3 lg:mb-4">
      <p className="text-[12px] text-slate mb-1.5 text-center lg:text-start">Sign in as</p>
      <div role="radiogroup" aria-label="Sign in as" className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-cream border border-bone">
        {(['user', 'seller'] as const).map(r => (
          <button
            key={r} type="button" role="radio" aria-checked={role === r}
            onClick={() => setRole(r)}
            className={`py-[7px] rounded-md text-[12.5px] font-semibold cursor-pointer border-none transition-colors ${role === r ? 'bg-white text-brand-orange shadow-sm' : 'bg-transparent text-slate hover:text-carbon'}`}
          >
            {r === 'user' ? 'Buyer' : 'Seller'}
          </button>
        ))}
      </div>
      <p className="text-[12px] text-slate mt-1.5 text-center lg:text-start">
        Store team?{' '}
        <button type="button" onClick={() => navigate('/admin/login')} className="text-brand-orange font-semibold cursor-pointer bg-transparent border-none p-0">Admin sign in</button>
      </p>
    </div>
  ) : null;
  // Signed in (the redirect effect above is already moving them on). Must stay
  // AFTER every hook — returning before the useCallbacks above crashed the
  // page with "Rendered fewer hooks than expected" the moment login succeeded.
  if (TokenStorage.isLoggedIn()) return null;

  return (
    <AuthSplitLayout
      heading={<>Commerce. <span className="text-[#9CCBF2]">Solved</span></>}
      subtext="Join the teachers, parents and educators buying and selling learning resources on Edudeen."
      highlights={HIGHLIGHTS}
      visual={<MarketplaceMockup />}
    >
      <h1 className="text-[20px] font-bold text-carbon mb-1 text-center lg:text-start">
        <span className="text-brand-orange">Sign in</span> to Edudeen
      </h1>
      <p className="text-[12.5px] text-slate mb-1 text-center lg:text-start">
        {showChooser && !onPasswordStep ? 'Choose an account to continue' : 'Enter your details to continue'}
      </p>

      {showChooser ? (
        onPasswordStep ? (
          <>
            {/* Locked-in summary once the account row has been picked — same
               identity, no longer clickable, with a way back to the picker. */}
            <button
              type="button"
              onClick={backToPicker}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-bone bg-cream mb-3 text-start cursor-pointer hover:border-slate/40 transition-colors"
            >
              <ArrowLeft size={14} className="text-slate shrink-0" />
              <Avatar name={remembered!.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-carbon truncate">{remembered!.name}</p>
                <p className="text-[12px] text-slate truncate">{remembered!.email} · {remembered!.role === 'seller' ? 'Seller account' : 'Buyer account'}</p>
              </div>
            </button>
            {roleSwitcher}
          </>
        ) : (
          <>
            {/* Step 1 — picker only: the account as one clickable row, plus a
               real "Add new account" button. Nothing else on this screen. */}
            <button
              type="button"
              onClick={selectAccount}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-bone bg-white cursor-pointer text-start hover:border-brand-orange hover:bg-brand-pale-orange/20 transition-colors mb-3"
            >
              <Avatar name={remembered!.name} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-carbon truncate">{remembered!.name}</p>
                <p className="text-[12px] text-slate truncate">{remembered!.email} · {remembered!.role === 'seller' ? 'Seller account' : 'Buyer account'}</p>
              </div>
              <ChevronRight size={16} className="text-slate shrink-0" />
            </button>

            <Button
              variant="outline" size="md" fullWidth
              onClick={useDifferentAccountHandler}
              icon={<UserPlus size={14} />}
              className="mb-3 lg:mb-4"
            >
              Add new account
            </Button>
          </>
        )
      ) : (
        <>
          {roleSwitcher}

          {/* Before an email is typed: full stacked social pills, one per
             row. Once the password field appears, the socials collapse into
             a single compact row and move below the form instead. */}
          {!freshEmailEntered && (
            <>
              <SocialLoginRow
                layout="stacked"
                mount={social.mount} onProvider={social.signIn}
                disabled={social.loading}
                className="mb-3 lg:mb-4"
              />

              {/* Not a failure — a known, honestly-labeled unavailable
                 feature — so it gets the neutral "info" treatment instead of
                 the red error one. */}
              {social.error && (
                <motion.div role="status" className="flex items-center gap-2 rounded-lg bg-info-bg px-[14px] py-[10px] mb-3 text-[13px] text-info" {...fadeSlide}>
                  <Info size={14} className="shrink-0" />
                  <span>{social.error}</span>
                </motion.div>
              )}

              <div className="flex items-center gap-3 mb-3 lg:mb-4">
                <div className="flex-1 h-px bg-bone" />
                <span className="text-[12px] text-slate">or continue with email</span>
                <div className="flex-1 h-px bg-bone" />
              </div>
            </>
          )}

          <Input
            id="login-email"
            label="Email Address"
            type="email" placeholder="Enter Your Email Address" autoComplete="email"
            value={values.email} onChange={set('email')} onBlur={blur('email')}
            onKeyDown={e => e.key === 'Enter' && passwordRef.current?.focus()}
            error={errors.email}
            autoFocus
          />
        </>
      )}

      {/* Password — shown once an identity is locked in, whichever path got
         us there. Skipped entirely for a remembered account that signed in
         via Google last time (see googleOnlyContinue above) — it has no
         password to ask for. */}
      {showPasswordStep && (
        <motion.div className="mt-3" {...fadeSlide}>
          {googleOnlyContinue ? (
            <>
              <p className="text-[12.5px] text-slate text-center mb-3">
                This account signs in with {socialMethod === 'facebook' ? 'Facebook' : socialMethod === 'apple' ? 'Apple' : 'Google'}.
              </p>
              <SocialLoginRow
                mount={social.mount} onProvider={social.signIn}
                disabled={social.loading}
              />
              {social.error && (
                <motion.div role="alert" className="flex items-center gap-2 rounded-lg bg-error-bg px-[14px] py-[10px] mt-3 text-[13px] text-error" {...fadeSlide}>
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{social.error}</span>
                </motion.div>
              )}
            </>
          ) : (
            <>
              <Input
                ref={passwordRef}
                id="login-password"
                label="Password"
                type={showPass ? 'text' : 'password'} placeholder="Enter Your Password" autoComplete="current-password"
                value={values.password} onChange={set('password')} onBlur={blur('password')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                error={errors.password}
                // Only steal focus here when we arrived via the account picker
                // (nothing else was focused) — in the fresh-email flow this
                // field mounts the instant the FIRST character is typed into
                // email, so auto-focusing it there would yank focus away
                // mid-keystroke. The email field's own Enter-key handler covers
                // that jump instead.
                autoFocus={showChooser}
                rightIcon={
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    className="bg-transparent border-none cursor-pointer text-slate p-0 flex hover:text-charcoal transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <div className="flex justify-end mt-2">
                <Button variant="link" size="sm" onClick={() => navigate('/forgot-password')}>
                  Forgot password?
                </Button>
              </div>

              <MagneticButton className="block mt-3 lg:mt-4">
                <Button variant="primary" size="md" fullWidth onClick={handleSubmit} loading={login.loading}>
                  Sign In
                </Button>
              </MagneticButton>

              {login.error && (
                <motion.div role="alert" className="flex items-center gap-2 rounded-lg bg-error-bg px-[14px] py-[10px] mt-3 text-[13px] text-error" {...fadeSlide}>
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{login.error}</span>
                </motion.div>
              )}
              {!login.error && social.error && (
                <motion.div role="status" className="flex items-center gap-2 rounded-lg bg-info-bg px-[14px] py-[10px] mt-3 text-[13px] text-info" {...fadeSlide}>
                  <Info size={14} className="shrink-0" />
                  <span>{social.error}</span>
                </motion.div>
              )}

              <div className="flex items-center gap-3 my-2.5 lg:my-4">
                <div className="flex-1 h-px bg-bone" />
                <span className="text-[12px] text-slate">or continue with</span>
                <div className="flex-1 h-px bg-bone" />
              </div>

              <SocialLoginRow
                mount={social.mount} onProvider={social.signIn}
                disabled={social.loading || login.loading}
                className="mb-3 lg:mb-4"
              />
            </>
          )}
        </motion.div>
      )}

      {/* Covers the "account doesn't exist" case without a real
         pre-check — a failed sign-in still lands right next to this. */}
      <p className="text-center text-[12px] text-slate mt-3">
        New to Edudeen?{' '}
        <Button variant="link" size="sm" onClick={() => navigate('/register')} className="font-semibold!">
          Create an account
        </Button>
      </p>
    </AuthSplitLayout>
  );
}
