import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Public shape — a seller's review of the Edudeen platform (homepage social-proof). */
export interface Testimonial {
  id:               string;
  name:             string;
  storeName:        string | null;
  rating:           number;
  text:             string;
  isVerifiedSeller: boolean;
}

/** Admin-managed record — the raw schema, edited via the Testimonials admin page. */
export interface AdminTestimonial {
  _id:              string;
  sellerName:       string;
  storeName:        string | null;
  rating:           number;
  text:             string;
  isVerifiedSeller: boolean;
  order:            number;
  isActive:         boolean;
  createdAt:        string;
  updatedAt:        string;
}

export interface TestimonialStats { active: number; inactive: number }

export interface CreateTestimonialPayload {
  sellerName:       string;
  storeName?:       string;
  rating:           number;
  text:             string;
  isVerifiedSeller?: boolean;
  order?:           number;
  isActive?:        boolean;
}

export type UpdateTestimonialPayload = Partial<CreateTestimonialPayload>;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/testimonials — real, admin-curated seller reviews of Edudeen itself. */
export function apiGetTestimonials(limit = 6) {
  return client.get<never, { success: boolean; count: number; data: Testimonial[] }>(
    ENDPOINTS.TESTIMONIALS.LIST, { params: { limit } },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetAllTestimonials() {
  return client.get<never, { success: boolean; count: number; stats: TestimonialStats; data: AdminTestimonial[] }>(
    ENDPOINTS.TESTIMONIALS.ADMIN_ALL,
  );
}

export function apiCreateTestimonial(payload: CreateTestimonialPayload) {
  return client.post<never, { success: boolean; message: string; data: AdminTestimonial }>(
    ENDPOINTS.TESTIMONIALS.CREATE, payload,
  );
}

export function apiUpdateTestimonial(id: string, payload: UpdateTestimonialPayload) {
  return client.put<never, { success: boolean; message: string; data: AdminTestimonial }>(
    ENDPOINTS.TESTIMONIALS.UPDATE(id), payload,
  );
}

export function apiToggleTestimonial(id: string) {
  return client.put<never, { success: boolean; message: string; data: AdminTestimonial }>(
    ENDPOINTS.TESTIMONIALS.TOGGLE(id), null,
  );
}

export function apiDeleteTestimonial(id: string) {
  return client.delete<never, { success: boolean; message: string }>(ENDPOINTS.TESTIMONIALS.DELETE(id));
}
