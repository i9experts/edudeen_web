import { useState, useEffect, type ReactNode, Suspense } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { TokenStorage, type AppRole } from '@/api/services/auth';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart2,
  Settings, Sparkles, ChevronLeft, ChevronRight, Store,
  Megaphone, Star, Search, Wallet, FileSpreadsheet, MessageCircleQuestion, Package2, Truck, Boxes, Gift,
  MessageSquare, FolderTree, RefreshCw, Undo2, CreditCard,
  PanelLeftClose, PanelLeftOpen, AlertTriangle, AlertCircle, XCircle, Clock, LogOut, Layers, UserRound,
} from 'lucide-react';
import { EdudeenIcon, EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { apiGetStoreById, type StoreData } from '@/api/services/store';
import { apiGetStorePlatformPlan, apiGetStoreEntitlements, type StorePlatformSubscription } from '@/api/services/platformPlans';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useLogout } from '@/hooks/auth/useLogout';
import { AnnouncementBanner, Modal, Button } from '@/components/comman/ui';
import { PlatformTopBar } from '@/components/comman/ui/PlatformTopBar';
import { useLockPageScroll } from '@/hooks/useLockPageScroll';
import { CommandPalette, type CommandPaletteItem } from '@/components/comman/ui/CommandPalette';
import { StoreWorkspaceCtx, useStoreWorkspace } from './StoreWorkspaceContext';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';

// ── Store Workspace Context ───────────────────────────────────────────────────
// Defined in ./StoreWorkspaceContext (see the note there); re-exported so every
// existing `import { useStoreWorkspace } from '@/components/layouts/StoreLayout'` keeps working.
export { useStoreWorkspace };

// ── Sidebar Nav ───────────────────────────────────────────────────────────────
export interface NavItem { id: string; Icon: LucideIcon; label: string; path: string }

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
      { id: 'analytics', Icon: BarChart2,       label: 'Analytics', path: 'analytics' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { id: 'orders',   Icon: Package,  label: 'Orders',       path: 'orders'  },
      { id: 'returns',  Icon: Undo2,    label: 'Returns',       path: 'returns' },
      { id: 'shipping', Icon: Truck,    label: 'Shipping',      path: 'shipping' },
      { id: 'quotes',   Icon: FileSpreadsheet, label: 'School Quotes', path: 'quotes' },
    ],
  },
  {
    group: 'Catalog',
    items: [
      { id: 'products',      Icon: ShoppingBag,   label: 'Products',      path: 'products'     },
      { id: 'inventory',     Icon: Boxes,         label: 'Inventory',     path: 'inventory'    },
      { id: 'categories',    Icon: FolderTree,    label: 'Categories',    path: 'categories'   },
      { id: 'collections',   Icon: Layers,        label: 'Collections',   path: 'collections'  },
      { id: 'bundles',       Icon: Package2,      label: 'Bundles',       path: 'bundles'      },
      { id: 'store-builder', Icon: Store,         label: 'Customize Store', path: 'storebuilder' },
    ],
  },
  {
    group: 'Customers',
    items: [
      { id: 'customers', Icon: Users,          label: 'Customers', path: 'customer/list' },
      { id: 'reviews',   Icon: Star,           label: 'Reviews',   path: 'reviews'        },
      { id: 'questions', Icon: MessageCircleQuestion, label: 'Questions', path: 'questions'   },
      { id: 'messages',  Icon: MessageSquare,  label: 'Messages',  path: 'messages'       },
    ],
  },
  {
    group: 'Growth',
    items: [
      { id: 'marketing',     Icon: Megaphone, label: 'Marketing',     path: 'marketing'     },
      { id: 'subscriptions', Icon: RefreshCw, label: 'Subscriptions', path: 'subscriptions' },
      { id: 'loyalty',       Icon: Gift,      label: 'Loyalty',       path: 'loyalty'       },
      { id: 'seo',           Icon: Search,    label: 'SEO',           path: 'seo'           },
      { id: 'ai',            Icon: Sparkles,  label: 'AI Studio',     path: 'ai/studio'     },
    ],
  },
  {
    group: 'Finance',
    items: [
      // One entry: opens the monthly statement; the page's own tab bar still
      // reaches the overview (transactions, payout methods).
      { id: 'earnings',     Icon: Wallet,     label: 'Earnings',       path: 'finance?tab=earnings' },
      { id: 'plan-billing', Icon: CreditCard, label: 'Plan & Billing', path: 'plan-billing' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { id: 'settings',      Icon: Settings,    label: 'Store Settings',        path: 'settings'      },
      { id: 'account',       Icon: UserRound,   label: 'Account',               path: 'account'       },
    ],
  },
];

// ── Shared grouped nav menu — the mobile "account hub" content for a store
// workspace, reused wherever the full list of store sections needs to be
// browsable (currently StoreSettings' mobile menu) — one source of truth
// instead of a duplicate copy per page, per the project's "never create
// duplicate logic" rule. `excludeGroups` always drops 'Overview' (Dashboard
// has its own bottom-nav tab, Analytics is reachable from the dashboard
// page's own metric cards) plus whatever else the caller already covers
// some other way (e.g. StoreSettings excludes 'settings' from Settings
// group since its own General tab already covers that destination).
export function StoreNavMenu({ storeId, onNavigate, excludeGroups = [], excludeItemIds = [] }: {
  storeId: string; onNavigate?: () => void;
  excludeGroups?: string[]; excludeItemIds?: string[];
}) {
  const navigate = useNavigate();
  const hiddenGroups = new Set(['Overview', ...excludeGroups]);
  const hiddenItems = new Set(excludeItemIds);
  return (
    <div className="flex flex-col gap-4">
      {NAV.filter(section => !hiddenGroups.has(section.group))
        .map(section => ({ ...section, items: section.items.filter(item => !hiddenItems.has(item.id)) }))
        .filter(section => section.items.length > 0)
        .map(section => (
        <div key={section.group} className="bg-white border border-bone rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10.5px] font-bold text-slate uppercase tracking-[0.06em]">{section.group}</p>
          </div>
          <div className="divide-y divide-[#f3f2ec]">
            {section.items.map(item => {
              const go = () => {
                onNavigate?.();
                navigate(`/store/${storeId}/${item.path}`);
              };
              return (
                <button
                  key={item.id}
                  onClick={go}
                  className="w-full flex items-center gap-3 px-5 py-[13px] bg-transparent border-0 cursor-pointer text-left hover:bg-cream transition-colors"
                >
                  <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
                    <item.Icon size={15} className="text-brand-orange" />
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-charcoal">{item.label}</span>
                  <ChevronRight size={15} className="text-slate shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mobile bottom tab bar — real navigation for the most frequent
// destinations, same icon-only pattern as SellerBottomNav. The last tab
// ("Settings") is where every OTHER section lives (Sales/Catalog/Customers/
// Growth/Finance) via StoreSettings'
// own mobile menu — Dashboard itself stays a pure metrics page, it doesn't
// double as a menu of everything.
const STORE_TABS: { id: string; Icon: LucideIcon; label: string; path: string }[] = [
  { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard', path: 'dashboard' },
  { id: 'orders',    Icon: Package,         label: 'Orders',    path: 'orders'    },
  { id: 'products',  Icon: ShoppingBag,     label: 'Products',  path: 'products'  },
  { id: 'messages',  Icon: MessageSquare,   label: 'Messages',  path: 'messages'  },
  { id: 'settings',  Icon: Settings,        label: 'Settings',  path: 'settings'  },
];

function StoreBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { storeId } = useStoreWorkspace();

  const isActive = (path: string) => pathname === `/store/${storeId}/${path}`;

  const goToTab = (path: string) => navigate(`/store/${storeId}/${path}`);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-bone">
      <div className="flex items-stretch">
        {STORE_TABS.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => goToTab(tab.path)}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className="flex-1 flex flex-col items-center justify-center py-[11px] gap-[5px] cursor-pointer bg-transparent border-none"
            >
              <tab.Icon
                size={21}
                strokeWidth={active ? 2.2 : 1.8}
                className={clsx('transition-colors duration-150', active ? 'text-brand-orange' : 'text-slate')}
              />
              <span className={clsx('w-[16px] h-[3px] rounded-full transition-colors duration-150', active ? 'bg-brand-orange' : 'bg-transparent')} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function buildPaletteItems(
  navigate: (path: string) => void,
  storeId: string,
): CommandPaletteItem[] {
  const result: CommandPaletteItem[] = [];
  NAV.forEach(section => {
    section.items.forEach(item => {
      result.push({
        id:       item.id,
        label:    item.label,
        group:    section.group,
        icon:     item.Icon,
        onSelect: () => navigate(item.path.startsWith('/') ? item.path : `/store/${storeId}/${item.path}`),
      });
    });
  });
  return result;
}

// A nav path may carry a query (e.g. 'finance?tab=earnings'). Such an item is
// active only when that query matches; its query-less sibling on the same
// route ('finance') is active only when no query-carrying sibling matches.
const ALL_NAV_PATHS = NAV.flatMap(s => s.items.map(i => i.path));

function queryMatches(query: string, search: string) {
  const want = new URLSearchParams(query);
  const have = new URLSearchParams(search);
  for (const [k, v] of want) if (have.get(k) !== v) return false;
  return true;
}

function isNavItemActive(path: string, pathname: string, search: string, storeId: string) {
  if (path.startsWith('/')) return pathname === path || pathname.startsWith(path + '/');
  const [seg, query] = path.split('?');
  if (pathname !== `/store/${storeId}/${seg}`) return false;
  // The only nav entry for this route stays highlighted whatever tab is open.
  const siblings = ALL_NAV_PATHS.filter(p => p.split('?')[0] === seg);
  if (siblings.length === 1) return true;
  if (query) return queryMatches(query, search);
  return !ALL_NAV_PATHS.some(p => {
    const [s, q] = p.split('?');
    return s === seg && !!q && queryMatches(q, search);
  });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
// Desktop only now — mobile navigation is the "menu" list on StoreDashboard
// (mirrors the buyer Account section's redesign: a real native-app menu
// screen + back-arrow drill-in, not a hamburger-triggered copy of this rail).
interface StoreSidebarProps { open: boolean; onToggle: () => void; }

function StoreSidebar({ open, onToggle }: StoreSidebarProps) {
  const navigate     = useNavigate();
  const { pathname, search } = useLocation();
  const { store, storeId, loading } = useStoreWorkspace();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const paletteItems = buildPaletteItems(navigate, storeId);
  const logout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    // Seller-only web login (see LoginPage's SELLER_ONLY_LOGIN) — a signed-out
    // seller belongs back at /login, not the public homepage default.
    await logout('/login');
  };

  const isActive = (path: string) => isNavItemActive(path, pathname, search, storeId);
  // Admin sale campaigns this store hasn't joined yet — shown as a badge on
  // Marketing, which then opens straight on the Platform Sales tab.
  const { needsAction: campaignsToJoin } = useStoreCampaigns(storeId);
  const itemTarget = (item: NavItem) =>
    item.path.startsWith('/') ? item.path
      : item.id === 'marketing' && campaignsToJoin > 0 ? `/store/${storeId}/marketing?tab=platform`
      : `/store/${storeId}/${item.path}`;

  const initials   = store?.name?.slice(0, 2).toUpperCase() ?? '..';
  // Real plan allowance from entitlements (monthlyAllowance: -1 = unlimited,
  // 0/unknown = no fixed max) — never a made-up ceiling.
  const [aiCredits, setAiCredits] = useState<{ monthlyAllowance: number; balance: number } | null>(null);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetStoreEntitlements(storeId)
      .then(res => { if (!cancelled) setAiCredits(res.data.aiCredits ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [storeId]);
  const credits    = aiCredits?.balance ?? store?.aiCredits ?? 0;
  const maxCredits = aiCredits && aiCredits.monthlyAllowance > 0 ? aiCredits.monthlyAllowance : null;
  const unlimited  = aiCredits?.monthlyAllowance === -1;
  const pct        = maxCredits ? Math.min(100, Math.round((credits / maxCredits) * 100)) : 0;

  const toggleBtn = (
    <button
      onClick={onToggle}
      title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      className="size-8 rounded-lg flex items-center justify-center shrink-0 text-slate hover:text-carbon hover:bg-cream transition-colors cursor-pointer"
    >
      {open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
    </button>
  );

  return (
    <>
      <aside className={clsx(
        'hidden lg:flex bg-[#f3f7fa] border-r border-[#d5dfe6] flex-col shrink-0',
        'transition-[width] duration-300 ease-in-out',
        'h-screen',
        open ? 'w-[248px]' : 'w-[68px]',
      )}>

        {/* Brand row — Edudeen lockup + collapse toggle. */}
        {open ? (
          <div className="px-5 pt-5 pb-4 shrink-0 flex items-center justify-between gap-2">
            <EdudeenLogo size={22} />
            {toggleBtn}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-5 pb-3 shrink-0">
            <EdudeenIcon size={28} />
            {toggleBtn}
          </div>
        )}

        {/* Store identity — which workspace you're in. */}
        {open ? (
          <div className="px-4 pb-4 shrink-0">
            <div className="flex items-center gap-[10px] rounded-xl border border-bone px-3 py-[10px]">
              <div className="size-9 rounded-[9px] shrink-0 bg-brand-pale-orange overflow-hidden flex items-center justify-center text-[13px] font-bold text-brand-orange">
                {loading
                  ? <div className="animate-pulse size-9 bg-bone rounded-[9px]" />
                  : store?.logo
                    ? <img loading="lazy" decoding="async" src={store.logo} className="w-full h-full object-cover" alt="" />
                    : initials}
              </div>
              <div className="flex-1 min-w-0">
                {loading ? (
                  <>
                    <div className="animate-pulse w-[90px] h-3 rounded-[3px] bg-bone mb-[5px]" />
                    <div className="animate-pulse w-[55px] h-[10px] rounded-[3px] bg-bone" />
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-carbon leading-[1.3] truncate">{store?.name ?? 'Loading…'}</p>
                    <p className="text-[11px] text-slate leading-[1.3] truncate capitalize">
                      {store?.plan ?? ''}{store?.slug ? ` · /${store.slug}` : ''}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center pb-3 shrink-0">
            <div
              title={store?.name}
              className="size-9 rounded-[9px] shrink-0 bg-brand-pale-orange overflow-hidden flex items-center justify-center text-[11px] font-bold text-brand-orange"
            >
              {loading ? '…' : store?.logo ? <img loading="lazy" decoding="async" src={store.logo} className="w-full h-full object-cover" alt="" /> : initials}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav aria-label="Store workspace" className={clsx('flex-1 overflow-y-auto', open ? 'px-3 pt-1' : 'px-[12px] pt-1')}>
          {NAV.map(section => (
            <div key={section.group} className="mb-3">
              {open
                ? <p className="text-[11px] font-bold text-graphite px-3 py-1 uppercase tracking-[0.12em] mb-0.5">{section.group}</p>
                : <div className="h-px bg-bone mx-1 mb-2" />
              }
              {section.items.map(item => {
                const active = isActive(item.path);
                const goToItem = () => navigate(itemTarget(item));
                const badge = item.id === 'marketing' ? campaignsToJoin : 0;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={goToItem}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToItem(); } }}
                    title={!open ? (badge ? `${item.label} — ${badge} sale${badge > 1 ? 's' : ''} to join` : item.label) : undefined}
                    aria-label={badge ? `${item.label}, ${badge} sale${badge > 1 ? 's' : ''} to join` : item.label}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'relative flex items-center gap-[10px] py-[8px] px-3 rounded-lg mb-0.5 cursor-pointer',
                      'transition-colors duration-150',
                      !open && 'lg:justify-center lg:px-0',
                      active ? 'bg-brand-orange shadow-[0_2px_8px_rgba(23,71,113,0.28)]' : 'bg-transparent hover:bg-[#e3ecf3]',
                    )}
                  >
                    <item.Icon
                      size={16}
                      className={clsx('shrink-0', active ? 'text-white' : 'text-charcoal')}
                    />
                    {open && (
                      <span className={clsx('text-[13.5px] flex-1', active ? 'font-semibold text-white' : 'font-medium text-carbon')}>
                        {item.label}
                      </span>
                    )}
                    {badge > 0 && (open ? (
                      <span className={clsx(
                        'text-[9.5px] font-bold px-[6px] py-[1px] rounded-full leading-[14px] shrink-0',
                        active ? 'bg-white text-brand-orange' : 'bg-brand-green text-white',
                      )}>
                        {badge} new sale{badge > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="absolute top-1 right-1 size-2 rounded-full bg-brand-green" aria-hidden />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer: AI credits + sign out */}
        {open ? (
          <div className="px-4 py-4 border-t border-bone shrink-0">
            <div className="bg-cream border border-bone rounded-xl px-3 py-[10px] mb-3">
              <div className="flex justify-between mb-[7px]">
                <div className="flex items-center gap-[5px]">
                  <Sparkles size={12} className="text-brand-royal" />
                  <span className="text-[12px] text-graphite">AI Credits</span>
                </div>
                <span className="text-[12px] font-bold text-brand-orange">
                  {unlimited ? 'Unlimited' : maxCredits ? `${credits}/${maxCredits}` : credits}
                </span>
              </div>
              {maxCredits && (
                <div className="h-[5px] bg-bone rounded-full" role="progressbar" aria-valuenow={credits} aria-valuemin={0} aria-valuemax={maxCredits} aria-label="AI credits remaining">
                  <div
                    className="h-full bg-brand-orange rounded-full transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[12px] text-slate flex-1 min-w-0 truncate">Edudeen creator studio</p>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Logout"
                aria-label="Logout"
                className="size-8 rounded-lg flex items-center justify-center shrink-0 text-slate hover:text-carbon hover:bg-cream transition-colors cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="py-3 border-t border-bone flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
              aria-label="Logout"
              className="size-8 rounded-lg flex items-center justify-center shrink-0 text-slate hover:text-carbon hover:bg-cream transition-colors cursor-pointer"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </aside>

      <CommandPalette items={paletteItems} open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {showLogoutConfirm && (
        <Modal title="Log out?" onClose={() => setShowLogoutConfirm(false)} footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogoutConfirm(false)} disabled={loggingOut}>Cancel</Button>
            <Button variant="primary" onClick={handleLogout} loading={loggingOut}>Logout</Button>
          </>
        }>
          <p className="text-[13px] text-slate">You'll need to sign in again to access this store's dashboard.</p>
        </Modal>
      )}
    </>
  );
}

// ── Page Header (exported for store pages) ────────────────────────────────────
export interface StorePageHeaderProps {
  title:     string;
  subtitle?: string;
  actions?:  ReactNode;
  /** Small royal-blue label above the title. Defaults to the store's name. Pass '' to hide. */
  eyebrow?:  string;
}

// Studio-style sticky page bar: blue letter-spaced eyebrow (store name),
// serif title, muted sub-line, actions on the right.
export function StorePageHeader({ title, subtitle, actions, eyebrow }: StorePageHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { storeId, store } = useStoreWorkspace();
  const dashboardPath = `/store/${storeId}/dashboard`;
  const isDashboard = pathname === dashboardPath;
  const eyebrowText = eyebrow ?? store?.name ?? '';

  return (
    <div className="bg-white/95 backdrop-blur-md border-b border-bone px-4 md:px-8 py-[14px] flex items-center justify-between gap-3 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile only, and only away from the dashboard "menu" screen —
           real drill-in navigation (back to the menu) instead of a
           hamburger that used to open a copy of the desktop sidebar. */}
        {!isDashboard && (
          <button
            onClick={() => navigate(dashboardPath)}
            aria-label="Back to Store Dashboard"
            className="lg:hidden size-8 -ml-1 rounded-md flex items-center justify-center text-charcoal hover:bg-cream transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft size={19} />
          </button>
        )}
        <div className="min-w-0">
          {eyebrowText && (
            <p className="hidden sm:block text-[10.5px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-[3px] truncate">{eyebrowText}</p>
          )}
          <h1 className="font-serif font-normal text-[21px] md:text-[25px] text-carbon leading-[1.2] tracking-[-0.3px] truncate">{title}</h1>
          {subtitle && <p className="text-[12.5px] text-slate mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-[10px] shrink-0">{actions}</div>}
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
function StoreWorkspaceProvider({ children }: { children: ReactNode }) {
  const { storeId = '' } = useParams<{ storeId: string }>();
  const [store,   setStore]   = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tick,    setTick]    = useState(0);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await apiGetStoreById(storeId);
        if (!cancelled) setStore(res.data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load store.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [storeId, tick]);

  const refetch = () => setTick(t => t + 1);

  return (
    <StoreWorkspaceCtx.Provider value={{ store, storeId, loading, error, refetch }}>
      {children}
    </StoreWorkspaceCtx.Provider>
  );
}

// ── Seller business-verification status — workspace-wide so a not-yet-
// verified store's owner sees it on every page, not just their store list.
// Reads `verificationStatus` (never `store.status`, which is the separate
// marketplace-listing lifecycle field — see store.schema.ts). A verified
// store never renders anything here. ──
function StoreVerificationBanner() {
  const navigate = useNavigate();
  const { store, storeId } = useStoreWorkspace();
  // A store that's already marketplace-active (including a pre-verification-
  // tracking legacy approval) never shows a verification nag, even if
  // `verificationStatus` is stale/missing — `status` is the authoritative
  // "already approved" signal (see the `verified` comment in StoreSidebar).
  if (!store || store.status === 'active') return null;

  const goToVerification = () => navigate(`/store/${storeId}/verification`);

  switch (store.verificationStatus) {
    case 'rejected':
      return (
        <button onClick={goToVerification} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-error bg-error-bg border-b border-error-border cursor-pointer text-center">
          <XCircle size={14} className="shrink-0" />
          Your business verification was rejected{store.rejectionReason ? `: ${store.rejectionReason}` : '.'}
          <span className="underline font-semibold shrink-0">Fix &amp; resubmit</span>
        </button>
      );
    case 'under_review':
      return (
        <div className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-[#1a5a8a] bg-info-bg border-b border-[#bfdcf3]">
          <Clock size={14} className="shrink-0" />
          Your store is under review by our team — you'll be notified as soon as a decision is made.
        </div>
      );
    case 'pending':
      return (
        <div className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-[#1a5a8a] bg-info-bg border-b border-[#bfdcf3]">
          <Clock size={14} className="shrink-0" />
          Your verification application has been submitted and is waiting to be reviewed.
        </div>
      );
    case 'not_started':
      return (
        <button onClick={goToVerification} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-[#946200] bg-warning-bg border-b border-[#f5dfa6] cursor-pointer text-center">
          <AlertTriangle size={14} className="shrink-0" />
          Your store isn't visible on the marketplace yet — complete business verification to submit it for review.
          <span className="underline font-semibold shrink-0">Complete verification</span>
        </button>
      );
    default:
      return null;
  }
}

// ── Platform-plan billing banner — past-due / scheduled-cancellation / trial-ending,
// surfaced workspace-wide (not just on the Billing Center page) so a seller can't
// miss it just by not visiting that one page. Same source of truth as StorePlanBilling. ──
function PlatformBillingBanner() {
  const navigate = useNavigate();
  const { storeId } = useStoreWorkspace();
  const [sub, setSub] = useState<StorePlatformSubscription | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetStorePlatformPlan(storeId)
      .then(res => { if (!cancelled) setSub(res.data); })
      .catch(() => {}); // non-critical — workspace still works without this banner
    return () => { cancelled = true; };
  }, [storeId]);

  if (!sub) return null;
  const goToBilling = () => navigate(`/store/${storeId}/plan-billing`);

  if (sub.status === 'expired') {
    return (
      <button onClick={goToBilling} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-error bg-error-bg border-b border-error-border cursor-pointer">
        <AlertTriangle size={14} className="shrink-0" />
        Your free trial has ended — choose a plan to keep adding products and selling.
        <span className="underline font-semibold">Choose a plan</span>
      </button>
    );
  }
  if (sub.status === 'past_due') {
    return (
      <button onClick={goToBilling} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-error bg-error-bg border-b border-error-border cursor-pointer">
        <AlertTriangle size={14} className="shrink-0" />
        Your plan payment failed (attempt {sub.failedPaymentAttempts}) — update your payment method to avoid losing access.
        <span className="underline font-semibold">Fix now</span>
      </button>
    );
  }
  if (sub.cancelAtPeriodEnd) {
    return (
      <button onClick={goToBilling} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-[#946200] bg-[#fdf2da] border-b border-[#f5dfa6] cursor-pointer">
        <XCircle size={14} className="shrink-0" />
        Your plan is set to cancel on {new Date(sub.currentPeriodEnd).toDateString()}.
        <span className="underline font-semibold">Reactivate</span>
      </button>
    );
  }
  if (sub.trialEndsAt) {
    const daysLeft = Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    if (daysLeft <= 7) {
      return (
        <button onClick={goToBilling} className="flex w-full items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium text-[#1a5a8a] bg-info-bg border-b border-[#bfdcf3] cursor-pointer">
          <Clock size={14} className="shrink-0" />
          Your trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
          <span className="underline font-semibold">{sub.amountUSD === 0 ? 'Choose a plan' : 'Add a payment method'}</span>
        </button>
      );
    }
  }
  return null;
}

// Shown instead of the real page when the store fetch itself failed (404,
// timeout, 500) — so a genuine backend failure is never indistinguishable
// from "this store just has no data yet" (every nested page would otherwise
// render its fields as blank/zero once `loading` flips false with `store`
// still null). Mirrors `MyStoreCard`'s error state on the top-level seller
// dashboard rather than inventing a second error-state design.
function StoreWorkspaceError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 px-6 py-16 max-w-[440px] mx-auto">
      <div className="size-14 rounded-full bg-error-bg flex items-center justify-center">
        <AlertCircle size={22} className="text-error" />
      </div>
      <div>
        <p className="text-[16px] font-bold text-carbon mb-1.5">Couldn't load your store</p>
        <p className="text-[13px] text-slate leading-[1.6]">{error}</p>
      </div>
      <Button variant="primary" size="md" onClick={onRetry}>Try Again</Button>
    </div>
  );
}

// Swaps in for `<Outlet/>` — renders the real nested route, or a shared
// retry state if the store fetch itself failed, instead of each page
// needing its own error handling.
function GatedOutlet() {
  const { loading, error, refetch } = useStoreWorkspace();
  if (!loading && error) return <StoreWorkspaceError error={error} onRetry={refetch} />;
  // Own boundary: a page chunk still downloading never blanks the sidebar
  // with RootLayout's full-screen spinner.
  return <Suspense fallback={null}><Outlet /></Suspense>;
}

function isFullBleedRoute(pathname: string) {
  return /\/messages(\/|$)/.test(pathname);
}

// Top bar for the store workspace: this store's logo (or its name when it has
// none) and a link to its page — no shopper promos or currency switch.
function StoreTopBar() {
  const { store } = useStoreWorkspace();
  return (
    <PlatformTopBar
      variant="seller"
      store={store ? { name: store.name, logo: store.logo, slug: store.slug } : null}
      showAccount
    />
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function StoreLayout() {
  // Only the dashboard's own content area scrolls — never the page around it.
  useLockPageScroll();
  const { pathname: currentPath } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggle = () => setSidebarOpen(o => !o);

  const user = TokenStorage.getUser<{ role?: AppRole }>();
  if (!TokenStorage.isLoggedIn() || user?.role !== 'seller') {
    // Same `?redirect=` convention as SellerLayout's guard — a buyer/
    // logged-out visitor hitting a store-workspace URL directly (e.g. the
    // verification page) lands back on it after logging in, instead of a
    // bare /login that drops where they were headed.
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  return (
    <StoreWorkspaceProvider>
      <div className={clsx('flex bg-white overflow-hidden', 'h-screen')}>
        <StoreSidebar open={sidebarOpen} onToggle={toggle} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <StoreTopBar />
          <AnnouncementBanner audience="sellers" />
          <StoreVerificationBanner />
          <PlatformBillingBanner />
          <div className="flex-1 overflow-y-auto overscroll-contain pb-[64px] lg:pb-0">
            {/* Content column capped at a readable studio width; the builder
               and messages views keep the full canvas they need. */}
            <div className={isFullBleedRoute(currentPath) ? 'min-h-full' : 'w-full max-w-[1440px] mx-auto min-h-full'}>
              <GatedOutlet />
            </div>
          </div>
        </div>
      </div>
      <StoreBottomNav />
    </StoreWorkspaceProvider>
  );
}
