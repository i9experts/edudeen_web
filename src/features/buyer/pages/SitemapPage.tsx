import { Link, useSearchParams } from 'react-router-dom';
import { GuideView } from './guide/GuideView';
import { BUYER_SECTIONS, SELLER_SECTIONS } from './guide/guideData';
import { useT } from '@/contexts/languageCtx';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCategoryTree, categoryPath } from '@/hooks/marketplace/useCategoryTree';
import type { CategoryNode } from '@/api/services/categories';
import { CLASS_LEVELS } from '@/constants/classLevels';
import { browsePath } from '@/utils/browsePath';

const linkCls = 'text-[13.5px] text-slate hover:text-brand-orange transition-colors no-underline inline-flex items-center min-h-8';

const EDUDEEN_LINKS: { label: string; to: string }[] = [
  { label: 'Home', to: '/' },
  { label: 'Browse everything', to: '/?browse=1' },
  { label: 'Online courses', to: '/?format=course' },
  { label: 'Free resources', to: '/?free=1' },
  { label: 'Learn by grade', to: '/learn' },
  { label: 'Edudeen Premium', to: '/premium' },
  { label: 'Sell on Edudeen', to: '/become-a-seller' },
  { label: 'About', to: '/about' },
  { label: 'Help & FAQ', to: '/faq' },
  { label: 'Contact Us', to: '/contact-us' },
];

const POLICY_LINKS: { label: string; to: string }[] = [
  { label: 'Returns policy', to: '/returns' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms of Service', to: '/terms-of-service' },
  { label: 'Cookie Policy', to: '/cookie-policy' },
];

const ACCOUNT_LINKS: { label: string; to: string }[] = [
  { label: 'Sign in', to: '/login' },
  { label: 'Dashboard', to: '/account/dashboard' },
  { label: 'My Orders', to: '/account/orders' },
  { label: 'My Library', to: '/account/downloads' },
  { label: 'Saved', to: '/account/wishlist' },
  { label: 'My children', to: '/account/children' },
];

function Heading({ children }: { children: string }) {
  return <h2 className="text-[12px] font-bold text-carbon uppercase tracking-[0.12em] mb-3 m-0">{children}</h2>;
}

function LinkList({ links }: { links: { label: string; to: string }[] }) {
  const t = useT();
  return (
    <ul className="m-0 p-0 list-none flex flex-col">
      {links.map(l => (
        <li key={l.to}><Link to={l.to} className={linkCls}>{t(l.label)}</Link></li>
      ))}
    </ul>
  );
}

/** Sub-categories at any depth (the tree nests up to 4 levels); each level is indented. */
function CategoryBranch({ nodes, depth }: { nodes: CategoryNode[]; depth: number }) {
  if (!nodes.length) return null;
  return (
    <ul className={depth ? 'm-0 ms-4 ps-3 list-none border-s border-bone flex flex-col' : 'm-0 p-0 list-none flex flex-col'}>
      {nodes.map(n => (
        <li key={n._id}>
          <Link to={categoryPath(n)} className={linkCls}>{n.name}</Link>
          <CategoryBranch nodes={n.children ?? []} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

type Tab = 'buyer' | 'seller' | 'pages';
const TABS: { id: Tab; label: string }[] = [
  { id: 'buyer', label: 'Buyer guide' },
  { id: 'seller', label: 'Seller guide' },
  { id: 'pages', label: 'All pages' },
];

export function SitemapPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'seller' || raw === 'pages' ? raw : 'buyer';
  const setTab = (next: Tab) => setParams(next === 'buyer' ? {} : { tab: next }, { replace: true });
  usePageMeta({
    title: tab === 'seller' ? 'Seller guide: open a store and upload products' : tab === 'pages' ? 'Sitemap' : 'Buyer guide: how to shop on Edudeen',
    description: 'Step-by-step guides with screenshots for buyers and sellers, plus every page on Edudeen: shop by class and subject, courses, help, policies and your account.',
  });

  return (
    <main id="main" className="bg-white">
      <div className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-[12px] text-slate mb-4">
          <Link to="/" className="hover:text-brand-orange no-underline">{t('Home')}</Link>
          <span className="mx-2" aria-hidden>/</span>
          <span className="text-carbon">{t('Sitemap')}</span>
        </nav>
        <h1 className="font-serif text-[30px] sm:text-[38px] text-carbon leading-tight m-0">{t('Sitemap & guides')}</h1>
        <p className="text-[14px] text-slate mt-2 mb-6 max-w-[620px]">{t('Learn how Edudeen works, step by step, or jump to any page.')}</p>

        <div role="tablist" aria-label={t('Guide sections')} className="flex gap-1 border-b border-bone mb-8 overflow-x-auto">
          {TABS.map(x => (
            <button
              key={x.id}
              role="tab"
              type="button"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`shrink-0 px-4 min-h-11 text-[14px] font-semibold border-b-2 -mb-px bg-transparent cursor-pointer ${tab === x.id ? 'border-brand-royal text-brand-royal' : 'border-transparent text-slate hover:text-carbon'}`}
            >
              {t(x.label)}
            </button>
          ))}
        </div>

        {tab === 'buyer' ? <GuideView sections={BUYER_SECTIONS} audience="buyer" cta={{ label: 'Start shopping', to: '/?browse=1' }} /> : null}
        {tab === 'seller' ? <GuideView sections={SELLER_SECTIONS} audience="seller" cta={{ label: 'Open my store', to: '/become-a-seller' }} /> : null}
        {tab === 'pages' ? <AllPages /> : null}
      </div>
    </main>
  );
}

function AllPages() {
  const t = useT();
  const { tree, loading } = useCategoryTree();
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
          <section aria-labelledby="sm-class">
            <div id="sm-class"><Heading>{t('Shop by class')}</Heading></div>
            <ul className="m-0 p-0 list-none flex flex-col">
              {CLASS_LEVELS.map(c => (
                <li key={c.value}><Link to={browsePath(c.value)} className={linkCls}>{t(c.label)}</Link></li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sm-edudeen" className="flex flex-col gap-8">
            <div>
              <div id="sm-edudeen"><Heading>{t('Edudeen')}</Heading></div>
              <LinkList links={EDUDEEN_LINKS} />
            </div>
            <div>
              <Heading>{t('Legal')}</Heading>
              <LinkList links={POLICY_LINKS} />
            </div>
            <div>
              <Heading>{t('Account')}</Heading>
              <LinkList links={ACCOUNT_LINKS} />
            </div>
          </section>

          <section aria-labelledby="sm-subject" className="md:col-span-2">
            <div id="sm-subject"><Heading>{t('Shop by subject')}</Heading></div>
            {loading && tree.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" aria-busy="true">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="h-4 w-32 rounded bg-bone animate-pulse" />
                    <div className="h-3 w-24 rounded bg-bone/70 animate-pulse" />
                    <div className="h-3 w-28 rounded bg-bone/70 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-bone/70 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : tree.length === 0 ? (
              <p className="text-[13.5px] text-slate m-0">{t('Subjects will appear here soon.')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
                {tree.map(root => (
                  <div key={root._id}>
                    <Link to={categoryPath(root)} className="text-[14px] font-bold text-carbon hover:text-brand-orange no-underline inline-flex items-center min-h-8">{root.name}</Link>
                    <CategoryBranch nodes={root.children ?? []} depth={0} />
                  </div>
                ))}
              </div>
            )}
          </section>
      </div>
    </div>
  );
}
