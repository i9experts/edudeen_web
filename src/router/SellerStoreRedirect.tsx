import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';

/**
 * A seller owns exactly one store, so there's no separate seller dashboard —
 * every old `/seller/*` URL lands in that store's workspace instead.
 * `to` is the page inside the store (e.g. "account"); the query string is
 * kept so links like `/seller/settings?tab=notifications` still work.
 * No store yet → onboarding.
 */
export function SellerStoreRedirect({ to = 'dashboard' }: { to?: string }) {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    let cancelled = false;
    resolveSellerDestinationRemote().then(dest => {
      if (cancelled) return;
      const match = dest.match(/^\/store\/([^/]+)\/dashboard$/);
      navigate(match ? `/store/${match[1]}/${to}${search}` : dest, { replace: true });
    });
    return () => { cancelled = true; };
  }, [navigate, search, to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <Loader2 size={24} className="text-brand-orange animate-spin" />
    </div>
  );
}
