import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NotFoundPage } from '@/features/buyer/pages/NotFoundPage';
import { apiGetPublicStore } from '@/api/services/store';

const SLUG = /^\/([a-z0-9][a-z0-9-]{1,80})\/?$/i;

/**
 * Fallback for unknown URLs. A link like `edudeen.com/<store-slug>` (what sellers naturally share) opens that store's
 * page at `/shop/<slug>` when the slug belongs to a real store; anything else is the normal 404 page.
 * Real app routes never reach this (they match earlier), so nothing existing changes.
 */
export default function RootStoreRedirect() {
  const { pathname, search, hash } = useLocation();
  const slug = SLUG.exec(pathname)?.[1]?.toLowerCase() ?? null;
  const [state, setState] = useState<'checking' | 'store' | 'none'>(slug ? 'checking' : 'none');

  useEffect(() => {
    if (!slug) { setState('none'); return; }
    let alive = true;
    setState('checking');
    apiGetPublicStore(slug)
      .then((res) => { if (alive) setState(res?.data ? 'store' : 'none'); })
      .catch(() => { if (alive) setState('none'); });
    return () => { alive = false; };
  }, [slug]);

  if (state === 'store' && slug) return <Navigate to={`/shop/${slug}${search}${hash}`} replace />;
  if (state === 'checking') {
    return <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500" role="status" aria-live="polite">Loading…</div>;
  }
  return <NotFoundPage />;
}
