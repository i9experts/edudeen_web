import { type ReactNode, useState, useRef, useEffect } from 'react';
import { ActiveStoreProvider, useActiveStore } from '@/contexts/ActiveStoreContext';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useLogout } from '@/hooks/auth/useLogout';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { TokenStorage, type AppRole } from '@/api/services/auth';
import { CommandPalette, type CommandPaletteItem } from '@/components/comman/ui/CommandPalette';
import { Modal, Button, CopyIconButton } from '@/components/comman/ui';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  Store,
  Settings, BarChart2,
  ChevronDown, Plus, PanelLeftClose, PanelLeftOpen, LogOut,
} from 'lucide-react';
import { EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { NotificationBell, AnnouncementBanner, CurrencySelector } from '@/components/comman/ui';

// ── Types ──────────────────────────────────────────────────────────────────────
interface NavItem {
  id:    string;
  Icon:  LucideIcon;
  label: string;
  path:  string;
}
interface NavDropdown {
  id:       string;
  Icon:     LucideIcon;
  label:    string;
  children: NavItem[];
}
type NavEntry = NavItem | NavDropdown;
interface NavSection {
  label: string;
  items: NavEntry[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { id: 'store-list',    Icon: Store,  label: 'My Stores',    path: '/seller/stores' },

      // {
      //   id: 'my-store', Icon: Store, label: 'My Store',
      //   children: [
      //     { id: 'store-list',    Icon: List,  label: 'Store List',    path: '/seller/stores' },
      //     { id: 'store-builder', Icon: Store, label: 'Store Builder', path: '/seller/store'  },
      //   ],
      // },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'analytics', Icon: BarChart2, label: 'Analytics', path: '/seller/analytics' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings',  Icon: Settings,  label: 'Settings',  path: '/seller/settings'  },
    ],
  },
];

function isDropdownEntry(item: NavEntry): item is NavDropdown {
  return 'children' in item;
}

function buildPaletteItems(navigate: (path: string) => void): CommandPaletteItem[] {
  const result: CommandPaletteItem[] = [];
  NAV_SECTIONS.forEach(section => {
    section.items.forEach(item => {
      if (isDropdownEntry(item)) {
        item.children.forEach(child => {
          result.push({
            id:       child.id,
            label:    child.label,
            group:    section.label,
            icon:     child.Icon,
            onSelect: () => navigate(child.path),
          });
        });
      } else {
        result.push({
          id:       item.id,
          label:    item.label,
          group:    section.label,
          icon:     item.Icon,
          onSelect: () => navigate(item.path),
        });
      }
    });
  });
  return result;
}

// ── Store Switcher ────────────────────────────────────────────────────────────
function SidebarStoreSwitcher() {
  const navigate = useNavigate();
  const { stores, loading } = useActiveStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = loading ? 'Loading…' : 'My Stores';
  const displaySub  = loading ? '' : `${stores.length} store${stores.length !== 1 ? 's' : ''}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className={clsx(
          'w-full rounded-md py-2 px-[10px] flex items-center gap-2',
          'cursor-pointer border-0 transition-colors duration-150',
          open ? 'bg-charcoal' : 'bg-dark-active hover:bg-charcoal',
        )}
      >
        <div className="size-6 rounded-sm bg-brand-orange flex items-center justify-center shrink-0">
          <Store size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-semibold text-white leading-[1.3] truncate">{displayName}</p>
          {displaySub && <p className="text-[10px] text-slate leading-[1.3]">{displaySub}</p>}
        </div>
        <ChevronDown size={13} className={clsx('text-slate shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[200] bg-[#1a1917] border border-charcoal rounded-[10px] p-[6px]">
          <p className="text-[10px] font-semibold text-dark-label uppercase tracking-[0.08em] px-[10px] pt-1 pb-2">
            Switch Store
          </p>
          <div className="max-h-[205px] overflow-y-auto">
            {stores.map(store => (
              <SidebarStoreItem
                key={store._id}
                label={store.name}
                sub={`/${store.slug} · ${store.plan}`}
                logo={store.logo}
                onClick={() => { navigate(`/store/${store._id}/dashboard`); setOpen(false); }}
              />
            ))}
            {stores.length === 0 && !loading && (
              <p className="text-[11px] text-dark-label px-[10px] py-[6px]">No stores yet</p>
            )}
          </div>
          <div className="h-px bg-charcoal mx-[6px] my-1" />
          <button
            onClick={() => { setOpen(false); navigate('/onboard'); }}
            className="flex items-center gap-[7px] w-full py-2 px-[10px] rounded-[7px] bg-transparent border-0 cursor-pointer text-[11px] font-semibold text-brand-orange hover:bg-charcoal transition-colors duration-150"
          >
            <Plus size={12} /> New Store
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarStoreItem({ label, sub, logo, onClick }: {
  label:   string;
  sub:     string;
  logo?:   string | null;
  onClick: () => void;
}) {
  const initials = label.slice(0, 2).toUpperCase();
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[9px] w-full py-[7px] px-[10px] rounded-md bg-transparent border-0 cursor-pointer text-left transition-colors duration-[120ms] hover:bg-dark-hover"
    >
      <div className="size-[26px] rounded-[7px] shrink-0 bg-charcoal overflow-hidden flex items-center justify-center text-[9px] font-bold text-slate">
        {logo ? <img loading="lazy" decoding="async" src={logo} alt={label} className="w-full h-full object-cover" /> : initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-dark-text truncate">{label}</p>
        <p className="text-[10px] text-dark-label">{sub}</p>
      </div>
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function isDropdown(item: NavEntry): item is NavDropdown {
  return 'children' in item;
}

interface SellerSidebarProps { open: boolean; onToggle: () => void; }

// Desktop only now — mobile navigation is `SellerBottomNav` below, a real
// bottom tab bar (this sidebar's 4 items map 1:1 onto 4 tabs) instead of a
// hamburger-triggered copy of this same dark rail.
function SellerSidebar({ open, onToggle }: SellerSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const { profile, loading: profileLoading } = useGetProfile();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const logout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    // Seller-only web login (see LoginPage's SELLER_ONLY_LOGIN) — a signed-out
    // seller belongs back at /login, not the public homepage default.
    await logout('/login');
  };

  const isActive     = (path: string) => pathname === path || pathname.startsWith(path + '/');
  const toggleDropdown = (id: string) => setOpenDropdowns(prev => ({ ...prev, [id]: !prev[id] }));

  const paletteItems = buildPaletteItems(navigate);

  const toggleBtn = (
    <button
      onClick={onToggle}
      title={open ? 'Collapse sidebar' : 'Expand sidebar'}
      className="size-7 rounded-md flex items-center justify-center shrink-0 text-slate hover:text-white hover:bg-dark-active transition-colors cursor-pointer"
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
        'flex items-center gap-1 rounded-md border border-dark-active text-slate hover:text-white hover:bg-dark-active transition-colors cursor-pointer shrink-0',
        open ? 'px-[7px] py-[3px] text-[10px] font-semibold' : 'size-7 justify-center text-[9px] font-semibold',
      )}
    >
      {open ? '⌘K' : 'K'}
    </button>
  );

  return (
    <>
      <aside className={clsx(
        'hidden lg:flex bg-carbon flex-col shrink-0',
        'transition-[width] duration-300 ease-in-out',
        'h-screen',
        open ? 'w-[220px]' : 'w-[60px]',
      )}>

        {/* Header: logo + toggle */}
        {open ? (
          <div className="px-5 pt-5 pb-4 shrink-0 flex items-center gap-[9px]">
            <div className="shrink-0"><EdudeenIcon size={28} /></div>
            <div className="flex items-center flex-1 min-w-0">
              <span className="text-[17px] font-bold text-white tracking-[-0.3px]">Solvex</span>
              <span className="text-[17px] font-bold text-brand-orange tracking-[-0.3px]">o</span>
            </div>
            {paletteHint}
            {toggleBtn}
          </div>
        ) : (
          <div className="pt-5 pb-4 flex flex-col items-center gap-[6px] shrink-0">
            {paletteHint}
            {toggleBtn}
          </div>
        )}

        {/* Store switcher (only when expanded) */}
        {open && (
          <div className="px-5 pb-4 shrink-0">
            <SidebarStoreSwitcher />
          </div>
        )}

        {/* Nav sections */}
        <nav className={clsx('flex-1 overflow-y-auto', open ? 'px-3 pt-1' : 'px-[10px] pt-2')}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="mb-1">
              {open
                ? <p className="text-[10px] font-semibold text-dark-label block px-2 py-1 uppercase tracking-[0.08em] mb-1">{section.label}</p>
                : <div className="h-px bg-dark-active mx-1 mb-2" />
              }

              {section.items.map(item => {
                if (isDropdown(item)) {
                  const isOpen = openDropdowns[item.id] ?? false;
                  const anyChildActive = item.children.some(c => isActive(c.path));

                  if (!open) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(item.children[0].path)}
                        title={item.label}
                        aria-label={item.label}
                        className={clsx(
                          'w-full flex items-center justify-center py-[9px] rounded-md mb-0.5 cursor-pointer border-none transition-colors duration-150',
                          anyChildActive ? 'bg-dark-active' : 'bg-transparent hover:bg-dark-active',
                        )}
                      >
                        <item.Icon size={15} className={clsx('shrink-0', anyChildActive ? 'text-brand-orange opacity-100' : 'text-slate opacity-45')} />
                      </button>
                    );
                  }

                  return (
                    <div key={item.id} className="mb-0.5">
                      <button
                        type="button"
                        onClick={() => toggleDropdown(item.id)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center gap-[10px] py-[9px] px-[10px] rounded-md cursor-pointer border-none text-left transition-colors duration-150 hover:bg-dark-active"
                      >
                        <item.Icon size={15} className={clsx('shrink-0', anyChildActive ? 'text-brand-orange opacity-100' : 'text-slate opacity-45')} />
                        <span className={clsx('text-[13px] flex-1', anyChildActive ? 'font-semibold text-white' : 'font-normal text-slate')}>
                          {item.label}
                        </span>
                        <ChevronDown size={14} className={clsx('text-slate transition-transform duration-200', isOpen && 'rotate-180')} />
                      </button>
                      {isOpen && (
                        <div className="pl-[18px]">
                          {item.children.map(child => {
                            const active = isActive(child.path);
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => navigate(child.path)}
                                aria-current={active ? 'page' : undefined}
                                className={clsx(
                                  'w-full flex items-center gap-[10px] py-2 px-[10px] rounded-md mb-0.5 border-none text-left',
                                  'cursor-pointer transition-colors duration-150',
                                  active ? 'bg-dark-active' : 'bg-transparent hover:bg-dark-active',
                                )}
                              >
                                <child.Icon size={13} className={clsx('shrink-0', active ? 'text-brand-orange opacity-100' : 'text-slate opacity-45')} />
                                <span className={clsx('text-[12px] flex-1', active ? 'font-semibold text-white' : 'font-normal text-slate')}>
                                  {child.label}
                                </span>
                                {active && <div className="w-[3px] h-[14px] rounded-[2px] bg-brand-orange shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.path)}
                    title={!open ? item.label : undefined}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'w-full flex items-center gap-[10px] py-[9px] px-[10px] rounded-md mb-0.5 border-none text-left',
                      'cursor-pointer transition-colors duration-150',
                      !open && 'lg:justify-center lg:px-0',
                      active ? 'bg-dark-active' : 'bg-transparent hover:bg-dark-active',
                    )}
                  >
                    <item.Icon size={15} className={clsx('shrink-0', active ? 'text-brand-orange opacity-100' : 'text-slate opacity-45')} />
                    {open && (
                      <>
                        <span className={clsx('text-[13px] flex-1', active ? 'font-semibold text-white' : 'font-normal text-slate')}>
                          {item.label}
                        </span>
                        {active && <div className="w-[3px] h-[14px] rounded-[2px] bg-brand-orange shrink-0" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-dark-active shrink-0">
          <div className={clsx('flex items-center gap-2', !open && 'flex-col')}>
            <div className="size-7 rounded-full shrink-0 bg-charcoal flex items-center justify-center overflow-hidden">
              {profileLoading
                ? <div className="animate-pulse w-full h-full bg-[#3c3a38]" />
                : profile?.profileImage
                  ? <img loading="lazy" decoding="async" src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
                  : <span className="text-[10px] font-bold text-brand-orange">{profile?.name?.slice(0, 2).toUpperCase() ?? '--'}</span>
              }
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
                    <p className="text-[12px] font-medium text-white leading-[1.3] truncate">{profile?.name ?? '—'}</p>
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-[10px] text-slate leading-[1.3] truncate">{profile?.email ?? '—'}</p>
                      {profile?.email && (
                        <CopyIconButton value={profile.email} title="Copy email" size={11} className="text-slate hover:text-white" />
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Logout"
              aria-label="Logout"
              className="size-7 rounded-md flex items-center justify-center shrink-0 text-slate hover:text-white hover:bg-dark-active transition-colors cursor-pointer"
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
          <p className="text-[13px] text-slate">You'll need to sign in again to access your seller dashboard.</p>
        </Modal>
      )}
    </>
  );
}

// ── Mobile bottom tab bar — real navigation, not a hamburger-triggered copy
// of the desktop sidebar. The sidebar's 4 items map 1:1 onto these 4 tabs,
// icon-only + a small underline for the active tab, same pattern as the
// buyer side's BottomNav. Desktop keeps the sidebar exactly as it was. ────
const SELLER_TABS: { id: string; Icon: LucideIcon; label: string; path: string }[] = [
  { id: 'stores',    Icon: Store,           label: 'My Stores',  path: '/seller/stores'    },
  { id: 'analytics', Icon: BarChart2,       label: 'Analytics',  path: '/seller/analytics' },
  { id: 'settings',  Icon: Settings,        label: 'Settings',   path: '/seller/settings'  },
];

function SellerBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-bone">
      <div className="flex items-stretch">
        {SELLER_TABS.map(tab => {
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

// ── Page Header (exported for seller pages) ───────────────────────────────────
export interface SellerPageHeaderProps {
  title:     string;
  subtitle?: string;
  actions?:  ReactNode;
}

export function SellerPageHeader({ title, subtitle, actions }: SellerPageHeaderProps) {
  return (
    <div className="bg-white/90 backdrop-blur-md border-b border-bone px-4 md:px-7 py-[14px] flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div>
        <h1 className="text-[18px] font-bold text-carbon leading-[1.3]">{title}</h1>
        {subtitle && <p className="text-[12px] text-slate mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-[10px]">
        {actions}
        <NotificationBell />
        <CurrencySelector />
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function SellerLayout() {
  const { pathname: currentPath } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggle = () => setSidebarOpen(o => !o);

  const user = TokenStorage.getUser<{ role?: AppRole }>();
  if (!TokenStorage.isLoggedIn() || user?.role !== 'seller') {
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  return (
    <ActiveStoreProvider>
      <div className={clsx('flex bg-cream', 'h-screen')}>
        <SellerSidebar open={sidebarOpen} onToggle={toggle} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AnnouncementBanner audience="sellers" />
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[64px] lg:pb-0">
            <Outlet />
          </div>
        </div>
      </div>
      <SellerBottomNav />
    </ActiveStoreProvider>
  );
}
