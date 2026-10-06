import client from '../client';

const BASE = '/api/platform-plans';

export interface PlatformPlanLimits {
  maxProducts?: number; maxStaffAccounts?: number; maxPosLocations?: number;
  aiCreditsPerMonth?: number; transactionFeeRate?: number;
  customDomainAllowed?: boolean; whiteLabelAllowed?: boolean; loyaltyProgramAllowed?: boolean;
  subscriptionProductsAllowed?: boolean; advancedAnalyticsAllowed?: boolean;
  abandonedCartRecoveryAllowed?: boolean; emailCampaignsAllowed?: boolean; apiWebhooksAllowed?: boolean;
  dedicatedAccountManager?: boolean; prioritySupport?: boolean; marketplaceFeaturedBadge?: boolean;
  slaUptimePercent?: number;
  advancedSeoToolsAllowed?: boolean; seoAiSuggestionsAllowed?: boolean;
  searchConsoleIntegrationAllowed?: boolean; customRedirectsAllowed?: boolean;
  maxActiveStoreBanners?: number; maxActivePromotions?: number;
}

export interface PlatformPlan {
  _id: string; name: string; description: string | null; badge: string | null;
  sortOrder: number; isFree: boolean; isCustomPricing: boolean;
  monthlyPriceUSD: number | null; yearlyPriceUSD: number | null; trialDays: number;
  featureBullets: string[]; limits: PlatformPlanLimits;
  status: 'active' | 'archived'; isPubliclyVisible: boolean; createdAt: string; updatedAt: string;
  subscriberCount?: number; mrrUSD?: number;
}

export type AddonType = 'extra_ai_credits' | 'extra_staff_seat' | 'priority_marketplace_placement' | 'advanced_tax_compliance' | 'sms_notifications';

export interface AddonPurchase {
  _id: string; storeId: string; addonType: AddonType; quantity: number;
  amountUSD: number; status: string; createdAt: string;
}

export interface PlatformPlanInvoice {
  _id: string; storeId: string; sellerId: string; platformPlanId: string;
  invoiceNumber: string; type: 'initial' | 'recurring' | 'proration';
  amountUSD: number; status: 'paid' | 'failed' | 'pending' | 'refunded' | 'partially_refunded';
  paidAt: string | null; refundedAt: string | null; refundedAmountUSD: number;
  hostedInvoiceUrl: string | null; invoicePdfUrl: string | null;
  paymentMethodType: string | null; createdAt: string;
}

export interface StorePlatformSubscription {
  _id: string; storeId: string; platformPlanId: string; billingInterval: 'monthly' | 'yearly';
  amountUSD: number; status: string; trialEndsAt: string | null; currentPeriodEnd: string; nextBillingDate: string;
  cancelAtPeriodEnd: boolean; cancelReason: string | null; failedPaymentAttempts: number;
  creditBalanceUSD: number; stripeCustomerId: string | null;
  plan?: PlatformPlan;
}

export interface PlanChangePreview {
  direction: 'upgrade' | 'downgrade' | 'billing_interval_change';
  currentPlanName: string; currentAmountUSD: number;
  newPlanName: string; newAmountUSD: number; newBillingInterval: 'monthly' | 'yearly';
  remainingDaysInCurrentPeriod: number;
  unusedCreditFromCurrentPlanUSD: number; existingCreditBalanceUSD: number; totalCreditAppliedUSD: number;
  amountDueTodayUSD: number; creditAppliedToBalanceUSD: number; effectiveImmediately: boolean;
}

export interface EntitlementsSummary {
  currentPlanName: string;
  currentPlanId: string | null;
  maxProducts: { limit: number; used: number; allowed: boolean };
  maxStaffAccounts: { limit: number; used: number; allowed: boolean };
  maxPosLocations: { limit: number; used: number; allowed: boolean };
  aiCredits: { monthlyAllowance: number; balance: number };
  transactionFeeRate: number;
  dedicatedAccountManager: boolean;
  prioritySupport: boolean;
  marketplaceFeaturedBadge: boolean;
  slaUptimePercent: number | null;
  [featureKey: string]: unknown;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ── Public ────────────────────────────────────────────────────────────────────
export function apiBrowsePlatformPlans() {
  return client.get<never, ApiResponse<PlatformPlan[]>>(`${BASE}/public`);
}

/** One entry of the public add-on catalog — the same price a purchase charges. */
export interface PublicAddonCatalogItem {
  addonType: AddonType | string;
  name:      string;
  priceUSD:  number;
  recurring: boolean;
  /** e.g. '500 credits', 'month', 'month (base enablement fee)'. */
  unitLabel: string;
}

/** GET /api/platform-plans/public/addons — no auth. */
export function apiGetPublicAddonCatalog() {
  return client.get<never, ApiResponse<PublicAddonCatalogItem[]>>(`${BASE}/public/addons`);
}

// ── Seller ────────────────────────────────────────────────────────────────────
export function apiGetSellerPlatformOverview() {
  return client.get<never, ApiResponse<{
    stores: Array<{
      storeId: string;
      storeName: string;
      storeSlug: string;
      storeStatus: string;
      platformPlan: { id: string; name: string; isFree: boolean } | null;
      subscriptionStatus: string;
      nextBillingDate: string | null;
      totalPaidUSD: number;
    }>;
  }>>(`${BASE}/seller/overview`);
}

// ── Onboarding wizard's Payment step (no store exists yet) ─────────────────
export function apiCreateOnboardingSetupIntent() {
  return client.post<never, ApiResponse<{ clientSecret: string; customerId: string }>>(`${BASE}/onboarding/setup-intent`, {});
}

export function apiConfirmOnboardingPaymentMethod(setupIntentId: string) {
  return client.post<never, ApiResponse<never>>(`${BASE}/onboarding/confirm-payment-method`, { setupIntentId });
}

export interface OnboardingDraft {
  step: number;
  maxReached: number;
  form: Record<string, unknown>;
}

export interface OnboardingProgress {
  draft: OnboardingDraft | null;
  hasPlatformPaymentMethod: boolean;
}

/** Lets the /onboard wizard resume exactly where the seller left off instead
 *  of restarting from step 1 after a reload/lost connection/different device. */
export function apiGetOnboardingProgress() {
  return client.get<never, ApiResponse<OnboardingProgress>>(`${BASE}/onboarding/progress`);
}

/** Fire-and-forget-friendly — called on every wizard step transition, not every keystroke. */
export function apiSaveOnboardingDraft(draft: OnboardingDraft) {
  return client.patch<never, ApiResponse<never>>(`${BASE}/onboarding/draft`, draft);
}

export function apiGetStorePlatformPlan(storeId: string) {
  return client.get<never, ApiResponse<StorePlatformSubscription | null>>(`${BASE}/${storeId}`);
}

export function apiGetStoreEntitlements(storeId: string) {
  return client.get<never, ApiResponse<EntitlementsSummary>>(`${BASE}/${storeId}/entitlements`);
}

export function apiGetStoreInvoices(storeId: string, query: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (query.page) qs.set('page', String(query.page));
  if (query.limit) qs.set('limit', String(query.limit));
  const s = qs.toString();
  return client.get<never, ApiResponse<{ invoices: PlatformPlanInvoice[]; total: number; page: number; limit: number; pages: number }>>(
    `${BASE}/${storeId}/invoices${s ? `?${s}` : ''}`,
  );
}

export function apiChangePlatformPlan(storeId: string, newPlatformPlanId: string, newBillingInterval: 'monthly' | 'yearly') {
  return client.patch<never, ApiResponse<StorePlatformSubscription>>(`${BASE}/${storeId}/change-plan`, { newPlatformPlanId, newBillingInterval });
}

/** Exact proration math for a would-be plan change — no charge, no write. Call this before showing a confirm dialog. */
export function apiPreviewPlatformPlanChange(storeId: string, newPlatformPlanId: string, newBillingInterval: 'monthly' | 'yearly') {
  return client.post<never, ApiResponse<PlanChangePreview>>(`${BASE}/${storeId}/preview-change-plan`, { newPlatformPlanId, newBillingInterval });
}

/** Schedules a downgrade to the free plan at the end of the current paid period — access continues until then. */
export function apiCancelPlatformPlan(storeId: string, reason?: string) {
  return client.post<never, ApiResponse<StorePlatformSubscription>>(`${BASE}/${storeId}/cancel`, { reason });
}

/** Undoes a still-pending apiCancelPlatformPlan — the subscription keeps renewing normally. */
export function apiReactivatePlatformPlan(storeId: string) {
  return client.post<never, ApiResponse<StorePlatformSubscription>>(`${BASE}/${storeId}/reactivate`, {});
}

/** Stripe-hosted portal for updating the payment method / viewing past invoices on this store's platform-plan billing. */
export function apiCreatePlatformBillingPortalSession(storeId: string, returnUrl: string) {
  return client.post<never, ApiResponse<{ url: string }>>(`${BASE}/${storeId}/billing-portal`, { returnUrl });
}

export function apiPurchaseAddon(storeId: string, addonType: AddonType, quantity = 1) {
  return client.post<never, ApiResponse<AddonPurchase>>(`${BASE}/${storeId}/addons`, { addonType, quantity });
}

export function apiListStoreAddons(storeId: string) {
  return client.get<never, ApiResponse<AddonPurchase[]>>(`${BASE}/${storeId}/addons`);
}

export function apiCancelAddon(storeId: string, addonId: string) {
  return client.delete<never, ApiResponse<never>>(`${BASE}/${storeId}/addons/${addonId}`);
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface CreatePlatformPlanPayload {
  name: string; description?: string; badge?: string; sortOrder?: number;
  isFree?: boolean; isCustomPricing?: boolean; monthlyPriceUSD?: number; yearlyPriceUSD?: number;
  trialDays?: number; featureBullets?: string[]; limits: PlatformPlanLimits;
  isPubliclyVisible?: boolean;
}

export function apiAdminCreatePlatformPlan(payload: CreatePlatformPlanPayload) {
  return client.post<never, ApiResponse<PlatformPlan>>(`${BASE}/admin`, payload);
}

export function apiAdminListPlatformPlans(includeArchived = false) {
  return client.get<never, ApiResponse<PlatformPlan[]>>(`${BASE}/admin?includeArchived=${includeArchived}`);
}

export function apiAdminGetPlatformPlanById(id: string) {
  return client.get<never, ApiResponse<PlatformPlan>>(`${BASE}/admin/${id}`);
}

export function apiAdminGetPlatformPlanSubscribers(id: string, query: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (query.page) qs.set('page', String(query.page));
  if (query.limit) qs.set('limit', String(query.limit));
  const s = qs.toString();
  return client.get<never, ApiResponse<{ pagination: { page: number; limit: number; total: number; pages: number }; subscribers: StorePlatformSubscription[] }>>(`${BASE}/admin/${id}/subscribers${s ? `?${s}` : ''}`);
}

export function apiAdminUpdatePlatformPlan(id: string, payload: Partial<CreatePlatformPlanPayload> & { status?: 'active' | 'archived' }) {
  return client.patch<never, ApiResponse<PlatformPlan>>(`${BASE}/admin/${id}`, payload);
}

export function apiAdminArchivePlatformPlan(id: string, force = false) {
  return client.delete<never, ApiResponse<never>>(`${BASE}/admin/${id}?force=${force}`);
}

export function apiAdminGetPlatformPlanRevenue(query: { range?: string } = {}) {
  const qs = query.range ? `?range=${query.range}` : '';
  return client.get<never, ApiResponse<{ mrr: number; arr: number; activeSubscribers: number; planBreakdown: Array<{ planName: string; subscriberCount: number; mrrUSD: number }> }>>(`${BASE}/admin/revenue${qs}`);
}

export function apiAdminListAddonPurchases(query: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (query.page) qs.set('page', String(query.page));
  if (query.limit) qs.set('limit', String(query.limit));
  const s = qs.toString();
  return client.get<never, ApiResponse<{ pagination: { page: number; limit: number; total: number; pages: number }; addons: AddonPurchase[] }>>(`${BASE}/admin/addons${s ? `?${s}` : ''}`);
}

export function apiAdminRefundPlatformInvoice(invoiceId: string, amountUSD?: number, reason?: string) {
  return client.post<never, ApiResponse<never>>(`${BASE}/admin/invoices/${invoiceId}/refund`, { amountUSD, reason });
}
