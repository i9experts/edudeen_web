import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { TokenStorage } from '@/api/services/auth';
import { CurrencySelector } from './BuyerNavbar';
import { ProfileAvatar } from './ProfileAvatar';

type Role = 'user' | 'seller' | 'admin';

// The right-hand link follows who's signed in: sellers jump to their stores,
// admins (who don't create) get a shortcut to the shop, visitors can learn
// about selling — and a signed-in buyer gets no seller link at all.
function actionFor(role: Role | undefined, loggedIn: boolean): { label: string; path: string } | null {
  if (role === 'admin')  return { label: 'View shop ↗',      path: '/' };
  if (role === 'seller') return { label: 'Start creating ↗', path: '/seller/stores' };
  if (loggedIn)          return null;
  return { label: 'Start creating ↗', path: '/sellers' };
}

/**
 * Thin navy → green strip shown at the very top of every Edudeen surface —
 * buyer navbar, marketing navbar, and the seller / store / admin / account
 * dashboards — holding the currency switch and "Start creating". With
 * `showAccount` it also carries the profile menu (notifications inside), for
 * dashboards that have no navbar of their own.
 */
export function PlatformTopBar({ showAccount = false, className }: { showAccount?: boolean; className?: string }) {
  const navigate = useNavigate();
  const loggedIn = TokenStorage.isLoggedIn();
  const role = loggedIn ? TokenStorage.getUser<{ role?: Role }>()?.role : undefined;
  const action = actionFor(role, loggedIn);

  return (
    <div className={clsx('shrink-0 bg-[linear-gradient(100deg,#1f4f78_0%,#3f8a5e_38%,#66AD36_62%,#3f8a5e_82%,#1f4f78_100%)] text-white', className)}>
      <div className="h-9 flex items-center justify-end gap-4 px-[5%] md:px-[4%]">
        <CurrencySelector tone="dark" />
        {action && (
          <>
            <span className="w-px h-4 bg-white/30" aria-hidden />
            <button
              onClick={() => navigate(action.path)}
              className="shrink-0 whitespace-nowrap bg-transparent border-none p-0 text-[12.5px] font-bold text-white cursor-pointer hover:underline underline-offset-4"
            >
              {action.label}
            </button>
          </>
        )}
        {showAccount && loggedIn && (
          <>
            <span className="w-px h-4 bg-white/30" aria-hidden />
            <ProfileAvatar withNotifications compact />
          </>
        )}
      </div>
    </div>
  );
}
