import client from '../client';

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export interface TeamRole { key: string; name: string; description: string; permissions: string[] }
export interface TeamPermission { key: string; label: string }
export type MemberStatus = 'invited' | 'active' | 'suspended' | 'removed';

export interface TeamMember {
  id: string; email: string; name: string; roleKey: string; roleName: string;
  permissionsAdd: string[]; permissionsRemove: string[]; permissions: string[];
  status: MemberStatus; accessExpiresAt: string | null; acceptedAt: string | null; inviteExpiresAt: string | null; createdAt: string | null;
}
export interface TeamList { members: TeamMember[]; permissions: TeamPermission[]; roles: TeamRole[]; max: number }

export interface InviteInput { email: string; name?: string; roleKey: string; permissionsAdd?: string[]; permissionsRemove?: string[]; accessExpiresAt?: string | null }
export interface UpdateInput { name?: string; roleKey?: string; permissionsAdd?: string[]; permissionsRemove?: string[]; accessExpiresAt?: string | null }

const base = (storeId: string) => `/api/store-team/${storeId}`;

export async function apiListTeam(storeId: string): Promise<TeamList> {
  return (await client.get<never, ApiResponse<TeamList>>(`${base(storeId)}/members`)).data;
}
export async function apiInviteMember(storeId: string, input: InviteInput): Promise<{ member: TeamMember; emailSent: boolean }> {
  return (await client.post<never, ApiResponse<{ member: TeamMember; emailSent: boolean }>>(`${base(storeId)}/members`, input)).data;
}
export async function apiUpdateMember(storeId: string, id: string, input: UpdateInput): Promise<{ member: TeamMember }> {
  return (await client.patch<never, ApiResponse<{ member: TeamMember }>>(`${base(storeId)}/members/${id}`, input)).data;
}
export async function apiSuspendMember(storeId: string, id: string): Promise<void> { await client.post(`${base(storeId)}/members/${id}/suspend`, {}); }
export async function apiResumeMember(storeId: string, id: string): Promise<void> { await client.post(`${base(storeId)}/members/${id}/resume`, {}); }
export async function apiRemoveMember(storeId: string, id: string): Promise<void> { await client.delete(`${base(storeId)}/members/${id}`); }
export async function apiResendInvite(storeId: string, id: string): Promise<{ emailSent: boolean }> {
  return (await client.post<never, ApiResponse<{ emailSent: boolean }>>(`${base(storeId)}/members/${id}/resend`, {})).data;
}

export interface TeamActivityItem { _id: string; action: string; description: string | null; actorName: string | null; actorRole: string | null; createdAt: string }
export async function apiTeamActivity(storeId: string): Promise<TeamActivityItem[]> {
  return (await client.get<never, ApiResponse<{ items: TeamActivityItem[] }>>(`${base(storeId)}/activity`)).data.items;
}

// ── invitee ──
export interface InviteInfo {
  storeName: string; roleName: string; emailHint: string; expiresAt: string;
  /** An Edudeen account already exists for the invited e-mail / it has a password / it is verified (null when no account). */
  hasAccount: boolean; hasPassword: boolean; accountVerified: boolean | null;
}
export interface JoinedWithSession {
  storeId: string; storeName: string;
  user: { id: string; name: string; email: string; role: string; image: string | null };
  token: { accessToken: string; refreshToken: string };
}
/** No account yet: choose a password, join and get signed in (one step). */
export async function apiAcceptWithNewPassword(token: string, password: string, name?: string): Promise<JoinedWithSession> {
  return (await client.post<never, ApiResponse<JoinedWithSession>>('/api/store-team/accept-new', { token, password, ...(name ? { name } : {}) })).data;
}
/** Account exists: sign in with the existing password and join (one step). */
export async function apiAcceptWithExistingPassword(token: string, password: string): Promise<JoinedWithSession> {
  return (await client.post<never, ApiResponse<JoinedWithSession>>('/api/store-team/accept-existing', { token, password })).data;
}
export async function apiInviteInfo(token: string): Promise<InviteInfo> {
  return (await client.get<never, ApiResponse<InviteInfo>>(`/api/store-team/invite/${encodeURIComponent(token)}`)).data;
}
export async function apiAcceptInvite(token: string): Promise<{ storeId: string; storeName: string }> {
  return (await client.post<never, ApiResponse<{ storeId: string; storeName: string }>>('/api/store-team/accept', { token })).data;
}

export interface MyTeamStore { storeId: string; name: string; slug: string; logo: string | null; roleKey: string; roleName: string }
export async function apiMyTeamStores(): Promise<MyTeamStore[]> {
  return (await client.get<never, ApiResponse<{ stores: MyTeamStore[] }>>('/api/store-team/mine')).data.stores;
}

export interface TeamSession {
  accessToken: string; expiresInSeconds: number;
  store: { id: string; name: string; slug: string }; role: { key: string; name: string }; permissions: string[];
}
export async function apiSwitchToTeamStore(storeId: string): Promise<TeamSession> {
  return (await client.post<never, ApiResponse<TeamSession>>('/api/store-team/switch', { storeId })).data;
}

// ── admin (read + remove) ──
export async function apiAdminStoreMembers(storeId: string): Promise<TeamMember[]> {
  return (await client.get<never, ApiResponse<{ members: TeamMember[] }>>(`/api/admin/stores/${storeId}/members`)).data.members;
}
export async function apiAdminRemoveMember(storeId: string, id: string): Promise<void> {
  await client.delete(`/api/admin/stores/${storeId}/members/${id}`);
}
