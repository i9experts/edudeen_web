import { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Users, Shield, Store, DollarSign, Bell, Settings, UserCog,
  PanelLeftClose, PanelLeftOpen, MessageSquare, Image as ImageIcon, HelpCircle, FolderTree, RefreshCw,
  BarChart3, Layers, Search, Sparkles, Tag, LogOut, MessageCircle, Landmark, Percent, Coins, UserPlus, Activity,
  ChevronDown, TrendingUp, ChevronRight, Quote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useLogout } from '@/hooks/auth/useLogout';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { TokenStorage, type AppRole } from '@/api/services/auth';
import { CommandPalette } from '@/components/comman/ui/CommandPalette';
import { Modal, Button, CopyIconButton } from '@/components/comman/ui';

interface AdminNavItem {
  id:    string;
  Icon:  LucideIcon;
  label: string;
  path:  string;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { id: 'overview',      Icon: LayoutDashboard, label: 'Overview',        path: '/admin'               },
  { id: 'analytics',     Icon: BarChart3,       label: 'Analytics',       path: '/admin/analytics'     },
  { id: 'users',         Icon: Users,           label: 'Users & Sellers', path: '/admin/users'         },
  { id: 'moderation',    Icon: Shield,          label: 'Moderation',      path: '/admin/moderation'    },
  { id: 'activity-log',  Icon: Activity,        label: 'Activity Log',    path: '/admin/activity-log'  },
  { id: 'messages',      Icon: MessageSquare,   label: 'Messaging',       path: '/admin/messages'      },
  { id: 'leads',         Icon: UserPlus,        label: 'Leads',           path: '/admin/leads'         },
  { id: 'marketplace',   Icon: Store,           label: 'Marketplace',     path: '/admin/marketplace'   },
  { id: 'categories',    Icon: FolderTree,      label: 'Categories',      path: '/admin/categories'    },
  { id: 'subscriptions', Icon: RefreshCw,       label: 'Subscriptions',   path: '/admin/subscriptions' },
  { id: 'marketing',     Icon: Tag,             label: 'Marketing',       path: '/admin/marketing'     },
  { id: 'platform-plans',Icon: Layers,          label: 'Platform Plans',  path: '/admin/platform-plans' },
  { id: 'finance',       Icon: DollarSign,      label: 'Finance',         path: '/admin/finance'       },
  { id: 'manual-payments', Icon: Landmark,      label: 'Manual Payments', path: '/admin/manual-payments' },
  { id: 'commission-rules', Icon: Percent,      label: 'Commission Rules', path: '/admin/commission-rules' },
  { id: 'fx-settings',   Icon: Coins,           label: 'FX Settings',     path: '/admin/fx-settings'   },
  { id: 'seo',           Icon: Search,          label: 'SEO',             path: '/admin/seo'           },
  { id: 'ai-studio',     Icon: Sparkles,        label: 'AI Studio',       path: '/admin/ai-studio'     },
  { id: 'banners',       Icon: ImageIcon,       label: 'Banners',         path: '/admin/banners'       },
  { id: 'faqs',          Icon: HelpCircle,      label: 'FAQs',            path: '/admin/faqs'          },
  { id: 'contact',       Icon: MessageCircle,   label: 'Contact Messages',path: '/admin/contact'       },
  { id: 'testimonials',  Icon: Quote,           label: 'Testimonials',   path: '/admin/testimonials'  },
  { id: 'announcements', Icon: Bell,            label: 'Announcements',   path: '/admin/announcements' },
  { id: 'config',        Icon: Settings,        label: 'Platform Config', path: '/admin/config'        },
  { id: 'settings',      Icon: UserCog,         label: 'My Settings',     path: '/admin/settings'      },
];

interface AdminModule {
  id:    string;
  label: string;
  Icon:  LucideIcon;
  ids:   AdminNavItem['id'][];
}

// Sidebar presentation only — every route/page listed in ADMIN_NAV above
// still exists and works exactly as before; this only controls how they're
// grouped and revealed. 'settings' is deliberately excluded from every
// module here — "My Settings" moves to the account menu in the sidebar
// footer instead of taking up a primary navigation slot (see AdminSidebar's
// footer + accountMenuItems below). A module with exactly one id (Overview,
// Analytics) renders as a plain link, not a collapsible group — there's
// nothing to expand for a "section" that's really just one page.
export const ADMIN_MODULES: AdminModule[] = [
  { id: 'overview',  label: 'Overview',             Icon: LayoutDashboard, ids: ['overview'] },
  { id: 'commerce',  label: 'Commerce',             Icon: Store,           ids: ['marketplace', 'categories', 'leads', 'subscriptions', 'platform-plans'] },
  { id: 'people',    label: 'Users & Communication', Icon: Users,          ids: ['users', 'moderation', 'messages', 'contact'] },
  { id: 'growth',    label: 'Growth',                Icon: TrendingUp,     ids: ['marketing', 'seo', 'ai-studio'] },
  { id: 'finance',   label: 'Finance',               Icon: DollarSign,     ids: ['finance', 'manual-payments', 'commission-rules', 'fx-settings'] },
  { id: 'content',   label: 'Content',               Icon: ImageIcon,      ids: ['banners', 'faqs', 'testimonials', 'announcements'] },
  { id: 'analytics', label: 'Analytics',             Icon: BarChart3,       ids: ['analytics'] },
  { id: 'system',    label: 'System',                Icon: Settings,       ids: ['activity-log', 'config'] },
];

function isNavItemActive(item: AdminNavItem, pathname: string) {
  return item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
}

// Which module should be expanded for a given route — the module whose
// child list contains the currently active page. Used both for the
// sidebar's initial state and to re-sync whenever the route changes (e.g.
// navigating via the command palette), without fighting a manual
// expand/collapse the admin made while staying on the same page.
function moduleForPath(pathname: string): string | null {
  for (const m of ADMIN_MODULES) {
    if (m.ids.some(id => {
      const item = ADMIN_NAV.find(n => n.id === id);
      return item ? isNavItemActive(item, pathname) : false;
    })) return m.id;
  }
  return null;
}

// ── Shared grouped nav menu — the mobile "account hub" content for the admin
// panel, mirroring StoreLayout's StoreNavMenu/StoreSettings pattern: every
// module except 'overview' (its own bottom-nav tab) lives here, reached via
// the bottom nav's "Settings" tab rather than the dashboard — one source of
// truth for the full page list instead of a hamburger-triggered copy of the
// desktop sidebar. `excludeItemIds` lets a caller drop whatever it already
// covers itself (AdminSettings drops 'settings', the page it already is).
export function AdminNavMenu({ excludeItemIds = [] }: { excludeItemIds?: string[] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hiddenItems = new Set(excludeItemIds);

  return (
    <div className="flex flex-col gap-4">
      {ADMIN_MODULES.filter(m => m.id !== 'overview')
        .map(module => ({ ...module, items: module.ids.map(id => ADMIN_NAV.find(n => n.id === id)).filter((n): n is AdminNavItem => !!n && !hiddenItems.has(n.id)) }))
        .filter(module => module.items.length > 0)
        .map(module => (
        <div key={module.id} className="bg-white border border-bone rounded-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-2">
            <p className="text-[10.5px] font-bold text-slate uppercase tracking-[0.06em]">{module.label}</p>
          </div>
          <div className="divide-y divide-[#f3f2ec]">
            {module.items.map(item => {
              const active = isNavItemActive(item, pathname);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 px-5 py-[13px] bg-transparent border-0 cursor-pointer text-left hover:bg-cream transition-colors"
                >
                  <div className={clsx('w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0', active ? 'bg-brand-orange' : 'bg-brand-pale-orange')}>
                    <item.Icon size={15} className={active ? 'text-white' : 'text-brand-orange'} />
                  </div>
                  <span className={clsx('flex-1 text-[13px] font-medium', active ? 'text-brand-deep-orange' : 'text-charcoal')}>{item.label}</span>
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
// destinations, same icon-only pattern as SellerBottomNav/StoreBottomNav.
// The last tab ("Settings") is where every other module lives (via
// AdminSettings' own mobile menu) — the dashboard stays a pure glance page,
// it doesn't double as a menu of everything.
const ADMIN_TABS: { id: string; Icon: LucideIcon; label: string; path: string }[] = [
  { id: 'overview',   Icon: LayoutDashboard, label: 'Overview',    path: '/admin'            },
  { id: 'users',      Icon: Users,           label: 'Users',       path: '/admin/users'      },
  { id: 'marketplace',Icon: Store,           label: 'Marketplace', path: '/admin/marketplace' },
  { id: 'moderation', Icon: Shield,          label: 'Moderation',  path: '/admin/moderation' },
  { id: 'settings',   Icon: Settings,        label: 'Settings',    path: '/admin/settings'   },
];

function AdminBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path: string) => (path === '/admin' ? pathname === '/admin' : pathname.startsWith(path));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-bone">
      <div className="flex items-stretch">
        {ADMIN_TABS.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
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

interface AdminSidebarProps { open: boolean; onToggle: () => void; }

// Desktop only now — mobile navigation is AdminBottomNav below, a real
// bottom tab bar plus a "Settings" tab that hosts every other module's
// AdminNavMenu, instead of a hamburger-triggered copy of this same dark rail.
function AdminSidebar({ open, onToggle }: AdminSidebarProps) {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { profile, loading: profileLoading } = useGetProfile();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const logout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Accordion state — only the module containing the current page is open
  // by default; re-synced on every route change, but a manual
  // expand/collapse while staying on the same page is left alone.
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(() => moduleForPath(pathname));
  useEffect(() => { setExpandedModuleId(moduleForPath(pathname)); }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout('/admin/login');
  };

  const isActive = (path: string) =>
    path === '/admin' ? pathname === '/admin' : pathname.startsWith(path);

  const goTo = (path: string) => navigate(path);

  const paletteItems = ADMIN_NAV.map(item => ({
    id:       item.id,
    label:    item.label,
    icon:     item.Icon,
    onSelect: () => navigate(item.path),
  }));

  const toggleBtn = (
    <button
      onClick={onToggle}
      title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      className="size-8 rounded-md flex items-center justify-center shrink-0 text-pos-muted hover:text-white hover:bg-dark-active transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
    >
      {open ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
    </button>
  );

  const paletteHint = (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      title="Search (Ctrl+K)"
      className={clsx(
        'flex items-center gap-1 rounded-md border border-dark-active text-pos-muted hover:text-white hover:bg-dark-active transition-colors duration-150 cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40',
        open ? 'px-[7px] py-[3px] text-[10px] font-semibold' : 'size-8 justify-center text-[9px] font-semibold',
      )}
    >
      {open ? '⌘K' : 'K'}
    </button>
  );

  return (
    <>
      <aside className={clsx(
        'hidden lg:flex bg-admin-bg flex-col shrink-0',
        'transition-[width] duration-300 ease-in-out',
        import.meta.env.DEV ? 'h-[calc(100vh-44px)]' : 'h-screen',
        open ? 'w-[220px]' : 'w-[60px]',
      )}>

        {/* Header: logo + toggle (mirrors StoreLayout/SellerLayout header) */}
        {open ? (
          <div className="px-5 pt-5 pb-4 shrink-0 flex items-center gap-[9px]">
            <div className="size-[30px] rounded-md bg-brand-orange flex items-center justify-center shrink-0">
              <Shield size={15} className="text-white" />
            </div>
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-[17px] font-bold text-white tracking-[-0.3px]">Edudeen</span>
              <span className="text-[17px] font-bold text-brand-orange tracking-[-0.3px]">&nbsp;Admin</span>
            </div>
            {paletteHint}
            {toggleBtn}
          </div>
        ) : (
          <div className="pt-5 pb-4 flex flex-col items-center gap-[6px] shrink-0">
            <div className="size-[30px] rounded-md bg-brand-orange flex items-center justify-center shrink-0">
              <Shield size={15} className="text-white" />
            </div>
            {paletteHint}
            {toggleBtn}
          </div>
        )}

        {/* Nav — module-based accordion. Each module is either a single
            direct link (Overview, Analytics — nothing to expand) or a
            collapsible group; only one group is open at a time. */}
        <nav className={clsx('flex-1 overflow-y-auto py-1', open ? 'px-3' : 'px-[10px] pt-1')}>
          {ADMIN_MODULES.map(module => {
            const children = module.ids
              .map(id => ADMIN_NAV.find(n => n.id === id))
              .filter((n): n is AdminNavItem => !!n);
            if (!children.length) return null;

            const single = children.length === 1 ? children[0] : null;

            if (single) {
              const active = isActive(single.path);
              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => goTo(single.path)}
                  title={!open ? module.label : undefined}
                  aria-label={module.label}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'w-full flex items-center gap-[10px] py-[11px] lg:py-[9px] px-[10px] rounded-md mb-0.5 border-none text-left',
                    'cursor-pointer transition-colors duration-150 outline-none',
                    'focus-visible:ring-2 focus-visible:ring-brand-orange/40',
                    'active:scale-[0.98]',
                    !open && 'lg:justify-center lg:px-0',
                    active ? 'bg-dark-active' : 'bg-transparent hover:bg-dark-active',
                  )}
                >
                  <module.Icon
                    size={15}
                    className={clsx('shrink-0 transition-opacity duration-150', active ? 'text-brand-orange opacity-100' : 'text-pos-faint opacity-40')}
                  />
                  {open && (
                    <>
                      <span className={clsx('text-[12px] flex-1 truncate', active ? 'font-semibold text-white' : 'font-normal text-pos-faint')}>
                        {module.label}
                      </span>
                      {active && <div className="w-[3px] h-3 rounded-[2px] bg-brand-orange shrink-0" />}
                    </>
                  )}
                </button>
              );
            }

            const expanded = open && expandedModuleId === module.id;
            const moduleHasActive = children.some(c => isActive(c.path));
            const groupId = `admin-nav-group-${module.id}`;

            return (
              <div key={module.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!open) {
                      // Collapsed icon-rail: reopen the sidebar straight into this module.
                      onToggle();
                      setExpandedModuleId(module.id);
                      return;
                    }
                    setExpandedModuleId(curr => (curr === module.id ? null : module.id));
                  }}
                  title={!open ? module.label : undefined}
                  aria-label={module.label}
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  className={clsx(
                    'w-full flex items-center gap-[10px] py-[11px] lg:py-[9px] px-[10px] rounded-md border-none text-left',
                    'cursor-pointer transition-colors duration-150 outline-none',
                    'focus-visible:ring-2 focus-visible:ring-brand-orange/40',
                    'active:scale-[0.98]',
                    !open && 'lg:justify-center lg:px-0',
                    expanded ? 'bg-dark-active' : 'bg-transparent hover:bg-dark-active',
                  )}
                >
                  <module.Icon
                    size={15}
                    className={clsx('shrink-0 transition-opacity duration-150', moduleHasActive ? 'text-brand-orange opacity-100' : 'text-pos-faint opacity-40')}
                  />
                  {open && (
                    <>
                      <span className={clsx('text-[12px] flex-1 truncate', moduleHasActive ? 'font-semibold text-white' : 'font-normal text-pos-faint')}>
                        {module.label}
                      </span>
                      <ChevronDown
                        size={13}
                        className={clsx('shrink-0 text-pos-faint transition-transform duration-200', expanded && 'rotate-180')}
                      />
                    </>
                  )}
                </button>

                {expanded && (
                  <div id={groupId} role="group" aria-label={module.label} className="mt-0.5 pl-[27px] flex flex-col gap-0.5">
                    {children.map(item => {
                      const active = isActive(item.path);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => goTo(item.path)}
                          aria-current={active ? 'page' : undefined}
                          className={clsx(
                            'w-full flex items-center gap-[8px] py-[9px] px-[8px] rounded-md border-none text-left',
                            'cursor-pointer transition-colors duration-150 outline-none',
                            'focus-visible:ring-2 focus-visible:ring-brand-orange/40',
                            'active:scale-[0.98]',
                            active ? 'bg-dark-active' : 'bg-transparent hover:bg-dark-active',
                          )}
                        >
                          <item.Icon
                            size={13}
                            className={clsx('shrink-0', active ? 'text-brand-orange opacity-100' : 'text-pos-faint opacity-40')}
                          />
                          <span className={clsx('text-[11.5px] flex-1 truncate', active ? 'font-semibold text-white' : 'font-normal text-pos-faint')}>
                            {item.label}
                          </span>
                          {active && <div className="w-[3px] h-3 rounded-[2px] bg-brand-orange shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User footer — mirrors StoreLayout/SellerLayout's bottom profile
            card exactly (plain row, no dropdown): the row itself is a
            direct link to My Settings, plus a separate Logout button. */}
        <div className="px-3 py-3 border-t border-dark-active shrink-0">
          <div className={clsx('flex items-center gap-1', !open && 'flex-col gap-2')}>
            <button
              type="button"
              onClick={() => goTo('/admin/settings')}
              title="My Settings"
              aria-label="My Settings"
              className={clsx(
                'flex items-center gap-2 rounded-md py-1.5 px-1 border-none text-left flex-1 min-w-0',
                'cursor-pointer transition-colors duration-150 outline-none',
                'hover:bg-dark-active focus-visible:ring-2 focus-visible:ring-brand-orange/40',
                !open && 'flex-col justify-center',
              )}
            >
              <div className="size-7 rounded-full shrink-0 bg-brand-orange flex items-center justify-center overflow-hidden text-[10px] font-bold text-white">
                {profileLoading
                  ? <div className="animate-pulse w-full h-full bg-charcoal" />
                  : profile?.profileImage
                    ? <img loading="lazy" decoding="async" src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                    : (profile?.name?.slice(0, 2).toUpperCase() ?? 'AD')}
              </div>
              {open && (
                <div className="flex-1 min-w-0">
                  {profileLoading ? (
                    <>
                      <div className="animate-pulse w-20 h-[11px] rounded-[3px] bg-charcoal mb-1" />
                      <div className="animate-pulse w-[110px] h-[9px] rounded-[3px] bg-charcoal" />
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] font-semibold text-white leading-[1.3] truncate">{profile?.name ?? 'Admin'}</p>
                      <p className="text-[10px] text-pos-muted leading-[1.3] truncate">{profile?.email ?? '—'}</p>
                    </>
                  )}
                </div>
              )}
            </button>
            {open && profile?.email && (
              <CopyIconButton value={profile.email} title="Copy email" size={13} className="text-pos-muted hover:text-white" />
            )}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
              aria-label="Logout"
              className="size-8 rounded-md flex items-center justify-center shrink-0 text-pos-muted hover:text-white hover:bg-dark-active transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <CommandPalette items={paletteItems} open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {showLogoutConfirm && (
        <Modal title="Log out?" onClose={() => setShowLogoutConfirm(false)} footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogoutConfirm(false)} disabled={loggingOut}>Cancel</Button>
            <Button variant="primary" onClick={handleLogout} loading={loggingOut}>Logout</Button>
          </>
        }>
          <p className="text-[13px] text-slate">You'll need to sign in again to access the admin panel.</p>
        </Modal>
      )}
    </>
  );
}

export function AdminLayout() {
  const { pathname: currentPath } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggle = () => setSidebarOpen(o => !o);

  const user = TokenStorage.getUser<{ role?: AppRole }>();
  if (!TokenStorage.isLoggedIn() || user?.role !== 'admin') {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  return (
    <div className={clsx('flex bg-cream overflow-hidden', import.meta.env.DEV ? 'h-[calc(100vh-44px)]' : 'h-screen')}>
      <AdminSidebar open={sidebarOpen} onToggle={toggle} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-[64px] lg:pb-0">
          <Outlet />
        </div>
      </div>
      <AdminBottomNav />
    </div>
  );
}
