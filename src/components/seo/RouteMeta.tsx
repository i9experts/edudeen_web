import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageMetaClaimed, restoreHead, setHead } from '@/hooks/usePageMeta';
import { SITE_URL } from '@/utils/seo';

/** Private / transactional areas: never indexed. */
const NOINDEX_PREFIXES = [
  '/account', '/cart', '/checkout', '/order-success', '/login', '/register', '/forgot-password', '/verify-otp',
  '/new-password', '/onboard', '/admin', '/store/', '/seller', '/payment', '/maintenance', '/compare',
  '/wishlist/shared', '/quotes', '/certificates', '/course/', '/seo/', '/delete-account',
];

/** Title + description for the static public pages (the bot prerender serves the same text). */
const STATIC_META: Record<string, { title: string; description: string }> = {
  '/about': { title: 'About Edudeen | Education marketplace', description: 'Edudeen is an education marketplace where teachers, scholars and publishers sell worksheets, books, digital downloads and courses.' },
  '/faq': { title: 'Help Center and FAQs | Edudeen', description: 'Answers about orders, downloads, payments, refunds and selling on Edudeen.' },
  '/contact-us': { title: 'Contact Edudeen', description: 'Get in touch with the Edudeen team for help with orders, sellers or your account.' },
  '/learn': { title: 'Learn by grade and subject | Edudeen', description: 'Browse worksheets, books and courses by grade level and subject for home and classroom.' },
  '/premium': { title: 'Edudeen Premium | Member prices and perks', description: 'Edudeen Premium members get member prices from sellers, a monthly personal coupon, early access to sales and priority support.' },
  '/become-a-seller': { title: 'Sell on Edudeen | Open your education store', description: 'Open a store on Edudeen and sell worksheets, books, courses and digital downloads to parents, teachers and schools.' },
  '/privacy-policy': { title: 'Privacy Policy | Edudeen', description: 'How Edudeen collects, uses and protects your personal information.' },
  '/terms-of-service': { title: 'Terms of Service | Edudeen', description: 'The terms that apply when you buy or sell on Edudeen.' },
  '/cookie-policy': { title: 'Cookie Policy | Edudeen', description: 'How Edudeen uses cookies and similar technologies.' },
  '/pricing': { title: 'Pricing | Edudeen', description: 'Plans and fees for selling on Edudeen.' },
};

/**
 * Route-level head defaults (mounted once in RootLayout): noindex for private areas, canonical + og:url for every
 * page, and title/description for the static pages. A page that calls usePageMeta({...}) itself keeps its own values.
 */
export function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const touched = new Map<string, string | null>();
    const path = pathname.replace(/\/+$/, '') || '/';
    const st = STATIC_META[path];
    const prevTitle = document.title;
    if (NOINDEX_PREFIXES.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p))) {
      setHead(touched, 'name', 'robots', 'noindex,follow');
    }
    if (!pageMetaClaimed()) {
      const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
      setHead(touched, 'canonical', 'canonical', canonical);
      setHead(touched, 'property', 'og:url', canonical);
      if (st) {
        document.title = st.title;
        setHead(touched, 'name', 'description', st.description);
        setHead(touched, 'property', 'og:title', st.title);
        setHead(touched, 'property', 'og:description', st.description);
      }
    }
    return () => { restoreHead(touched); if (st && document.title === st.title) document.title = prevTitle; };
  }, [pathname]);
  return null;
}
