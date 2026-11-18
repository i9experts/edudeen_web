import client from '../client';
import { ENDPOINTS } from '../endpoints';
import { cachedRequest } from './requestCache';

export interface NotificationItem {
  _id:           string;
  recipientId:   string;
  recipientRole: 'user' | 'seller';
  type:          string;
  title:         string;
  body:          string;
  data:          Record<string, any> | null;
  storeId?:      string | null;
  isRead:        boolean;
  readAt:        string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface ListNotificationsQuery {
  page?:       number;
  limit?:      number;
  unreadOnly?: boolean;
  type?:       string;
}

export interface ListNotificationsData {
  items:       NotificationItem[];
  total:       number;
  unreadCount: number;
  page:        number;
  limit:       number;
}

export interface NotificationPreferenceFlags {
  orders:        boolean;
  messages:      boolean;
  promotions:    boolean;
  loyalty:       boolean;
  subscriptions: boolean;
  /** Payouts and money movement (sellers). */
  finance?:      boolean;
}

export interface NotificationPreferenceData {
  _id:          string;
  userId:       string;
  role:         'user' | 'seller';
  prefs:        NotificationPreferenceFlags;
  pushEnabled:  boolean;
  emailEnabled: boolean;
  /** Opt-in WhatsApp / SMS order messages (off by default). */
  whatsappEnabled?: boolean;
  smsEnabled?:      boolean;
  /** Opt-in WhatsApp / SMS cart reminders, price and stock alerts, referral rewards (off by default). */
  retentionChannelsEnabled?: boolean;
  language?:        'en' | 'ur';
  createdAt:    string;
  updatedAt:    string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

/** Inside a seller workspace (/store/<id>/…) the inbox + badge are limited to that store; elsewhere = everything. */
export function currentStoreScope(): string | null {
  try { return window.location.pathname.match(/^\/store\/([a-f0-9]{24})(?:\/|$)/i)?.[1] ?? null; } catch { return null; }
}

/** Axios config for the bulk actions (mark all read / clear read): limited to the open store, like the list. */
function scopeParams() {
  const storeId = currentStoreScope();
  return storeId ? { params: { storeId } } : undefined;
}

/** True when a (live-pushed) notice belongs in the current store scope. */
export function notificationInScope(n: { storeId?: string | null; data?: Record<string, any> | null }): boolean {
  const sid = currentStoreScope();
  if (!sid) return true;
  return n.storeId === sid || n.data?.storeId === sid || (typeof n.data?.link === 'string' && n.data.link.startsWith(`/store/${sid}/`));
}

export function apiListNotifications(query?: ListNotificationsQuery) {
  const params: Record<string, string> = {};
  const scope = currentStoreScope();
  if (scope) params.storeId = scope;
  if (query?.page) params.page = String(query.page);
  if (query?.limit) params.limit = String(query.limit);
  if (query?.unreadOnly !== undefined) params.unreadOnly = String(query.unreadOnly);
  if (query?.type) params.type = query.type;

  // 1.5 s: only collapses duplicate mount-time calls; later refreshes always hit the API.
  return cachedRequest(`notifications:${JSON.stringify(params)}`, 1500, () =>
    client.get<never, ApiResponse<ListNotificationsData>>(ENDPOINTS.NOTIFICATIONS.LIST, { params }));
}

export function apiGetUnreadCount() {
  const storeId = currentStoreScope();
  return client.get<never, ApiResponse<{ unreadCount: number }>>(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT, storeId ? { params: { storeId } } : undefined);
}

export function apiGetPreferences() {
  return client.get<never, ApiResponse<NotificationPreferenceData>>(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
}

export function apiUpdatePreferences(dto: Partial<NotificationPreferenceFlags> & { pushEnabled?: boolean; emailEnabled?: boolean; whatsappEnabled?: boolean; smsEnabled?: boolean; retentionChannelsEnabled?: boolean; language?: 'en' | 'ur' }) {
  return client.patch<never, ApiResponse<NotificationPreferenceData>>(ENDPOINTS.NOTIFICATIONS.UPDATE_PREFERENCES, dto);
}

export function apiRegisterDeviceToken(fcmToken: string, platform: string) {
  return client.post<never, ApiResponse<{ message: string }>>(ENDPOINTS.NOTIFICATIONS.REGISTER_DEVICE_TOKEN, { fcmToken, platform });
}

export function apiRemoveDeviceToken(fcmToken: string) {
  return client.delete<never, ApiResponse<{ message: string }>>(ENDPOINTS.NOTIFICATIONS.REMOVE_DEVICE_TOKEN, { data: { fcmToken } });
}

export function apiMarkAllNotificationsRead() {
  return client.patch<never, ApiResponse<{ message: string }>>(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, undefined, scopeParams());
}

export function apiMarkNotificationRead(id: string) {
  return client.patch<never, ApiResponse<NotificationItem>>(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
}

export function apiClearReadNotifications() {
  return client.delete<never, ApiResponse<{ deleted: number }>>(ENDPOINTS.NOTIFICATIONS.CLEAR_READ, scopeParams());
}

export function apiDeleteNotification(id: string) {
  return client.delete<never, ApiResponse<{ message: string }>>(ENDPOINTS.NOTIFICATIONS.REMOVE(id));
}
