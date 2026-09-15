import { useEffect, useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { SkeletonBox, StoreAnnouncementBar } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { Store, ArrowLeft } from 'lucide-react';
import { apiGetPublicStore, apiResolveStoreByDomain, type PublicStoreData } from '@/api/services/store';
import { apiGetPublicStoreTheme, type StoreThemeData } from '@/api/services/storeTheme';
import { getStoreSlugFromHost, getMainAppUrl } from '@/utils/storefrontUrl';
import { CartProvider } from '@/contexts/CartContext';
import { StorefrontProvider, resolveStorefrontCfg, resolveStorefrontLink, type StorefrontContextValue } from './StorefrontContext';
import { StorefrontNavbar } from './StorefrontNavbar';
import { StorefrontFooter } from './StorefrontFooter';

const DEFAULT_FAVICON = '/favicon.png';

/** Swaps the browser tab icon to the store's own logo while on any `/:slug*` route, restoring Edudeen's default on unmount — same "zero Edudeen branding on the storefront" principle as the navbar/footer, just for the one piece of chrome that lives outside React's render tree. */
function useStorefrontFavicon(logo: string | null | undefined) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    const previousHref = link.href;
    link.href = logo || DEFAULT_FAVICON;
    return () => { link.href = previousHref; };
  }, [logo]);
}

// Root layout for a store's own subdomain (`hello.edudeen.com`) OR a
// seller-connected Custom Domain — the router mounts this tree whenever
// EITHER `getStoreSlugFromHost()` resolved a slug at boot, OR the hostname
// is a non-platform domain (`isCustomDomainCandidate()`, see
// `router/index.tsx`). A subdomain's slug comes straight from the hostname
// (synchronous, no network call); a custom domain has no slug to parse, so
// it's resolved here via `apiResolveStoreByDomain` against the store whose
// domain has actually been DNS-verified (`DomainWhiteLabelCard`) — an
// unverified/unconnected domain lands on the "Store not found" state below,
// never a random store.
// Fetches the store + its StoreTheme ONCE, provides both via context to
// every child route (home, custom pages, blog), and renders the seller's
// own zero-Edudeen-branding navbar/footer around them.
export function StorefrontLayout() {
  const slug = getStoreSlugFromHost();
  const [store, setStore] = useState<PublicStoreData | null>(null);
  const [theme, setTheme] = useState<StoreThemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = slug ? apiGetPublicStore(slug) : apiResolveStoreByDomain(window.location.hostname);
    load
      .then(res => {
        if (cancelled) return;
        setStore(res.data);
        return apiGetPublicStoreTheme(res.data.storeId).then(r => { if (!cancelled) setTheme(r.data); });
      })
      .catch(() => { if (!cancelled) setError('Store not found'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  useStorefrontFavicon(store?.logo);

  const cfg = useMemo(() => resolveStorefrontCfg(theme), [theme]);

  const contextValue: StorefrontContextValue | null = useMemo(() => {
    if (!store) return null;
    return {
      store,
      theme,
      cfg,
      resolveLink: resolveStorefrontLink,
    };
  }, [store, theme, cfg, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-[64px] flex items-center gap-3 px-4 sm:px-6 lg:px-10 border-b border-bone">
          <SkeletonBox width={36} height={36} rounded="8px" />
          <SkeletonBox width={120} height={16} rounded="4px" />
        </div>
      </div>
    );
  }

  if (error || !store || !contextValue) {
    // `getMainAppUrl()` only makes sense on a real `*.edudeen.com`
    // subdomain (`slug` truthy) — on a genuine custom domain, that helper
    // would build a URL on the SELLER'S OWN domain, not Edudeen's, so the
    // "Back to Marketplace" fallback is only shown when it can actually
    // point somewhere real.
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <Store size={48} className="text-bone" />
        <p className="text-[15px] text-slate">{slug ? 'Store not found' : "This domain isn't connected to a store yet"}</p>
        {slug && (
          <Button variant="secondary" size="sm" onClick={() => { window.location.href = getMainAppUrl('/marketplace'); }}>
            <ArrowLeft size={13} className="mr-1" /> Back to Marketplace
          </Button>
        )}
      </div>
    );
  }

  return (
    <StorefrontProvider value={contextValue}>
      {/* Scopes the buyer's cart to THIS store — shadows the app-wide
          CartProvider from main.tsx for everything rendered below, since
          the store's storeId is only known here, after it's resolved. */}
      <CartProvider storeId={store.storeId}>
        <div className="min-h-screen" style={{ background: cfg.bgColor, color: cfg.textColor, fontFamily: `${cfg.font}, sans-serif` }}>
          <StorefrontNavbar />
          {store.announcementBar?.message && (
            <StoreAnnouncementBar
              storeId={store.storeId}
              message={store.announcementBar.message}
              type={store.announcementBar.type}
              ctaLabel={store.announcementBar.ctaLabel}
              ctaLink={store.announcementBar.ctaLink}
            />
          )}
          <Outlet />
          <StorefrontFooter />
        </div>
      </CartProvider>
    </StorefrontProvider>
  );
}
