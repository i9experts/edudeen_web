import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Tag, Shield, Globe, X } from 'lucide-react';
import { useLanguage } from '@/contexts/languageCtx';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { TokenStorage } from '@/api/services/auth';
import { CurrencySelector } from './BuyerNavbar';
import { LanguageToggle } from './LanguageToggle';
import { ProfileAvatar } from './ProfileAvatar';
import { TopBarDealsTicker } from './TopBarDealsTicker';
import { useTopBarDeals } from '@/hooks/useTopBarDeals';
import { getStorePagePath } from '@/utils/storefrontUrl';

type Role = 'user' | 'seller' | 'admin';

/**
 * Who the bar is for:
 * - `shop`   — buyers & visitors (shop pages, buyer account): live sales + flash
 *              deals, currency switch, "Start creating" for visitors.
 * - `seller` — seller / store dashboards: the seller's own store (logo, or its
 *              name when there's no logo) and a link to their store page. No
 *              shopper promos and no currency switch.
 * - `admin`  — admin panel: how many sales are live (→ Marketing) and a link
 *              to the shop. No shopper promos and no currency switch.
 */
export type TopBarVariant = 'shop' | 'seller' | 'admin';

export interface TopBarStoreIdentity {
  name: string;
  logo?: string | null;
  /** Store slug — when known, "View store page" opens it. */
  slug?: string | null;
}

const BAR_BG = 'bg-[linear-gradient(100deg,#1f4f78_0%,#3f8a5e_38%,#66AD36_62%,#3f8a5e_82%,#1f4f78_100%)]';
const LINK_CLS = 'shrink-0 whitespace-nowrap bg-transparent border-none p-0 text-[12.5px] font-bold text-white cursor-pointer hover:underline underline-offset-4';
const Divider = ({ className }: { className?: string }) => <span className={clsx('w-px h-4 bg-white/30', className)} aria-hidden />;

// Visitors can learn about selling; a signed-in buyer gets no seller link.
function shopAction(role: Role | undefined, loggedIn: boolean): { label: string; path: string } | null {
  if (role === 'admin')  return { label: 'Admin panel ↗',   path: '/admin' };
  if (role === 'seller') return { label: 'My store ↗',      path: '/seller' };
  if (loggedIn)          return null;
  return { label: 'Start creating ↗', path: '/sellers' };
}

function StoreIdentity({ store }: { store?: TopBarStoreIdentity | null }) {
  if (!store) return <div className="flex-1 min-w-0" />;
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2" title={store.name}>
      {store.logo ? (
        // Seller has a logo → show the logo.
        <span className="h-7 max-w-[140px] rounded-md bg-white/95 px-1 flex items-center overflow-hidden shrink-0">
          <img src={store.logo} alt={store.name} className="h-6 w-auto max-w-full object-contain" />
        </span>
      ) : (
        // No logo → show the store's name instead.
        <span className="text-[13.5px] font-bold text-white truncate">{store.name}</span>
      )}
    </div>
  );
}

function AdminIdentity() {
  const navigate = useNavigate();
  const deals = useTopBarDeals();
  const live = deals?.campaigns.length ?? 0;
  return (
    <div className="flex-1 min-w-0 flex items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white whitespace-nowrap">
        <Shield size={13} /> Edudeen Admin
      </span>
      <Divider className="hidden sm:block" />
      <button onClick={() => navigate('/admin/marketing')} className={clsx(LINK_CLS, 'hidden sm:inline-flex items-center gap-1.5 font-semibold')}>
        <Tag size={12} /> {live === 0 ? 'No sale running' : `${live} sale${live === 1 ? '' : 's'} live`}
      </button>
    </div>
  );
}

/** Phones: currency + language live behind one globe button (a bottom sheet) so the bar can show a single short message. */
function MobilePrefs() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const { currency, setCurrency } = useCurrencyPreference();
  return (
    <div className="md:hidden shrink-0">
      <button type="button" onClick={() => setOpen(true)} aria-label={t('Language & currency')}
        className="relative inline-flex items-center gap-1 text-[12px] font-bold text-white bg-white/10 border border-white/30 rounded-full ps-2 pe-2.5 h-7 cursor-pointer before:absolute before:-inset-2">
        <Globe size={13} aria-hidden /> {currency}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end bg-black/40" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label={t('Language & currency')} className="w-full rounded-t-2xl bg-white text-carbon p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="m-0 text-[15px] font-bold">{t('Language & currency')}</p>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('Close')} className="size-11 -me-2 inline-flex items-center justify-center bg-transparent border-none cursor-pointer text-slate"><X size={20} /></button>
            </div>
            <p className="m-0 mb-1.5 text-[12px] font-semibold text-slate">{t('Currency')}</p>
            <div className="flex gap-2 mb-4">
              {(['PKR', 'USD'] as const).map(c => (
                <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}
                  className={clsx('flex-1 min-h-11 rounded-xl border text-[14px] font-semibold cursor-pointer', currency === c ? 'bg-brand-royal text-white border-brand-royal' : 'bg-white text-carbon border-bone')}>{c}</button>
              ))}
            </div>
            <p className="m-0 mb-1.5 text-[12px] font-semibold text-slate">{t('Language')}</p>
            <div className="flex"><LanguageToggle tone="light" /></div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/**
 * Thin navy → green strip at the very top of every Edudeen surface. What it
 * holds depends on who it's for (see `TopBarVariant`). With `showAccount` it
 * also carries the profile menu (notifications inside), for dashboards that
 * have no navbar of their own.
 */
export function PlatformTopBar({ variant = 'shop', store, showAccount = false, className }: {
  variant?: TopBarVariant;
  /** Seller variant: the store to show on the left. */
  store?: TopBarStoreIdentity | null;
  showAccount?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const loggedIn = TokenStorage.isLoggedIn();
  const role = loggedIn ? TokenStorage.getUser<{ role?: Role }>()?.role : undefined;
  const action = variant === 'shop' ? shopAction(role, loggedIn) : null;

  return (
    <div className={clsx('shrink-0 text-white', BAR_BG, className)}>
      <div className="h-10 md:h-9 flex items-center gap-4 px-[5%] md:px-[4%]">
        {variant === 'shop' && (
          <>
            {/* Left: live admin sales + top marketplace flash deals. */}
            <TopBarDealsTicker />
            <MobilePrefs />
            <div className="hidden md:flex items-center gap-4">
              <CurrencySelector tone="dark" />
              <LanguageToggle tone="dark" />
            </div>
            {action && (
              <>
                {/* On a phone the sales ticker gets the room; this link stays in the footer. */}
                <Divider className="hidden sm:block" />
                <button onClick={() => navigate(action.path)} className={clsx(LINK_CLS, 'hidden sm:inline-block')}>
                  {action.label}
                </button>
              </>
            )}
          </>
        )}

        {variant === 'seller' && (
          <>
            <StoreIdentity store={store} />
            {store?.slug && (
              <button onClick={() => window.open(getStorePagePath(store.slug!), '_blank', 'noopener')} className={clsx(LINK_CLS, 'relative before:absolute before:-inset-y-2 before:-inset-x-1')}>
                View store page ↗
              </button>
            )}
          </>
        )}

        {variant === 'admin' && (
          <>
            <AdminIdentity />
            <button onClick={() => navigate('/')} className={LINK_CLS}>View shop ↗</button>
          </>
        )}

        {showAccount && loggedIn && (
          <>
            <Divider />
            <ProfileAvatar withNotifications compact />
          </>
        )}
      </div>
    </div>
  );
}
