import client from '../client';

export type AcademyCategory =
  | 'getting_started' | 'products_listings' | 'orders_reviews' | 'shipping' | 'payments_finance' | 'marketing' | 'policies_guidelines';
export type AcademyLessonType = 'video' | 'text' | 'pdf';
export type AcademySort = 'recommended' | 'most_viewed' | 'latest';

export const ACADEMY_CATEGORIES: { value: AcademyCategory; label: string }[] = [
  { value: 'getting_started',     label: 'Getting started' },
  { value: 'products_listings',   label: 'Products & listings' },
  { value: 'orders_reviews',      label: 'Orders & reviews' },
  { value: 'shipping',            label: 'Shipping & returns' },
  { value: 'payments_finance',    label: 'Payments & finance' },
  { value: 'marketing',           label: 'Marketing' },
  { value: 'policies_guidelines', label: 'Policies & guidelines' },
];
export const academyCategoryLabel = (c: string) => ACADEMY_CATEGORIES.find(x => x.value === c)?.label ?? c;

export interface AcademyLesson {
  _id?: string;
  title: string;
  type: AcademyLessonType;
  videoUrl: string | null;
  body: string;
  fileUrl: string | null;
  durationMinutes: number | null;
}

export interface AcademyCourse {
  _id: string;
  title: string;
  slug: string;
  summary: string;
  coverImage: string | null;
  category: AcademyCategory;
  countries: string[];
  language: string | null;
  status: 'draft' | 'published';
  isRecommended: boolean;
  order: number;
  lessons: AcademyLesson[];
  viewCount: number;
  publishedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademyCourseCard extends Omit<AcademyCourse, 'lessons' | 'status' | 'order'> {
  lessonCount: number;
  totalMinutes: number;
  completedCount: number;
  completed: boolean;
}

export interface AcademyProgress { completedLessonIds: string[]; completedAt: string | null }

export type AcademyCoursePayload = Partial<Pick<AcademyCourse, 'title' | 'summary' | 'coverImage' | 'category' | 'countries' | 'language' | 'isRecommended' | 'order' | 'lessons'>>;

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ── Seller ──
export function apiAcademyCourses(params: { sort?: AcademySort; category?: string; search?: string }) {
  return client.get<never, ApiResponse<AcademyCourseCard[]>>('/api/academy/courses', { params });
}
export function apiAcademyCourse(slug: string) {
  return client.get<never, ApiResponse<{ course: AcademyCourse; progress: AcademyProgress }>>(`/api/academy/courses/${encodeURIComponent(slug)}`);
}
export function apiAcademyCompleteLesson(courseId: string, lessonId: string) {
  return client.post<never, ApiResponse<AcademyProgress>>(`/api/academy/courses/${courseId}/lessons/${lessonId}/complete`);
}

// ── Admin ──
export function apiAdminAcademyList(params: { status?: string; search?: string }) {
  return client.get<never, ApiResponse<AcademyCourse[]>>('/api/admin/academy', { params });
}
export function apiAdminAcademyGet(id: string) {
  return client.get<never, ApiResponse<AcademyCourse>>(`/api/admin/academy/${id}`);
}
export function apiAdminAcademyCreate(payload: AcademyCoursePayload) {
  return client.post<never, ApiResponse<AcademyCourse>>('/api/admin/academy', payload);
}
export function apiAdminAcademyUpdate(id: string, payload: AcademyCoursePayload) {
  return client.put<never, ApiResponse<AcademyCourse>>(`/api/admin/academy/${id}`, payload);
}
export function apiAdminAcademySetStatus(id: string, status: 'draft' | 'published') {
  return client.patch<never, ApiResponse<AcademyCourse>>(`/api/admin/academy/${id}/status`, { status });
}
export function apiAdminAcademyDelete(id: string) {
  return client.delete<never, ApiResponse<null>>(`/api/admin/academy/${id}`);
}
