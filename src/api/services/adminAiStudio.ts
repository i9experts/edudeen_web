import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { AiToolType, AiTone, CampaignGoal, EnhancementType, AiGenerationRow } from './aiStudio';

interface ApiResponse<T> { success: boolean; message?: string; data: T }

function qs(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ── Overview ───────────────────────────────────────────────────────────────────

export interface AdminAiStudioOverview {
  days: number;
  totalGenerations: number;
  successRate: number;
  totalCreditsSpent: number;
  capturedTransactionCount: number;
  byTool: Record<AiToolType, { succeeded: number; failed: number; processing: number }>;
  topStores: { storeId: string; storeName: string | null; storeSlug: string | null; generations: number; creditsCharged: number }[];
}

export function apiGetAdminAiStudioOverview(days = 28) {
  return client.get<never, ApiResponse<AdminAiStudioOverview>>(`${ENDPOINTS.ADMIN_AI_STUDIO.OVERVIEW}${qs({ days })}`);
}

// ── Generations (cross-store) ───────────────────────────────────────────────────

export type AiGenerationScope = 'seller' | 'platform';

export interface AdminGenerationRow extends AiGenerationRow {
  scope: AiGenerationScope;
  adminId: string | null;
  storeName: string | null;
  storeSlug: string | null;
}

export interface AdminGenerationsListParams {
  scope?: AiGenerationScope;
  storeId?: string;
  sellerId?: string;
  toolType?: AiToolType;
  status?: 'processing' | 'succeeded' | 'failed';
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface AdminGenerationsListData {
  items: AdminGenerationRow[];
  total: number;
  page: number;
  limit: number;
}

export function apiListAdminGenerations(params: AdminGenerationsListParams = {}) {
  return client.get<never, ApiResponse<AdminGenerationsListData>>(`${ENDPOINTS.ADMIN_AI_STUDIO.GENERATIONS}${qs(params)}`);
}

export function apiGetAdminGeneration(generationId: string) {
  return client.get<never, ApiResponse<AdminGenerationRow>>(ENDPOINTS.ADMIN_AI_STUDIO.GENERATION_BY_ID(generationId));
}

// ── Wallets ────────────────────────────────────────────────────────────────────

export interface AdminWalletRow {
  _id: string;
  storeId: string;
  sellerId: string;
  storeName: string | null;
  storeSlug: string | null;
  balance: number;
  monthlyAllowance: number;
  lastResetAt: string | null;
}

export interface AdminWalletsListParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface AdminWalletsListData {
  items: AdminWalletRow[];
  total: number;
  page: number;
  limit: number;
}

export function apiListAdminWallets(params: AdminWalletsListParams = {}) {
  return client.get<never, ApiResponse<AdminWalletsListData>>(`${ENDPOINTS.ADMIN_AI_STUDIO.WALLETS}${qs(params)}`);
}

export interface WalletLedgerEntry {
  type: 'grant' | 'spend' | 'reset';
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export interface WalletLedgerData {
  storeId: string;
  balance: number;
  monthlyAllowance: number;
  ledger: WalletLedgerEntry[];
}

export function apiGetAdminWalletLedger(storeId: string) {
  return client.get<never, ApiResponse<WalletLedgerData>>(ENDPOINTS.ADMIN_AI_STUDIO.WALLET_LEDGER(storeId));
}

export interface AdjustWalletPayload {
  direction: 'grant' | 'deduct';
  amount: number;
  reason: string;
}

export interface AdjustWalletResult {
  storeId: string;
  balance: number;
  monthlyAllowance: number;
}

export function apiAdjustAdminWallet(storeId: string, payload: AdjustWalletPayload) {
  return client.post<never, ApiResponse<AdjustWalletResult>>(ENDPOINTS.ADMIN_AI_STUDIO.ADJUST_WALLET(storeId), payload);
}

// ── Transactions (spend audit) ───────────────────────────────────────────────────

export interface AdminTransactionRow {
  _id: string;
  storeId: string;
  sellerId: string;
  toolUsed: AiToolType;
  creditsCharged: number;
  status: 'held' | 'captured' | 'refunded';
  generationId: string;
  note: string | null;
  createdAt: string;
}

export interface AdminTransactionsListParams {
  storeId?: string;
  toolUsed?: AiToolType;
  status?: 'held' | 'captured' | 'refunded';
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface AdminTransactionsListData {
  items: AdminTransactionRow[];
  total: number;
  page: number;
  limit: number;
}

export function apiListAdminTransactions(params: AdminTransactionsListParams = {}) {
  return client.get<never, ApiResponse<AdminTransactionsListData>>(`${ENDPOINTS.ADMIN_AI_STUDIO.TRANSACTIONS}${qs(params)}`);
}

// ── Platform-scope generation (Edudeen's own content) ────────────────────────────

export interface PlatformGenerateSeoPayload {
  title: string;
  description?: string;
  currentTags?: string[];
  regenerateFromId?: string;
}

export interface PlatformSeoResult {
  generationId: string;
  sessionId: string;
  creditsCharged: 0;
  provider: string;
  optimizedTitle: string;
  optimizedTags: { tag: string; isVerifiedData: boolean; competition: string | null }[];
  rankingNotes: string;
  lowConfidence: boolean;
}

export function apiGeneratePlatformSeo(payload: PlatformGenerateSeoPayload) {
  return client.post<never, ApiResponse<PlatformSeoResult>>(ENDPOINTS.ADMIN_AI_STUDIO.PLATFORM_SEO_BOOSTER, payload);
}

export interface PlatformGenerateEmailPayload {
  campaignGoal: CampaignGoal;
  tone: AiTone;
  regenerateFromId?: string;
}

export interface PlatformEmailResult {
  generationId: string;
  sessionId: string;
  creditsCharged: 0;
  provider: string;
  subject: string;
  previewText: string;
  body: string;
}

export function apiGeneratePlatformEmail(payload: PlatformGenerateEmailPayload) {
  return client.post<never, ApiResponse<PlatformEmailResult>>(ENDPOINTS.ADMIN_AI_STUDIO.PLATFORM_EMAIL, payload);
}

export interface PlatformGenerateImagePayload {
  imageUrl: string;
  enhancementType: EnhancementType;
  regenerateFromId?: string;
}

export interface StartPlatformImageResult {
  jobId: string;
  status: 'processing';
  creditsCharged: 0;
}

export function apiStartPlatformImageEnhance(payload: PlatformGenerateImagePayload) {
  return client.post<never, ApiResponse<StartPlatformImageResult>>(ENDPOINTS.ADMIN_AI_STUDIO.PLATFORM_IMAGE, payload);
}

export interface PlatformImageJobResult {
  jobId: string;
  status: 'processing' | 'succeeded' | 'failed';
  errorMessage: string | null;
  enhancedImageUrl?: string;
  originalImageUrl?: string;
  note?: string | null;
}

export function apiGetPlatformImageJob(jobId: string) {
  return client.get<never, ApiResponse<PlatformImageJobResult>>(ENDPOINTS.ADMIN_AI_STUDIO.PLATFORM_IMAGE_JOB(jobId));
}
