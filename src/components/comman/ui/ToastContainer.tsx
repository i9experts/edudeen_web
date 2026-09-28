import {
  CheckCircle2, AlertTriangle, Info, X,
  ShoppingBag, Heart, Package, Star, Gift, MapPin,
  CreditCard, MessageCircle, Store, LogIn, LogOut, KeyRound, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToastList, TOAST_DURATION_MS, type ToastVariant } from '@/contexts/ToastContext';

interface ToastStyle {
  icon:   LucideIcon;
  tint:   string; // icon chip background + icon color
  accent: string; // left bar + progress bar fill
  shadow: string; // color-matched drop shadow
}

const BASE: Record<ToastVariant, ToastStyle> = {
  success: { icon: CheckCircle2, tint: 'bg-success-bg text-success', accent: 'bg-success', shadow: 'shadow-[0_14px_32px_-12px_rgba(45,138,78,0.38)]' },
  error:   { icon: AlertTriangle, tint: 'bg-error-bg text-error',   accent: 'bg-error',   shadow: 'shadow-[0_14px_32px_-12px_rgba(193,48,48,0.38)]' },
  info:    { icon: Info,          tint: 'bg-info-bg text-info',     accent: 'bg-info',    shadow: 'shadow-[0_14px_32px_-12px_rgba(26,114,194,0.38)]' },
};

const ORANGE: ToastStyle = { icon: ShoppingBag, tint: 'bg-brand-pale-orange text-brand-deep-orange', accent: 'bg-brand-orange', shadow: 'shadow-[0_14px_32px_-12px_rgba(23,71,113,0.38)]' };
const VIOLET: ToastStyle = { icon: ShieldCheck, tint: 'bg-accent-violet-bg text-accent-violet',      accent: 'bg-accent-violet', shadow: 'shadow-[0_14px_32px_-12px_rgba(124,58,237,0.32)]' };
const AMBER:  ToastStyle = { icon: Star,        tint: 'bg-warning-bg text-warning',                  accent: 'bg-warning',       shadow: 'shadow-[0_14px_32px_-12px_rgba(192,139,30,0.38)]' };
const BLUE:   ToastStyle = { icon: Package,     tint: 'bg-info-bg text-info',                        accent: 'bg-info',          shadow: 'shadow-[0_14px_32px_-12px_rgba(26,114,194,0.38)]' };
const GREEN:  ToastStyle = { icon: CreditCard,  tint: 'bg-success-bg text-success',                  accent: 'bg-success',       shadow: 'shadow-[0_14px_32px_-12px_rgba(45,138,78,0.38)]' };

// Each rule keys off the human copy call sites already pass to
// toast.success/info (e.g. 'Added to cart', 'Review submitted') so every
// buyer action gets its own icon + accent instead of one flat green/blue —
// deliberately built only from colors already in the theme (brand-orange,
// accent-violet, warning, info, success) rather than inventing new ones.
// A failed action (toast.error) always keeps the plain red alert styling
// below — severity is never softened by a "themed" color.
const CATEGORY_RULES: { test: RegExp; style: ToastStyle; icon: LucideIcon }[] = [
  { test: /wishlist/i,                                        style: VIOLET, icon: Heart },
  { test: /cart/i,                                             style: ORANGE, icon: ShoppingBag },
  { test: /following|unfollowed|store/i,                       style: ORANGE, icon: Store },
  { test: /order|return/i,                                     style: BLUE,   icon: Package },
  { test: /seller (blocked|unblocked)|conversation|chat/i,     style: BLUE,   icon: MessageCircle },
  { test: /review/i,                                           style: AMBER,  icon: Star },
  { test: /reward|redeem/i,                                    style: AMBER,  icon: Gift },
  { test: /address/i,                                          style: VIOLET, icon: MapPin },
  { test: /account|security|password/i,                        style: VIOLET, icon: ShieldCheck },
  { test: /code resent/i,                                      style: VIOLET, icon: KeyRound },
  { test: /logged out/i,                                       style: VIOLET, icon: LogOut },
  { test: /logged in/i,                                        style: VIOLET, icon: LogIn },
  { test: /plan|subscription|credit/i,                         style: GREEN,  icon: CreditCard },
];

function resolveStyle(variant: ToastVariant, message: string): ToastStyle {
  if (variant === 'error') return BASE.error;
  const match = CATEGORY_RULES.find(r => r.test.test(message));
  return match ? { ...match.style, icon: match.icon } : BASE[variant];
}

/** Stacked action-feedback toasts (Added to cart, Removed, Coupon applied,
 *  etc.) — bottom-right, light editorial-card styling that matches the rest
 *  of the app's soft-tint icon chips (Badge/StatusBadge). Each kind of
 *  action gets its own icon + accent color (commerce = orange, identity/
 *  account = violet, orders/messages = blue, reviews/rewards = amber,
 *  billing = green) so the stack reads at a glance instead of every action
 *  looking identical. A thin countdown bar shows time-to-dismiss and
 *  genuinely pauses (not just visually) while hovered. */
export function ToastContainer() {
  const { toasts, dismiss, pause, resume } = useToastList();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map(t => {
        const style = resolveStyle(t.variant, t.message);
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            role="status"
            aria-atomic="true"
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id)}
            className={clsx(
              t.leaving ? 'toast-leave' : 'toast-enter',
              'pointer-events-auto relative flex items-start gap-3 w-[320px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-bone bg-white pl-4 pr-3 py-3',
              style.shadow,
            )}
          >
            <span className={clsx('absolute left-0 top-0 bottom-0 w-[3px]', style.accent)} />
            <span className={clsx('flex items-center justify-center size-8 rounded-[10px] shrink-0', style.tint)}>
              <Icon size={16} />
            </span>
            <p className="text-[12.5px] font-medium text-charcoal leading-snug flex-1 min-w-0 pt-[3px]">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="text-slate hover:text-charcoal hover:bg-fog bg-transparent border-0 cursor-pointer p-1 rounded-md shrink-0 transition-colors"
            >
              <X size={13} />
            </button>
            <span className="absolute left-0 right-0 bottom-0 h-[2.5px] bg-bone/70">
              <span
                className={clsx('toast-progress block h-full', style.accent)}
                style={{ animationDuration: `${TOAST_DURATION_MS}ms`, animationPlayState: t.paused ? 'paused' : 'running' }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
