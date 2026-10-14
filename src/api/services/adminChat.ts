import client from '../client';

// Admin chat inbox. Envelope: { success, data }.
const BASE = '/api/admin/chat';
export type ChatUserKind = 'buyer' | 'seller' | 'guest';
export type ChatStatus = 'open' | 'answered' | 'closed';

export interface AdminChatRow {
  id: string; shortCode: string; userKind: ChatUserKind; userId: string | null; senderName: string;
  senderEmail: string | null; senderPhone: string | null; storeName: string | null; status: ChatStatus;
  unreadForAdmin: number; lastMessageAt: string; createdAt: string; messageCount: number; preview: string; lastFrom: string | null;
}
export interface AdminChatMessage { id: string; from: 'user' | 'admin' | 'bot'; text: string; at: string; via: string }
export interface AdminChatThread extends AdminChatRow { messages: AdminChatMessage[] }
interface Res<T> { success: boolean; data: T }

export const apiAdminChatStats = () => client.get<never, Res<{ open: number; answered: number; closed: number; unread: number }>>(`${BASE}/stats`);
export const apiAdminChatList = (params: { status?: string; q?: string; page?: number }) =>
  client.get<never, Res<{ items: AdminChatRow[]; total: number; page: number; limit: number }>>(`${BASE}/conversations`, { params });
export const apiAdminChatGet = (id: string) => client.get<never, Res<AdminChatThread>>(`${BASE}/conversations/${id}`);
export const apiAdminChatReply = (id: string, text: string) => client.post<never, Res<AdminChatThread>>(`${BASE}/conversations/${id}/reply`, { text });
export const apiAdminChatClose = (id: string) => client.patch<never, Res<AdminChatRow>>(`${BASE}/conversations/${id}/close`);
