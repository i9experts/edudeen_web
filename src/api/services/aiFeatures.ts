import client from '../client';

// Phase 5 AI features (Claude). Paths live here to keep this module self-contained.
interface Res<T> { success: boolean; message?: string; data: T }

export interface AiExtras { imageEnhancer: boolean; tts: boolean; semanticSearch: boolean }
export interface AiFeaturesState { available: boolean; studio?: boolean; features: Record<string, boolean>; extras?: AiExtras }

/** User-facing message + code from an AI endpoint failure (402 credits, 403 switched off, 503 unavailable, 429 rate limit). */
export function aiErrorInfo(err: unknown): { message: string; code?: string } {
  const e = err as { response?: { data?: { message?: string; errorCode?: string } }; message?: string };
  const body = e?.response?.data;
  const code = body?.errorCode;
  let message = body?.message || (err instanceof Error ? err.message : '') || 'Something went wrong.';
  if (code === 'INSUFFICIENT_AI_CREDITS') message += ' Buy more credits in AI Studio.';
  return { message, code };
}

export function apiGetAiFeatures(storeId?: string) {
  return client.get<never, Res<AiFeaturesState>>(`/api/ai/features${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`);
}

// ── Buyer ────────────────────────────────────────────────────────────────────
export interface AiProductCard {
  id: string; slug: string; name: string; nameUr: string | null; image: string | null;
  price: number | null; currency: string | null; rating: number; ratingCount: number;
  productType: string; educationLevel: string | null; url: string;
}
export interface SmartSearchResult {
  query: string; usedAi: boolean; relaxed?: boolean;
  interpreted: { keywords: string[]; educationLevel?: string; productType?: string; maxPrice?: number; minPrice?: number; age?: number } | null;
  products: AiProductCard[];
}
export function apiSmartSearch(q: string) {
  return client.get<never, Res<SmartSearchResult>>(`/api/ai/search?q=${encodeURIComponent(q)}`);
}

export interface ChatTurn { role: 'user' | 'assistant'; content: string }
export function apiAssistantChat(messages: ChatTurn[]) {
  return client.post<never, Res<{ reply: string; products: AiProductCard[] }>>('/api/ai/assistant/chat', { messages });
}

export interface ReviewSummary { available: boolean; reviewCount: number; summary: string | null; pros?: string[]; cons?: string[] }
export function apiReviewSummary(productId: string) {
  return client.get<never, Res<ReviewSummary>>(`/api/ai/reviews/summary/${productId}`);
}

// ── Seller ───────────────────────────────────────────────────────────────────
const S = (storeId: string) => `/api/ai/seller/${storeId}`;

export interface TranslateDraft { direction?: 'en_to_ur' | 'ur_to_en'; title: string; description: string; needsReview: string[]; productId?: string; saved?: boolean }
export const apiTranslateText = (storeId: string, body: { title: string; description?: string; direction?: 'en_to_ur' | 'ur_to_en' }) =>
  client.post<never, Res<TranslateDraft>>(`${S(storeId)}/translate`, body);
export const apiTranslateProduct = (storeId: string, productId: string) =>
  client.post<never, Res<TranslateDraft>>(`${S(storeId)}/products/${productId}/translate`, {});
export const apiSaveUrdu = (storeId: string, productId: string, body: { nameUr: string; descriptionUr: string }) =>
  client.put<never, Res<{ nameUr: string | null; descriptionUr: string | null }>>(`${S(storeId)}/products/${productId}/urdu`, body);
export const apiTranslateBatch = (storeId: string) =>
  client.post<never, Res<{ translated: number; remaining: number; failed: { productId: string; reason: string }[]; stoppedReason: string | null }>>(`${S(storeId)}/translate/batch`, {});

export interface CodRisk { orderId: string; score: number; level: 'low' | 'medium' | 'high'; factors: { code: string; points: number; text: string }[]; explanation: string | null }
export const apiCodRisk = (storeId: string, orderId: string, explain = true) =>
  client.get<never, Res<CodRisk>>(`${S(storeId)}/orders/${orderId}/cod-risk?explain=${explain ? 1 : 0}`);

export const apiReviewReplyDraft = (storeId: string, ratingId: string) =>
  client.post<never, Res<{ draft: string }>>(`${S(storeId)}/reviews/${ratingId}/reply-draft`, {});

export interface InsightsPayload {
  digest: { headline: string; highlights: string[]; actions: { title: string; why: string }[] } | null;
  stats: Record<string, unknown>; at: string;
}
export const apiWeeklyInsights = (storeId: string) => client.post<never, Res<InsightsPayload>>(`${S(storeId)}/insights/weekly`, {});
export const apiLatestInsights = (storeId: string) => client.get<never, Res<InsightsPayload | null>>(`${S(storeId)}/insights/latest`);

export const apiHelpBot = (storeId: string, question: string) =>
  client.post<never, Res<{ answer: string; sources: string[]; grounded: boolean }>>(`${S(storeId)}/help`, { question });

export interface CoverResult { spec: { headline: string; subtitle: string; badge: string; theme: string }; svg: string }
export const apiProductCover = (storeId: string, productId: string) => client.post<never, Res<CoverResult>>(`${S(storeId)}/products/${productId}/cover`, {});

export interface ImageCheckResult { altText: string; qualityScore: number; issues: string[]; suggestions: string[] }
export const apiImageCheck = (storeId: string, imageUrl: string, productName?: string) =>
  client.post<never, Res<ImageCheckResult>>(`${S(storeId)}/image-check`, { imageUrl, productName });

// Quiz generator + worksheet/quiz export (Phase 5 follow-ups)
export type SheetQuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_blank' | 'open_ended';
export interface SheetQuestion { type: SheetQuestionType; prompt: string; choices?: string[]; answer?: string; explanation?: string }
export interface SheetSection { instructions?: string; questions: SheetQuestion[] }
export interface SheetContent { title: string; sections: SheetSection[]; language?: 'en' | 'ur'; grade?: string }
export interface QuizRequest { sourceText?: string; productId?: string; grade?: string; language?: 'en' | 'ur'; mcq?: number; trueFalse?: number; short?: number; title?: string }
export const apiGenerateQuiz = (storeId: string, body: QuizRequest) =>
  client.post<never, Res<{ generationId: string | null; quiz: SheetContent; creditsCharged: number }>>(`${S(storeId)}/quiz`, body);
export const apiSheetHtml = (storeId: string, content: SheetContent, includeAnswers: boolean) =>
  client.post<never, Res<{ html: string; title: string }>>(`${S(storeId)}/sheet/html`, { content, includeAnswers });
export const apiSaveSheetAsProduct = (storeId: string, body: { generationId?: string; content?: SheetContent; title?: string; includeAnswers?: boolean }) =>
  client.post<never, Res<{ productId: string | null; name: string; status: string; price: number }>>(`${S(storeId)}/sheet/save-as-product`, body);

export interface DigestSettings { weeklyDigestEnabled: boolean; lastRunAt: string | null; creditsPerDigest: number; aiAvailable: boolean }
export const apiDigestSettings = (storeId: string) => client.get<never, Res<DigestSettings>>(`${S(storeId)}/insights/settings`);
export const apiSetDigestSettings = (storeId: string, weeklyDigestEnabled: boolean) =>
  client.put<never, Res<{ weeklyDigestEnabled: boolean }>>(`${S(storeId)}/insights/settings`, { weeklyDigestEnabled });

export const apiWorksheetHtml = (storeId: string, generationId: string, answers: boolean) =>
  client.get<never, Res<{ html: string; title: string }>>(`${S(storeId)}/worksheets/${generationId}/html?answers=${answers ? 1 : 0}`);

// ── Admin ────────────────────────────────────────────────────────────────────
export interface ModerationReview {
  islamicSuitability: 'suitable' | 'needs_review' | 'unsuitable';
  ageSuitability: 'all_ages' | 'teen_and_up' | 'adult_only' | 'unclear';
  copyrightRisk: 'low' | 'medium' | 'high';
  qualityIssues: string[]; suggestedDecision: 'approve' | 'needs_changes' | 'reject'; reasons: string[];
  at?: string; imagesChecked?: number;
}
export const apiGetModerationReview = (productId: string) => client.get<never, Res<ModerationReview | null>>(`/api/admin/ai/moderation/${productId}`);
export const apiRunModerationReview = (productId: string) => client.post<never, Res<ModerationReview>>(`/api/admin/ai/moderation/${productId}`, {});
export const apiAskData = (question: string) =>
  client.post<never, Res<{ answer: string; sources: { tool: string; input: unknown }[] }>>('/api/admin/ai/ask', { question });

export interface AdminAiConfig {
  available: boolean; modelStandard: string; modelFast: string; allEnabled: boolean;
  features: { key: string; label: string; group: string; credits: number; enabled: boolean }[];
  storeOverrides: Record<string, string[]>;
}
export const apiAdminAiConfig = () => client.get<never, Res<AdminAiConfig>>('/api/admin/ai/config');
export const apiAdminSetAiFlag = (feature: string, enabled: boolean) => client.put<never, Res<unknown>>('/api/admin/ai/flags', { feature, enabled });
export const apiAdminSetAiStoreOverride = (storeId: string, feature: string, enabled: boolean) =>
  client.put<never, Res<unknown>>('/api/admin/ai/store-overrides', { storeId, feature, enabled });
export interface AiUsageRow { feature: string; calls: number; failed: number; tokensIn: number; tokensOut: number; estCostUsd: number; avgLatencyMs: number }
export const apiAdminAiUsage = (days = 28) => client.get<never, Res<{ days: number; rows: AiUsageRow[] }>>(`/api/admin/ai/usage?days=${days}`);
