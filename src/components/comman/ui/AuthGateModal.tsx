import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Info, Lock, Mail } from 'lucide-react';
import { apiLogin, TokenStorage, LastRolePreference, RememberedAccount, type AppRole } from '@/api/services/auth';
import { useSocialLogin } from '@/hooks/auth/useSocialLogin';
import { useRegister } from '@/hooks/auth/useRegister';
import { useForgotPassword } from '@/hooks/auth/useForgotPassword';
import { useForm } from '@/hooks/useForm';
import { loginSchema, registerSchema, forgotPasswordSchema, type LoginFormData, type RegisterFormData, type ForgotPasswordFormData } from '@/utils/validation/schemas';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { SocialLoginRow } from './SocialIcons';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

type Mode = 'login' | 'register' | 'forgot';

// Renders the "sign in to continue" prompt whenever a guest-only action
// (add to cart, wishlist, follow, message, checkout) gets gated by
// useAuthGate(). Signs in without ever navigating away — the gated action
// itself carries the user back to what they were doing, so browsing position
// is never lost and the intended action is never silently dropped. Also
// covers Create Account and Forgot Password as in-modal modes (switched via
// `mode` below) instead of bouncing out to the full-page routes for those —
// Register still hands off to the full-page OTP-verify step once submitted
// (unavoidable — a real one-time code has to be entered somewhere), Login
// never navigates anywhere at all.
export function AuthGateModal() {
  const location = useLocation();
  const { pending, cancel, resolve } = useAuthGate();
  // Buyer-only surface (cart/wishlist/follow/message/checkout gate) — matches
  // the hardcoded role: 'user' below. useSocialLogin defaults to 'seller' for
  // the (now seller-only) main LoginPage/RegisterPage, so this needs the
  // buyer role explicitly.
  const social = useSocialLogin('user');
  const register = useRegister();
  const forgot = useForgotPassword();

  const [mode, setMode] = useState<Mode>('login');
  const [remember, setRemember] = useState(true);

  // Local rather than reusing useLogin()'s loading/error — useLogin() also
  // navigates on success, which is exactly the "lose your position" behavior
  // this modal exists to avoid, so the submit here is handled by hand instead.
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loginForm = useForm<LoginFormData>(
    loginSchema,
    { email: '', password: '' },
    {
      onSubmit: async (data: LoginFormData) => {
        setSubmitError('');
        setSubmitting(true);
        try {
          const res = await apiLogin({ email: data.email, password: data.password, role: 'user' });
          const { token, user } = res.data;
          TokenStorage.save(token.accessToken, token.refreshToken, remember);
          TokenStorage.saveUser(user);
          LastRolePreference.set((user.role ?? 'user') as AppRole);
          RememberedAccount.set({ name: (user as { name?: string }).name ?? '', email: data.email, role: 'user', image: null });
          loginForm.reset();
          resolve();
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
        } finally {
          setSubmitting(false);
        }
      },
    },
  );

  const registerForm = useForm<RegisterFormData>(
    registerSchema,
    { name: '', email: '', password: '', phone: '', address: '', role: 'user' },
    {
      onSubmit: async (data: RegisterFormData) => {
        // useRegister() navigates to /verify-otp on success — the one point
        // this modal can't avoid a page transition, since a real one-time
        // code has to be entered somewhere. It closes itself via `cancel()`
        // right before that happens so it isn't still open underneath.
        await register.execute({ name: data.name, email: data.email, password: data.password, phone: data.phone, address: data.address, role: 'user' });
      },
    },
  );

  const forgotForm = useForm<ForgotPasswordFormData>(
    forgotPasswordSchema,
    { email: '' },
    {
      onSubmit: async (data: ForgotPasswordFormData) => {
        await forgot.execute(data.email, 'user');
      },
    },
  );

  // register.execute()/forgot.execute() both navigate to /verify-otp on
  // success. AuthGateModal is mounted at RootLayout level (outlives every
  // route change), so without this it would stay open, stranded on top of
  // the new page — dismiss it the moment that navigation actually lands,
  // rather than guessing from loading/error state (which can't distinguish
  // "still submitting" from "succeeded and navigated away").
  useEffect(() => {
    if ((mode === 'register' || mode === 'forgot') && location.pathname === '/verify-otp') {
      cancel();
      // Resetting back to the default mode here is a one-off reaction to a
      // real external event (the route just changed under us), not a value
      // derivable from render — the legitimate case set-state-in-effect
      // still allows.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode('login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, mode]);

  if (!pending) return null;

  const close = () => {
    cancel();
    loginForm.reset();
    registerForm.reset();
    forgotForm.reset();
    setSubmitError('');
    setMode('login');
  };

  const switchMode = (next: Mode) => {
    setSubmitError('');
    setMode(next);
  };

  return (
    <Modal
      title={mode === 'login' ? 'Sign in to continue' : mode === 'register' ? 'Create your account' : 'Reset your password'}
      onClose={close}
      width={420}
    >
      <div className="flex flex-col gap-4">
        {mode !== 'forgot' && (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-[14px] bg-brand-pale-orange">
            <span className="flex items-center justify-center size-9 rounded-full bg-white shrink-0">
              <Lock size={16} className="text-brand-orange" />
            </span>
            <p className="text-[12.5px] text-charcoal leading-[1.5]">{pending.reason}</p>
          </div>
        )}

        {mode === 'login' && (
          <>
            <form onSubmit={loginForm.handleSubmit} className="flex flex-col gap-2.5">
              <Input
                type="email"
                placeholder="Email address"
                value={loginForm.values.email}
                onChange={loginForm.set('email')}
                onBlur={loginForm.blur('email')}
                error={loginForm.errors.email}
                autoComplete="email"
                autoFocus
              />
              <Input
                type="password"
                placeholder="Password"
                value={loginForm.values.password}
                onChange={loginForm.set('password')}
                onBlur={loginForm.blur('password')}
                error={loginForm.errors.password}
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between mt-0.5">
                <label className="flex items-center gap-2 text-[12px] text-slate cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="size-[15px] rounded accent-brand-orange cursor-pointer"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[12px] font-medium text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:text-brand-deep-orange transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {submitError && (
                <p className="text-[11.5px] text-error flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {submitError}</p>
              )}

              <Button type="submit" variant="primary" size="md" pill fullWidth loading={submitting} className="justify-center mt-1">
                Sign In
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-bone" />
              <span className="text-[10px] text-slate whitespace-nowrap">or continue with</span>
              <div className="flex-1 h-px bg-bone" />
            </div>
            <SocialLoginRow mount={social.mount} disabled={submitting} />
            {social.error && (
              <p className="text-[11.5px] text-info flex items-start gap-1">
                <Info size={12} className="shrink-0 mt-[1px]" /> {social.error}
              </p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-bone -mx-5 px-5 -mb-4 pb-4">
              <button type="button" onClick={close} className="text-[12px] font-medium text-slate bg-transparent border-none cursor-pointer p-0 hover:text-charcoal transition-colors">
                Cancel
              </button>
              <button type="button" onClick={() => switchMode('register')} className="text-[12px] font-medium text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:text-brand-deep-orange transition-colors">
                Create Account
              </button>
            </div>
          </>
        )}

        {mode === 'register' && (
          <>
            <form onSubmit={registerForm.handleSubmit} className="flex flex-col gap-2.5">
              <Input
                type="email"
                placeholder="Email address"
                value={registerForm.values.email}
                onChange={registerForm.set('email')}
                onBlur={registerForm.blur('email')}
                error={registerForm.errors.email}
                autoComplete="email"
                autoFocus
              />
              <Input
                placeholder="Full name"
                value={registerForm.values.name}
                onChange={registerForm.set('name')}
                onBlur={registerForm.blur('name')}
                error={registerForm.errors.name}
                autoComplete="name"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={registerForm.values.phone}
                  onChange={registerForm.set('phone')}
                  onBlur={registerForm.blur('phone')}
                  error={registerForm.errors.phone}
                  autoComplete="tel"
                />
                <Input
                  placeholder="Address"
                  value={registerForm.values.address}
                  onChange={registerForm.set('address')}
                  onBlur={registerForm.blur('address')}
                  error={registerForm.errors.address}
                  autoComplete="street-address"
                />
              </div>
              <Input
                type="password"
                placeholder="Create a password"
                value={registerForm.values.password}
                onChange={registerForm.set('password')}
                onBlur={registerForm.blur('password')}
                error={registerForm.errors.password}
                autoComplete="new-password"
              />

              {register.error && (
                <p className="text-[11.5px] text-error flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {register.error}</p>
              )}

              <Button type="submit" variant="primary" size="md" pill fullWidth loading={register.loading} className="justify-center mt-1">
                Create Account
              </Button>

              <p className="text-[11px] text-slate text-center leading-[1.5]">
                By creating an account you agree to our{' '}
                <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:text-brand-deep-orange">Terms</a>{' '}and{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:text-brand-deep-orange">Privacy Policy</a>.
              </p>
            </form>

            <div className="flex items-center justify-center pt-1 border-t border-bone -mx-5 px-5 -mb-4 pb-4">
              <button type="button" onClick={() => switchMode('login')} className="text-[12px] font-medium text-slate bg-transparent border-none cursor-pointer p-0 hover:text-charcoal transition-colors">
                Already have an account? <span className="text-brand-orange font-semibold">Sign In</span>
              </button>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-[14px] bg-brand-pale-orange">
              <span className="flex items-center justify-center size-9 rounded-full bg-white shrink-0">
                <Mail size={16} className="text-brand-orange" />
              </span>
              <p className="text-[12.5px] text-charcoal leading-[1.5]">We'll email you a code to reset your password.</p>
            </div>
            <form onSubmit={forgotForm.handleSubmit} className="flex flex-col gap-2.5">
              <Input
                type="email"
                placeholder="Email address"
                value={forgotForm.values.email}
                onChange={forgotForm.set('email')}
                onBlur={forgotForm.blur('email')}
                error={forgotForm.errors.email}
                autoComplete="email"
                autoFocus
              />
              {forgot.error && (
                <p className="text-[11.5px] text-error flex items-center gap-1"><AlertTriangle size={12} className="shrink-0" /> {forgot.error}</p>
              )}
              <Button type="submit" variant="primary" size="md" pill fullWidth loading={forgot.loading} className="justify-center mt-1">
                Send Reset Code
              </Button>
            </form>
            <div className="flex items-center justify-center pt-1 border-t border-bone -mx-5 px-5 -mb-4 pb-4">
              <button type="button" onClick={() => switchMode('login')} className="text-[12px] font-medium text-slate bg-transparent border-none cursor-pointer p-0 hover:text-charcoal transition-colors">
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
