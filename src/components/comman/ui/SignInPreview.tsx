import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, User, ShoppingBag, Heart, MessageSquare, X,
} from 'lucide-react';
import { useLogin } from '@/hooks/auth/useLogin';
import { useSocialLogin } from '@/hooks/auth/useSocialLogin';
import { useForm } from '@/hooks/useForm';
import { loginSchema, type LoginFormData } from '@/utils/validation/schemas';
import { useDropdownPosition } from '@/hooks/useDropdownPosition';
import { SocialLoginRow } from './SocialIcons';
import { Input } from './Input';
import { Button } from './Button';

const QUICK_LINKS = [
  { Icon: ShoppingBag,   label: 'Orders'   },
  { Icon: Heart,         label: 'Wishlist' },
  { Icon: MessageSquare, label: 'Messages' },
];

const CLOSE_DELAY_MS = 150;

// Alibaba-style hover preview: hovering "Sign In" opens a quick-login panel
// (desktop only — touch devices have no hover, so mobile keeps the plain link).
// Closes on mouse-leave (same delayed-close pattern as MiniCart/MiniWishlist,
// re-checked on both the trigger and the portaled panel so moving between the
// two never closes it) as well as on outside click/Escape.
export function SignInPreview() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [remember, setRemember] = useState(true);
  const pos = useDropdownPosition(ref, open);

  const login  = useLogin();
  // Buyer-only quick sign-in preview — matches the hardcoded role: 'user'
  // below. useSocialLogin defaults to 'seller' for the (now seller-only) main
  // LoginPage, so this needs the buyer role explicitly.
  const social = useSocialLogin('user');

  const { values, errors, set, blur, handleSubmit } = useForm(
    loginSchema,
    { email: '', password: '' },
    {
      onSubmit: async (data: LoginFormData) => {
        await login.execute({ email: data.email, password: data.password, role: 'user' });
      },
    },
  );

  const clearCloseTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { clearCloseTimer(); closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS); };
  const openNow = useCallback(() => { clearCloseTimer(); setOpen(true); }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <div ref={ref} className="relative hidden md:block" onMouseEnter={openNow} onMouseLeave={scheduleClose}>
      <Button variant="primary" size="sm" onClick={() => navigate('/login')}>
        Sign In
      </Button>

      {open && createPortal(
        <div
          ref={panelRef}
          onMouseEnter={() => { clearCloseTimer(); setOpen(true); }}
          onMouseLeave={scheduleClose}
          style={pos}
          className="dropdown-enter fixed z-[9999] w-[320px] max-w-[calc(100vw-2rem)]"
        >
          <div className="absolute -top-[7px] w-3 h-3 bg-white border-t border-l border-bone rotate-45" style={{ left: pos.arrowLeft }} />
          <div className="relative bg-white border border-bone rounded-[16px] overflow-hidden flex flex-col">

          {/* Header — avatar + welcome */}
          <div className="relative flex items-center gap-3 px-4 pt-4 pb-3 bg-gradient-to-br from-cream to-white border-b border-bone">
            <div className="w-11 h-11 rounded-full bg-brand-pale-orange border-2 border-white flex items-center justify-center shrink-0">
              <User size={19} className="text-brand-deep-orange" />
            </div>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-carbon leading-tight">Welcome to Edudeen</p>
              <p className="text-[11px] text-slate mt-[2px]">Sign in to unlock your account</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 w-6 h-6 rounded-md flex items-center justify-center bg-transparent border-none cursor-pointer text-slate hover:bg-white/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <X size={13} />
            </button>
          </div>

          {/* Quick account links — preview of what's behind sign-in */}
          <div className="grid grid-cols-3 gap-1 px-3 pt-3">
            {QUICK_LINKS.map(({ Icon, label }) => (
              <button
                key={label}
                onClick={() => navigate('/login')}
                className="flex flex-col items-center gap-1 py-2 rounded-[10px] bg-transparent border-none cursor-pointer text-slate hover:bg-cream hover:text-brand-orange transition-colors"
              >
                <Icon size={16} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-bone mx-4 my-3" />

          {/* Mini login form */}
          <form onSubmit={handleSubmit} className="px-4 flex flex-col gap-2.5">
            <Input
              type="email"
              placeholder="Email address"
              value={values.email}
              onChange={set('email')}
              onBlur={blur('email')}
              error={errors.email}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={values.password}
              onChange={set('password')}
              onBlur={blur('password')}
              error={errors.password}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-[6px] text-[11px] text-slate cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-[13px] h-[13px] accent-brand-orange cursor-pointer"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] font-medium text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:text-brand-deep-orange transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {login.error && (
              <p className="text-[11px] text-error flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> {login.error}</p>
            )}

            <Button type="submit" variant="primary" size="md" pill fullWidth loading={login.loading} className="justify-center mt-1">
              Sign In
            </Button>
          </form>

          {/* Social login */}
          <div className="flex items-center gap-2 px-4 my-3">
            <div className="flex-1 h-px bg-bone" />
            <span className="text-[10px] text-slate whitespace-nowrap">or continue with</span>
            <div className="flex-1 h-px bg-bone" />
          </div>
          <div className="px-4 pb-2">
            <SocialLoginRow layout="stacked" mount={social.mount} onProvider={social.signIn} disabled={login.loading} />
          </div>

          {social.error && (
            <p className="text-[11px] text-error px-4 pb-3 flex items-start gap-1">
              <AlertTriangle size={11} className="shrink-0 mt-[1px]" /> {social.error}
            </p>
          )}

          {/* Footer */}
          <div className="px-4 pb-4 pt-3 border-t border-bone flex items-center justify-between">
            <button
              onClick={() => navigate('/register')}
              className="text-[11.5px] font-medium text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:text-brand-deep-orange transition-colors"
            >
              Create account
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-[11.5px] font-medium text-slate bg-transparent border-none cursor-pointer p-0 hover:text-charcoal transition-colors flex items-center gap-1"
            >
              Full sign in <ArrowRight size={11} />
            </button>
          </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
