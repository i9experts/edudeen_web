import client from '../client';

type Res<T> = { success: boolean; data: T };

export type HealthLevel = 'good' | 'watch' | 'action';
export type OpsSort = 'attention' | 'name' | 'overdue' | 'unanswered' | 'stuck' | 'toShip' | 'listings';
export type MouStatus = 'none' | 'not_started' | 'active' | 'expiring_soon' | 'expired';
export type ShipmentKind = 'domestic' | 'cross_border' | 'unknown';

export interface OpsRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  country: string;
  region: 'national' | 'international';
  managementType: 'self' | 'managed';
  fulfillmentMode: 'seller' | 'platform';
  seller: { id: string; name: string | null; email: string | null } | null;
  mouStatus: MouStatus | null;
  commissionRate: number | null;
  assignees: { adminId: string; name: string | null; role: string }[];
  listings: { active: number; drafts: number; pendingReview: number; rejected: number; inactive: number; outOfStock: number; missingPhotos: number; issues: number };
  response: { medianReplyMinutes: number | null; responseRatePct: number | null; responseSample: number; unanswered: number; unansweredOver24h: number; oldestUnansweredAt: string | null; unansweredQuestions: number };
  orders: { new: number; toShip: number; overdue: number; inTransit: number; delivered30d: number; cancelledBySeller30d: number; returnsOpen: number };
  shipments: { inTransit: number; stuck: number; onTimeDispatchPct: number | null; dispatchSample: number; lateDispatchPct: number | null; domestic30d: number; crossBorder30d: number; unknown30d: number };
  health: { level: HealthLevel; reasons: string[] };
}

export interface OpsSummary {
  stores: number;
  needsAttention: number;
  actionNeeded: number;
  overdueOrders: number;
  toShip: number;
  unansweredOver24h: number;
  unansweredQuestions: number;
  stuckShipments: number;
  inTransit: number;
  listingIssues: number;
  medianReplyMinutes: number | null;
  onTimeDispatchPct: number | null;
}

export interface OpsOverview {
  items: OpsRow[];
  total: number;
  page: number;
  limit: number;
  summary: OpsSummary;
  counts: { all: number; managed: number; international: number };
  generatedAt: string;
  scope: 'all' | 'assigned';
}

export interface OpsQuery {
  type?: 'self' | 'managed';
  region?: 'national' | 'international';
  manager?: string;
  attention?: '1';
  level?: HealthLevel;
  q?: string;
  sort?: OpsSort;
  page?: number;
  limit?: number;
  refresh?: '1';
}

export interface OpsStoreDetail {
  store: OpsRow;
  mou: { status: MouStatus | null; commissionRate: number | null; startDate: string | null; endDate: string | null; hasDocument: boolean } | null;
  assignees: { adminId: string; role: string; assignedAt: string; name: string | null; email: string | null }[];
  overdueOrders: { orderId: string; orderNumber: string; status: string; buyerCountry: string | null; buyerCity: string | null; createdAt: string; dueAt: string; hoursLate: number; shippedBy: 'seller' | 'edudeen' }[];
  stuckShipments: { orderId: string; orderNumber: string; courier: string | null; trackingNumber: string | null; shippedAt: string; days: number; kind: ShipmentKind; buyerCountry: string | null }[];
  unansweredChats: { conversationId: string; buyer: string; waitingSince: string | null; hoursWaiting: number | null; aboutOrderId: string | null; aboutProductId: string | null }[];
  listingIssues: {
    rejected: { productId: string; name: string; note: string | null; reviewedAt: string | null }[];
    missingPhotos: { productId: string; name: string; status: string }[];
    outOfStock: { productId: string; name: string }[];
  };
  generatedAt: string;
}

export interface OpsManager { adminId: string; name: string | null; email: string | null; stores: number }

export const apiOpsOverview = (params: OpsQuery) => client.get<never, Res<OpsOverview>>('/api/admin/operations', { params });
export const apiOpsManagers = () => client.get<never, Res<OpsManager[]>>('/api/admin/operations/managers');
export const apiOpsStore = (storeId: string) => client.get<never, Res<OpsStoreDetail>>(`/api/admin/operations/${storeId}`);

/** "45 min", "3 h", "2 d" */
export function formatMinutes(min: number | null | undefined): string {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 48 * 60) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
}

export const HEALTH_LABEL: Record<HealthLevel, string> = { good: 'Good', watch: 'Watch', action: 'Action needed' };

/** 'PK' -> 🇵🇰 (regional indicator letters). */
export const flagOf = (code: string) => (/^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 0x1f1a5 + c.charCodeAt(0))) : '');

// ── Team performance + work queue ───────────────────────────────────────────

export type TeamPeriod = 7 | 30 | 90;

export interface TeamRow {
  adminId: string;
  name: string | null;
  email: string | null;
  stores: { assigned: number; managed: number };
  products: { created: number; edited: number };
  replies: { sent: number; answered: number; medianMinutes: number | null; within24hPct: number | null };
  orders: { actioned: number; confirmed: number; shipped: number; delivered: number; courierBooked: number; cancelled: number; onTimePct: number | null; onTimeSample: number };
  workload: { toShip: number; overdue: number; waiting: number; waitingOver24h: number; stuck: number; listingIssues: number };
  lastActiveAt: string | null;
  breaches: string[];
}

export interface TeamList {
  days: TeamPeriod;
  items: TeamRow[];
  summary: { members: number; withBreaches: number; productsListed: number; repliesAnswered: number; medianReplyMinutes: number | null; ordersActioned: number; onTimePct: number | null; openOverdue: number };
  generatedAt: string;
}

export interface TeamMemberStore {
  storeId: string;
  name: string;
  managementType: 'self' | 'managed';
  assigned: boolean;
  role: string | null;
  assignedAt: string | null;
  health: { level: HealthLevel; reasons: string[] } | null;
  workload: { toShip: number; overdue: number; waiting: number; waitingOver24h: number; stuck: number; listingIssues: number } | null;
  activity: { productsCreated: number; productsEdited: number; messagesSent: number; answered: number; medianReplyMinutes: number | null; ordersActioned: number; shipped: number; onTimePct: number | null };
}

export interface TeamMemberDetail {
  days: TeamPeriod;
  member: TeamRow;
  stores: TeamMemberStore[];
  timeline: { items: { at: string; storeId: string; storeName: string; label: string }[]; total: number; page: number; limit: number };
  generatedAt: string;
}

export interface MyQueue {
  stores: { id: string; name: string; managementType: 'self' | 'managed' }[];
  waiting: { storeId: string; storeName: string; conversationId: string; buyer: string; waitingSince: string | null; hoursWaiting: number | null }[];
  toShip: QueueParcel[];
  overdue: QueueParcel[];
  stuck: { storeId: string; storeName: string; orderId: string; orderNumber: string; courier: string | null; trackingNumber: string | null; kind: ShipmentKind; days: number }[];
  listings: { storeId: string; storeName: string; productId: string; name: string; issue: 'rejected' | 'missing_photos' | 'out_of_stock'; note: string | null }[];
  kpis: { medianReplyMinutes: number | null; within24hPct: number | null; onTimePct: number | null; onTimeSample: number };
  adminId: string;
  generatedAt: string;
}
export interface QueueParcel { storeId: string; storeName: string; orderId: string; orderNumber: string; status: string; buyerCountry: string | null; createdAt: string; dueAt: string | null; hoursToDue: number | null; shippedBy: 'seller' | 'edudeen' }

export const apiOpsTeam = (days: TeamPeriod, refresh?: boolean) => client.get<never, Res<TeamList>>('/api/admin/operations/team', { params: { days, ...(refresh ? { refresh: '1' } : {}) } });
export const apiOpsTeamMember = (adminId: string, days: TeamPeriod, page = 1) => client.get<never, Res<TeamMemberDetail>>(`/api/admin/operations/team/${adminId}`, { params: { days, page } });
export const apiOpsMyQueue = () => client.get<never, Res<MyQueue>>('/api/admin/operations/my-queue');
