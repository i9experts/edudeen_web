import { useT } from '@/contexts/languageCtx';
import { Suspense } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { Home, Heart, ShoppingCart, User } from 'lucide-react';
import { TokenStorage } from '@/api/services/auth';
import { useCartContext } from '@/contexts/CartContext';
import { AnnouncementBanner, AppOpenPrompt, AppOpenFab } from '@/components/comman/ui';

// ── Mobile bottom nav — Home / Marketplace / Cart / Account. Reinstated now
// that '/' is a real shopper-first marketplace landing page again (see
// Homepage.tsx) instead of the seller-pitch page it used to be, which is why
// this was previously removed outright. Same visual pattern as
// SellerBottomNav/StoreBottomNav/AdminBottomNav (light variant, brand-orange
// active state) for consistency across the app's mobile nav bars.
function BuyerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCartContext();
  const isActive = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path);
  const t = useT();

  const tabs = [
    { id: 'home',        Icon: Home,         label: 'Home',        path: '/' },
    { id: 'saved',       Icon: Heart,        label: 'Saved',       path: '/account/wishlist' },
    { id: 'cart',        Icon: ShoppingCart, label: 'Cart',        path: '/cart', badge: cartCount },
    { id: 'account',     Icon: User,         label: 'Account',     path: TokenStorage.isLoggedIn() ? '/account/dashboard' : '/login' },
  ] as const;

  return (
    <nav className="lg:hidden fixed bottom-0 start-0 end-0 z-50 h-16 bg-white border-t border-bone">
      <div className="flex items-stretch h-full">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={t(tab.label)}
              className="relative flex-1 flex flex-col items-center justify-center gap-[3px] cursor-pointer bg-transparent border-none"
            >
              <span className="relative">
                <tab.Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={clsx('transition-colors duration-150', active ? 'text-brand-orange' : 'text-slate')}
                />
                {'badge' in tab && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2 min-w-[15px] h-[15px] px-[3px] rounded-full bg-brand-orange text-white text-[9px] font-bold flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </span>
              <span className={clsx('text-[10px] font-medium transition-colors duration-150', active ? 'text-brand-orange' : 'text-slate')}>{t(tab.label)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── BuyerLayout ───────────────────────────────────────────────────────────────
// Thin shell for buyer-facing pages — the public marketing top navbar
// (PublicLayout) still wraps the genuine marketing pages, while every
// shopping page (including the '/' homepage) renders its own BuyerNavbar/
// MegaMenuBar and sits under this shell for the shared announcement banner,
// mobile bottom-nav and app-install prompts.
export function BuyerLayout() {
  // The account area is a full-height dashboard (sidebar + its own scroll) —
  // a banner stacked above it made the page taller than the screen, so the
  // whole page slid up and left a blank strip at the top. AccountLayout
  // shows the banner inside its own column instead.
  const { pathname } = useLocation();
  const inAccount = pathname === '/account' || pathname.startsWith('/account/');
  return (
    <>
      {!inAccount && <AnnouncementBanner audience="buyers" />}
      {/* Local Suspense boundary (same reasoning as PublicLayout) so a
         first-visit-this-session page under this branch doesn't blank the
         whole screen via RootLayout's outer big-spinner Suspense — no
         fallback markup, TopProgressBar already covers the "loading" signal. */}
      <Suspense fallback={null}><Outlet /></Suspense>
      <div className="lg:hidden h-16" aria-hidden="true" />
      <BuyerBottomNav />
      <AppOpenPrompt />
      <AppOpenFab />
    </>
  );
}
