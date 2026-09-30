import { useEffect } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiGetProductById } from '@/api/services/marketplace';

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/**
 * The separate /marketplace page was retired — the homepage is the shop.
 * Old links and bookmarks land here and are forwarded:
 *   /marketplace?search=q      → /?search=q
 *   /marketplace/<category>    → /?category=<category>
 *   /marketplace/<product id>  → /product/<slug>   (legacy product links)
 *   anything else              → /
 */
export function MarketplaceRedirect() {
  const navigate = useNavigate();
  const { slugOrId } = useParams<{ slugOrId?: string }>();
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();

  useEffect(() => {
    const search = searchParams.get('search')?.trim();
    if (slugOrId && OBJECT_ID_RE.test(slugOrId)) {
      let cancelled = false;
      apiGetProductById(slugOrId)
        .then(res => {
          if (cancelled) return;
          const slug = res.data?.product?.slug;
          navigate(slug ? `/product/${slug}${hash}` : '/', { replace: true });
        })
        .catch(() => { if (!cancelled) navigate('/', { replace: true }); });
      return () => { cancelled = true; };
    }
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (slugOrId) next.set('category', slugOrId);
    const qs = next.toString();
    navigate(qs ? `/?${qs}` : '/', { replace: true });
  }, [slugOrId, searchParams, navigate, hash]);

  return null;
}
