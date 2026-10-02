import { useEffect, useState, useMemo } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { SkeletonBox, StoreAnnouncementBar, BuyerNavbar, Footer } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { Store, ArrowLeft } from 'lucide-react';
import { apiGetPublicStore, apiResolveStoreByDomain, type PublicStoreData } from '@/api/services/store';
import { apiGetPublicStoreTheme, type StoreThemeData } from '@/api/services/storeTheme';
import { getStoreSlugFromHost, getMainAppUrl, getStorePagePath } from '@/utils/storefrontUrl';
import {
  StorefrontProvider, resolveEdudeenStoreCfg, resolveStorefrontLink, EDUDEEN_GOLD_GRADIENT,
  type StorefrontContextValue,
} from './StorefrontContext';

/**
 * A seller's store is a normal Edudeen page — `edudeen.com/shop/<slug>`:
 * Edudeen's own navbar (search, the one shared cart, account) and footer,
 * Edudeen's look (sellers no longer restyle the whole page with a theme), the
 * store's banner and every product it sells. Add to cart puts items in the
 * main Edudeen cart, so checkout and payment always go through Edudeen.
 *
 * The old separate addresses — a store subdomain (`hello.edudeen.com`) or a
 * connected custom domain — no longer show a separate site: once the store is
 * known they forward to its Edudeen page.
 */
export function StorefrontLayout() {
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const navigate = useNavigate();
  const inApp = !!storeSlug;
  const slug = storeSlug ?? getStoreSlugFromHost();
  const basePath = inApp ? getStorePagePath(storeSlug!) : '';
  const [store, setStore] = useState<PublicStoreData | null>(null);
  // Only the seller's light customisation is read from it (accent colour, banner options).
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
        // Subdomain / custom domain → the one real address, inside Edudeen.
        if (!inApp) { window.location.replace(getMainAppUrl(getStorePagePath(res.data.slug))); return; }
        setStore(res.data);
        return apiGetPublicStoreTheme(res.data.storeId).then(r => { if (!cancelled) setTheme(r.data); }).catch(() => {});
      })
      .catch(() => { if (!cancelled) setError('Store not found'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, inApp]);

  // Edudeen's look; the seller only picks an accent colour from a fixed set.
  const cfg = useMemo(() => resolveEdudeenStoreCfg(theme), [theme]);

  const contextValue: StorefrontContextValue | null = useMemo(() => {
    if (!store) return null;
    return {
      store,
      theme,
      cfg,
      basePath,
      resolveLink: link => resolveStorefrontLink(link, basePath),
      goToMainApp: (path: string) => navigate(path),
    };
  }, [store, theme, cfg, basePath, navigate]);

  if (loading || (!inApp && !error)) {
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
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <Store size={48} className="text-bone" />
        <p className="text-[15px] text-slate">Store not found</p>
        <Button variant="secondary" size="sm" onClick={() => { if (inApp) navigate('/'); else window.location.href = getMainAppUrl('/'); }}>
          <ArrowLeft size={13} className="me-1" /> Back to Edudeen
        </Button>
      </div>
    );
  }

  return (
    <StorefrontProvider value={contextValue}>
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50">
          <BuyerNavbar />
        </div>
        <div aria-hidden style={{ height: 3, background: EDUDEEN_GOLD_GRADIENT }} />
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
        <Footer />
      </div>
    </StorefrontProvider>
  );
}
