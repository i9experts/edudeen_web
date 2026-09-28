import { useState, Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, ShoppingBag, Heart, Star,
  MessageSquare, Landmark,
  User, Shield, MapPin, Bell, RefreshCw,
  ChevronLeft, PanelLeftClose, PanelLeftOpen, type LucideIcon,
} from 'lucide-react';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useConversations } from '@/hooks/messaging/useConversations';
import { EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack';

// ── Nav model ─────────────────────────────────────────────────────────────────
export interface NavItem { id: string; label: string; Icon: LucideIcon; path: string; badge?: number }
export interface NavGroup { group: string; items: NavItem[] }

export function useNavGroups(): NavGroup[] {
  const { wishlistCount } = useWishlistContext();
  // Reuses the same live-updating (socket-backed) conversations hook the
  // Messages page itself uses, so this badge tracks in real time just like
  // the Wishlist badge already does.
  const { conversations } = useConversations();
  const messagesUnread = conversations.reduce((n, c) => n + c.buyerUnread, 0);

  return [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard, path: 'dashboard' },
      ],
    },
    {
      group: 'Shopping',
      items: [
        { id: 'orders',   label: 'Orders',   Icon: ShoppingBag, path: 'orders' },
        { id: 'wishlist', label: 'Wishlist', Icon: Heart,       path: 'wishlist', badge: wishlistCount },
        { id: 'reviews',  label: 'Reviews',  Icon: Star,        path: 'reviews' },
        { id: 'payments', label: 'Bank Transfers', Icon: Landmark, path: 'payments' },
      ],
    },
    {
      group: 'Updates',
      items: [
        { id: 'messages',      label: 'Messages',      Icon: MessageSquare, path: 'messages', badge: messagesUnread },
        { id: 'notifications', label: 'Notifications', Icon: Bell,          path: 'notifications' },
      ],
    },
    {
      group: 'Account',
      items: [
        { id: 'profile',       label: 'Profile',        Icon: User,      path: 'profile' },
        { id: 'security',      label: 'Login & Security', Icon: Shield,  path: 'security' },
        { id: 'addresses',     label: 'Addresses',      Icon: MapPin,    path: 'addresses' },
        { id: 'subscriptions', label: 'Subscriptions',  Icon: RefreshCw, path: 'subscriptions' },
      ],
    },
  ];
}

export function findAccountNavLabel(pathname: string, groups: NavGroup[]): string {
  for (const g of groups) {
    for (const item of g.items) {
      if (pathname === `/account/${item.path}` || pathname.startsWith(`/account/${item.path}/`)) {
        return item.label;
      }
    }
  }
  return 'My Account';
}

// ── Sidebar (mirrors the seller StoreLayout dark sidebar) — desktop only.
// Mobile navigation lives entirely in AccountDashboard's own menu list now
// (native-app style: a flat list of destinations + a back arrow on each
// sub-page), not a hamburger-triggered copy of this same rail. ─────────────
interface SidebarProps { open: boolean; onToggle: () => void }

function AccountSidebar({ open, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const navGroups = useNavGroups();

  const isActive = (path: string) => pathname === `/account/${path}` || pathname.startsWith(`/account/${path}/`);

  const go = (path: string) => navigate(`/account/${path}`);

  return (
    <aside className={clsx(
      'hidden lg:flex bg-carbon flex-col shrink-0 h-screen',
      'transition-[width] duration-300 ease-in-out',
      open ? 'w-[220px]' : 'w-[60px]',
    )}>

        {/* Back to home + toggle */}
        <div className={clsx('flex items-center pt-[14px] pb-[10px] shrink-0', open ? 'px-4 gap-2' : 'flex-col gap-[6px] px-[10px]')}>
          {open ? (
            <>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-[7px] flex-1 bg-transparent border-0 cursor-pointer text-slate text-[12px] font-medium transition-colors duration-150 text-left hover:text-brand-orange"
              >
                <ChevronLeft size={14} /> Home
              </button>
              <button
                onClick={onToggle}
                title="Collapse sidebar"
                className="size-9 rounded-md flex items-center justify-center shrink-0 text-slate hover:text-white hover:bg-dark-active transition-colors cursor-pointer"
              >
                <PanelLeftClose size={15} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/')}
                title="Home"
                className="size-9 rounded-md flex items-center justify-center text-slate hover:text-brand-orange hover:bg-dark-active transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={onToggle}
                title="Expand sidebar"
                className="size-9 rounded-md flex items-center justify-center shrink-0 text-slate hover:text-white hover:bg-dark-active transition-colors cursor-pointer"
              >
                <PanelLeftOpen size={15} />
              </button>
            </>
          )}
        </div>

        <div className="h-px bg-dark-active mx-3 mb-[6px]" />

        {/* Nav */}
        <nav className={clsx('flex-1 overflow-y-auto', open ? 'px-[10px] pt-1' : 'px-[10px] pt-2')}>
          {navGroups.map(section => (
            <div key={section.group} className="mb-1">
              {open
                ? <p className="text-[10px] font-semibold text-dark-label px-2 py-1 uppercase tracking-[0.08em] mb-0.5">{section.group}</p>
                : <div className="h-px bg-dark-active mx-1 mb-2" />
              }
              {section.items.map(item => {
                const active = isActive(item.path);
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => go(item.path)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(item.path); } }}
                    title={!open ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center gap-[10px] min-h-11 py-[9px] px-[10px] rounded-md mb-0.5 cursor-pointer',
                      'transition-colors duration-150',
                      !open && 'lg:justify-center lg:px-0',
                      active ? 'bg-dark-active' : 'bg-transparent hover:bg-[#1a1917]',
                    )}
                  >
                    <item.Icon size={15} className={clsx('shrink-0', active ? 'text-brand-orange opacity-100' : 'text-slate opacity-55')} />
                    {open && (
                      <>
                        <span className={clsx('text-[13px] flex-1', active ? 'font-semibold text-white' : 'font-normal text-slate')}>
                          {item.label}
                        </span>
                        {!!item.badge && item.badge > 0 && (
                          <span className={clsx(
                            'text-[9px] font-bold px-[6px] py-[1px] rounded-full leading-[14px] shrink-0',
                            active ? 'bg-brand-orange text-white' : 'bg-dark-active text-slate',
                          )}>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                        {active && <div className="w-[3px] h-[14px] rounded-[2px] bg-brand-orange shrink-0" />}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {open ? (
          <div className="px-4 py-3 border-t border-dark-active shrink-0 flex items-center gap-2">
            <EdudeenIcon size={20} />
            <p className="text-[11px] text-dark-label">My Account</p>
          </div>
        ) : (
          <div className="py-3 border-t border-dark-active flex justify-center shrink-0">
            <EdudeenIcon size={20} />
          </div>
        )}
      </aside>
  );
}

// ── Content loading fallback (keeps the sidebar mounted between tabs) ─────────
function AccountContentSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-6 w-48 bg-bone rounded-md" />
      <div className="h-4 w-72 bg-bone rounded-md" />
      <div className="h-40 w-full bg-bone rounded-2xl mt-2" />
      <div className="h-24 w-full bg-bone rounded-2xl" />
    </div>
  );
}

// ── Mobile top bar — plain title on the account "home" (dashboard) screen,
// a back arrow (to that same home) on every other account page. Replaces the
// old hamburger-opens-a-drawer pattern: mobile navigation now happens by
// tapping a row in AccountDashboard's own menu list, so there's no separate
// drawer left to open. ─────────────────────────────────────────────────────
function MobileTopBar({ label, isRoot, onBack }: { label: string; isRoot: boolean; onBack: () => void }) {
  return (
    <div className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-bone shrink-0">
      {!isRoot && (
        <button
          onClick={onBack}
          aria-label="Back to My Account"
          className="w-9 h-9 -ml-1 flex items-center justify-center rounded-full bg-transparent border-0 cursor-pointer text-charcoal hover:bg-cream transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      <span className="text-[14px] font-semibold text-charcoal">{isRoot ? 'My Account' : label}</span>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function AccountLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navGroups = useNavGroups();
  const currentLabel = findAccountNavLabel(pathname, navGroups);
  const isRoot = pathname === '/account/dashboard';
  const goHome = () => navigate('/account/dashboard');
  // Edge-swipe-back on every account sub-page, same gesture ProductDetail
  // uses — no-op on the root screen itself (nothing to swipe back to here).
  const swipeHandlers = useEdgeSwipeBack(isRoot ? undefined : goHome);

  const toggle = () => setSidebarOpen(o => !o);

  return (
    <div
      className={clsx(
        'bg-cream flex overflow-hidden',
        // 64px = BuyerLayout's fixed bottom tab bar (mobile-only); nothing is
        // subtracted on desktop, where that bar is hidden.
        'h-[calc(100vh-64px)] md:h-screen',
      )}
      {...swipeHandlers}
    >
      <AccountSidebar open={sidebarOpen} onToggle={toggle} />

      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <MobileTopBar label={currentLabel} isRoot={isRoot} onBack={goHome} />
        <main className="flex-1 min-h-0 min-w-0 px-4 md:px-7 py-4 md:py-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Suspense fallback={<AccountContentSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
