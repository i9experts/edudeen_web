import client from '../client';
import type { ChatbotConfig } from '@/components/chat/chatbotDefaults';

export type ChatAudience = 'buyer' | 'seller';
export type ChatSource = 'faq' | 'greeting' | 'ai' | 'fallback';

export interface ChatReplyData {
  reply: string;
  quickReplies: { id: string; label: string }[];
  actions: { label: string; to: string }[];
  source: ChatSource;
  /** Language of the visitor's message (en, ur, ur-latn, fr, ...). */
  lang: string;
  notice?: boolean;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

/** POST /api/chatbot/message - public, throttled. */
export function apiChatbotMessage(body: { audience: ChatAudience; text: string; lang: 'en' | 'ur'; langNoticeShown?: boolean }) {
  return client.post<never, ApiResponse<ChatReplyData>>('/api/chatbot/message', body, { timeout: 45000 });
}

/** GET /api/admin/platform-config/chatbot - effective content (stored overrides merged over the built-in defaults). */
export function apiGetChatbotAdmin() {
  return client.get<never, ApiResponse<ChatbotConfig>>('/api/admin/platform-config/chatbot');
}

/** PUT /api/admin/platform-config/chatbot - keys left out are kept; null resets one to the default. */
export function apiUpdateChatbot(body: Partial<Record<keyof ChatbotConfig, unknown>>, config?: import('axios').AxiosRequestConfig) {
  return client.put<never, ApiResponse<ChatbotConfig>>('/api/admin/platform-config/chatbot', body, config);
}
