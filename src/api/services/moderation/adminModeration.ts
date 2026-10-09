import client from '../../client';
import { ENDPOINTS } from '../../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type ModerationTargetType = 'listing' | 'seller' | 'review';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface ModerationStats {
  queueTotal: number;
  /** Products waiting for an admin to approve them (status pending_review). */
  pendingListings?: number;
  urgent: number;
  approvedToday: number;
  avgReviewMinutes: number;
}

export interface ModerationQuery {
  targetType?: ModerationTargetType;
  riskLevel?: RiskLevel;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ModerationReportRow {
  _id: string;
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved';
  riskLevel: RiskLevel;
  itemLabel: string;
  sellerName: string | null;
  createdAt: string;
}

export interface ModerationQueueData {
  items: ModerationReportRow[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetModerationStats() {
  return client.get<never, ApiResponse<ModerationStats>>(ENDPOINTS.MODERATION.STATS);
}

export function apiGetModerationQueue(query: ModerationQuery = {}) {
  return client.get<never, ApiResponse<ModerationQueueData>>(ENDPOINTS.MODERATION.QUEUE, { params: query });
}

export function apiMarkReportReviewed(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MODERATION.REVIEW(id));
}

export function apiApproveReport(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MODERATION.APPROVE(id));
}

export function apiRemoveReportTarget(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MODERATION.REMOVE(id));
}
