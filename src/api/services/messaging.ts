import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — verified against the live staging API (messaging endpoints do NOT
// use the {success,message,data} envelope that the rest of the app uses;
// each endpoint returns its own raw shape).
// ─────────────────────────────────────────────────────────────────────────────
export type MessageType   = 'text' | 'image' | 'video' | 'pdf' | 'document' | 'voice' | 'product_share';
export type SenderRole    = 'user' | 'seller' | 'admin';
export type TargetType    = 'user' | 'message' | 'conversation';
export type ReportStatus  = 'pending' | 'reviewed' | 'resolved';

export interface ConversationParticipantPreview {
  _id:           string;
  name:          string;
  email?:        string;
  profileImage:  string | null;
}

export interface StorePreview {
  _id:     string;
  name:    string;
  logo:    string | null;
  slug?:   string;
  badges?: string[];
}

export interface LastMessagePreview {
  messageId:   string;
  text:        string | null;
  type:        MessageType;
  senderId:    string;
  senderRole:  SenderRole;
  sentAt:      string;
}

export interface Conversation {
  _id:             string;
  buyerId:         string;
  sellerId:        string;
  storeId:         string;
  isArchived:      boolean;
  isMuted:         boolean;
  isPinned:        boolean;
  blockedByBuyer:  boolean;
  blockedBySeller: boolean;
  deletedByBuyer:  boolean;
  deletedBySeller: boolean;
  buyerUnread:     number;
  sellerUnread:    number;
  lastMessage:     LastMessagePreview | null;
  createdAt:       string;
  updatedAt:       string;
  // Only present on endpoints that denormalize the thread (list-of-chats, get-by-id).
  buyer?:          ConversationParticipantPreview;
  store?:          StorePreview;
}

export interface MessageAttachment {
  url:           string;
  publicId:      string;
  resourceType:  string;
  mimeType:      string;
  fileName:      string;
  fileSize:      number;
  thumbnailUrl?: string;
}

export interface MessageSeenEntry { userId: string; seenAt: string }

export interface MessageReplyTo {
  messageId:   string;
  text?:       string | null;
  type?:       MessageType;
  senderId?:   string;
  senderRole?: SenderRole;
}

export interface ProductSharePayload { productId: string }

// The server enriches productShare with catalog data once a message is sent.
export interface ProductShareInfo {
  productId: string;
  title?:    string;
  price?:    number;
  image?:    string;
  slug?:     string;
}

export interface Message {
  _id:             string;
  conversationId:  string;
  senderId:        string;
  senderRole:      SenderRole;
  type:            MessageType;
  text:            string | null;
  attachments:     MessageAttachment[];
  productShare:    ProductShareInfo | null;
  replyTo:         MessageReplyTo | null;
  forwardedFrom?:  string | null;
  status:          string;
  seenBy:          MessageSeenEntry[];
  isEdited:        boolean;
  editedAt:        string | null;
  isDeleted:       boolean;
  deletedAt:       string | null;
  isFlagged:       boolean;
  createdAt:       string;
  updatedAt:       string;
}

export interface Report {
  _id:          string;
  reporterId:   string;
  reporterRole: SenderRole;
  targetType:   TargetType;
  targetId:     string;
  reason:       string;
  details?:     string | null;
  status:       ReportStatus;
  adminNotes?:  string | null;
  createdAt:    string;
  updatedAt:    string;
}

interface Paginated { total: number; page: number; limit: number; pages: number }

// ── Payloads ──────────────────────────────────────────────────────────────────
export interface StartConversationPayload { storeId: string }

export interface ListConversationsParams   { storeId?: string; page?: number; limit?: number; isArchived?: boolean; isPinned?: boolean }
export interface SearchConversationsParams { q: string; storeId?: string }

export interface SendTextMessagePayload       { type: 'text'; text: string; replyTo?: MessageReplyTo }
export interface SendAttachmentMessagePayload { type: 'image' | 'video' | 'pdf' | 'document' | 'voice'; attachments: MessageAttachment[]; replyTo?: MessageReplyTo }
export interface SendProductSharePayload      { type: 'product_share'; productShare: ProductSharePayload; replyTo?: MessageReplyTo }
export type SendMessagePayload = SendTextMessagePayload | SendAttachmentMessagePayload | SendProductSharePayload;

export interface GetMessagesParams    { before?: string; limit?: number }
export interface SearchMessagesParams { q: string }
export interface EditMessagePayload   { text: string }

export interface BlockUserPayload { targetId: string; targetRole: SenderRole; reason?: string }
export interface ReportPayload    { targetType: TargetType; targetId: string; reason: string; details?: string }

export interface GetReportsParams {
  status?:     ReportStatus;
  targetType?: TargetType;
  page?:       number;
  limit?:      number;
}

export interface AdminListConversationsParams {
  storeId?:    string;
  buyerId?:    string;
  sellerId?:   string;
  isArchived?: boolean;
  page?:       number;
  limit?:      number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS
// ─────────────────────────────────────────────────────────────────────────────
export function apiStartConversation(payload: StartConversationPayload) {
  return client.post<never, Conversation>(ENDPOINTS.MESSAGING.CONVERSATIONS.START, payload);
}

export function apiListConversations(params?: ListConversationsParams) {
  return client.get<never, Paginated & { conversations: Conversation[] }>(
    ENDPOINTS.MESSAGING.CONVERSATIONS.LIST, { params },
  );
}

export function apiSearchConversations(params: SearchConversationsParams) {
  return client.get<never, Conversation[]>(ENDPOINTS.MESSAGING.CONVERSATIONS.SEARCH, { params });
}

export function apiGetConversationById(id: string) {
  return client.get<never, Conversation>(ENDPOINTS.MESSAGING.CONVERSATIONS.GET_BY_ID(id));
}

export function apiArchiveConversation(id: string) {
  return client.patch<never, { isArchived: boolean }>(ENDPOINTS.MESSAGING.CONVERSATIONS.ARCHIVE(id));
}

export function apiRestoreConversation(id: string) {
  return client.patch<never, { isArchived: boolean }>(ENDPOINTS.MESSAGING.CONVERSATIONS.RESTORE(id));
}

export function apiPinConversation(id: string, pin = true) {
  return client.patch<never, { isPinned: boolean }>(ENDPOINTS.MESSAGING.CONVERSATIONS.PIN(id), null, { params: { pin } });
}

export function apiMuteConversation(id: string, mute = true) {
  return client.patch<never, { isMuted: boolean }>(ENDPOINTS.MESSAGING.CONVERSATIONS.MUTE(id), null, { params: { mute } });
}

export function apiDeleteConversation(id: string) {
  return client.delete<never, { deleted: boolean }>(ENDPOINTS.MESSAGING.CONVERSATIONS.DELETE(id));
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENTS
// ─────────────────────────────────────────────────────────────────────────────
export function apiUploadAttachment(conversationId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return client.post<never, MessageAttachment>(ENDPOINTS.MESSAGING.ATTACHMENTS.UPLOAD(conversationId), fd);
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetMessages(conversationId: string, params?: GetMessagesParams) {
  return client.get<never, { messages: Message[]; nextCursor: string | null; hasMore: boolean }>(
    ENDPOINTS.MESSAGING.MESSAGES.LIST(conversationId), { params },
  );
}

export function apiSendMessage(conversationId: string, payload: SendMessagePayload) {
  return client.post<never, Message>(ENDPOINTS.MESSAGING.MESSAGES.SEND(conversationId), payload);
}

export function apiSearchMessages(conversationId: string, params: SearchMessagesParams) {
  return client.get<never, Message[]>(ENDPOINTS.MESSAGING.MESSAGES.SEARCH(conversationId), { params });
}

export function apiEditMessage(messageId: string, payload: EditMessagePayload) {
  return client.patch<never, Message>(ENDPOINTS.MESSAGING.MESSAGES.EDIT(messageId), payload);
}

export function apiDeleteMessage(messageId: string) {
  return client.delete<never, { deleted: boolean }>(ENDPOINTS.MESSAGING.MESSAGES.DELETE(messageId));
}

export function apiMarkMessageSeen(messageId: string, conversationId: string) {
  return client.post<never, { seen: boolean }>(ENDPOINTS.MESSAGING.MESSAGES.MARK_SEEN(messageId), null, { params: { conversationId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODERATION
// ─────────────────────────────────────────────────────────────────────────────
export function apiBlockUser(payload: BlockUserPayload) {
  return client.post<never, { blockerId: string; blockerRole: SenderRole; targetId: string; targetRole: SenderRole; reason?: string; _id: string }>(
    ENDPOINTS.MESSAGING.MODERATION.BLOCK, payload,
  );
}

export function apiUnblockUser(targetId: string) {
  return client.delete<never, { unblocked: boolean }>(ENDPOINTS.MESSAGING.MODERATION.UNBLOCK(targetId));
}

export function apiReportEntity(payload: ReportPayload) {
  return client.post<never, Report>(ENDPOINTS.MESSAGING.MODERATION.REPORT, payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export function apiAdminListConversations(params?: AdminListConversationsParams) {
  return client.get<never, Paginated & { conversations: Conversation[] }>(
    ENDPOINTS.MESSAGING.ADMIN.LIST_CONVERSATIONS, { params },
  );
}

export function apiAdminGetConversationById(id: string) {
  return client.get<never, Conversation>(ENDPOINTS.MESSAGING.ADMIN.GET_CONVERSATION_BY_ID(id));
}

export function apiAdminGetReports(params?: GetReportsParams) {
  return client.get<never, Paginated & { reports: Report[] }>(ENDPOINTS.MESSAGING.ADMIN.GET_REPORTS, { params });
}

/** Admin list rows carry names resolved server-side (null when the account no longer exists). */
export interface AdminConversationRow extends Conversation {
  storeName?:  string | null;
  buyerName?:  string | null;
  buyerEmail?: string | null;
  sellerName?: string | null;
}

export interface AdminReportRow extends Report {
  reporterName?: string | null;
  /** Only for `targetType: 'user'`. */
  targetName?:   string | null;
}

export function apiAdminListConversationRows(params?: AdminListConversationsParams) {
  return client.get<never, Paginated & { conversations: AdminConversationRow[] }>(
    ENDPOINTS.MESSAGING.ADMIN.LIST_CONVERSATIONS, { params },
  );
}

export function apiAdminListReportRows(params?: GetReportsParams) {
  return client.get<never, Paginated & { reports: AdminReportRow[] }>(ENDPOINTS.MESSAGING.ADMIN.GET_REPORTS, { params });
}

export interface AdminUpdateMessagingReportPayload { status: 'reviewed' | 'resolved'; adminNotes?: string }

/** Admin triage of a messaging report — `PATCH /api/messaging/admin/reports/:id`. */
export function apiAdminUpdateMessagingReport(id: string, payload: AdminUpdateMessagingReportPayload) {
  return client.patch<never, Report>(`/api/messaging/admin/reports/${id}`, payload);
}
