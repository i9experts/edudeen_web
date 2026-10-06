import client from '../../client';
import type { MaintenancePayload } from '@/api/services/maintenance';
import { ENDPOINTS } from '../../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface FeatureFlags {
  aiStudio: boolean;
  marketplace: boolean;
  digitalUploads: boolean;
  affiliateProgram: boolean;
  giftCards: boolean;
  posMode: boolean;
  storeBuilder: boolean;
  bulkProductImport: boolean;
  promotions: boolean;
  storefrontBlog: boolean;
}

export interface AiConfig {
  monthlyCreditLimit: number;
  aiModel: string;
}

export interface EmailConfig {
  fromName: string;
  fromEmail: string | null;
  replyToEmail: string | null;
  provider: string;
}

export interface PlacementLimits {
  homepageHero: number;
  marketplaceHero: number;
  educationHero: number;
  categoryHero: number;
  storeHero: number;
  storeFeaturedProducts: number;
}

export interface FestivalPricingOverride {
  name: string;
  startAt: string;
  endAt: string;
  rate: number;
}

export interface PlacementRateCard {
  hourly?: number;
  daily?: number;
  weekly?: number;
  monthly?: number;
  weekendMultiplier?: number;
  peakMultiplier?: number;
  festivalOverrides?: FestivalPricingOverride[];
}

export type PromotionPricing = Partial<Record<'homepageHero' | 'marketplaceHero' | 'educationHero' | 'categoryHero', PlacementRateCard>>;

export interface ManualPaymentConfig {
  enabled: boolean;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  instructions: string | null;
  usdToPkrRate: number;
}

export interface FxConfig {
  autoRefreshEnabled: boolean;
  refreshIntervalHours: number;
  staleRateAlertThresholdHours: number;
  sanityBandMinPKR: number;
  sanityBandMaxPKR: number;
  abnormalJumpAlertPercent: number;
}

export type PayoutFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual';

/** Mirrors backend PayoutConfig (admin-config/schemas/platform-config.schema.ts). */
export interface PayoutConfig {
  /** Minimum available balance before a USD seller can be paid out. */
  minPayoutUSD: number;
  /** Minimum available balance before a PKR seller can be paid out. */
  minPayoutPKR: number;
  /** Frequency NEW seller payout schedules start on — existing schedules are not changed. */
  payoutFrequency: PayoutFrequency;
}

export interface PlatformConfig {
  _id: string;
  maintenanceMode: boolean;
  /** What is under maintenance, why and until when; absent on an older config document. */
  maintenance?: (Omit<MaintenancePayload, 'maintenanceMode'> & { enabled: boolean; updatedAt?: string | null }) | null;
  /** May be absent on an older config document — the backend then falls back to its defaults (USD 5 / PKR 1500 / monthly). */
  payoutConfig?: PayoutConfig;
  featureFlags: FeatureFlags;
  aiConfig: AiConfig;
  emailConfig: EmailConfig;
  placementLimits: PlacementLimits;
  promotionPricing: PromotionPricing;
  manualPaymentConfig: ManualPaymentConfig;
  fxConfig: FxConfig;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetPlatformConfig() {
  return client.get<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.GET);
}

export function apiUpdateFeatureFlags(payload: Partial<FeatureFlags>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_FEATURE_FLAGS, payload);
}

export function apiUpdateAiConfig(payload: Partial<AiConfig>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_AI, payload);
}

export function apiUpdateEmailConfig(payload: Partial<EmailConfig>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_EMAIL, payload);
}

export function apiUpdateMaintenanceMode(payload: MaintenancePayload) {
  return client.patch<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_MAINTENANCE, payload);
}

export function apiUpdatePlacementLimits(payload: Partial<PlacementLimits>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_PLACEMENT_LIMITS, payload);
}

export function apiUpdatePromotionPricing(payload: PromotionPricing) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_PROMOTION_PRICING, payload);
}

export function apiUpdateManualPaymentConfig(payload: Partial<ManualPaymentConfig>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_MANUAL_PAYMENT, payload);
}

export function apiUpdatePayoutConfig(payload: Partial<PayoutConfig>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_PAYOUT, payload);
}

export function apiUpdateFxConfig(payload: Partial<FxConfig>) {
  return client.put<never, ApiResponse<PlatformConfig>>(ENDPOINTS.PLATFORM_CONFIG.UPDATE_FX, payload);
}

/** PUT /api/admin/platform-config/social-links — footer social links (empty string clears one). */
export function apiUpdateSocialLinks(links: Partial<Record<'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'x', string>>) {
  return client.put<never, { success: boolean; message?: string }>('/api/admin/platform-config/social-links', links);
}
