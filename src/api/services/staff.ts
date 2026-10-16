import client from '../client';

export interface StaffMember {
  _id: string; name: string; email: string; profileImage: string | null; isStaff: boolean; isOwner: boolean;
  staffStatus: 'invited' | 'active' | 'suspended'; staffRoleId: string | null; roleName: string;
  permissionsAdd: string[]; permissionsRemove: string[]; permissions: string[]; accessExpiresAt: string | null;
  totpEnabled: boolean; lastLoginAt: string | null; lastLoginIp: string | null; createdAt: string;
}
export interface StaffRole { _id: string; name: string; description: string; permissions: string[]; isSystem: boolean; memberCount: number }
export interface PermissionDef { key: string; label: string; group: string; sensitive?: boolean }
export interface StaffTask {
  _id: string; title: string; description: string; status: 'todo' | 'doing' | 'blocked' | 'done'; priority: 'low' | 'normal' | 'high' | 'urgent';
  dueAt: string | null; assigneeId: string; assigneeName: string; createdByName: string;
  link: { type: string; id: string; label?: string } | null; comments: { _id: string; authorName: string; text: string; at: string }[]; createdAt: string;
}
export interface AuditRow { _id: string; adminId: string; name?: string; method: string; path: string; status: number; ip?: string; denied?: string | null; at: string }
type R<T> = { success: boolean; data: T };
const B = '/api/admin/staff';

export const apiStaffMe = () => client.get<never, R<StaffMember>>(`${B}/me`);
export const apiStaffList = () => client.get<never, R<StaffMember[]>>(B);
export const apiStaffPermissions = () => client.get<never, R<PermissionDef[]>>(`${B}/permissions`);
export const apiStaffRoles = () => client.get<never, R<StaffRole[]>>(`${B}/roles`);
export const apiSaveStaffRole = (id: string | null, body: Partial<StaffRole>) => id ? client.patch<never, R<StaffRole>>(`${B}/roles/${id}`, body) : client.post<never, R<StaffRole>>(`${B}/roles`, body);
export const apiDeleteStaffRole = (id: string) => client.delete<never, R<unknown>>(`${B}/roles/${id}`);
export type InviteResult = { staff: StaffMember; inviteToken: string; expiresAt: string };
export const apiInviteStaff = (body: { email: string; name?: string; roleId: string; permissionsAdd?: string[]; permissionsRemove?: string[]; accessExpiresAt?: string | null }) => client.post<never, R<InviteResult>>(`${B}/invite`, body);
export const apiUpdateStaff = (id: string, body: Partial<{ name: string; roleId: string; permissionsAdd: string[]; permissionsRemove: string[]; accessExpiresAt: string | null }>) => client.patch<never, R<StaffMember>>(`${B}/${id}`, body);
export const apiStaffAction = (id: string, action: 'suspend' | 'reactivate' | 'resend-invite' | 'reset-2fa') => client.post<never, R<Partial<InviteResult> & StaffMember>>(`${B}/${id}/${action}`);
export const apiRemoveStaff = (id: string) => client.delete<never, R<unknown>>(`${B}/${id}`);
export const apiStaffAudit = (adminId?: string) => client.get<never, R<AuditRow[]>>(`${B}/audit`, { params: { adminId, limit: 120 } });
export const apiStaffTasks = (scope: 'mine' | 'all', status?: string) => client.get<never, R<StaffTask[]>>(`${B}/tasks`, { params: { scope, status } });
export const apiCreateStaffTask = (body: Record<string, unknown>) => client.post<never, R<StaffTask>>(`${B}/tasks`, body);
export const apiUpdateStaffTask = (id: string, body: Record<string, unknown>) => client.patch<never, R<StaffTask>>(`${B}/tasks/${id}`, body);
export const apiCommentStaffTask = (id: string, text: string) => client.post<never, R<StaffTask>>(`${B}/tasks/${id}/comments`, { text });
export const apiDeleteStaffTask = (id: string) => client.delete<never, R<unknown>>(`${B}/tasks/${id}`);

// Public invitation steps
export const apiInviteInfo = (token: string) => client.get<never, R<{ email: string; name: string }>>(`/api/staff/invite/${token}`);
export const apiAcceptInvite = (token: string, body: { password: string; name?: string }) => client.post<never, R<{ secret: string; otpauthUrl: string }>>(`/api/staff/invite/${token}/accept`, body);
export const apiActivate2fa = (token: string, code: string) => client.post<never, R<{ recoveryCodes: string[] }>>(`/api/staff/invite/${token}/activate`, { code });
