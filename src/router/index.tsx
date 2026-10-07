import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { getStoreSlugFromHost, isCustomDomainCandidate } from '@/utils/storefrontUrl';

// Root wrapper (reference nav + outlet + global Suspense)
import { RootLayout }   from '@/components/layouts/RootLayout';

// Layouts — eagerly imported (needed as wrappers immediately)
import { BuyerLayout }  from '@/components/layouts/BuyerLayout';
import { AccountLayout } from '@/components/layouts/AccountLayout';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { SellerStoreRedirect } from './SellerStoreRedirect';
import { AdminLayout }  from '@/components/layouts/AdminLayout';
import { StoreLayout }  from '@/components/layouts/StoreLayout';
import { RequireRole }  from './RequireRole';
import { FeatureMaintenance } from '@/components/comman/ui/FeatureMaintenance';

// Critical conversion-path pages — eagerly imported so the highest-traffic
// storefront flow (home → login/register → product → cart → checkout)
// never shows a route-level Suspense spinner.
import { ProductDetail } from '@/features/buyer/pages/ProductDetail';
import { CartPage }     from '@/features/buyer/pages/CartPage';
import { CheckoutPage } from '@/features/buyer/pages/CheckoutPage';
import { LoginPage }    from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { MarketplaceRedirect } from '@/features/buyer/pages/MarketplaceRedirect';
import { NotForBuyers } from '@/router/NotForBuyers';
import { OnboardingPage } from '@/features/auth/pages/onboard/OnboardingPage';

// Remaining auth pages — eagerly imported too (no lazy/Suspense split), same
// reasoning as LoginPage/RegisterPage/OnboardingPage above: auth is always on
// the critical path, never worth a route-level Suspense flash.
import { AdminLoginPage }     from '@/features/auth/pages/admin/AdminLoginPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { VerifyOTPPage }      from '@/features/auth/pages/VerifyOTPPage';
import { NewPasswordPage }    from '@/features/auth/pages/NewPasswordPage';

// Public marketing pages — eagerly imported (no lazy/Suspense split) per
// explicit instruction.
import { Homepage }             from '@/features/buyer/pages/Homepage';
import { PricingPage }          from '@/features/buyer/pages/PricingPage';
import { ForSellersPage }       from '@/features/buyer/pages/ForSellersPage';
import { BecomeSellerPage }     from '@/features/buyer/pages/BecomeSellerPage';
import { FaqPage }              from '@/features/buyer/pages/FaqPage';
import { PrivacyPolicyPage }    from '@/features/buyer/pages/PrivacyPolicyPage';
import { DeleteAccountPage }    from '@/features/buyer/pages/DeleteAccountPage';
import { TermsOfServicePage }   from '@/features/buyer/pages/TermsOfServicePage';
import { CookiePolicyPage }     from '@/features/buyer/pages/CookiePolicyPage';
import { ContactUsPage }        from '@/features/buyer/pages/ContactUsPage';
import { AboutPage }            from '@/features/buyer/pages/AboutPage';
import { ProductsOverviewPage } from '@/features/buyer/pages/products/ProductsOverviewPage';
import { PlatformProductPage }  from '@/features/buyer/pages/products/PlatformProductPage';
import { SolutionsOverviewPage } from '@/features/buyer/pages/solutions/SolutionsOverviewPage';
import { SolutionPage }         from '@/features/buyer/pages/solutions/SolutionPage';

// ── Lazy helpers ──────────────────────────────────────────────────────────────
const named = <T extends Record<string, unknown>>(
  p: Promise<T>,
  key: keyof T,
): Promise<{ default: T[keyof T] }> =>
  p.then(m => ({ default: m[key] }));

// ── Public / Buyer ────────────────────────────────────────────────────────────
const OrderSuccessPage     = lazy(() => named(import('@/features/buyer/pages/OrderSuccessPage'),                'OrderSuccessPage'));
const SellerStorefront     = lazy(() => named(import('@/features/buyer/pages/SellerStorefront'),                'SellerStorefront'));
const StorefrontLayout     = lazy(() => named(import('@/features/storefront/StorefrontLayout'),                  'StorefrontLayout'));
const StorefrontCustomPage = lazy(() => named(import('@/features/buyer/pages/StorefrontCustomPage'),             'StorefrontCustomPage'));
const CategoryBrowsePage   = lazy(() => named(import('@/features/storefront/pages/CategoryBrowsePage'),           'CategoryBrowsePage'));
const CollectionDetailPage = lazy(() => named(import('@/features/storefront/pages/CollectionDetailPage'),         'CollectionDetailPage'));
const SearchResultsPage    = lazy(() => named(import('@/features/storefront/pages/SearchResultsPage'),            'SearchResultsPage'));
const MarketplaceSearchPage   = lazy(() => named(import('@/features/buyer/pages/MarketplaceBrowse'),          'SearchResultsPage'));
const MarketplaceCategoryPage = lazy(() => named(import('@/features/buyer/pages/MarketplaceBrowse'),          'CategoryPage'));
const StorefrontBlogIndex  = lazy(() => named(import('@/features/buyer/pages/StorefrontBlogIndex'),              'StorefrontBlogIndex'));
const StorefrontBlogPost   = lazy(() => named(import('@/features/buyer/pages/StorefrontBlogPost'),               'StorefrontBlogPost'));
const StorefrontCartPage   = lazy(() => named(import('@/features/storefront/StorefrontCartPage'),                'StorefrontCartPage'));
const StorefrontLoginPage  = lazy(() => named(import('@/features/storefront/StorefrontLoginPage'),               'StorefrontLoginPage'));
const MaintenancePage      = lazy(() => named(import('@/features/buyer/pages/MaintenancePage'),                 'MaintenancePage'));

// ── Account (buyer) ───────────────────────────────────────────────────────────
const AccountDashboard     = lazy(() => named(import('@/features/buyer/pages/account/AccountDashboard'),        'AccountDashboard'));
const AccountOrders        = lazy(() => named(import('@/features/buyer/pages/MyOrdersPage'),                     'OrdersTab'));
const AccountOrderDetail   = lazy(() => named(import('@/features/buyer/pages/account/OrderDetailPage'),        'OrderDetailPage'));
const OrderInvoice         = lazy(() => named(import('@/features/buyer/pages/account/InvoicePage'),            'InvoicePage'));
const LearnHubPage         = lazy(() => named(import('@/features/buyer/pages/LearnPages'),                     'LearnHubPage'));
const LearnLevelPage       = lazy(() => named(import('@/features/buyer/pages/LearnPages'),                     'LearnLevelPage'));
const AccountLists         = lazy(() => named(import('@/features/buyer/pages/account/ListsPage'),              'ListsPage'));
const AccountQuotes        = lazy(() => named(import('@/features/buyer/pages/account/QuotesPage'),             'QuotesPage'));
const QuotationPrint       = lazy(() => named(import('@/features/buyer/pages/account/QuotationPage'),          'QuotationPage'));
const PublicListPage       = lazy(() => named(import('@/features/buyer/pages/ListPage'),                       'ListPage'));
const StoreQuestions     = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/questions/StoreQuestions'), 'StoreQuestions'));
const StoreQuotes        = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/quotes/StoreQuotes'),       'StoreQuotes'));
const AccountDownloads     = lazy(() => named(import('@/features/buyer/pages/account/Downloads'),                'Downloads'));
const AccountWishlist      = lazy(() => named(import('@/features/buyer/pages/account/Wishlist'),                 'Wishlist'));
const AccountReviews       = lazy(() => named(import('@/features/buyer/pages/MyReviewsPage'),                    'ReviewsTab'));
const AccountPayments      = lazy(() => named(import('@/features/buyer/pages/account/Payments'),                 'Payments'));
const AccountMessages      = lazy(() => named(import('@/features/buyer/pages/account/Messages'),                 'Messages'));
// Real routes replacing Settings' old ?tab=<name> query-param switcher.
const AccountProfile       = lazy(() => named(import('@/features/buyer/pages/account/PersonalInfo'),             'PersonalInfo'));
const AccountSecurity      = lazy(() => named(import('@/features/buyer/pages/account/Security'),                 'Security'));
const AccountAddresses     = lazy(() => named(import('@/features/buyer/pages/account/Addresses'),                'Addresses'));
const AccountNotifications = lazy(() => named(import('@/features/buyer/pages/account/Notifications'),            'Notifications'));
const AccountSubscriptions = lazy(() => named(import('@/features/buyer/pages/MySubscriptionsPage'),              'SubscriptionsTab'));

// ── Seller ────────────────────────────────────────────────────────────────────
const SellerSettings      = lazy(() => named(import('@/features/seller/dashboard/settings/SellerSettings'),   'SellerSettings'));
const SellerShipping       = lazy(() => named(import('@/features/seller/dashboard/SellerShipping'),             'SellerShipping'));
const SellerMessages       = lazy(() => named(import('@/features/seller/dashboard/SellerMessages'),             'SellerMessages'));
const StorePageOverview    = lazy(() => named(import('@/features/seller/dashboard/storemodule/StorePageOverview'), 'StorePageOverview'));

// ── Store Workspace ───────────────────────────────────────────────────────────
const StoreDashboard     = lazy(() => import('@/features/seller/store/Dashboard/StoreDashboard'));
const StoreProductList   = lazy(() => import('@/features/seller/store/Dashboard/StoreSection/products/StoreProductList'));
const StoreAddProduct    = lazy(() => import('@/features/seller/store/Dashboard/StoreSection/products/StoreAddProduct'));
const StoreEditProduct   = lazy(() => import('@/features/seller/store/Dashboard/StoreSection/products/StoreEditProduct'));
const StoreProductDetail = lazy(() => import('@/features/seller/store/Dashboard/StoreSection/products/StoreProductDetail'));
const CourseBuilder      = lazy(() => import('@/features/seller/store/Dashboard/StoreSection/products/CourseBuilder'));
const StoreCustomerList  = lazy(() => import('@/features/seller/store/Dashboard/StoreSection/customer/CustomerList'));
const StoreSettings      = lazy(() => import('@/features/seller/store/Dashboard/Manage/StoreSettings'));
const StoreCategories    = lazy(() => import('@/features/seller/store/Dashboard/Manage/StoreCategories'));
const StoreCollections   = lazy(() => import('@/features/seller/store/Dashboard/Manage/StoreCollections'));
const StoreBundles       = lazy(() => import('@/features/seller/store/Dashboard/Manage/StoreBundles'));
const BundlePage         = lazy(() => named(import('@/features/buyer/pages/BundlePage'), 'BundlePage'));
// OAuth return page for Search Console / GA4 / Merchant Center / Bing (admin and seller).
const AdminSeoCallback   = lazy(() => import('@/features/admin/components/seo/SeoIntegrationCallback').then(m => ({ default: () => <m.SeoIntegrationCallback side="admin" /> })));
const SellerSeoCallback  = lazy(() => import('@/features/admin/components/seo/SeoIntegrationCallback').then(m => ({ default: () => <m.SeoIntegrationCallback side="seller" /> })));
const CoursePlayerPage   = lazy(() => named(import('@/features/buyer/pages/CoursePlayerPage'), 'CoursePlayerPage'));
const CertificatePage    = lazy(() => named(import('@/features/buyer/pages/CertificatePage'), 'CertificatePage'));
const ShelfPage          = lazy(() => named(import('@/features/buyer/pages/ShelfPage'), 'ShelfPage'));
const AdminOnboardingSlides = lazy(() => named(import('@/features/admin/pages/AdminOnboardingSlides'), 'AdminOnboardingSlides'));
const AdminShelves       = lazy(() => named(import('@/features/admin/pages/AdminShelves'), 'AdminShelves'));
const StorePlanBilling   = lazy(() => import('@/features/seller/store/Dashboard/Manage/StorePlanBilling'));
const StoreVerification  = lazy(() => named(import('@/features/seller/store/Dashboard/Manage/StoreVerification'), 'StoreVerification'));
const StoreOrderList     = lazy(() => named(import('@/features/seller/store/Dashboard/StoreSection/orders/OrderList'),        'StoreOrderList'));
const StoreReturnList    = lazy(() => named(import('@/features/seller/store/Dashboard/StoreSection/returns/ReturnList'),      'StoreReturnList'));
const StoreAnalytics     = lazy(() => named(import('@/features/seller/store/Dashboard/Analytic/analytics/Analytics'),        'StoreAnalytics'));
const StoreAIStudio      = lazy(() => named(import('@/features/seller/store/Dashboard/Analytic/ai/AiStudio'),                'StoreAIStudio'));
const StoreSEO           = lazy(() => named(import('@/features/seller/store/Dashboard/Analytic/seo/StoreSEO'),               'StoreSEO'));
const StoreFinance       = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/finance/Finance'),          'StoreFinance'));
const StoreReviews       = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/reviews/reviews'),          'StoreReviews'));
const StoreInventory     = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/inventory/Inventory'),      'StoreInventory'));
const StoreMarketing     = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/marketing/Marketing'),      'StoreMarketing'));
const StoreLoyalty       = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/loyalty/Loyalty'),          'StoreLoyalty'));
const StoreSubscriptions = lazy(() => named(import('@/features/seller/store/Dashboard/Operations/subscriptions/Subscriptions'), 'StoreSubscriptions'));

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminOverview      = lazy(() => named(import('@/features/admin/pages/AdminOverview'),                     'AdminOverview'));
const AdminAnalytics     = lazy(() => named(import('@/features/admin/pages/AdminAnalytics'),                    'AdminAnalytics'));
const AdminUsers         = lazy(() => named(import('@/features/admin/pages/AdminUsers'),                        'AdminUsers'));
const AdminModeration    = lazy(() => named(import('@/features/admin/pages/AdminModeration'),                   'AdminModeration'));
const AdminActivityLog   = lazy(() => named(import('@/features/admin/pages/AdminActivityLog'),                   'AdminActivityLog'));
const AdminMessaging     = lazy(() => named(import('@/features/admin/pages/AdminMessaging'),                    'AdminMessaging'));
const AdminMarketplace   = lazy(() => named(import('@/features/admin/pages/AdminMarketplace'),                  'AdminMarketplace'));
const AdminLeads         = lazy(() => named(import('@/features/admin/pages/AdminLeads'),                        'AdminLeads'));
const AdminRefunds       = lazy(() => named(import('@/features/admin/pages/AdminRefunds'),                      'AdminRefunds'));
const AdminShippingZones = lazy(() => named(import('@/features/admin/pages/AdminShippingZones'),                'AdminShippingZones'));
const AdminOrders        = lazy(() => named(import('@/features/admin/pages/AdminOrders'),                       'AdminOrders'));
const AdminCategories    = lazy(() => named(import('@/features/admin/pages/AdminCategories'),                    'AdminCategories'));
const AdminSubscriptions = lazy(() => named(import('@/features/admin/pages/AdminSubscriptions'),                 'AdminSubscriptions'));
const AdminPlatformPlans = lazy(() => named(import('@/features/admin/pages/AdminPlatformPlans'),                 'AdminPlatformPlans'));
const AdminFinance       = lazy(() => named(import('@/features/admin/pages/AdminFinance'),                      'AdminFinance'));
const AdminAnnouncements = lazy(() => named(import('@/features/admin/pages/AdminAnnouncements'),                'AdminAnnouncements'));
const AdminBanners       = lazy(() => named(import('@/features/admin/pages/AdminBanners'),                       'AdminBanners'));
const AdminFaqs          = lazy(() => named(import('@/features/admin/pages/AdminFaqs'),                          'AdminFaqs'));
const AdminContactMessages = lazy(() => named(import('@/features/admin/pages/AdminContactMessages'),             'AdminContactMessages'));
const AdminTestimonials  = lazy(() => named(import('@/features/admin/pages/AdminTestimonials'),                  'AdminTestimonials'));
const AdminManualPayments = lazy(() => named(import('@/features/admin/pages/AdminManualPayments'),               'AdminManualPayments'));
const AdminCommissionRules = lazy(() => named(import('@/features/admin/pages/AdminCommissionRules'),             'AdminCommissionRules'));
const AdminConfig        = lazy(() => named(import('@/features/admin/pages/AdminConfig'),                       'AdminConfig'));
const AdminFxSettings    = lazy(() => named(import('@/features/admin/pages/AdminFxSettings'),                   'AdminFxSettings'));
const AdminMarketing     = lazy(() => named(import('@/features/admin/pages/AdminMarketing'),                     'AdminMarketing'));
const AdminSettings      = lazy(() => named(import('@/features/admin/pages/settings/AdminSettings'),           'AdminSettings'));
const AdminSEO           = lazy(() => named(import('@/features/admin/pages/AdminSEO'),                          'AdminSEO'));
const AdminAiStudio      = lazy(() => named(import('@/features/admin/pages/AdminAiStudio'),                     'AdminAiStudio'));

// ── Storefront subdomain router ────────────────────────────────────────────────
// A store's own subdomain (`hello.edudeen.com`) serves ONLY its storefront
// — home/blog/custom-pages — never the marketplace/seller/admin app. Kept as
// a wholly separate route tree (not a branch of the main tree) since a
// `:pageSlug` catch-all would otherwise have to coexist with dozens of
// unrelated top-level paths (`/marketplace`, `/cart`, `/admin`, ...) on the
// same origin — instead the two trees never overlap, selected once at boot
// by `getStoreSlugFromHost()` below.
const storefrontRouter = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <StorefrontLayout />,
        children: [
          { index: true, element: <SellerStorefront /> },
          { path: 'blog', element: <StorefrontBlogIndex /> },
          { path: 'blog/:postSlug', element: <StorefrontBlogPost /> },
          { path: 'cart', element: <StorefrontCartPage /> },
          { path: 'login', element: <StorefrontLoginPage /> },
          // Must come before the `:pageSlug` catch-all below — 'category'/
          // 'collections' are reserved custom-page slugs precisely so they
          // can never collide with these (see RESERVED_CUSTOM_PAGE_SLUGS).
          { path: 'category/:slugOrId', element: <CategoryBrowsePage /> },
          { path: 'collections/:slugOrId', element: <CollectionDetailPage /> },
          { path: 'search', element: <SearchResultsPage /> },
          { path: ':pageSlug', element: <StorefrontCustomPage /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

// ── Main app router (marketplace/buyer/seller/admin — the apex domain) ────────
const mainRouter = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [

      // ── All buyer-facing pages — BuyerLayout adds the mobile bottom nav ─
      {
        element: <BuyerLayout />,
        children: [
          // Pages that also need the public marketing top navbar
          {
            path: '/',
            element: <PublicLayout />,
            children: [
              { path: 'pricing',         element: <NotForBuyers><PricingPage /></NotForBuyers> },
              { path: 'sellers',         element: <NotForBuyers><ForSellersPage /></NotForBuyers> },
              { path: 'become-a-seller', element: <BecomeSellerPage /> },
              { path: 'faq',             element: <FaqPage /> },
              { path: 'help',            element: <Navigate to="/faq" replace /> },
              { path: 'privacy-policy',  element: <PrivacyPolicyPage /> },
              { path: 'delete-account',  element: <DeleteAccountPage /> },
              { path: 'terms-of-service', element: <TermsOfServicePage /> },
              { path: 'cookie-policy',   element: <CookiePolicyPage /> },
              { path: 'contact-us',      element: <ContactUsPage /> },
              { path: 'contact',         element: <Navigate to="/contact-us" replace /> },
              { path: 'about',           element: <AboutPage /> },
              { path: 'products',        element: <NotForBuyers><ProductsOverviewPage /></NotForBuyers> },
              { path: 'products/:slug',  element: <NotForBuyers><PlatformProductPage /></NotForBuyers> },
              { path: 'solutions',       element: <NotForBuyers><SolutionsOverviewPage /></NotForBuyers> },
              { path: 'solutions/:slug', element: <NotForBuyers><SolutionPage /></NotForBuyers> },
            ],
          },
          // Account — nested routes, each section is its own deep-linkable page
          {
            path: 'account',
            element: <AccountLayout />,
            children: [
              { index: true,          element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard',     element: <AccountDashboard /> },
              { path: 'orders',        element: <FeatureMaintenance feature="orders"><AccountOrders /></FeatureMaintenance> },
              { path: 'orders/:orderId', element: <FeatureMaintenance feature="orders"><AccountOrderDetail /></FeatureMaintenance> },
              { path: 'downloads',     element: <AccountDownloads /> },
              { path: 'lists',         element: <AccountLists /> },
              { path: 'quotes',        element: <AccountQuotes /> },
              { path: 'wishlist',      element: <FeatureMaintenance feature="cart"><AccountWishlist /></FeatureMaintenance> },
              { path: 'reviews',       element: <FeatureMaintenance feature="reviews"><AccountReviews /></FeatureMaintenance> },
              { path: 'payments',      element: <AccountPayments /> },
              { path: 'profile',       element: <AccountProfile /> },
              { path: 'security',      element: <AccountSecurity /> },
              { path: 'addresses',     element: <AccountAddresses /> },
              { path: 'notifications', element: <AccountNotifications /> },
              { path: 'subscriptions', element: <AccountSubscriptions /> },
              // Settings merged into Profile — old bookmarks/links still land somewhere real.
              { path: 'settings',      element: <Navigate to="/account/profile" replace /> },
              { path: 'messages',      element: <FeatureMaintenance feature="messaging"><AccountMessages /></FeatureMaintenance> },
            ],
          },
          // Pages with their own embedded navbar (no PublicLayout wrapper needed)
          { index: true,             element: <Homepage /> },
          // The homepage is the shop — the old separate marketplace pages
          // (/marketplace, /education) forward there so old links keep working.
          { path: 'marketplace/:slugOrId?', element: <MarketplaceRedirect /> },
          { path: 'education/:levelSlug?',  element: <Navigate to="/" replace /> },
          { path: 'EducationMarketplace',   element: <Navigate to="/" replace /> },
          { path: 'cart',            element: <FeatureMaintenance feature="cart" variant="page"><CartPage /></FeatureMaintenance> },
          { path: 'checkout',        element: <CheckoutPage /> },
          { path: 'order-success',   element: <OrderSuccessPage /> },
          { path: 'product/:slug',   element: <FeatureMaintenance feature="product_page" variant="page"><ProductDetail /></FeatureMaintenance> },
          { path: 'search',          element: <FeatureMaintenance feature="search" variant="page"><MarketplaceSearchPage /></FeatureMaintenance> },
          { path: 'c/:slug',         element: <FeatureMaintenance feature="categories" variant="page"><MarketplaceCategoryPage /></FeatureMaintenance> },
          // Grade and subject landing pages (/learn/primary-school/mathematics).
          { path: 'learn',           element: <FeatureMaintenance feature="learn" variant="page"><LearnHubPage /></FeatureMaintenance> },
          { path: 'learn/:level/:subject?', element: <FeatureMaintenance feature="learn" variant="page"><LearnLevelPage /></FeatureMaintenance> },
          { path: 'lists/:slug', element: <PublicListPage /> },
          { path: 'bundles/:slug', element: <BundlePage /> },
          { path: 'picks/:slug', element: <ShelfPage /> },
        ],
      },

      // ── A seller's store as a page inside Edudeen (`/shop/<slug>`) — same
      //    themed storefront the store's subdomain serves, same child pages. ──
      {
        path: '/shop/:storeSlug',
        element: <StorefrontLayout />,
        children: [
          { index: true, element: <SellerStorefront /> },
          { path: 'blog', element: <StorefrontBlogIndex /> },
          { path: 'blog/:postSlug', element: <StorefrontBlogPost /> },
          // One Edudeen cart + checkout for every store.
          { path: 'cart', element: <Navigate to="/cart" replace /> },
          { path: 'category/:slugOrId', element: <CategoryBrowsePage /> },
          { path: 'collections/:slugOrId', element: <CollectionDetailPage /> },
          { path: 'search', element: <SearchResultsPage /> },
          { path: ':pageSlug', element: <StorefrontCustomPage /> },
        ],
      },

      // ── Maintenance mode (backend 503 redirects here — see client.ts) ──
      { path: '/maintenance',     element: <MaintenancePage /> },

      // Printable invoice — no app chrome, so printing gives a clean page.
      { path: '/account/orders/:orderId/invoice', element: <OrderInvoice /> },
      { path: '/quotes/:quoteId/print', element: <QuotationPrint /> },
      { path: '/course/:slug', element: <CoursePlayerPage /> },
      { path: '/certificates/:code', element: <CertificatePage /> },
      { path: '/seo/integrations/callback', element: <SellerSeoCallback /> },

      // ── Auth ──────────────────────────────────────────────────────────
      { path: '/login',           element: <LoginPage /> },
      { path: '/admin/login',     element: <AdminLoginPage /> },
      { path: '/register',        element: <RegisterPage /> },
      { path: '/onboard',      element: <OnboardingPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/verify-otp',      element: <VerifyOTPPage /> },
      { path: '/new-password',    element: <NewPasswordPage /> },


      // ── Retired theme / live previews — stores now use Edudeen's own design,
      //    so old preview links land on the seller's Store Page instead. ──
      { path: '/store/:storeId/theme-preview/:themeId', element: <Navigate to="../../storebuilder" relative="path" replace /> },
      { path: '/store/:storeId/live-preview', element: <Navigate to="../storebuilder" relative="path" replace /> },

      // ── Old seller-level pages — one seller has one store now, so these
      //    all open that store's own workspace. ──────────────────────────
      {
        path: '/seller',
        children: [
          { index: true,           element: <SellerStoreRedirect /> },
          { path: 'analytics',     element: <SellerStoreRedirect to="analytics" /> },
          { path: 'stores',        element: <SellerStoreRedirect /> },
          { path: 'store',         element: <SellerStoreRedirect to="storebuilder" /> },
          { path: 'settings',      element: <SellerStoreRedirect to="account" /> },
          { path: '*',             element: <SellerStoreRedirect /> },
        ],
      },

      // ── Store Workspace (each store's own mini-admin panel) ──────────
      {
        path: '/store/:storeId',
        element: <StoreLayout />,
        children: [
          { index: true,                              element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard',                        element: <StoreDashboard /> },
          { path: 'orders',                           element: <StoreOrderList /> },
          { path: 'products',                         element: <StoreProductList /> },
          { path: 'products/add',                     element: <StoreAddProduct /> },
          { path: 'products/edit/:productId',         element: <StoreEditProduct /> },
          { path: 'products/detail/:productId',       element: <StoreProductDetail /> },
          { path: 'products/:productId/course',       element: <CourseBuilder /> },
          { path: 'customer/list',                    element: <StoreCustomerList /> },
          { path: 'analytics',                        element: <StoreAnalytics /> },
          { path: 'settings',                         element: <StoreSettings /> },
          { path: 'account',                          element: <SellerSettings /> },
          { path: 'categories',                       element: <StoreCategories /> },
          { path: 'collections',                      element: <StoreCollections /> },
          { path: 'bundles',                          element: <StoreBundles /> },
          { path: 'plan-billing',                     element: <StorePlanBilling /> },
          { path: 'verification',                     element: <StoreVerification /> },
          { path: 'storebuilder',                     element: <StorePageOverview /> },
          { path: 'returns',                          element: <StoreReturnList /> },
          { path: 'seo',                              element: <StoreSEO /> },
          { path: 'ai/studio',                        element: <StoreAIStudio /> },
          { path: 'reviews',                          element: <StoreReviews /> },
          { path: 'questions',                        element: <StoreQuestions /> },
          { path: 'quotes',                           element: <StoreQuotes /> },
          { path: 'finance',                          element: <StoreFinance /> },
          { path: 'inventory',                        element: <StoreInventory /> },
          { path: 'marketing',                        element: <StoreMarketing /> },
          { path: 'loyalty',                          element: <StoreLoyalty /> },
          { path: 'subscriptions',                    element: <StoreSubscriptions /> },
          // Retired: the page only showed placeholder "connected apps".
          { path: 'integrations',                     element: <Navigate to="../dashboard" replace /> },
          { path: 'activity',                         element: <Navigate to="../settings" replace /> },
          { path: 'followers',                        element: <Navigate to="../customer/list" replace /> },
          // Retired in-person POS URLs (Edudeen is online-only) — old
          // bookmarks land on the store dashboard instead of a 404.
          { path: 'pos',                              element: <Navigate to="../dashboard" replace /> },
          { path: 'pos/register',                     element: <Navigate to="../dashboard" replace /> },
          { path: 'pos/login',                        element: <Navigate to="../dashboard" replace /> },
          { path: 'pos-admin',                        element: <Navigate to="../dashboard" replace /> },
          { path: 'shipping',                         element: <SellerShipping /> },
          { path: 'messages',                         element: <SellerMessages /> },
        ],
      },

      // ── Admin pages ───────────────────────────────────────────────────
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true,          element: <AdminOverview /> },
          { path: 'analytics',    element: <RequireRole role="admin"><AdminAnalytics /></RequireRole> },
          { path: 'users',        element: <RequireRole role="admin"><AdminUsers /></RequireRole> },
          { path: 'moderation',   element: <RequireRole role="admin"><AdminModeration /></RequireRole> },
          { path: 'activity-log', element: <RequireRole role="admin"><AdminActivityLog /></RequireRole> },
          { path: 'messages',     element: <AdminMessaging /> },
          { path: 'leads',        element: <RequireRole role="admin"><AdminLeads /></RequireRole> },
          { path: 'refunds',      element: <RequireRole role="admin"><AdminRefunds /></RequireRole> },
          { path: 'shipping-zones', element: <RequireRole role="admin"><AdminShippingZones /></RequireRole> },
          { path: 'picks', element: <RequireRole role="admin"><AdminShelves /></RequireRole> },
          { path: 'app-slides', element: <RequireRole role="admin"><AdminOnboardingSlides /></RequireRole> },
          { path: 'orders',       element: <RequireRole role="admin"><AdminOrders /></RequireRole> },
          { path: 'marketplace',  element: <RequireRole role="admin"><AdminMarketplace /></RequireRole> },
          { path: 'categories',   element: <AdminCategories /> },
          { path: 'subscriptions',element: <AdminSubscriptions /> },
          { path: 'platform-plans',element: <AdminPlatformPlans /> },
          { path: 'finance',      element: <RequireRole role="admin"><AdminFinance /></RequireRole> },
          { path: 'manual-payments', element: <RequireRole role="admin"><AdminManualPayments /></RequireRole> },
          { path: 'fx-settings', element: <RequireRole role="admin"><AdminFxSettings /></RequireRole> },
          { path: 'commission-rules', element: <RequireRole role="admin"><AdminCommissionRules /></RequireRole> },
          { path: 'announcements',element: <RequireRole role="admin"><AdminAnnouncements /></RequireRole> },
          { path: 'banners',      element: <AdminBanners /> },
          { path: 'faqs',         element: <AdminFaqs /> },
          { path: 'contact',      element: <AdminContactMessages /> },
          { path: 'testimonials', element: <AdminTestimonials /> },
          { path: 'config',       element: <RequireRole role="admin"><AdminConfig /></RequireRole> },
          { path: 'marketing',    element: <RequireRole role="admin"><AdminMarketing /></RequireRole> },
          { path: 'settings',     element: <AdminSettings /> },
          { path: 'seo',          element: <RequireRole role="admin"><AdminSEO /></RequireRole> },
          { path: 'seo/integrations/callback', element: <RequireRole role="admin"><AdminSeoCallback /></RequireRole> },
          { path: 'ai-studio',    element: <RequireRole role="admin"><AdminAiStudio /></RequireRole> },
        ],
      },

      // ── 404 ───────────────────────────────────────────────────────────
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

// Decided once at module load — the hostname doesn't change without a full
// page reload, so this never needs to be reactive. A `*.edudeen.com`
// subdomain resolves its slug synchronously here; an arbitrary connected
// Custom Domain (`isCustomDomainCandidate`) can't be resolved synchronously
// (it needs a real DNS-backed lookup), so it's routed into the SAME
// storefront tree and resolved asynchronously once mounted — see
// `StorefrontLayout.tsx`.
export const router = (getStoreSlugFromHost() || isCustomDomainCandidate()) ? storefrontRouter : mainRouter;
