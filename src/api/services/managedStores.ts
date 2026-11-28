import client from '../client';

type Res<T> = { success: boolean; data: T };

export type ManagementType = 'self' | 'managed';
export type MouStatus = 'none' | 'not_started' | 'active' | 'expiring_soon' | 'expired';
export type AssignmentRole = 'account_manager' | 'assistant';

export const MOU_STATUS_LABEL: Record<MouStatus, string> = {
  none: 'No MOU', not_started: 'Starts later', active: 'Active', expiring_soon: 'Ending soon', expired: 'Ended',
};
export const ASSIGNMENT_ROLE_LABEL: Record<AssignmentRole, string> = { account_manager: 'Account manager', assistant: 'Assistant' };

export interface ManagedStoreRow {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  status: string;
  country: string | null;
  currency: string | null;
  managementType: ManagementType;
  fulfillmentMode: 'seller' | 'platform';
  createdByAdmin: boolean;
  createdAt: string | null;
  seller: { id: string; name: string | null; email: string | null } | null;
  mou: {
    status: MouStatus;
    commissionRate: number | null;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
    hasDocument: boolean;
    documentName: string | null;
    updatedAt: string | null;
  } | null;
  assignees: { adminId: string; role: AssignmentRole; name: string | null; email: string | null; assignedAt: string }[];
}

export interface ManagedStoreDetail extends ManagedStoreRow {
  history: { action: string; changes: Record<string, unknown> | null; actorId: string | null; at: string }[];
}

export interface TeamMemberOption { id: string; name: string | null; email: string; isStaff: boolean; status: string; assignedStores: number }

export interface ManagedStoresList {
  items: ManagedStoreRow[];
  total: number;
  page: number;
  limit: number;
  counts: { all: number; managed: number; expiring: number; expired: number };
}

export interface ManagedStorePatch {
  managementType?: ManagementType;
  /** Fraction 0.20–0.65 */
  commissionRate?: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  fulfillmentMode?: 'seller' | 'platform';
}

export const apiListManagedStores = (params: { type?: string; mouStatus?: string; assignee?: string; q?: string; page?: number; limit?: number }) =>
  client.get<never, Res<ManagedStoresList>>('/api/admin/managed-stores', { params });
export const apiMyManagedStores = () => client.get<never, Res<{ isOwner: boolean; items: ManagedStoreRow[] }>>('/api/admin/managed-stores/mine');
export const apiManagedTeam = () => client.get<never, Res<TeamMemberOption[]>>('/api/admin/managed-stores/team');
export const apiGetManagedStore = (id: string) => client.get<never, Res<ManagedStoreDetail>>(`/api/admin/managed-stores/${id}`);
export const apiUpdateManagedStore = (id: string, body: ManagedStorePatch) => client.patch<never, Res<ManagedStoreDetail>>(`/api/admin/managed-stores/${id}`, body);
export function apiUploadMouDocument(id: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return client.post<never, Res<ManagedStoreDetail>>(`/api/admin/managed-stores/${id}/mou-document`, fd);
}
export const apiMouDocumentUrl = (id: string) => client.get<never, Res<{ url: string | null; fileName: string; expiresInSeconds: number }>>(`/api/admin/managed-stores/${id}/mou-document`);
export const apiAssignStore = (id: string, adminId: string, role: AssignmentRole) =>
  client.post<never, Res<ManagedStoreDetail>>(`/api/admin/managed-stores/${id}/assignments`, { adminId, role });
export const apiUnassignStore = (id: string, adminId: string) => client.delete<never, Res<ManagedStoreDetail>>(`/api/admin/managed-stores/${id}/assignments/${adminId}`);
