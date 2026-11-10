import client from '../client';
import type { MarketplaceProduct } from './marketplace';

type Ok<T> = { success: boolean; message?: string; data: T };

// ── Product Q&A ──────────────────────────────────────────────────────────────

export interface ProductQuestion {
  _id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  askerName: string;
  createdAt: string;
  isMine: boolean;
}

export interface SellerQuestion {
  _id: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  productImage: string | null;
  askerName: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  hidden: boolean;
  createdAt: string;
}

export const apiGetProductQuestions = (idOrSlug: string) => client.get<never, Ok<ProductQuestion[]>>(`/api/product-questions/product/${idOrSlug}`);
export const apiAskQuestion = (idOrSlug: string, question: string) =>
  client.post<never, Ok<{ _id: string }>>(`/api/product-questions/product/${idOrSlug}`, { question });
export const apiDeleteQuestion = (id: string) => client.delete<never, Ok<unknown>>(`/api/product-questions/${id}`);
export const apiGetSellerQuestions = (storeId: string, status?: string) =>
  client.get<never, Ok<{ unanswered: number; questions: SellerQuestion[] }>>(`/api/product-questions/seller/${storeId}${status ? `?status=${status}` : ''}`);
export const apiAnswerQuestion = (storeId: string, id: string, answer: string) =>
  client.patch<never, Ok<SellerQuestion>>(`/api/product-questions/seller/${storeId}/${id}/answer`, { answer });
export const apiSetQuestionHidden = (storeId: string, id: string, hidden: boolean) =>
  client.patch<never, Ok<unknown>>(`/api/product-questions/seller/${storeId}/${id}/visibility`, { hidden });

// ── Bundles ──────────────────────────────────────────────────────────────────

export interface PublicBundle {
  _id: string;
  name: string;
  nameUr?: string | null;
  coverImage?: string | null;
  slug: string;
  description: string;
  discountPercent: number;
  storeId: string;
  storeName: string | null;
  storeSlug: string | null;
  currency: string;
  totalPrice: number;
  bundlePrice: number;
  savings: number;
  products: MarketplaceProduct[];
}

export interface SellerBundle {
  _id: string;
  name: string;
  slug: string;
  description: string;
  discountPercent: number;
  productIds: string[];
  isActive: boolean;
  nameUr?: string | null;
  coverImage?: string | null;
  products: { _id: string; name: string; image: string | null; status: string; isDelete?: boolean }[];
  /** Read-time values from the API (same arithmetic as the cart). */
  validCount?: number;
  displayStatus?: 'active' | 'incomplete' | 'draft';
  currency?: string | null;
  totalPrice?: number;
  bundlePrice?: number;
  savings?: number;
}

export interface BundleQuote { currency: string | null; itemCount: number; totalPrice: number; bundlePrice: number; savings: number }
export interface BundleSuggestion { _id: string; name: string; image: string | null; reason: string }

export interface BundleInput {
  nameUr?: string | null;
  coverImage?: string | null;
  name: string;
  description?: string;
  productIds: string[];
  discountPercent: number;
  isActive?: boolean;
}

export const apiGetBundlesForProduct = (productId: string) => client.get<never, Ok<PublicBundle[]>>(`/api/bundles/for-product/${productId}`);
export const apiGetBundle = (slug: string) => client.get<never, Ok<PublicBundle>>(`/api/bundles/public/${encodeURIComponent(slug)}`);
export const apiGetSellerBundles = (storeId: string) => client.get<never, Ok<SellerBundle[]>>(`/api/bundles/seller/${storeId}`);
export const apiCreateBundle = (storeId: string, body: BundleInput) => client.post<never, Ok<SellerBundle>>(`/api/bundles/seller/${storeId}`, body);
export const apiUpdateBundle = (storeId: string, id: string, body: Partial<BundleInput>) => client.patch<never, Ok<SellerBundle>>(`/api/bundles/seller/${storeId}/${id}`, body);
export const apiDeleteBundle = (storeId: string, id: string) => client.delete<never, Ok<unknown>>(`/api/bundles/seller/${storeId}/${id}`);
export const apiDuplicateBundle = (storeId: string, id: string) => client.post<never, Ok<SellerBundle>>(`/api/bundles/seller/${storeId}/${id}/duplicate`, {});
export const apiQuoteBundle = (storeId: string, productIds: string[], discountPercent: number, signal?: AbortSignal) =>
  client.post<never, Ok<BundleQuote>>(`/api/bundles/seller/${storeId}/quote`, { productIds, discountPercent }, { signal });
export const apiBundleSuggestions = (storeId: string, productIds: string[], signal?: AbortSignal) =>
  client.post<never, Ok<BundleSuggestion[]>>(`/api/bundles/seller/${storeId}/suggestions`, { productIds }, { signal });
/** A store's live bundles for its public page. */
export const apiGetStoreBundles = (storeId: string) => client.get<never, Ok<PublicBundle[]>>(`/api/bundles/store/${storeId}`);

// ── Curated shelves (Edudeen picks) ──────────────────────────────────────────

export interface CuratedShelf {
  _id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  image: string | null;
  products: MarketplaceProduct[];
}

export interface CuratedCollectionAdmin {
  _id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  image: string | null;
  productIds: string[];
  rule: { educationLevel: string | null; curriculum: string | null; categoryId: string | null; tags: string[] };
  status: 'active' | 'draft';
  showOnHome: boolean;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
  products?: { _id: string; name: string; slug: string; images?: string[]; status: string }[];
}

export const apiGetHomeShelves = () => client.get<never, Ok<CuratedShelf[]>>('/api/curated-collections/home');
export const apiGetShelf = (slug: string) => client.get<never, Ok<CuratedShelf>>(`/api/curated-collections/${encodeURIComponent(slug)}`);
export const apiAdminListShelves = () => client.get<never, Ok<CuratedCollectionAdmin[]>>('/api/admin/curated-collections');
export const apiAdminGetShelf = (id: string) => client.get<never, Ok<CuratedCollectionAdmin>>(`/api/admin/curated-collections/${id}`);
export const apiAdminCreateShelf = (body: Partial<CuratedCollectionAdmin>) => client.post<never, Ok<CuratedCollectionAdmin>>('/api/admin/curated-collections', body);
export const apiAdminUpdateShelf = (id: string, body: Partial<CuratedCollectionAdmin>) => client.patch<never, Ok<CuratedCollectionAdmin>>(`/api/admin/curated-collections/${id}`, body);
export const apiAdminDeleteShelf = (id: string) => client.delete<never, Ok<unknown>>(`/api/admin/curated-collections/${id}`);
export const apiAdminSearchProducts = (q: string) =>
  client.get<never, Ok<{ _id: string; name: string; slug: string; image: string | null }[]>>(`/api/admin/curated-collections/product-search?q=${encodeURIComponent(q)}`);

// ── Courses ───────────────────────────────────────────────────

export type LessonType = 'video' | 'pdf' | 'text' | 'quiz';
export interface CourseFileRef { url: string; name: string; size?: number | null; mimeType?: string | null }
export interface QuizQuestionInput { question: string; options: string[]; answerIndex: number }
export interface CourseLessonInput {
  _id?: string;
  title: string;
  type: LessonType;
  file: CourseFileRef | null;
  /** External video (YouTube / Vimeo https link) used instead of an uploaded file. */
  videoUrl?: string | null;
  text: string;
  durationMinutes: number | null;
  isPreview: boolean;
  quiz: { passPercent: number; questions: QuizQuestionInput[] } | null;
}
export interface CourseSectionInput { _id?: string; title: string; lessons: CourseLessonInput[] }
export interface CourseInstructor { name: string; bio: string }

/** Seller's design for the completion certificate. Every field is optional (older courses have none). */
export interface CertificateConfig {
  watermarkText?: string | null;
  watermarkImageUrl?: string | null;
  stampImageUrl?: string | null;
  signatureName?: string | null;
  signatureTitle?: string | null;
  signatureImageUrl?: string | null;
  /** Header logo override; empty = the store's logo, then Edudeen's. */
  logoImageUrl?: string | null;
  issuerName?: string | null;
}

/** What the buyer prints on their certificate. */
export interface CertificateDetails { fullName: string; guardianName?: string | null; institute?: string | null; city?: string | null; country?: string | null }

export interface CourseBuilderData {
  product: { _id: string; name: string; slug: string; status: string; deliveryFormat: string };
  sections: CourseSectionInput[];
  certificateEnabled: boolean;
  certificateConfig?: CertificateConfig | null;
  outcomes?: string[];
  instructor?: CourseInstructor | null;
  /** null = lifetime access */
  accessDays?: number | null;
  learners: number;
}

export interface CourseOutline {
  sections: { _id: string; title: string; lessons: { _id: string; title: string; type: LessonType; durationMinutes: number | null; isPreview: boolean }[] }[];
  lessons: number;
  minutes: number;
  certificateEnabled: boolean;
  lessonCount?: number;
  totalMinutes?: number;
  outcomes?: string[];
  instructor?: CourseInstructor | null;
  accessDays?: number | null;
}

export interface LearnView {
  product: { _id: string; name: string; slug: string; image: string | null; storeName: string | null; storeSlug: string | null };
  sections: { _id: string; title: string; lessons: { _id: string; title: string; type: LessonType; durationMinutes: number | null }[] }[];
  certificateEnabled: boolean;
  certificateDetails?: CertificateDetails | null;
  certificateDetailsRequired?: boolean;
  progress: { completedLessonIds: string[]; quizScores: Record<string, number>; lastLessonId: string | null; completedAt: string | null; certificateCode: string | null };
}

export interface LessonContent {
  _id: string;
  title: string;
  type: LessonType;
  text: string;
  durationMinutes: number | null;
  file?: { name: string; mimeType: string; url: string };
  /** External video link (YouTube / Vimeo). */
  videoUrl?: string | null;
  kind?: 'external' | 'file';
  url?: string;
  quiz?: { passPercent: number; questions: { question: string; options: string[] }[] };
}

export interface QuizResult {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  passPercent: number;
  answers: number[];
  progress: { completedLessonIds: string[]; completedAt: string | null; certificateCode: string | null } | null;
}

export interface CertificateData {
  code: string;
  learnerName: string;
  courseName: string;
  courseSlug: string | null;
  teacher: string | null;
  storeSlug: string | null;
  completedAt: string;
  /** Added with the certificate designer; older certificates lack these. */
  courseTitle?: string;
  instructorName?: string | null;
  storeName?: string | null;
  storeLogoUrl?: string | null;
  issuedAt?: string;
  guardianName?: string | null;
  institute?: string | null;
  city?: string | null;
  country?: string | null;
  config?: CertificateConfig | null;
}

export interface MyCourse {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  deliveryFormat: 'course';
  lessons: number;
  completed: number;
  completedAt: string | null;
  certificateCode: string | null;
  accessExpiresAt?: string | null;
  percent?: number;
  lastLessonId?: string | null;
  /** False for draft / deleted / test courses (older API builds omit it). */
  isPublished?: boolean;
}

export const apiGetCourseBuilder = (storeId: string, productId: string) => client.get<never, Ok<CourseBuilderData>>(`/api/courses/seller/${storeId}/${productId}`);
export const apiSaveCourse = (storeId: string, productId: string, body: { sections: CourseSectionInput[]; certificateEnabled: boolean; certificateConfig?: CertificateConfig | null; outcomes?: string[]; instructor?: CourseInstructor | null; accessDays?: number | null }) =>
  client.put<never, Ok<{ sections: CourseSectionInput[]; certificateEnabled: boolean }>>(`/api/courses/seller/${storeId}/${productId}`, body);
export const apiGetCourseOutline = (idOrSlug: string) => client.get<never, Ok<CourseOutline>>(`/api/courses/outline/${idOrSlug}`);
export const apiGetPreviewLesson = (idOrSlug: string, lessonId: string) => client.get<never, Ok<LessonContent>>(`/api/courses/preview/${idOrSlug}/${lessonId}`);
export const apiSaveCertificateDetails = (idOrSlug: string, body: CertificateDetails) =>
  client.post<never, Ok<{ certificateDetails: CertificateDetails | null }>>(`/api/courses/learn/${idOrSlug}/certificate-details`, body);
export const apiGetLearnView = (idOrSlug: string) => client.get<never, Ok<LearnView>>(`/api/courses/learn/${idOrSlug}`);
export const apiGetLesson = (idOrSlug: string, lessonId: string) => client.get<never, Ok<LessonContent>>(`/api/courses/learn/${idOrSlug}/lessons/${lessonId}`);
export const apiCompleteLesson = (idOrSlug: string, lessonId: string) =>
  client.post<never, Ok<{ completedLessonIds: string[]; completedAt: string | null; certificateCode: string | null }>>(`/api/courses/learn/${idOrSlug}/lessons/${lessonId}/complete`, {});
export const apiSubmitQuiz = (idOrSlug: string, lessonId: string, answers: number[]) =>
  client.post<never, Ok<QuizResult>>(`/api/courses/learn/${idOrSlug}/lessons/${lessonId}/quiz`, { answers });
export const apiVerifyCertificate = (code: string) => client.get<never, Ok<CertificateData>>(`/api/courses/certificates/${encodeURIComponent(code)}`);
export const apiGetMyCourses = () => client.get<never, Ok<MyCourse[]>>('/api/courses/mine');

export interface CourseStudent { userId: string; name: string; email: string; enrolledAt: string | null; completedLessons: number; totalLessons: number; percent: number; lastActiveAt: string | null; completedAt: string | null; certificateCode: string | null }
export interface RosterRow { userId: string; name: string; email: string | null; productId: string; productName: string; kind: 'course' | 'file'; enrolledAt: string; isFree: boolean; percent: number | null; completedLessons: number | null; totalLessons: number | null; downloads: number | null; lastActivityAt: string | null; accessEnded: boolean }
export interface RosterPage { total: number; page: number; limit: number; totalPages: number; rows: RosterRow[]; products: { id: string; name: string }[] }
export interface RosterFilters { productId?: string; q?: string }
const rosterParams = (f: RosterFilters) => ({ ...(f.productId ? { productId: f.productId } : {}), ...(f.q ? { q: f.q } : {}) });
/** Store-level students & downloads (courses + files, paid and free claims). */
export const apiGetStoreRoster = (storeId: string, f: RosterFilters, page = 1, limit = 20) =>
  client.get<never, Ok<RosterPage>>(`/api/courses/seller/${storeId}/roster`, { params: { ...rosterParams(f), page, limit } });
/** CSV text of the current filter (newest 5000 rows). */
export const apiExportStoreRoster = (storeId: string, f: RosterFilters) =>
  client.get<never, string>(`/api/courses/seller/${storeId}/roster/export`, { params: rosterParams(f), responseType: 'text' });

export const apiGetCourseStudents = (storeId: string, productId: string, page = 1, limit = 20) =>
  client.get<never, Ok<{ total: number; students: CourseStudent[] }>>(`/api/courses/seller/${storeId}/${productId}/students?page=${page}&limit=${limit}`);

/** Active bundles for the home shelf (live products only). */
export const apiGetPublicBundles = (limit = 6) => client.get<never, Ok<PublicBundle[]>>(`/api/bundles/public?limit=${limit}`);
