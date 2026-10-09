import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Shared response envelope ──────────────────────────────────────────────────
interface ApiResponse<T> { success: boolean; message?: string; data: T }

export const AI_TOOL_TYPES = [
  'listing_writer', 'price_optimizer', 'worksheet_builder',
  'seo_booster', 'email_campaigns', 'image_enhancer',
] as const;
export type AiToolType = (typeof AI_TOOL_TYPES)[number];

export const TONES = ['professional', 'friendly', 'academic'] as const;
export type AiTone = (typeof TONES)[number];

export const CAMPAIGN_GOALS = ['promo', 'newsletter', 'abandoned_cart', 'new_arrival', 'restock', 'thank_you'] as const;
export type CampaignGoal = (typeof CAMPAIGN_GOALS)[number];

export const ENHANCEMENT_TYPES = ['upscale', 'denoise', 'background_cleanup'] as const;
export type EnhancementType = (typeof ENHANCEMENT_TYPES)[number];

// ── Credits ────────────────────────────────────────────────────────────────────

export interface AiCreditTransactionRow {
  _id: string;
  storeId: string;
  sellerId: string;
  toolUsed: AiToolType;
  creditsCharged: number;
  status: 'held' | 'captured' | 'refunded';
  generationId: string;
  note?: string | null;
  createdAt: string;
}

export interface AiCreditsOverview {
  balance: number;
  monthlyAllowance: number;
  lastResetAt: string | null;
  toolCosts: Record<AiToolType, number>;
  usedThisMonth: number;
  usageByTool: { tool: AiToolType; credits: number; generations: number }[];
  transactions: AiCreditTransactionRow[];
  buyCredits: { endpoint: string; addonType: string; creditsPerUnit: number };
}

export function apiGetAiStudioCredits(storeId: string) {
  return client.get<never, ApiResponse<AiCreditsOverview>>(ENDPOINTS.AI_STUDIO.CREDITS(storeId));
}

// ── Generation history ────────────────────────────────────────────────────────

export interface AiGenerationRow {
  _id: string;
  sellerId: string;
  storeId: string;
  toolType: AiToolType;
  status: 'processing' | 'succeeded' | 'failed';
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown> | null;
  errorMessage: string | null;
  providerUsed: string | null;
  modelUsed: string | null;
  creditsCharged: number;
  sessionId: string;
  regeneratedFromId: string | null;
  productId: string | null;
  accepted: boolean;
  acceptedAt: string | null;
  appliedToProduct: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiGenerationsListParams {
  toolType?: AiToolType;
  sessionId?: string;
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface AiGenerationsListData {
  items: AiGenerationRow[];
  total: number;
  page: number;
  limit: number;
}

function qs(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function apiListAiGenerations(storeId: string, params: AiGenerationsListParams = {}) {
  return client.get<never, ApiResponse<AiGenerationsListData>>(`${ENDPOINTS.AI_STUDIO.GENERATIONS(storeId)}${qs(params)}`);
}

export function apiGetAiGeneration(storeId: string, generationId: string) {
  return client.get<never, ApiResponse<AiGenerationRow>>(ENDPOINTS.AI_STUDIO.GENERATION_BY_ID(storeId, generationId));
}

export interface AcceptGenerationPayload {
  applyToProduct?: boolean;
  productId?: string;
  /** The seller's edits of the AI draft (listing_writer / seo_booster). */
  edits?: Record<string, unknown>;
}

export function apiAcceptAiGeneration(storeId: string, generationId: string, payload: AcceptGenerationPayload = {}) {
  return client.post<never, ApiResponse<AiGenerationRow>>(ENDPOINTS.AI_STUDIO.ACCEPT_GENERATION(storeId, generationId), payload);
}

// ── 1. Listing Writer ─────────────────────────────────────────────────────────

export interface GenerateListingPayload {
  productType: string;
  keywords: string | string[];
  tone: AiTone;
  productId?: string;
  regenerateFromId?: string;
}

export interface ListingWriterResult {
  generationId: string;
  sessionId: string;
  creditsCharged: number;
  provider: string;
  title: string;
  description: string;
  suggestedTags: string[];
}

export function apiGenerateListing(storeId: string, payload: GenerateListingPayload) {
  return client.post<never, ApiResponse<ListingWriterResult>>(ENDPOINTS.AI_STUDIO.LISTING_WRITER(storeId), payload);
}

// ── 2. SEO Booster ─────────────────────────────────────────────────────────────

export interface GenerateSeoPayload {
  productId?: string;
  title?: string;
  description?: string;
  currentTags?: string[];
  regenerateFromId?: string;
}

export interface SeoBoosterTag {
  tag: string;
  isVerifiedData: boolean;
  competition: string | null;
}

export interface SeoBoosterResult {
  generationId: string;
  sessionId: string;
  creditsCharged: number;
  provider: string;
  optimizedTitle: string;
  optimizedTags: SeoBoosterTag[];
  rankingNotes: string;
  lowConfidence: boolean;
  keywordResearch: unknown[];
}

export function apiGenerateSeoBooster(storeId: string, payload: GenerateSeoPayload) {
  return client.post<never, ApiResponse<SeoBoosterResult>>(ENDPOINTS.AI_STUDIO.SEO_BOOSTER(storeId), payload);
}

// ── 3. Email Campaigns ─────────────────────────────────────────────────────────

export interface GenerateEmailPayload {
  campaignGoal: CampaignGoal;
  productIds?: string[];
  tone: AiTone;
  regenerateFromId?: string;
}

export interface EmailCampaignResult {
  generationId: string;
  sessionId: string;
  creditsCharged: number;
  provider: string;
  subject: string;
  previewText: string;
  body: string;
}

export function apiGenerateEmailCampaign(storeId: string, payload: GenerateEmailPayload) {
  return client.post<never, ApiResponse<EmailCampaignResult>>(ENDPOINTS.AI_STUDIO.EMAIL_CAMPAIGNS(storeId), payload);
}

// ── 4. Worksheet Builder ───────────────────────────────────────────────────────

export interface GenerateWorksheetPayload {
  subject: string;
  gradeLevel: string;
  topics: string[];
  questionCount: number;
  includeAnswerKey: boolean;
  regenerateFromId?: string;
}

export interface WorksheetQuestion {
  prompt: string;
  type?: 'multiple_choice' | 'short_answer' | 'fill_in_blank' | 'true_false' | 'open_ended';
  choices?: string[];
  answer?: string;
}

export interface WorksheetSection {
  instructions: string;
  questions: WorksheetQuestion[];
}

export interface WorksheetResult {
  generationId: string;
  sessionId: string;
  creditsCharged: number;
  provider: string;
  title: string;
  sections: WorksheetSection[];
}

export function apiGenerateWorksheet(storeId: string, payload: GenerateWorksheetPayload) {
  return client.post<never, ApiResponse<WorksheetResult>>(ENDPOINTS.AI_STUDIO.WORKSHEET_BUILDER(storeId), payload);
}

// ── 5. Price Optimizer ─────────────────────────────────────────────────────────

export interface GeneratePricePayload {
  productId?: string;
  categoryId?: string;
  attributes?: string;
  regenerateFromId?: string;
}

export interface PriceOptimizerResult {
  generationId: string;
  sessionId: string;
  creditsCharged: number;
  provider?: string;
  suggestedPrice: number | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  comparableListingsSampleSize: number;
  lowConfidence: boolean;
  explanation: string;
  externalMarketNote: string | null;
}

export function apiGeneratePriceOptimization(storeId: string, payload: GeneratePricePayload) {
  return client.post<never, ApiResponse<PriceOptimizerResult>>(ENDPOINTS.AI_STUDIO.PRICE_OPTIMIZER(storeId), payload);
}

// ── 6. Image Enhancer (async) ───────────────────────────────────────────────────

export interface GenerateImageEnhancePayload {
  imageUrl: string;
  enhancementType: EnhancementType;
  regenerateFromId?: string;
}

export interface StartImageEnhanceResult {
  jobId: string;
  status: 'processing';
  creditsCharged: number;
  pollUrl: string;
}

export function apiStartImageEnhance(storeId: string, payload: GenerateImageEnhancePayload) {
  return client.post<never, ApiResponse<StartImageEnhanceResult>>(ENDPOINTS.AI_STUDIO.IMAGE_ENHANCER(storeId), payload);
}

export interface ImageEnhanceJobResult {
  jobId: string;
  status: 'processing' | 'succeeded' | 'failed';
  creditsCharged: number;
  errorMessage: string | null;
  enhancedImageUrl?: string;
  originalImageUrl?: string;
  note?: string | null;
}

export function apiGetImageEnhanceJob(storeId: string, jobId: string) {
  return client.get<never, ApiResponse<ImageEnhanceJobResult>>(ENDPOINTS.AI_STUDIO.IMAGE_ENHANCER_JOB(storeId, jobId));
}
