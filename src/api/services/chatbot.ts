import client from '../client';
import type { ChatbotConfig } from '@/components/chat/chatbotDefaults';

export type ChatAudience = 'buyer' | 'seller';
export type ChatSource = 'faq' | 'greeting' | 'ai' | 'fallback' | 'escalated' | 'needs_contact' | 'rate_limited';

export interface ChatEscalation { conversationId: string; shortCode: string; status: string; messageId: string; guestToken?: string; notice: string }

export interface ChatReplyData {
  reply: string;
  quickReplies: { id: string; label: string }[];
  actions: { label: string; to: string }[];
  source: ChatSource;
  /** Language of the visitor's message (en, ur, ur-latn, fr, ...). */
  lang: string;
  notice?: boolean;
  conversationId?: string;
  escalation?: ChatEscalation;
}

export interface ChatGuest { name: string; email?: string; phone?: string }

interface ApiResponse<T> { success: boolean; message?: string; data: T }

/** POST /api/chatbot/message - public, throttled. Unmatched questions are escalated to the Edudeen team (source 'escalated'). */
export function apiChatbotMessage(body: { audience: ChatAudience; text: string; lang: 'en' | 'ur'; langNoticeShown?: boolean; guestToken?: string; guest?: ChatGuest }) {
  return client.post<never, ApiResponse<ChatReplyData>>('/api/chatbot/message', body, { timeout: 45000 });
}

export interface ChatThreadMessage { id: string; from: 'user' | 'admin' | 'bot'; text: string; at: string }
export interface ChatThread { id: string; shortCode: string; status: 'open' | 'answered' | 'closed'; unreadForUser: number; lastMessageAt: string; messages: ChatThreadMessage[] }

/** GET /api/chatbot/conversation - the caller's own active conversation (account or guestToken). */
export function apiChatConversation(params: { since?: string; guestToken?: string; markRead?: boolean }) {
  return client.get<never, ApiResponse<{ conversation: ChatThread | null; serverTime: string }>>('/api/chatbot/conversation', {
    params: { since: params.since, guestToken: params.guestToken, markRead: params.markRead ? '1' : undefined },
  });
}

/** POST /api/chatbot/conversation/message - follow-up in the active conversation (404 when there is none). */
export function apiChatFollowUp(body: { text: string; guestToken?: string }) {
  return client.post<never, ApiResponse<{ source: string; conversationId?: string; messageId?: string; status?: string }>>('/api/chatbot/conversation/message', body);
}

/** GET /api/admin/platform-config/chatbot - effective content (stored overrides merged over the built-in defaults). */
export function apiGetChatbotAdmin() {
  return client.get<never, ApiResponse<ChatbotConfig>>('/api/admin/platform-config/chatbot');
}

/** PUT /api/admin/platform-config/chatbot - keys left out are kept; null resets one to the default. */
export function apiUpdateChatbot(body: Partial<Record<keyof ChatbotConfig, unknown>>, config?: import('axios').AxiosRequestConfig) {
  return client.put<never, ApiResponse<ChatbotConfig>>('/api/admin/platform-config/chatbot', body, config);
}
