import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  User, LayoutDashboard, LogOut, ShoppingBag,
  ChevronRight, Shield, Store, Package, Wallet, CreditCard, type LucideIcon,
} from 'lucide-react';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { TokenStorage, apiLogout } from '@/api/services/auth';
import { useNotification } from '@/contexts/NotificationContext';
import { CopyIconButton } from './CopyIconButton';
import { NotificationsMenuSection, NotificationToast } from './NotificationBell';

// ─────────────────────────────────────────────────────────────────────────────
// RoleChip
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CHIP_CONFIG = {
  buyer:  { label: 'Buyer',  bg: '#EEF7FF', text: '#1A65A8', dot: '#3B82F6' },
  seller: { label: 'Seller', bg: '#FFF4DC', text: '#B36200', dot: '#174771' },
  admin:  { label: 'Admin',  bg: '#F3F0FF', text: '#5B3BCC', dot: '#7C3AED' },
} as const;

function RoleChip({ role }: { role: keyof typeof ROLE_CHIP_CONFIG }) {
  const cfg = ROLE_CHIP_CONFIG[role];
  return (
    <span
      className="inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-full text-[12px] font-bold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvatarImage
// ─────────────────────────────────────────────────────────────────────────────
function AvatarImage({
  profileImage, name, initials, size,
}: { profileImage?: string | null; name?: string; initials: string; size: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-9 h-9 text-[12px]' : 'w-11 h-11 text-[15px]';
  return (
    <div className={clsx(
      dim,
      'rounded-full bg-brand-pale-orange flex items-center justify-center overflow-hidden shrink-0 border-2 border-bone',
    )}>
      {profileImage
        ? <img loading="lazy" decoding="async" src={profileImage} alt={name} className="w-full h-full object-cover" />
        : <span className="font-bold text-brand-deep-orange">{initials}</span>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvatarTrigger
// ─────────────────────────────────────────────────────────────────────────────
function AvatarTrigger({
  open, onClick, profileImage, name, initials, loading, badge = 0, compact = false,
}: {
  open: boolean; onClick: () => void;
  profileImage?: string | null; name?: string; initials: string; loading: boolean;
  /** Unread-notification count shown on the avatar (0 hides it). */
  badge?: number;
  /** Smaller trigger for the thin top bar. */
  compact?: boolean;
}) {
  // A gradient ring (brand-orange → deep-orange, 2px, via padding + an inner
  // white gap) rather than a flat single-color border — gives the avatar its
  // own distinct, on-brand identity mark instead of reading as just another
  // bordered circle in the row next to Wishlist/Cart/Bell.
  return (
    <button
      onClick={onClick}
      aria-label={badge > 0 ? `Account menu, ${badge} unread notifications` : 'Account menu'}
      className={clsx(
        'relative rounded-full shrink-0 p-[2px]',
        compact ? 'size-7 ring-1 ring-white/60' : 'size-9',
        'bg-gradient-to-br from-brand-orange to-brand-deep-orange cursor-pointer transition-all duration-150',
        open ? 'scale-[0.96] shadow-[0_0_0_3px_rgba(23,71,113,0.18)]' : 'hover:scale-105',
      )}
    >
      {badge > 0 && (
        <span className="absolute -top-[3px] -end-[3px] z-[1] min-w-[15px] h-[15px] bg-[#c0392b] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-[3px] border border-white leading-none">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <span className="flex items-center justify-center w-full h-full rounded-full bg-white overflow-hidden">
        {loading
          ? <div className="w-full h-full bg-bone animate-pulse rounded-full" />
          : profileImage
          ? <img loading="lazy" decoding="async" src={profileImage} alt={name} className="w-full h-full object-cover" />
          : <span className="text-[12px] font-bold text-brand-deep-orange">{initials}</span>
        }
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DropdownHeader
// ─────────────────────────────────────────────────────────────────────────────
function DropdownHeader({
  profileImage, name, email, initials,
  hasBuyer, hasSeller, hasAdmin,
}: {
  profileImage?: string | null; name?: string; email?: string; initials: string;
  hasBuyer: boolean; hasSeller: boolean; hasAdmin: boolean;
}) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-bone">
      <div className="flex items-start gap-3">
        <AvatarImage profileImage={profileImage} name={name} initials={initials} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-carbon leading-tight truncate">{name ?? '—'}</p>
          <div className="flex items-center gap-1 mt-[2px] mb-[7px]">
            <p className="text-[12px] text-slate truncate min-w-0">{email ?? '—'}</p>
            {email && <CopyIconButton value={email} title="Copy email" size={11} className="text-slate hover:text-charcoal" />}
          </div>
          <div className="flex items-center gap-[5px] flex-wrap">
            {hasBuyer  && <RoleChip role="buyer"  />}
            {hasSeller && <RoleChip role="seller" />}
            {hasAdmin  && <RoleChip role="admin"  />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuItem
// ─────────────────────────────────────────────────────────────────────────────
function MenuItem({
  icon: Icon, label, sublabel, onClick, danger = false,
}: {
  icon: LucideIcon; label: string; sublabel?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-[10px] py-[9px] px-3 rounded-[9px] border-0 cursor-pointer text-start group',
        'transition-colors',
        danger ? 'hover:bg-[#fff0f0]' : 'hover:bg-cream',
      )}
    >
      <div className={clsx(
        'w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors',
        danger ? 'bg-[#fff0f0] group-hover:bg-[#fecdd3]' : 'bg-bone group-hover:bg-[#edebe2]',
      )}>
        <Icon size={14} className={danger ? 'text-[#c0392b]' : 'text-slate'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-[13px] font-medium leading-tight', danger ? 'text-[#c0392b]' : 'text-charcoal')}>
          {label}
        </p>
        {sublabel && <p className="text-[12px] text-slate mt-[1px]">{sublabel}</p>}
      </div>
      {!danger && <ChevronRight size={12} className="text-bone shrink-0 group-hover:text-slate transition-colors" />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DropdownMenu
// ─────────────────────────────────────────────────────────────────────────────
function DropdownMenu({
  hasBuyer, hasDash, isAdmin, canSell, onNavigate, onLogout,
}: {
  hasBuyer: boolean; hasDash: boolean; isAdmin: boolean; canSell: boolean;
  onNavigate: (path: string) => void; onLogout: () => void;
}) {
  return (
    <>
      <div className="p-[6px]">
        {hasBuyer && (
          <MenuItem
            icon={User}
            label="My Account"
            sublabel="Dashboard & settings"
            onClick={() => onNavigate('/account/dashboard')}
          />
        )}
        {hasBuyer && (
          <MenuItem
            icon={ShoppingBag}
            label="My Orders"
            sublabel="Track your purchases"
            onClick={() => onNavigate('/account/orders')}
          />
        )}
        {canSell && (
          <MenuItem
            icon={Store}
            label="Sell on Edudeen"
            sublabel="Open your own store"
            onClick={() => onNavigate('/become-a-seller')}
          />
        )}
        {hasDash && (
          <MenuItem
            icon={isAdmin ? Shield : LayoutDashboard}
            label={isAdmin ? 'Admin Panel' : 'Store Dashboard'}
            sublabel={isAdmin ? 'Manage the platform' : 'Manage your store'}
            onClick={() => onNavigate(isAdmin ? '/admin' : '/seller')}
          />
        )}
        {hasDash && !isAdmin && (
          <>
            <MenuItem icon={Package} label="Products" sublabel="Add and manage your listings" onClick={() => onNavigate('/seller/products')} />
            <MenuItem icon={ShoppingBag} label="Orders" sublabel="Sales and fulfilment" onClick={() => onNavigate('/seller/orders')} />
            <MenuItem icon={Wallet} label="Finance" sublabel="Earnings and payouts" onClick={() => onNavigate('/seller/finance')} />
            <MenuItem icon={CreditCard} label="Plan & Billing" sublabel="Your Edudeen plan" onClick={() => onNavigate('/seller/plan-billing')} />
          </>
        )}
        {hasDash && !isAdmin && (
          <MenuItem
            icon={User}
            label="Account"
            sublabel="Profile, login & notifications"
            onClick={() => onNavigate('/seller/settings')}
          />
        )}
      </div>
      <div className="h-px bg-bone mx-3" />
      <div className="p-[6px]">
        <MenuItem icon={LogOut} label="Logout" onClick={onLogout} danger />
      </div>
    </>
  );
}

// Business rule (frontend-only, deliberately reversible — same pattern as
// LoginPage's SELLER_ONLY_LOGIN / RegisterPage's SELLER_ONLY_REGISTER):
// buyer-facing account features (the "Buyer" role chip, My Account, My
// Orders) are hidden here — there's currently no buyer-facing entry point on
// the apex domain to use them from, so showing them (even to a seller/admin,
// which `hasBuyer` below always did) is just confusing dead-end UI. Flip
// back to true to restore instantly with no other changes; nothing about
// the underlying role data or routes is touched.
const SHOW_BUYER_FEATURES = false;

// ─────────────────────────────────────────────────────────────────────────────
// ProfileDropdown
// ─────────────────────────────────────────────────────────────────────────────
function ProfileDropdown({
  profile, initials, onNavigate, onLogout, withNotifications, maxHeight,
}: {
  profile: ReturnType<typeof useGetProfile>['profile'];
  initials: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  withNotifications: boolean;
  maxHeight?: number;
}) {
  const role      = profile?.role;
  const isSeller  = role === 'seller';
  const isAdmin   = role === 'admin';
  const isBuyer   = role === 'user';
  const hasBuyer  = isBuyer || (SHOW_BUYER_FEATURES && (isSeller || isAdmin));
  const hasSeller = isSeller;
  const hasAdmin  = isAdmin;
  const hasDash   = isSeller || isAdmin;

  return (
    <div className="relative w-full">
      {/* Arrow indicator — a rotated square clipped by the panel's own border/bg,
          connecting the floating panel visually back to its trigger. */}
      <div className="absolute -top-[7px] end-[14px] w-3 h-3 bg-white border-t border-s border-bone rotate-45" />
      <div className="relative bg-white border border-bone rounded-[16px] overflow-y-auto overscroll-contain" style={maxHeight ? { maxHeight } : undefined}>
      <DropdownHeader
        profileImage={profile?.profileImage}
        name={profile?.name}
        email={profile?.email}
        initials={initials}
        hasBuyer={hasBuyer}
        hasSeller={hasSeller}
        hasAdmin={hasAdmin}
      />
      {withNotifications && (
        <>
          <NotificationsMenuSection onNavigate={onNavigate} />
          <div className="h-px bg-bone mx-3" />
        </>
      )}
      <DropdownMenu
        hasBuyer={hasBuyer}
        canSell={isBuyer}
        hasDash={hasDash}
        isAdmin={isAdmin}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileAvatar
// ─────────────────────────────────────────────────────────────────────────────
const CLOSE_DELAY_MS = 150;
const PANEL_WIDTH = 272;
const PANEL_WIDTH_WITH_NOTIFICATIONS = 312;
const PANEL_HEIGHT_ESTIMATE = 320;

/** `withNotifications` folds the notification bell into this menu (unread badge on the avatar, latest items inside the popup). */
export function ProfileAvatar({ withNotifications = false, compact = false }: { withNotifications?: boolean; compact?: boolean } = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { unreadCount, fetchNotifications } = useNotification();
  const panelWidth = withNotifications ? PANEL_WIDTH_WITH_NOTIFICATIONS : PANEL_WIDTH;
  const panelHeight = withNotifications ? PANEL_HEIGHT_ESTIMATE + 260 : PANEL_HEIGHT_ESTIMATE;

  useEffect(() => { if (withNotifications) fetchNotifications(); }, [withNotifications, fetchNotifications]);
  useEffect(() => { if (withNotifications && open) fetchNotifications(); }, [withNotifications, open, fetchNotifications]);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number }>({});
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A click right after the hover-open must not toggle the menu shut again (mouse and touch both fire enter + click).
  const hoverOpenedAt = useRef(0);
  const { profile, loading } = useGetProfile();

  const clearCloseTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const scheduleClose = () => { clearCloseTimer(); closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS); };

  // The dropdown used to be a plain absolutely-positioned child of the
  // trigger — any scrollable/clipped ancestor between it and the page root
  // (e.g. BuyerNavbar's icon row, which deliberately has `overflow-x-auto`
  // as a mobile safety net for the wishlist/cart/account icons) silently
  // clipped or trapped it, exactly like ActionMenu's dropdown would if it
  // weren't already portaled to <body>. Computing a fixed position against
  // the trigger's real screen coordinates and portaling out is the same
  // fix, applied here for the same reason.
  const calcPos = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const GAP = 10;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < panelHeight + GAP && rect.top > spaceBelow;
    // Never taller than the room available — the menu scrolls inside instead of running off screen.
    setMaxHeight(Math.max(180, (openUpward ? rect.top : spaceBelow) - GAP - 12));
    setPos({
      [openUpward ? 'bottom' : 'top']: openUpward ? window.innerHeight - rect.top + GAP : rect.bottom + GAP,
      // Line the panel up with the trigger's outer edge — its right edge in
      // LTR, its left edge in RTL (Urdu puts the avatar on the left) — then
      // keep it inside the viewport either way.
      left: Math.min(
        Math.max(8, document.documentElement.dir === 'rtl' ? rect.left : rect.right - panelWidth),
        Math.max(8, window.innerWidth - panelWidth - 8),
      ),
    });
  }, [panelHeight, panelWidth]);

  useEffect(() => {
    if (!open) return;
    calcPos();
    const onOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(t) ?? false;
      const insidePanel = panelRef.current?.contains(t) ?? false;
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onReflow = () => calcPos();
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open, calcPos]);

  useEffect(() => () => clearCloseTimer(), []);

  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '..';
  const handleNavigate = (path: string) => { navigate(path); setOpen(false); };
  const handleLogout   = async () => {
    try { await apiLogout(); } catch { /* best-effort — clear local session regardless */ }
    TokenStorage.clear();
    setOpen(false);
    navigate('/');
    window.location.reload();
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative"
        onMouseEnter={() => { clearCloseTimer(); hoverOpenedAt.current = Date.now(); setOpen(true); }}
        onMouseLeave={scheduleClose}
      >
        <AvatarTrigger
          open={open}
          onClick={() => setOpen(p => (p && Date.now() - hoverOpenedAt.current < 600 ? true : !p))}
          profileImage={profile?.profileImage}
          name={profile?.name}
          initials={initials}
          loading={loading}
          badge={withNotifications ? unreadCount : 0}
          compact={compact}
        />
      </div>
      {withNotifications && <NotificationToast />}

      {createPortal(
        <div
          ref={panelRef}
          // Re-armed here too — the panel is now a DOM sibling of the
          // trigger (not a child of it), so without this, moving the mouse
          // from the avatar into the menu would read as "left" and close it
          // mid-hover.
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          style={{ position: 'fixed', zIndex: 100, width: panelWidth, ...pos }}
          className={clsx(
            'transition-all duration-200 origin-top-right rtl:origin-top-left',
            open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none',
          )}
        >
          <ProfileDropdown
            profile={profile}
            initials={initials}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            withNotifications={withNotifications}
            maxHeight={maxHeight}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
