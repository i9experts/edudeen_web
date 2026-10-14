import type { AxiosRequestConfig } from 'axios';
import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface Faq {
  _id:       string;
  question:  string;
  answer:    string;
  category:  string;
  order:     number;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqStats { active: number; inactive: number }

export interface CreateFaqPayload {
  question: string;
  answer:   string;
  category?: string;
  order?:    number;
  isActive?: boolean;
}

export type UpdateFaqPayload = Partial<CreateFaqPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetActiveFaqs(category?: string) {
  return client.get<never, { success: boolean; count: number; data: Faq[] }>(
    ENDPOINTS.FAQ.LIST, { params: category ? { category } : undefined },
  );
}

export function apiSearchFaqs(q: string) {
  return client.get<never, { success: boolean; count: number; query: string; data: Faq[] }>(
    ENDPOINTS.FAQ.SEARCH, { params: { q } },
  );
}

export function apiGetFaqCategories() {
  return client.get<never, { success: boolean; count: number; data: string[] }>(ENDPOINTS.FAQ.CATEGORIES);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetAllFaqs() {
  return client.get<never, { success: boolean; count: number; stats: FaqStats; data: Faq[] }>(
    ENDPOINTS.FAQ.ADMIN_ALL,
  );
}

export function apiCreateFaq(payload: CreateFaqPayload, cfg?: AxiosRequestConfig) {
  return client.post<never, { success: boolean; message: string; data: Faq }>(ENDPOINTS.FAQ.CREATE, payload, cfg);
}

export function apiUpdateFaq(id: string, payload: UpdateFaqPayload, cfg?: AxiosRequestConfig) {
  return client.put<never, { success: boolean; message: string; data: Faq }>(ENDPOINTS.FAQ.UPDATE(id), payload, cfg);
}

export function apiToggleFaq(id: string, cfg?: AxiosRequestConfig) {
  return client.put<never, { success: boolean; message: string; data: Faq }>(ENDPOINTS.FAQ.TOGGLE(id), null, cfg);
}

export function apiDeleteFaq(id: string, cfg?: AxiosRequestConfig) {
  return client.delete<never, { success: boolean; message: string }>(ENDPOINTS.FAQ.DELETE(id), cfg);
}
