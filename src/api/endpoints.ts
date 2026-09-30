// ── API Endpoints ─────────────────────────────────────────────────────────────
// All endpoint paths in one place.
// Base URL is loaded from VITE_API_URL in .env via the Axios client.
// ─────────────────────────────────────────────────────────────────────────────

export const ENDPOINTS = {

  // ── USERS (self-service account management) ──────────────────────────────
  USERS: {
    CHANGE_PASSWORD: '/api/users/change-password',
    DELETE_ACCOUNT:  '/api/users/profile',

    // Admin — merged buyer/seller directory
    ADMIN: {
      STATS:     '/api/admin/users/stats',
      LIST:      '/api/admin/users',
      GET_BY_ID: (role: string, id: string) => `/api/admin/users/${role}/${id}`,
      SUSPEND:   (role: string, id: string) => `/api/admin/users/${role}/${id}/suspend`,
      UNSUSPEND: (role: string, id: string) => `/api/admin/users/${role}/${id}/unsuspend`,
    },
  },

  // ── PLATFORM CONFIG (Admin) ────────────────────────────────────────────────
  PLATFORM_CONFIG: {
    GET:                  '/api/admin/platform-config',
    UPDATE_FEATURE_FLAGS: '/api/admin/platform-config/feature-flags',
    UPDATE_AI:            '/api/admin/platform-config/ai',
    UPDATE_EMAIL:         '/api/admin/platform-config/email',
    UPDATE_MAINTENANCE:   '/api/admin/platform-config/maintenance',
    UPDATE_PLACEMENT_LIMITS: '/api/admin/platform-config/placement-limits',
    UPDATE_PROMOTION_PRICING: '/api/admin/platform-config/promotion-pricing',
    UPDATE_PAYOUT: '/api/admin/platform-config/payout',
    UPDATE_MANUAL_PAYMENT: '/api/admin/platform-config/manual-payment',
    UPDATE_FX: '/api/admin/platform-config/fx',
  },

  // ── EXCHANGE RATE ───────────────────────────────────────────────────────────
  EXCHANGE_RATE: {
    CURRENT: '/api/exchange-rate/current',
    ADMIN_HISTORY: '/api/admin/fx/history',
    ADMIN_STALENESS: '/api/admin/fx/staleness',
    ADMIN_OVERRIDE: '/api/admin/fx/override',
  },

  // ── MANUAL BANK TRANSFER (buyer, Pakistan track) ───────────────────────────
  MANUAL_PAYMENT: {
    BANK_DETAILS: '/api/payment/manual-transfer/bank-details',
    SUBMIT:       '/api/payment/manual-transfer/submit',
    LIST_MINE:    '/api/payment/manual-transfer',
    STATUS:       (proofId: string) => `/api/payment/manual-transfer/${proofId}`,
    REUPLOAD:     (proofId: string) => `/api/payment/manual-transfer/${proofId}/reupload`,

    ADMIN: {
      LIST:    '/api/admin/manual-payments',
      GET:     (proofId: string) => `/api/admin/manual-payments/${proofId}`,
      APPROVE: (proofId: string) => `/api/admin/manual-payments/${proofId}/approve`,
      REJECT:  (proofId: string) => `/api/admin/manual-payments/${proofId}/reject`,
    },
  },

  // ── REFUND REQUESTS (item-level refunds; admin reviews the platform queue) ─
  REFUND_REQUEST: {
    ADMIN_PENDING: '/api/refund-request/admin/pending',
    FOR_ORDER:     (orderId: string) => `/api/refund-request/order/${orderId}`,
    APPROVE:       (id: string) => `/api/refund-request/${id}/approve`,
    REJECT:        (id: string) => `/api/refund-request/${id}/reject`,
  },

  // ── COMMISSION RULES (admin-managed seller commission overrides) ──────────
  COMMISSION_RULES: {
    GLOBAL:         '/api/admin/commission-rules/global',
    GLOBAL_HISTORY: '/api/admin/commission-rules/global/history',
    SELLERS:        '/api/admin/commission-rules/sellers',
    RESOLVE:        (storeId: string) => `/api/admin/commission-rules/sellers/${storeId}`,
    // GET has an /override suffix (returns the current override row); PUT/DELETE act on the bare :storeId route — these are NOT the same path.
    SELLER_OVERRIDE_GET: (storeId: string) => `/api/admin/commission-rules/sellers/${storeId}/override`,
    SELLER_OVERRIDE_SET: (storeId: string) => `/api/admin/commission-rules/sellers/${storeId}`,
    SELLER_HISTORY:  (storeId: string) => `/api/admin/commission-rules/sellers/${storeId}/history`,
  },

  // ── ANNOUNCEMENTS (Admin) ───────────────────────────────────────────────────
  ANNOUNCEMENTS: {
    LIST:       '/api/admin/announcements',
    CREATE:     '/api/admin/announcements',
    UPDATE:     (id: string) => `/api/admin/announcements/${id}`,
    SET_STATUS: (id: string) => `/api/admin/announcements/${id}/status`,
    DELETE:     (id: string) => `/api/admin/announcements/${id}`,

    // Public — buyer/seller consumption
    ACTIVE: '/api/announcements/active',
  },

  // ── NEWSLETTER (public) ─────────────────────────────────────────────────────
  NEWSLETTER: {
    SUBSCRIBE: '/api/newsletter/subscribe',
  },

  // ── CONTENT MODERATION (Admin) ──────────────────────────────────────────────
  MODERATION: {
    STATS:   '/api/admin/moderation/stats',
    QUEUE:   '/api/admin/moderation/queue',
    REVIEW:  (id: string) => `/api/admin/moderation/${id}/review`,
    APPROVE: (id: string) => `/api/admin/moderation/${id}/approve`,
    REMOVE:  (id: string) => `/api/admin/moderation/${id}/remove`,
  },

  // ── AUTH ───────────────────────────────────────────────────────────────────
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    SOCIAL_LOGIN: '/api/auth/social-login',
    VERIFY_OTP: '/api/auth/verifyOtp',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    REFRESH_TOKEN: '/api/auth/refresh',
    GET_PROFILE: '/api/auth/getprofile',
    EDIT_PROFILE: '/api/auth/edit-profile',
    RESEND_OTP: '/api/auth/resend-otp',
    LOGOUT: '/api/auth/logout',
  },

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────────
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    PREFERENCES: '/api/notifications/preferences',
    UPDATE_PREFERENCES: '/api/notifications/preferences',
    REGISTER_DEVICE_TOKEN: '/api/notifications/device-token',
    REMOVE_DEVICE_TOKEN: '/api/notifications/device-token',
    MARK_ALL_READ: '/api/notifications/read-all',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    REMOVE: (id: string) => `/api/notifications/${id}`,
  },

  // ── CATEGORIES ────────────────────────────────────────────────────────────
  CATEGORIES: {
    ADD:       '/api/categories/add-category',
    TREE:      '/api/categories/category-tree',
    GET_BY_ID: (id: string) => `/api/categories/category/${id}`,
  },

  // ── ATTRIBUTES (category-scoped classification fields — subject, format, etc) ──
  ATTRIBUTES: {
    LIST_FOR_CATEGORY:   (categoryId: string) => `/api/categories/${categoryId}/attributes`,
    CREATE_FOR_CATEGORY: (categoryId: string) => `/api/categories/${categoryId}/attributes`,
    UPDATE:              (id: string) => `/api/attributes/${id}`,
    DELETE:              (id: string) => `/api/attributes/${id}`,
    GET_FOR_PRODUCT:     (productId: string) => `/api/products/${productId}/attributes`,
    SET_FOR_PRODUCT:     (productId: string) => `/api/products/${productId}/attributes`,
  },

  // ── STORE ─────────────────────────────────────────────────────────────────
  STORE: {
    CREATE: '/api/store/create-store',
    UPDATE: '/api/store/update-store',
    GET_BY_ID: (id: string) => `/api/store/getStoreById/${id}`,
    MY_STORES: '/api/store/my-stores',
    CUSTOM_DOMAIN: (storeId: string) => `/api/store/${storeId}/custom-domain`,
    CUSTOM_DOMAIN_VERIFY: (storeId: string) => `/api/store/${storeId}/custom-domain/verify`,
    RESOLVE_DOMAIN: '/api/store/public/resolve-domain',
    WHITE_LABEL:   (storeId: string) => `/api/store/${storeId}/white-label`,
    PINNED_PRODUCTS: (storeId: string) => `/api/store/${storeId}/pinned-products`,
    ANNOUNCEMENT:    (storeId: string) => `/api/store/${storeId}/announcement`,
    VERIFICATION:              (storeId: string) => `/api/store/${storeId}/verification`,
    VERIFICATION_REQUIREMENTS: (storeId: string) => `/api/store/${storeId}/verification/requirements`,
    VERIFICATION_DOCUMENTS:    (storeId: string) => `/api/store/${storeId}/verification/documents`,
    VERIFICATION_SUBMIT:       (storeId: string) => `/api/store/${storeId}/verification/submit`,
    /** Store-independent — used by onboarding before a store exists. */
    VERIFICATION_REQUIREMENTS_PREVIEW: '/api/store/verification/requirements-preview',

    // Builder
    SAVE_BUILDER_CONFIG: '/api/store/save-builder-config',
    GET_BUILDER_CONFIG: (storeId: string) => `/api/store/builder-config/${storeId}`,

    // Public storefront
    PUBLIC_BY_SLUG: (slug: string) => `/api/store/public/${slug}`,
    PUBLIC_PRODUCTS: (storeId: string) => `/api/store/public/${storeId}/products`,
    PUBLIC_FILTERS:  (storeId: string) => `/api/store/public/${storeId}/filters`,
    // Public store browse/discovery — note: 'public' and 'public/top' must stay
    // registered before PUBLIC_BY_SLUG on the backend or they'd be swallowed by it.
    PUBLIC_LIST: '/api/store/public',
    PUBLIC_TOP:  '/api/store/public/top',
    PUBLIC_PLATFORM_STATS: '/api/store/public/platform-stats',

    // Follow
    FOLLOW: (storeId: string) => `/api/store/${storeId}/follow`,
    FOLLOW_STATUS: (storeId: string) => `/api/store/${storeId}/follow-status`,
    FOLLOWERS: (storeId: string) => `/api/store/${storeId}/followers`,

    // Customers (staff-facing — only people who ordered from this store)
    CUSTOMERS: {
      LIST:   (storeId: string) => `/api/store/${storeId}/customers`,
      UPDATE: (storeId: string, customerId: string) => `/api/store/${storeId}/customers/${customerId}`,
    },
  },

  // ── COLLECTIONS (named, curated per-store product groupings) ────────────
  COLLECTIONS: {
    LIST:            (storeId: string) => `/api/collections/${storeId}`,
    CREATE:          (storeId: string) => `/api/collections/${storeId}`,
    GET:             (storeId: string, collectionId: string) => `/api/collections/${storeId}/${collectionId}`,
    UPDATE:          (storeId: string, collectionId: string) => `/api/collections/${storeId}/${collectionId}`,
    UPDATE_PRODUCTS: (storeId: string, collectionId: string) => `/api/collections/${storeId}/${collectionId}/products`,
    DELETE:          (storeId: string, collectionId: string) => `/api/collections/${storeId}/${collectionId}`,
    PUBLIC_LIST:     (storeId: string) => `/api/public/collections/${storeId}`,
    PUBLIC_GET:      (storeId: string, slugOrId: string) => `/api/public/collections/${storeId}/${slugOrId}`,
  },

  // ── STORE THEME (navbar/footer/colors — replaces STORE.SAVE_BUILDER_CONFIG) ─
  STORE_THEME: {
    GET:            (storeId: string) => `/api/store-theme/${storeId}`,
    DRAFT:          (storeId: string) => `/api/store-theme/${storeId}/draft`,
    PUBLISH:        (storeId: string) => `/api/store-theme/${storeId}/publish`,
    REVERT_DRAFT:   (storeId: string) => `/api/store-theme/${storeId}/revert-draft`,
    UPDATE_THEME:   (storeId: string) => `/api/store-theme/${storeId}/theme`,
    UPDATE_HEADER:  (storeId: string) => `/api/store-theme/${storeId}/header`,
    UPDATE_FOOTER:  (storeId: string) => `/api/store-theme/${storeId}/footer`,
    UPDATE_IDENTITY_BANNER: (storeId: string) => `/api/store-theme/${storeId}/identity-banner`,
    PUBLIC:         (storeId: string) => `/api/public/store-theme/${storeId}`,
  },

  // ── STORE PAGES (home + custom pages, each composed of sections/blocks) ────
  STORE_PAGES: {
    LIST:             (storeId: string) => `/api/store-pages/${storeId}`,
    GET:              (storeId: string, pageId: string) => `/api/store-pages/${storeId}/${pageId}`,
    CREATE:           (storeId: string) => `/api/store-pages/${storeId}`,
    UPDATE:           (storeId: string, pageId: string) => `/api/store-pages/${storeId}/${pageId}`,
    UPDATE_SECTIONS:  (storeId: string, pageId: string) => `/api/store-pages/${storeId}/${pageId}/sections`,
    PUBLISH:          (storeId: string, pageId: string) => `/api/store-pages/${storeId}/${pageId}/publish`,
    UNPUBLISH:        (storeId: string, pageId: string) => `/api/store-pages/${storeId}/${pageId}/unpublish`,
    DELETE:           (storeId: string, pageId: string) => `/api/store-pages/${storeId}/${pageId}`,

    PUBLIC_HOME: (storeId: string) => `/api/public/store-pages/${storeId}/home`,
    PUBLIC_LIST: (storeId: string) => `/api/public/store-pages/${storeId}/list`,
    PUBLIC_PAGE: (storeId: string, slug: string) => `/api/public/store-pages/${storeId}/page/${slug}`,
  },

  // ── STORE BLOG ───────────────────────────────────────────────────────────
  STORE_BLOG: {
    LIST:            (storeId: string) => `/api/store-blog/${storeId}`,
    GET:             (storeId: string, postId: string) => `/api/store-blog/${storeId}/${postId}`,
    CREATE:          (storeId: string) => `/api/store-blog/${storeId}`,
    UPDATE:          (storeId: string, postId: string) => `/api/store-blog/${storeId}/${postId}`,
    UPDATE_CONTENT:  (storeId: string, postId: string) => `/api/store-blog/${storeId}/${postId}/content`,
    PUBLISH:         (storeId: string, postId: string) => `/api/store-blog/${storeId}/${postId}/publish`,
    UNPUBLISH:       (storeId: string, postId: string) => `/api/store-blog/${storeId}/${postId}/unpublish`,
    DELETE:          (storeId: string, postId: string) => `/api/store-blog/${storeId}/${postId}`,

    PUBLIC_LIST: (storeId: string) => `/api/public/store-blog/${storeId}`,
    PUBLIC_POST: (storeId: string, slug: string) => `/api/public/store-blog/${storeId}/${slug}`,
  },

  // ── ACTIVITY LOG ──────────────────────────────────────────────────────────
  ACTIVITY_LOG: {
    LIST:   (storeId: string) => `/api/activity-log/${storeId}`,
    STATS:  (storeId: string) => `/api/activity-log/${storeId}/stats`,
    EXPORT: (storeId: string) => `/api/activity-log/${storeId}/export`,
  },

  // ── ACTIVITY LOG (Admin, platform-wide) ─────────────────────────────────────
  ADMIN_ACTIVITY_LOG: {
    LIST:   '/api/admin/activity-log',
    EXPORT: '/api/admin/activity-log/export',
  },

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
  SUBSCRIPTIONS: {
    // Buyer
    BROWSE_PLANS: (storeId: string) => `/api/subscriptions/public/${storeId}/plans`,
    SUBSCRIBE:    '/api/subscriptions/subscribe',
    MY:           '/api/subscriptions/my',
    MY_BY_ID:     (id: string) => `/api/subscriptions/my/${id}`,
    MY_PAUSE:     (id: string) => `/api/subscriptions/my/${id}/pause`,
    MY_RESUME:    (id: string) => `/api/subscriptions/my/${id}/resume`,
    MY_CANCEL:    (id: string) => `/api/subscriptions/my/${id}/cancel`,
    MY_CHANGE_PLAN: (id: string) => `/api/subscriptions/my/${id}/change-plan`,
    MY_TIMELINE:  (id: string) => `/api/subscriptions/my/${id}/timeline`,
    MY_SETUP_INTENT: '/api/subscriptions/my/setup-intent',
    MY_BILLING_PORTAL: '/api/subscriptions/my/billing-portal',
    MY_BENEFITS:  (storeId: string) => `/api/subscriptions/my/benefits/${storeId}`,
    MY_CREDITS:   '/api/subscriptions/my/credits',
    MY_CREDITS_SPEND: (storeId: string) => `/api/subscriptions/my/credits/${storeId}/spend`,
    MY_NOTIFICATION_PREFS: '/api/subscriptions/my/notification-preferences',

    // Seller (store-scoped)
    PLANS: {
      CREATE:    (storeId: string) => `/api/subscriptions/${storeId}/plans`,
      LIST:      (storeId: string) => `/api/subscriptions/${storeId}/plans`,
      GET_BY_ID: (storeId: string, id: string) => `/api/subscriptions/${storeId}/plans/${id}`,
      UPDATE:    (storeId: string, id: string) => `/api/subscriptions/${storeId}/plans/${id}`,
      ARCHIVE:   (storeId: string, id: string) => `/api/subscriptions/${storeId}/plans/${id}`,
      ESTIMATE_HEALTH: (storeId: string) => `/api/subscriptions/${storeId}/plans/estimate-health`,
    },
    DASHBOARD:   (storeId: string) => `/api/subscriptions/${storeId}/dashboard`,
    EXPORT:      (storeId: string) => `/api/subscriptions/${storeId}/export`,
    ANALYTICS_ADVANCED: (storeId: string) => `/api/subscriptions/${storeId}/analytics/advanced`,
    SUBSCRIBERS: {
      LIST:      (storeId: string) => `/api/subscriptions/${storeId}/subscribers`,
      GET_BY_ID: (storeId: string, id: string) => `/api/subscriptions/${storeId}/subscribers/${id}`,
      PAUSE:     (storeId: string, id: string) => `/api/subscriptions/${storeId}/subscribers/${id}/pause`,
      RESUME:    (storeId: string, id: string) => `/api/subscriptions/${storeId}/subscribers/${id}/resume`,
      CANCEL:    (storeId: string, id: string) => `/api/subscriptions/${storeId}/subscribers/${id}/cancel`,
      REFUND_INVOICE: (storeId: string, id: string, invoiceId: string) => `/api/subscriptions/${storeId}/subscribers/${id}/invoices/${invoiceId}/refund`,
    },

    // Admin
    ADMIN: {
      OVERVIEW:          '/api/subscriptions/admin/overview',
      STORES:            '/api/subscriptions/admin/stores',
      STORE_DETAIL:      (storeId: string) => `/api/subscriptions/admin/stores/${storeId}`,
      SUSPEND_PLAN:      (id: string) => `/api/subscriptions/admin/plans/${id}/suspend`,
      UNSUSPEND_PLAN:    (id: string) => `/api/subscriptions/admin/plans/${id}/unsuspend`,
      PAYMENT_FAILURES:  '/api/subscriptions/admin/payment-failures',
      SUB_DETAIL:        (id: string) => `/api/subscriptions/admin/subscriptions/${id}`,
      SUB_PAYMENT_ATTEMPTS: (id: string) => `/api/subscriptions/admin/subscriptions/${id}/payment-attempts`,
      LTV:               '/api/subscriptions/admin/ltv',
      REVENUE_BREAKDOWN: '/api/subscriptions/admin/revenue-breakdown',
      CHURN_COHORTS:     '/api/subscriptions/admin/churn-cohorts',
      INVOICE_REFUND:    (invoiceId: string) => `/api/subscriptions/admin/invoices/${invoiceId}/refund`,
      WEBHOOKS:          '/api/subscriptions/admin/webhooks',
      WEBHOOK_RETRY:     (id: string) => `/api/subscriptions/admin/webhooks/${id}/retry`,
    },
  },

  // ── MARKETING ─────────────────────────────────────────────────────────────
  MARKETING: {
    COUPONS: {
      CREATE: (storeId: string) => `/api/marketing/${storeId}/coupons`,
      LIST:   (storeId: string) => `/api/marketing/${storeId}/coupons`,
      UPDATE: (storeId: string, couponId: string) => `/api/marketing/${storeId}/coupons/${couponId}`,
      DELETE: (storeId: string, couponId: string) => `/api/marketing/${storeId}/coupons/${couponId}`,
    },
    CAMPAIGNS: {
      LIST: (storeId: string) => `/api/marketing/${storeId}/campaigns`,
      JOIN: (storeId: string, campaignId: string) => `/api/marketing/${storeId}/campaigns/${campaignId}/join`,
      LEAVE:(storeId: string, campaignId: string) => `/api/marketing/${storeId}/campaigns/${campaignId}/leave`,
    },

    // Public — buyer marketplace/homepage deal banner
    PUBLIC_CAMPAIGNS: '/api/public/marketing/campaigns',

    // Admin — platform-wide sale campaigns + platform-issued coupons
    ADMIN: {
      CAMPAIGNS: {
        CREATE:     '/api/admin/marketing/campaigns',
        LIST:       '/api/admin/marketing/campaigns',
        UPDATE:     (id: string) => `/api/admin/marketing/campaigns/${id}`,
        SET_STATUS: (id: string) => `/api/admin/marketing/campaigns/${id}/status`,
        DELETE:     (id: string) => `/api/admin/marketing/campaigns/${id}`,
      },
      COUPONS: {
        CREATE: '/api/admin/marketing/coupons',
        LIST:   '/api/admin/marketing/coupons',
        UPDATE: (id: string) => `/api/admin/marketing/coupons/${id}`,
        DELETE: (id: string) => `/api/admin/marketing/coupons/${id}`,
      },
    },
  },

  // ── LOYALTY & REWARDS ─────────────────────────────────────────────────────
  LOYALTY: {
    OVERVIEW:      (storeId: string) => `/api/loyalty/${storeId}/overview`,
    PROGRAM:       (storeId: string) => `/api/loyalty/${storeId}/program`,
    EARNING_RULES: (storeId: string) => `/api/loyalty/${storeId}/earning-rules`,
    TIERS:         (storeId: string) => `/api/loyalty/${storeId}/tiers`,
    MEMBERS:       (storeId: string) => `/api/loyalty/${storeId}/members`,
    MEMBER_TRANSACTIONS: (storeId: string, memberId: string) => `/api/loyalty/${storeId}/members/${memberId}/transactions`,
    AWARD_POINTS:  (storeId: string, memberId: string) => `/api/loyalty/${storeId}/members/${memberId}/award`,
    REWARDS: {
      CREATE: (storeId: string) => `/api/loyalty/${storeId}/rewards`,
      LIST:   (storeId: string) => `/api/loyalty/${storeId}/rewards`,
      MANAGE: (storeId: string) => `/api/loyalty/${storeId}/rewards/manage`,
      UPDATE: (storeId: string, rewardId: string) => `/api/loyalty/${storeId}/rewards/${rewardId}`,
      DELETE: (storeId: string, rewardId: string) => `/api/loyalty/${storeId}/rewards/${rewardId}`,
    },
    MY_BALANCE: (storeId: string) => `/api/loyalty/${storeId}/my-balance`,
    REDEEM:     (storeId: string) => `/api/loyalty/${storeId}/redeem`,
  },

  // ── GIFT CARDS ────────────────────────────────────────────────────────────
  GIFT_CARDS: {
    SETTINGS:        (storeId: string) => `/api/gift-cards/${storeId}/settings`,
    ISSUE:           (storeId: string) => `/api/gift-cards/${storeId}/issue`,
    LIST:            (storeId: string) => `/api/gift-cards/${storeId}`,
    DISABLE:         (storeId: string, giftCardId: string) => `/api/gift-cards/${storeId}/${giftCardId}/disable`,
    PUBLIC_SETTINGS: (storeId: string) => `/api/gift-cards/${storeId}/public-settings`,
    PURCHASE_INTENT: (storeId: string) => `/api/gift-cards/${storeId}/purchase-intent`,
  },

  // ── AUTOMATIC DISCOUNTS ───────────────────────────────────────────────────
  DISCOUNTS: {
    LIST:   (storeId: string) => `/api/discounts/${storeId}`,
    UPDATE: (storeId: string, discountId: string) => `/api/discounts/${storeId}/${discountId}`,
    DELETE: (storeId: string, discountId: string) => `/api/discounts/${storeId}/${discountId}`,
  },

  // ── STRIPE CONNECT (seller's own payment gateway) ────────────────────────
  STRIPE_CONNECT: {
    STATUS:          '/api/stripe-connect/status',
    ONBOARDING_LINK: '/api/stripe-connect/onboarding-link',
    SYNC:            '/api/stripe-connect/sync',
  },

  PRODUCT: {
    CREATE_PHYSICAL: '/api/products/add-physical-product',
    CREATE_DIGITAL: '/api/products/add-digital-product',
    EDIT_PRODUCT: '/api/products/edit-product',
    DELETE_PRODUCT: (id: string) => `/api/products/delete-product/${id}`,
    GET_MY_ALL_PRODUCT: (id: string) => `/api/inventory/getStoreInventory/${id}`,
    GET_MY_PRODUCT_BY_ID: (id: string) => `/api/products/get-my-product/${id}`,
    EDUCATION_FACETS: '/api/products/education/facets',
    EDUCATION_CUSTOM_LEVEL_SUGGESTIONS: '/api/products/education/custom-level-suggestions',
    STORE_PINNED:        (storeId: string) => `/api/products/store/${storeId}/pinned`,
    STORE_NEW_ARRIVALS:  (storeId: string) => `/api/products/store/${storeId}/new-arrivals`,
    STORE_BEST_SELLERS:  (storeId: string) => `/api/products/store/${storeId}/best-sellers`,
    STORE_TRENDING:      (storeId: string) => `/api/products/store/${storeId}/trending`,
    VARIANTS: {
      LIST:   (productId: string) => `/api/products/${productId}/variants`,
      CREATE: (productId: string) => `/api/products/${productId}/variants`,
      UPDATE: (productId: string, variantId: string) => `/api/products/${productId}/variants/${variantId}`,
      DELETE: (productId: string, variantId: string) => `/api/products/${productId}/variants/${variantId}`,
    },
  },

  // ── MARKETPLACE ───────────────────────────────────────────────────────────
  MARKETPLACE: {
    PRODUCTS_BY_CATEGORY: `/api/products/products-by-category`,
    PRODUCT_BY_ID: (id: string) => `/api/products/getProductById/${id}`,
    PRODUCT_PREVIEW: (id: string) => `/api/products/preview/${id}`,

    // Admin — marketplace-wide listing management
    ADMIN: {
      STATS:    '/api/admin/marketplace/stats',
      LISTINGS: '/api/admin/marketplace/listings',
      FEATURE:  (id: string) => `/api/admin/marketplace/listings/${id}/feature`,
      REMOVE:   (id: string) => `/api/admin/marketplace/listings/${id}/remove`,
      SET_STORE_BADGE: (storeId: string) => `/api/admin/marketplace/stores/${storeId}/badge`,
      LEADS:            '/api/admin/marketplace/leads',
      LEAD_DETAIL:      (id: string) => `/api/admin/marketplace/leads/${id}`,
      LEAD_UNDER_REVIEW: (id: string) => `/api/admin/marketplace/leads/${id}/under-review`,
      APPROVE_LEAD:     (id: string) => `/api/admin/marketplace/leads/${id}/approve`,
      REJECT_LEAD:      (id: string) => `/api/admin/marketplace/leads/${id}/reject`,
    },
  },

  // ── AI STUDIO (public trial) ───────────────────────────────────────────────
  AI_STUDIO_PUBLIC: {
    WORKSHEET_TRY_FREE: '/api/public/worksheet-builder/try-free',
  },

  // ── SEARCH ────────────────────────────────────────────────────────────────
  SEARCH: {
    STORES:   '/api/search/stores',
    PRODUCTS: '/api/search/products',
    RECENT:   '/api/search/recent',
  },

  // ── CART ──────────────────────────────────────────────────────────────────
  CART: {
    ADD: '/api/cart/add-to-cart',
    GET: '/api/cart/get-cart',
    MY_CARTS: '/api/cart/my-carts',
    UPDATE_QUANTITY: '/api/cart/update-cart-quantity',
    REMOVE_ITEM: '/api/cart/remove-cart-item',
    CLEAR: '/api/cart/clear-cart',
  },

  // ── WISHLIST ───────────────────────────────────────────────────────────────
  WISHLIST: {
    ADD: '/api/cart/add-to-wishlist',
    GET: '/api/cart/get-wishlist',
    GET_ITEM: '/api/cart/get-wishlist-item',
    REMOVE: '/api/cart/remove-from-wishlist',
    CLEAR: '/api/cart/clear-wishlist',
  },

  // ── ADDRESS ────────────────────────────────────────────────────────────────
  ADDRESS: {
    ADD: '/api/address/add-address',
    GET_ALL: '/api/address/getMyAddresses',
    GET_DEFAULT: '/api/address/getDefaultAddress',
    UPDATE: '/api/address/update-address',
    GET_BY_ID: (addressId: string) => `/api/address/get-address-by-id/${addressId}`,
    SET_DEFAULT: (addressId: string) => `/api/address/setDefaultAddress/${addressId}`,
    DELETE: (addressId: string) => `/api/address/delete-address/${addressId}`,
  },

  SHIPPING: {
    GET_SHIPPING_ZONES: '/api/checkout/getShippingZones',
  },

  CHECKOUT: {
    CREATE: '/api/checkout/create-checkout',
    ADD_SHIPPING_ZONE_IN_CHECKOUT: '/api/checkout/addShippingInCheckout',
    DELETE_CHECKOUT: '/api/checkout/delete-checkout',
    APPLY_COUPON: '/api/checkout/apply-coupon',
    REMOVE_COUPON: (checkoutId: string) => `/api/checkout/remove-coupon/${checkoutId}`,
    APPLY_GIFT_CARD: '/api/checkout/apply-gift-card',
    REMOVE_GIFT_CARD: (checkoutId: string) => `/api/checkout/remove-gift-card/${checkoutId}`,
  },

  UPLOAD: {
    PUBLIC_FILE: '/api/upload/file',
    PRIVATE_FILE: '/api/upload/private-file',
  },

  INVENTORY: {
    GET_STORE_INVENTORY: (id: string) => `/api/inventory/getStoreInventory/${id}`,
    LOW_STOCK_SUMMARY: (storeId: string) => `/api/inventory/low-stock-summary/${storeId}`,
  },

  SELLER_ACCOUNT: {
    GET_SELLER_ORDERS: (id: string) => `/api/orders/seller-orders/${id}`,
    GET_MY_SELLER_ORDERS: '/api/orders/seller-orders/my',
  },

  PAYMENT: {
    COD:              '/api/payment/cod-payment',
    INITIATE_PAYMENT: '/api/payment/initiate-payment',
    STATUS:           '/api/payment/status',
  },

  ORDERS: {
    MARK_PAID:     (id: string) => `/api/orders/mark-paid/${id}`,
    UPDATE_STATUS: '/api/orders/update-status',
    DOWNLOAD_URL:  '/api/orders/download-url',

    MY_ORDERS:       '/api/orders/my-orders',
    GET_BY_ID:       (orderId: string) => `/api/orders/${orderId}`,
    CANCEL:          (orderId: string) => `/api/orders/cancel/${orderId}`,
    RETURN_REQUEST:  (orderId: string) => `/api/orders/return-request/${orderId}`,
    SELLER_RETURNS:  '/api/orders/returns',
    RETURN_ACTION:   (orderId: string) => `/api/orders/return-action/${orderId}`,
    GET_DOWNLOAD_LINK: '/api/orders/get-download-link',
    STREAM_PDF:        '/api/orders/stream-pdf',
  },

  // ── MESSAGING ─────────────────────────────────────────────────────────────
  MESSAGING: {
    CONVERSATIONS: {
      START:     '/api/messaging/conversations',
      LIST:      '/api/messaging/conversations',
      SEARCH:    '/api/messaging/conversations/search',
      GET_BY_ID: (id: string) => `/api/messaging/conversations/${id}`,
      ARCHIVE:   (id: string) => `/api/messaging/conversations/${id}/archive`,
      RESTORE:   (id: string) => `/api/messaging/conversations/${id}/restore`,
      PIN:       (id: string) => `/api/messaging/conversations/${id}/pin`,
      MUTE:      (id: string) => `/api/messaging/conversations/${id}/mute`,
      DELETE:    (id: string) => `/api/messaging/conversations/${id}`,
    },
    ATTACHMENTS: {
      UPLOAD: (conversationId: string) => `/api/messaging/conversations/${conversationId}/attachments`,
    },
    MESSAGES: {
      LIST:      (conversationId: string) => `/api/messaging/conversations/${conversationId}/messages`,
      SEND:      (conversationId: string) => `/api/messaging/conversations/${conversationId}/messages`,
      SEARCH:    (conversationId: string) => `/api/messaging/conversations/${conversationId}/messages/search`,
      EDIT:      (messageId: string) => `/api/messaging/messages/${messageId}`,
      DELETE:    (messageId: string) => `/api/messaging/messages/${messageId}`,
      MARK_SEEN: (messageId: string) => `/api/messaging/messages/${messageId}/seen`,
    },
    MODERATION: {
      BLOCK:   '/api/messaging/block',
      UNBLOCK: (targetId: string) => `/api/messaging/block/${targetId}`,
      REPORT:  '/api/messaging/report',
    },
    ADMIN: {
      LIST_CONVERSATIONS:     '/api/messaging/admin/conversations',
      GET_CONVERSATION_BY_ID: (id: string) => `/api/messaging/admin/conversations/${id}`,
      GET_REPORTS:            '/api/messaging/admin/reports',
    },
  },

  // ── POS ───────────────────────────────────────────────────────────────────
  POS: {
    PIN_LOGIN: '/api/pos/pin-login',

    EMPLOYEES: {
      CREATE:     '/api/pos/employees',
      LIST:       (storeId: string) => `/api/pos/employees/${storeId}`,
      GET_BY_ID:  (storeId: string, employeeId: string) => `/api/pos/employees/${storeId}/${employeeId}`,
      UPDATE:     (storeId: string, employeeId: string) => `/api/pos/employees/${storeId}/${employeeId}`,
      REMOVE:     (storeId: string, employeeId: string) => `/api/pos/employees/${storeId}/${employeeId}`,
      RESET_PIN:  (storeId: string, employeeId: string) => `/api/pos/employees/${storeId}/${employeeId}/reset-pin`,
    },

    LOCATIONS: {
      CREATE:    (storeId: string) => `/api/pos/locations/${storeId}`,
      LIST:      (storeId: string) => `/api/pos/locations/${storeId}`,
      OVERVIEW:  (storeId: string) => `/api/pos/locations/${storeId}/overview`,
      GET_BY_ID: (storeId: string, locationId: string) => `/api/pos/locations/${storeId}/${locationId}`,
      UPDATE:    (storeId: string, locationId: string) => `/api/pos/locations/${storeId}/${locationId}`,
      ARCHIVE:   (storeId: string, locationId: string) => `/api/pos/locations/${storeId}/${locationId}`,
    },

    REGISTERS: {
      ADD:       (storeId: string) => `/api/pos/registers/${storeId}`,
      LIST:      (storeId: string) => `/api/pos/registers/${storeId}`,
      GET_BY_ID: (storeId: string, registerId: string) => `/api/pos/registers/${storeId}/${registerId}`,
      UPDATE:    (storeId: string, registerId: string) => `/api/pos/registers/${storeId}/${registerId}`,
      REMOVE:    (storeId: string, registerId: string) => `/api/pos/registers/${storeId}/${registerId}`,
    },

    SHIFTS: {
      ADD:       (storeId: string) => `/api/pos/shifts/${storeId}`,
      LIST:      (storeId: string) => `/api/pos/shifts/${storeId}`,
      GET_BY_ID: (storeId: string, shiftId: string) => `/api/pos/shifts/${storeId}/${shiftId}`,
      UPDATE:    (storeId: string, shiftId: string) => `/api/pos/shifts/${storeId}/${shiftId}`,
      DELETE:    (storeId: string, shiftId: string) => `/api/pos/shifts/${storeId}/${shiftId}`,
    },

    PRODUCTS: {
      SEARCH:         '/api/pos/products/search',
      LIST:           (storeId: string) => `/api/pos/products/${storeId}`,
      GET_BY_BARCODE: (storeId: string, barcode: string) => `/api/pos/products/barcode/${storeId}/${barcode}`,
    },

    SESSIONS: {
      OPEN:            '/api/pos/sessions/open',
      CLOSE:           '/api/pos/sessions/close',
      ACTIVE:          '/api/pos/sessions/active',
      HISTORY:         '/api/pos/sessions/history',
      CASH_ADJUSTMENT: (sessionId: string) => `/api/pos/sessions/${sessionId}/cash-adjustment`,
      REPORT:          (sessionId: string) => `/api/pos/sessions/${sessionId}/report`,
      FORCE_CLOSE:     (sessionId: string) => `/api/pos/sessions/${sessionId}/force-close`,
    },

    SALES: {
      CREATE:      '/api/pos/sales',
      HELD:        '/api/pos/sales/held',
      LIST:        '/api/pos/sales',
      GET_BY_ID:   (saleId: string) => `/api/pos/sales/${saleId}`,
      COMPLETE:    (saleId: string) => `/api/pos/sales/${saleId}/complete`,
      REFUND:      (saleId: string) => `/api/pos/sales/${saleId}/refund`,
      DISCARD:     (saleId: string) => `/api/pos/sales/${saleId}/discard`,
      VOID:        (saleId: string) => `/api/pos/sales/${saleId}/void`,
      UPDATE_ITEMS:(saleId: string) => `/api/pos/sales/${saleId}/items`,
    },

    REPORTS: {
      DAILY:          '/api/pos/reports/daily',
      RANGE:          '/api/pos/reports/range',
      DAILY_EXPORT:   '/api/pos/reports/daily/export',
      REGISTER:       (registerId: string) => `/api/pos/reports/register/${registerId}`,
      EMPLOYEE:       (employeeId: string) => `/api/pos/reports/employee/${employeeId}`,
    },

    SETTINGS: {
      GET:    (storeId: string) => `/api/pos/settings/${storeId}`,
      UPDATE: (storeId: string) => `/api/pos/settings/${storeId}`,
    },

    AUDIT_LOGS: {
      LIST: (storeId: string) => `/api/pos/audit-logs/${storeId}`,
    },
  },

  // ── BANNERS ───────────────────────────────────────────────────────────────
  BANNER: {
    // `/api/spotlight` — additive alias of `/api/banners` (same handler, see
    // banner.controller.ts) used for this public unauthenticated GET because
    // some browser ad-blockers pattern-match and silently drop any request
    // whose URL contains "banners".
    LIST:   '/api/spotlight',
    COUNT:  '/api/banners/count',
    CREATE: '/api/banners',
    UPLOAD: '/api/banners/upload',
    UPDATE: (id: string) => `/api/banners/${id}`,
    PAUSE:  (id: string) => `/api/banners/${id}/pause`,
    RESUME: (id: string) => `/api/banners/${id}/resume`,
    DELETE: (id: string) => `/api/banners/${id}`,
  },

  // ── STORE BANNERS (seller-owned storefront banners) ───────────────────────
  STORE_BANNER: {
    PUBLIC:   (storeId: string) => `/api/public/store-banners/${storeId}`,
    LIST:     (storeId: string) => `/api/store-banner/${storeId}`,
    CREATE:   (storeId: string) => `/api/store-banner/${storeId}`,
    UPDATE:   (storeId: string, bannerId: string) => `/api/store-banner/${storeId}/${bannerId}`,
    PAUSE:    (storeId: string, bannerId: string) => `/api/store-banner/${storeId}/${bannerId}/pause`,
    RESUME:   (storeId: string, bannerId: string) => `/api/store-banner/${storeId}/${bannerId}/resume`,
    TIMELINE: (storeId: string, bannerId: string) => `/api/store-banner/${storeId}/${bannerId}/timeline`,
    DELETE:   (storeId: string, bannerId: string) => `/api/store-banner/${storeId}/${bannerId}`,
  },

  // ── MEDIA LIBRARY (reusable promotional creatives) ────────────────────────
  MEDIA_LIBRARY: {
    LIST: '/api/media-library',
  },

  // ── PROMOTIONS (seller-requested paid platform placements) ────────────────
  PROMOTIONS: {
    PREVIEW_PRICE: '/api/promotions/preview-price',
    LIST:          (storeId: string) => `/api/promotions/${storeId}`,
    CREATE:        (storeId: string) => `/api/promotions/${storeId}`,
    ANALYTICS:     (storeId: string) => `/api/promotions/${storeId}/analytics`,
    PAY:           (id: string) => `/api/promotions/${id}/pay`,
    CONFIRM:       (id: string) => `/api/promotions/${id}/confirm`,
    CANCEL:        (id: string) => `/api/promotions/${id}/cancel`,
    TIMELINE:      (id: string) => `/api/promotions/${id}/timeline`,
    TRACK_IMPRESSION: '/api/promotions/track/impression',
    TRACK_CLICK:      '/api/promotions/track/click',

    ADMIN: {
      LIST:      '/api/admin/marketing/promotions',
      ANALYTICS: '/api/admin/marketing/promotions/analytics',
      CALENDAR:  '/api/admin/marketing/promotions/calendar',
      CONFLICTS: '/api/admin/marketing/promotions/conflicts',
      APPROVE:   (id: string) => `/api/admin/marketing/promotions/${id}/approve`,
      REJECT:    (id: string) => `/api/admin/marketing/promotions/${id}/reject`,
    },
  },

  // ── FAQS ──────────────────────────────────────────────────────────────────
  FAQ: {
    LIST:       '/api/faqs',
    SEARCH:     '/api/faqs/search',
    CATEGORIES: '/api/faqs/categories',
    ADMIN_ALL:  '/api/faqs/admin/all',
    CREATE:     '/api/faqs',
    UPDATE:     (id: string) => `/api/faqs/${id}`,
    TOGGLE:     (id: string) => `/api/faqs/${id}/toggle`,
    DELETE:     (id: string) => `/api/faqs/${id}`,
  },

  // ── CONTACT US ────────────────────────────────────────────────────────────
  CONTACT: {
    SUBMIT:       '/api/contact',
    ADMIN_ALL:    '/api/contact/admin/all',
    UPDATE_STATUS:(id: string) => `/api/contact/admin/${id}/status`,
    DELETE:       (id: string) => `/api/contact/admin/${id}`,
  },

  TESTIMONIALS: {
    LIST:      '/api/testimonials',
    ADMIN_ALL: '/api/testimonials/admin/all',
    CREATE:    '/api/testimonials',
    UPDATE:    (id: string) => `/api/testimonials/${id}`,
    TOGGLE:    (id: string) => `/api/testimonials/${id}/toggle`,
    DELETE:    (id: string) => `/api/testimonials/${id}`,
  },

  // ── RATING / REVIEWS ──────────────────────────────────────────────────────
  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  ANALYTICS: {
    SELLER: {
      TODAY:                '/api/seller/analytics/today',
      OVERVIEW:             '/api/seller/analytics/overview',
      REVENUE_OVER_TIME:    '/api/seller/analytics/revenue-over-time',
      ORDERS_OVER_TIME:     '/api/seller/analytics/orders-over-time',
      TRAFFIC_SOURCES:      '/api/seller/analytics/traffic-sources',
      TOP_PRODUCTS:         '/api/seller/analytics/top-products',
      CUSTOMERS:            '/api/seller/analytics/customers',
      PRODUCTS_PERFORMANCE: '/api/seller/analytics/products/performance',
      INVENTORY_INSIGHTS:   '/api/seller/analytics/inventory-insights',
      PAYMENT_METHODS:      '/api/seller/analytics/payment-methods',
      REVENUE_BREAKDOWN:    '/api/seller/analytics/revenue-breakdown',
      EXPORT:               '/api/seller/analytics/export',
    },
    ADMIN: {
      OVERVIEW:                    '/api/admin/analytics/overview',
      REVENUE_OVER_TIME:           '/api/admin/analytics/revenue-over-time',
      REVENUE_BREAKDOWN:           '/api/admin/analytics/revenue-breakdown',
      SELLERS_TOP:                 '/api/admin/analytics/sellers/top',
      SELLERS_PERFORMANCE:         '/api/admin/analytics/sellers/performance',
      SELLERS_REGISTRATION_TRENDS: '/api/admin/analytics/sellers/registration-trends',
      CUSTOMERS:                   '/api/admin/analytics/customers',
      PRODUCTS_TOP:                '/api/admin/analytics/products/top',
      CATEGORIES_TOP:              '/api/admin/analytics/categories/top',
      PRODUCTS_PERFORMANCE:        '/api/admin/analytics/products/performance',
      INVENTORY_INSIGHTS:          '/api/admin/analytics/inventory-insights',
      ORDERS_OVER_TIME:            '/api/admin/analytics/orders-over-time',
      ORDERS_STATUS_BREAKDOWN:     '/api/admin/analytics/orders/status-breakdown',
      PAYMENTS_BREAKDOWN:          '/api/admin/analytics/payments/breakdown',
      PLATFORM_METRICS:            '/api/admin/analytics/platform-metrics',
      EXPORT:                      '/api/admin/analytics/export',
    },
  },

  // ── FINANCE ───────────────────────────────────────────────────────────────
  FINANCE: {
    SELLER: {
      DASHBOARD:             (storeId: string) => `/api/finance/${storeId}/dashboard`,
      TRANSACTIONS:          (storeId: string) => `/api/finance/${storeId}/transactions`,
      TRANSACTIONS_EXPORT:   (storeId: string) => `/api/finance/${storeId}/transactions/export`,
      ANALYTICS:             (storeId: string) => `/api/finance/${storeId}/analytics`,
      REQUEST_PAYOUT:        (storeId: string) => `/api/finance/${storeId}/payouts/request`,
      PAYOUTS:               (storeId: string) => `/api/finance/${storeId}/payouts`,
      PAYOUT_BY_ID:          (storeId: string, payoutId: string) => `/api/finance/${storeId}/payouts/${payoutId}`,
      ADD_PAYOUT_METHOD:     (storeId: string) => `/api/finance/${storeId}/payout-methods`,
      PAYOUT_METHODS:        (storeId: string) => `/api/finance/${storeId}/payout-methods`,
      SET_DEFAULT_METHOD:    (storeId: string, methodId: string) => `/api/finance/${storeId}/payout-methods/${methodId}/default`,
      UPDATE_PAYOUT_METHOD:  (storeId: string, methodId: string) => `/api/finance/${storeId}/payout-methods/${methodId}`,
      DELETE_PAYOUT_METHOD:  (storeId: string, methodId: string) => `/api/finance/${storeId}/payout-methods/${methodId}`,
      PAYOUT_SCHEDULE:       (storeId: string) => `/api/finance/${storeId}/payout-schedule`,
      GENERATE_TAX_REPORT:   (storeId: string) => `/api/finance/${storeId}/tax-reports/generate`,
      TAX_REPORTS:           (storeId: string) => `/api/finance/${storeId}/tax-reports`,
      MONTHLY_STATEMENT:     (storeId: string) => `/api/finance/${storeId}/monthly-statement`,
    },
    ADMIN: {
      OVERVIEW:              '/api/admin/finance/overview',
      REVENUE_OVER_TIME:     '/api/admin/finance/revenue-over-time',
      COMMISSION_OVER_TIME:  '/api/admin/finance/commission-over-time',
      SELLER_BALANCES:       '/api/admin/finance/sellers/balances',
      SELLER_DETAIL:         (storeId: string) => `/api/admin/finance/sellers/${storeId}`,
      SELLER_TRANSACTIONS:   (storeId: string) => `/api/admin/finance/sellers/${storeId}/transactions`,
      MANUAL_PAYOUT:         (storeId: string) => `/api/admin/finance/sellers/${storeId}/payouts/manual`,
      TRANSACTIONS:          '/api/admin/finance/transactions',
      PAYOUT_QUEUE:          '/api/admin/finance/payouts',
      APPROVE_PAYOUT:        (payoutId: string) => `/api/admin/finance/payouts/${payoutId}/approve`,
      REJECT_PAYOUT:         (payoutId: string) => `/api/admin/finance/payouts/${payoutId}/reject`,
      RETRY_PAYOUT:          (payoutId: string) => `/api/admin/finance/payouts/${payoutId}/retry`,
      PROCESS_CLEARING:      '/api/admin/finance/process-clearing',
      PROCESS_SCHEDULED_PAYOUTS: '/api/admin/finance/process-scheduled-payouts',
      PENDING_VERIFICATION_METHODS: '/api/admin/finance/payout-methods/pending-verification',
      VERIFY_PAYOUT_METHOD:  (storeId: string, methodId: string) => `/api/admin/finance/sellers/${storeId}/payout-methods/${methodId}/verify`,
      REFUND_REPORT:         '/api/admin/finance/reports/refunds',
      TAX_REPORTS:           '/api/admin/finance/reports/tax',
      SETTLEMENT_REPORT:     '/api/admin/finance/reports/settlement',
      MONTHLY_REPORT:        '/api/admin/finance/reports/monthly',
      EXPORT:                '/api/admin/finance/export',
      RECONCILIATION:        '/api/admin/finance/reconciliation',
      RECONCILIATION_HISTORY: '/api/admin/finance/reconciliation/history',
      FX_EXPOSURE:           '/api/admin/finance/fx-exposure',
      MONTHLY_SETTLEMENT:    '/api/admin/finance/monthly-settlement',
      MONTHLY_SETTLEMENT_RUN: '/api/admin/finance/monthly-settlement/run',
    },
  },

  // ── AI STUDIO (seller-only) ───────────────────────────────────────────────
  AI_STUDIO: {
    CREDITS:            (storeId: string) => `/api/ai-studio/${storeId}/credits`,
    GENERATIONS:        (storeId: string) => `/api/ai-studio/${storeId}/generations`,
    GENERATION_BY_ID:   (storeId: string, id: string) => `/api/ai-studio/${storeId}/generations/${id}`,
    ACCEPT_GENERATION:  (storeId: string, id: string) => `/api/ai-studio/${storeId}/generations/${id}/accept`,
    LISTING_WRITER:     (storeId: string) => `/api/ai-studio/${storeId}/listing-writer/generate`,
    SEO_BOOSTER:        (storeId: string) => `/api/ai-studio/${storeId}/seo-booster/generate`,
    EMAIL_CAMPAIGNS:    (storeId: string) => `/api/ai-studio/${storeId}/email-campaigns/generate`,
    WORKSHEET_BUILDER:  (storeId: string) => `/api/ai-studio/${storeId}/worksheet-builder/generate`,
    PRICE_OPTIMIZER:    (storeId: string) => `/api/ai-studio/${storeId}/price-optimizer/generate`,
    IMAGE_ENHANCER:     (storeId: string) => `/api/ai-studio/${storeId}/image-enhancer/generate`,
    IMAGE_ENHANCER_JOB: (storeId: string, jobId: string) => `/api/ai-studio/${storeId}/image-enhancer/jobs/${jobId}`,
  },

  // ── ADMIN AI STUDIO (oversight + platform-scope generation) ──────────────
  ADMIN_AI_STUDIO: {
    OVERVIEW:               '/api/admin/ai-studio/overview',
    GENERATIONS:            '/api/admin/ai-studio/generations',
    GENERATION_BY_ID:       (id: string) => `/api/admin/ai-studio/generations/${id}`,
    WALLETS:                '/api/admin/ai-studio/wallets',
    WALLET_LEDGER:          (storeId: string) => `/api/admin/ai-studio/wallets/${storeId}/ledger`,
    ADJUST_WALLET:          (storeId: string) => `/api/admin/ai-studio/wallets/${storeId}/adjust`,
    TRANSACTIONS:           '/api/admin/ai-studio/transactions',
    PLATFORM_SEO_BOOSTER:   '/api/admin/ai-studio/platform/seo-booster/generate',
    PLATFORM_EMAIL:         '/api/admin/ai-studio/platform/email-campaigns/generate',
    PLATFORM_IMAGE:         '/api/admin/ai-studio/platform/image-enhancer/generate',
    PLATFORM_IMAGE_JOB:     (jobId: string) => `/api/admin/ai-studio/platform/image-enhancer/jobs/${jobId}`,
  },

  // ── SEO (Admin/Platform + Seller/Store) ──────────────────────────────────
  SEO: {
    ADMIN: {
      GET_SETTINGS:   '/api/admin/seo/settings',
      UPDATE_SETTINGS:'/api/admin/seo/settings',
      RULES: {
        LIST:   '/api/admin/seo/rules',
        CREATE: '/api/admin/seo/rules',
        UPDATE: (code: string) => `/api/admin/seo/rules/${code}`,
        DELETE: (code: string) => `/api/admin/seo/rules/${code}`,
      },
      LANDING_PAGES: {
        LIST:      '/api/admin/seo/landing-pages',
        CREATE:    '/api/admin/seo/landing-pages',
        GET_BY_ID: (id: string) => `/api/admin/seo/landing-pages/${id}`,
        UPDATE:    (id: string) => `/api/admin/seo/landing-pages/${id}`,
        DELETE:    (id: string) => `/api/admin/seo/landing-pages/${id}`,
      },
      CATEGORY: {
        GET_SEO:    (id: string) => `/api/admin/seo/categories/${id}`,
        UPDATE_SEO: (id: string) => `/api/admin/seo/categories/${id}`,
      },
      FAQ: {
        GET_SEO:    (id: string) => `/api/admin/seo/faqs/${id}`,
        UPDATE_SEO: (id: string) => `/api/admin/seo/faqs/${id}`,
      },
      SITEMAP: {
        STATUS:     '/api/admin/seo/sitemap/status',
        REGENERATE: '/api/admin/seo/sitemap/regenerate',
      },
      REDIRECTS: {
        LIST:   '/api/admin/seo/redirects',
        CREATE: '/api/admin/seo/redirects',
        UPDATE: (id: string) => `/api/admin/seo/redirects/${id}`,
        DELETE: (id: string) => `/api/admin/seo/redirects/${id}`,
      },
      CANONICAL_RULES: {
        LIST:   '/api/admin/seo/canonical-rules',
        CREATE: '/api/admin/seo/canonical-rules',
        UPDATE: (id: string) => `/api/admin/seo/canonical-rules/${id}`,
        DELETE: (id: string) => `/api/admin/seo/canonical-rules/${id}`,
      },
      INTEGRATIONS: {
        LIST:            '/api/admin/seo/integrations',
        AUTHORIZE_URL:   (provider: string) => `/api/admin/seo/integrations/${provider}/authorize-url`,
        CONNECT:         (provider: string) => `/api/admin/seo/integrations/${provider}/connect`,
        DISCONNECT:      (provider: string) => `/api/admin/seo/integrations/${provider}`,
        SYNC:            (provider: string) => `/api/admin/seo/integrations/${provider}/sync`,
      },
      MONITORING: {
        CRAWL_LOGS:              '/api/admin/seo/monitoring/crawl-logs',
        CRAWL_STATS:             '/api/admin/seo/monitoring/crawl-stats',
        INDEX_SNAPSHOTS:         '/api/admin/seo/monitoring/index-snapshots',
        REFRESH_INDEX_SNAPSHOTS: '/api/admin/seo/monitoring/index-snapshots/refresh',
        CWV:                     '/api/admin/seo/monitoring/cwv',
        REFRESH_CWV:             '/api/admin/seo/monitoring/cwv/refresh',
      },
      ANALYTICS: {
        OVERVIEW:           '/api/admin/seo/analytics/overview',
        SEARCH_PERFORMANCE: '/api/admin/seo/analytics/search-performance',
        ORGANIC_TRAFFIC:    '/api/admin/seo/analytics/organic-traffic',
      },
    },

    SELLER: {
      DASHBOARD:          (storeId: string) => `/api/store/${storeId}/seo/dashboard`,
      GET_STORE_SEO:      (storeId: string) => `/api/store/${storeId}/seo/store`,
      UPDATE_STORE_SEO:   (storeId: string) => `/api/store/${storeId}/seo/store`,
      GET_CHECKLIST:      (storeId: string) => `/api/store/${storeId}/seo/store/checklist`,
      UPDATE_CHECKLIST:   (storeId: string) => `/api/store/${storeId}/seo/store/checklist`,

      PRODUCTS: {
        LIST:               (storeId: string) => `/api/store/${storeId}/seo/products`,
        GET_BY_ID:          (storeId: string, productId: string) => `/api/store/${storeId}/seo/products/${productId}`,
        UPDATE:             (storeId: string, productId: string) => `/api/store/${storeId}/seo/products/${productId}`,
        BULK_APPLY_TEMPLATE:(storeId: string) => `/api/store/${storeId}/seo/products/bulk-apply-template`,
        EXPORT:             (storeId: string) => `/api/store/${storeId}/seo/products/export`,
      },

      CONTENT: {
        CATEGORIES:  (storeId: string) => `/api/store/${storeId}/seo/content/categories`,
        GET_PAGE:    (storeId: string, pageId: string) => `/api/store/${storeId}/seo/content/pages/${pageId}`,
        UPDATE_PAGE: (storeId: string, pageId: string) => `/api/store/${storeId}/seo/content/pages/${pageId}`,
      },

      PREVIEW: {
        SCHEMA: (storeId: string, entityType: string, entityId: string) => `/api/store/${storeId}/seo/preview/schema/${entityType}/${entityId}`,
        SOCIAL: (storeId: string, entityType: string, entityId: string) => `/api/store/${storeId}/seo/preview/social/${entityType}/${entityId}`,
      },

      AUDIT: {
        RUN:     (storeId: string) => `/api/store/${storeId}/seo/audit/run`,
        LATEST:  (storeId: string) => `/api/store/${storeId}/seo/audit/latest`,
        HISTORY: (storeId: string) => `/api/store/${storeId}/seo/audit/history`,
      },

      AI: {
        GENERATE:      (storeId: string) => `/api/store/${storeId}/seo/ai/generate`,
        GENERATE_BULK: (storeId: string) => `/api/store/${storeId}/seo/ai/generate-bulk`,
        SUGGESTIONS:   (storeId: string) => `/api/store/${storeId}/seo/ai/suggestions`,
      },

      REDIRECTS: {
        LIST:   (storeId: string) => `/api/store/${storeId}/seo/redirects`,
        CREATE: (storeId: string) => `/api/store/${storeId}/seo/redirects`,
        UPDATE: (storeId: string, id: string) => `/api/store/${storeId}/seo/redirects/${id}`,
        DELETE: (storeId: string, id: string) => `/api/store/${storeId}/seo/redirects/${id}`,
      },

      CANONICAL_RULES: {
        LIST:   (storeId: string) => `/api/store/${storeId}/seo/canonical-rules`,
        CREATE: (storeId: string) => `/api/store/${storeId}/seo/canonical-rules`,
        UPDATE: (storeId: string, id: string) => `/api/store/${storeId}/seo/canonical-rules/${id}`,
        DELETE: (storeId: string, id: string) => `/api/store/${storeId}/seo/canonical-rules/${id}`,
      },

      INTEGRATIONS: {
        LIST:          (storeId: string) => `/api/store/${storeId}/seo/integrations`,
        AUTHORIZE_URL: (storeId: string, provider: string) => `/api/store/${storeId}/seo/integrations/${provider}/authorize-url`,
        CONNECT:       (storeId: string, provider: string) => `/api/store/${storeId}/seo/integrations/${provider}/connect`,
        DISCONNECT:    (storeId: string, provider: string) => `/api/store/${storeId}/seo/integrations/${provider}`,
      },

      ANALYTICS: {
        SEARCH_PERFORMANCE: (storeId: string) => `/api/store/${storeId}/seo/analytics/search-performance`,
        ORGANIC_TRAFFIC:    (storeId: string) => `/api/store/${storeId}/seo/analytics/organic-traffic`,
      },
    },
  },

  RATING: {
    ADD_REVIEW:      '/api/rating/add-review',
    MY_REVIEWS:      '/api/rating/my-reviews',
    EDIT_REVIEW:     (reviewId: string) => `/api/rating/${reviewId}`,
    DELETE_REVIEW:   (reviewId: string) => `/api/rating/${reviewId}`,
    PRODUCT_REVIEWS: (productId: string) => `/api/rating/product/${productId}`,
    STORE_REVIEWS:   (storeId: string) => `/api/rating/store-reviews/${storeId}`,
    REPLY:           (reviewId: string) => `/api/rating/reply/${reviewId}`,
    EDIT_REPLY:      (reviewId: string) => `/api/rating/edit-reply/${reviewId}`,
    FLAG:            (reviewId: string) => `/api/rating/flag/${reviewId}`,
    UNFLAG:          (reviewId: string) => `/api/rating/unflag/${reviewId}`,
    MODERATE_DELETE: (reviewId: string) => `/api/rating/admin/${reviewId}`,
    TOGGLE_HELPFUL:  (reviewId: string) => `/api/rating/${reviewId}/helpful`,
  },

} as const;
