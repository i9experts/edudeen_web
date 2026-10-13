import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type ContactSubmissionStatus = 'new' | 'read' | 'resolved';

export interface ContactSubmission {
  _id:       string;
  name:      string;
  email:     string;
  topic:     string;
  message:   string;
  status:    ContactSubmissionStatus;
  /** Sender is an active Edudeen Premium member (priority support). */
  priority?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactStats { new: number; read: number; resolved: number }

export interface SubmitContactPayload {
  name:    string;
  email:   string;
  topic:   string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────
export function apiSubmitContact(payload: SubmitContactPayload) {
  return client.post<never, { success: boolean; message: string }>(ENDPOINTS.CONTACT.SUBMIT, payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetAllContactSubmissions(priorityOnly = false) {
  return client.get<never, { success: boolean; count: number; stats: ContactStats; data: ContactSubmission[] }>(
    ENDPOINTS.CONTACT.ADMIN_ALL, priorityOnly ? { params: { priority: true } } : undefined,
  );
}

export function apiUpdateContactStatus(id: string, status: ContactSubmissionStatus) {
  return client.patch<never, { success: boolean; message: string; data: ContactSubmission }>(
    ENDPOINTS.CONTACT.UPDATE_STATUS(id), { status },
  );
}

export function apiDeleteContactSubmission(id: string) {
  return client.delete<never, { success: boolean; message: string }>(ENDPOINTS.CONTACT.DELETE(id));
}
