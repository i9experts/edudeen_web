import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Menu, X, ShoppingCart, User, Store as StoreIcon, Search } from 'lucide-react';
import { useStorefront, useStorefrontPaths } from './StorefrontContext';
import { useCartContext } from '@/contexts/CartContext';
import { TokenStorage } from '@/api/services/auth';
import { ThemedButton } from './ThemedButton';

type ResolveLink = ReturnType<typeof useStorefront>['resolveLink'];

// One nav link, shared by the desktop and mobile menus — renders as a
// themed button when the seller toggled "Highlight as button" on it in the
// Store Builder, otherwise the same plain text link as before.
function NavLinkItem({ link, resolveLink, className, onNavigate }: {
  link: { _id?: string; settings: Record<string, any> };
  resolveLink: ResolveLink;
  className: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const { to, href } = resolveLink(link.settings as { linkType: string; pageSlug?: string; url?: string; categoryId?: string; collectionId?: string });
  const label = link.settings.label as string;

  if (link.settings.highlight) {
    return (
      <ThemedButton
        key={link._id ?? label}
        size="sm"
        onClick={() => { onNavigate?.(); if (to) navigate(to); else if (href) window.open(href, '_blank', 'noopener,noreferrer'); }}
      >
        {label}
      </ThemedButton>
    );
  }
  return to
    ? <Link key={link._id ?? label} to={to} onClick={onNavigate} className={className}>{label}</Link>
    : <a key={link._id ?? label} href={href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>{label}</a>;
}

// The seller's own storefront chrome — deliberately has ZERO Edudeen branding
// (no Edudeen logo, no platform nav links). Used only on a store's own
// subdomain via `StorefrontLayout`; the rest of the app keeps the shared
// `BuyerNavbar`. Cart and (logged-out) sign-in now stay on this same
// subdomain (`StorefrontCartPage`/`StorefrontLoginPage`, both store-scoped)
// — only the logged-in Account button still hard-navigates cross-origin to
// the apex app's Account Workspace, since there's no storefront-local
// account view yet (a later phase).
export function StorefrontNavbar() {
  const navigate = useNavigate();
  const { store, theme, cfg, resolveLink } = useStorefront();
  const { path, toMain, basePath } = useStorefrontPaths();
  const { cartCount } = useCartContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isLoggedIn = TokenStorage.isLoggedIn();

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`${path('/search')}?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
  };

  const logoUrl = theme?.header?.logoSource === 'custom' ? theme.header.customLogoUrl : store.logo;
  const navLinks = theme?.header?.blocks?.filter(b => b.type === 'nav_link') ?? [];
  const navAlignment = theme?.header?.navAlignment ?? 'left';
  const isCentered = cfg.headerStyle === 'centered';
  const dark = cfg.isDarkTheme;

  const logo = (
    <Link to={path('/')} className="flex items-center gap-2 shrink-0 no-underline">
      {logoUrl
        ? <img src={logoUrl} alt={store.name} className="w-9 h-9 rounded-lg object-cover" />
        : <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${cfg.primaryColor}18` }}>
            <StoreIcon size={18} style={{ color: cfg.primaryColor }} />
          </div>
      }
      <span className={clsx('font-bold text-[15px] truncate max-w-[160px]', dark ? 'text-white' : 'text-charcoal')}>{store.name}</span>
    </Link>
  );

  const desktopNav = (
    <nav className="hidden md:flex items-center gap-5">
      {navLinks.map(link => (
        <NavLinkItem
          key={link._id ?? link.settings.label}
          link={link}
          resolveLink={resolveLink}
          className={clsx('text-[13px] font-medium no-underline transition-colors', dark ? 'text-white/70 hover:text-white' : 'text-graphite hover:text-charcoal')}
        />
      ))}
    </nav>
  );

  const icons = (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => setSearchOpen(o => !o)}
        aria-label="Search"
        className={clsx('w-9 h-9 rounded-full flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-cream')}
      >
        <Search size={18} className={dark ? 'text-white' : 'text-charcoal'} />
      </button>

      <button
        onClick={() => navigate(path('/cart'))}
        aria-label="Cart"
        className={clsx('relative w-9 h-9 rounded-full flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-cream')}
      >
        <ShoppingCart size={18} className={dark ? 'text-white' : 'text-charcoal'} />
        {cartCount > 0 && (
          <span
            className="absolute -top-[2px] -right-[2px] min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            style={{ background: cfg.primaryColor }}
          >
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>

      <button
        onClick={() => { if (isLoggedIn) toMain('/account'); else if (basePath) toMain(`/login?redirect=${encodeURIComponent(basePath)}`); else navigate('/login'); }}
        aria-label="Account"
        className={clsx('w-9 h-9 rounded-full flex items-center justify-center border-none bg-transparent cursor-pointer transition-colors', dark ? 'hover:bg-white/10' : 'hover:bg-cream')}
      >
        <User size={18} className={dark ? 'text-white' : 'text-charcoal'} />
      </button>

      {navLinks.length > 0 && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menu"
          className="md:hidden w-9 h-9 rounded-full flex items-center justify-center border-none bg-transparent cursor-pointer"
        >
          {mobileOpen ? <X size={18} className={dark ? 'text-white' : undefined} /> : <Menu size={18} className={dark ? 'text-white' : undefined} />}
        </button>
      )}
    </div>
  );

  const mobileMenu = mobileOpen && navLinks.length > 0 && (
    <nav className={clsx('md:hidden flex flex-col gap-2 border-t px-4 py-2', dark ? 'border-white/10' : 'border-bone')}>
      {navLinks.map(link => (
        <NavLinkItem
          key={link._id ?? link.settings.label}
          link={link}
          resolveLink={resolveLink}
          className={clsx('py-2.5 text-[13px] font-medium no-underline', dark ? 'text-white/80' : 'text-graphite')}
          onNavigate={() => setMobileOpen(false)}
        />
      ))}
    </nav>
  );

  const searchBar = searchOpen && (
    <form onSubmit={submitSearch} className={clsx('px-4 sm:px-6 lg:px-10 py-2.5 border-t flex items-center gap-2', dark ? 'border-white/10' : 'border-bone')}>
      <Search size={15} className={dark ? 'text-white/50' : 'text-slate'} />
      <input
        autoFocus
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder={`Search ${store.name}…`}
        className={clsx(
          'flex-1 min-w-0 bg-transparent border-none outline-none text-[13.5px]',
          dark ? 'text-white placeholder:text-white/40' : 'text-charcoal placeholder:text-slate',
        )}
      />
      <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className={clsx('bg-transparent border-none cursor-pointer p-1', dark ? 'text-white/60' : 'text-slate')}>
        <X size={15} />
      </button>
    </form>
  );

  const headerCls = clsx('sticky top-0 z-40 border-b', dark ? 'bg-[#111]/95 backdrop-blur-sm border-white/10' : 'bg-white border-bone');

  // 'centered' — logo on its own centered row, nav links centered on a
  // second row below it (desktop only); icons stay pinned top-right. A
  // genuinely different composition from 'standard', not just re-aligned.
  if (isCentered) {
    return (
      <header className={headerCls} style={{ fontFamily: `${cfg.font}, sans-serif` }}>
        <div className="px-4 sm:px-6 lg:px-10 grid grid-cols-[1fr_auto_1fr] items-center h-[64px]">
          <div />
          <div className="flex justify-center">{logo}</div>
          <div className="flex justify-end">{icons}</div>
        </div>
        {navLinks.length > 0 && (
          <div className={clsx('hidden md:flex justify-center border-t py-2', dark ? 'border-white/10' : 'border-bone')}>{desktopNav}</div>
        )}
        {searchBar}
        {mobileMenu}
      </header>
    );
  }

  return (
    <header className={headerCls} style={{ fontFamily: `${cfg.font}, sans-serif` }}>
      <div className="px-4 sm:px-6 lg:px-10 h-[64px] flex items-center gap-4">
        {logo}

        {navAlignment !== 'left' && <div className="flex-1" />}
        <div className={clsx(navAlignment === 'left' && 'ml-4')}>{desktopNav}</div>
        {navAlignment !== 'right' && <div className="flex-1" />}

        {icons}
      </div>

      {searchBar}
      {mobileMenu}
    </header>
  );
}
