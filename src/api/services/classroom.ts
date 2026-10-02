import client from '../client';
import type { MarketplaceProduct } from './marketplace';

type Ok<T> = { success: boolean; message?: string; data: T };

// ── Teacher lists ────────────────────────────────────────────────────────────

export interface SavedListSummary {
  _id: string;
  name: string;
  description: string;
  slug: string;
  isPublic: boolean;
  itemCount: number;
  productIds: string[];
  covers: string[];
  updatedAt: string;
}

export interface SavedListDetail {
  _id: string;
  name: string;
  description: string;
  slug: string;
  isPublic: boolean;
  isOwner: boolean;
  ownerName: string;
  updatedAt: string;
  items: { product: MarketplaceProduct; note: string }[];
}

export const apiGetMyLists = () => client.get<never, Ok<SavedListSummary[]>>('/api/lists/mine');
export const apiCreateList = (body: { name: string; description?: string; isPublic?: boolean; productId?: string }) =>
  client.post<never, Ok<SavedListSummary>>('/api/lists', body);
export const apiUpdateList = (id: string, body: { name?: string; description?: string; isPublic?: boolean }) =>
  client.patch<never, Ok<unknown>>(`/api/lists/${id}`, body);
export const apiDeleteList = (id: string) => client.delete<never, Ok<unknown>>(`/api/lists/${id}`);
export const apiAddToList = (id: string, productId: string, note?: string) =>
  client.post<never, Ok<{ added: boolean }>>(`/api/lists/${id}/items`, { productId, note });
export const apiUpdateListNote = (id: string, productId: string, note: string) =>
  client.patch<never, Ok<unknown>>(`/api/lists/${id}/items/${productId}`, { note });
export const apiRemoveFromList = (id: string, productId: string) =>
  client.delete<never, Ok<unknown>>(`/api/lists/${id}/items/${productId}`);
export const apiGetListBySlug = (slug: string) => client.get<never, Ok<SavedListDetail>>(`/api/lists/public/${encodeURIComponent(slug)}`);

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

// ── School / bulk quotes ─────────────────────────────────────────────────────

export const INSTITUTION_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'madrasa', label: 'Madrasa' },
  { value: 'academy', label: 'Academy / tuition centre' },
  { value: 'college', label: 'College' },
  { value: 'university', label: 'University' },
  { value: 'ngo', label: 'NGO / trust' },
  { value: 'other', label: 'Other' },
] as const;

export type QuoteStatus = 'pending' | 'quoted' | 'accepted' | 'declined' | 'cancelled';

export interface QuoteRequest {
  _id: string;
  number: string;
  buyerId: string;
  buyerEmail: string;
  storeId: string;
  storeName?: string;
  storeSlug?: string | null;
  storeContactEmail?: string | null;
  storeContactPhone?: string | null;
  productId: string;
  productName: string;
  institutionName: string;
  institutionType: string;
  city: string;
  contactName: string;
  contactPhone: string;
  quantity: number;
  message: string;
  status: QuoteStatus;
  offer: { unitPrice: number; totalPrice: number; currency: string; validUntil: string | null; note: string } | null;
  declineReason: string;
  quotedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  viewer?: 'buyer' | 'seller';
}

export interface QuoteRequestInput {
  productId: string;
  institutionName: string;
  institutionType: string;
  city: string;
  contactName: string;
  contactPhone: string;
  quantity: number;
  message: string;
}

export const apiRequestQuote = (body: QuoteRequestInput) => client.post<never, Ok<QuoteRequest>>('/api/quotes', body);
export const apiGetMyQuotes = () => client.get<never, Ok<QuoteRequest[]>>('/api/quotes/mine');
export const apiGetQuote = (id: string) => client.get<never, Ok<QuoteRequest>>(`/api/quotes/${id}`);
export const apiRespondToQuote = (id: string, action: 'accept' | 'decline' | 'cancel') =>
  client.patch<never, Ok<QuoteRequest>>(`/api/quotes/mine/${id}/${action}`, {});
export const apiGetSellerQuotes = (storeId: string, status?: string) =>
  client.get<never, Ok<{ pending: number; quotes: QuoteRequest[] }>>(`/api/quotes/seller/${storeId}${status ? `?status=${status}` : ''}`);
export const apiSendQuoteOffer = (storeId: string, id: string, body: { unitPrice: number; validUntil?: string | null; note?: string }) =>
  client.patch<never, Ok<QuoteRequest>>(`/api/quotes/seller/${storeId}/${id}/offer`, body);
export const apiDeclineQuote = (storeId: string, id: string, reason: string) =>
  client.patch<never, Ok<unknown>>(`/api/quotes/seller/${storeId}/${id}/decline`, { reason });

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  pending: 'Waiting for price', quoted: 'Price received', accepted: 'Accepted', declined: 'Declined', cancelled: 'Cancelled',
};

/** Status pill colours, shared by the buyer and seller quote pages. */
export const QUOTE_TONE: Record<QuoteStatus, string> = {
  pending: 'bg-amber-50 text-amber-700', quoted: 'bg-brand-pale-orange text-brand-orange',
  accepted: 'bg-green-50 text-success', declined: 'bg-red-50 text-error', cancelled: 'bg-fog text-slate',
};

// ── Bundles ──────────────────────────────────────────────────────────────────

export interface PublicBundle {
  _id: string;
  name: string;
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
  products: { _id: string; name: string; image: string | null; status: string }[];
}

export interface BundleInput {
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

// ── Courses & live classes ───────────────────────────────────────────────────

export type LessonType = 'video' | 'pdf' | 'text' | 'quiz';
export interface CourseFileRef { url: string; name: string; size?: number | null; mimeType?: string | null }
export interface QuizQuestionInput { question: string; options: string[]; answerIndex: number }
export interface CourseLessonInput {
  _id?: string;
  title: string;
  type: LessonType;
  file: CourseFileRef | null;
  text: string;
  durationMinutes: number | null;
  isPreview: boolean;
  quiz: { passPercent: number; questions: QuizQuestionInput[] } | null;
}
export interface CourseSectionInput { _id?: string; title: string; lessons: CourseLessonInput[] }

export interface CourseBuilderData {
  product: { _id: string; name: string; slug: string; status: string; deliveryFormat: string };
  sections: CourseSectionInput[];
  certificateEnabled: boolean;
  learners: number;
}

export interface CourseOutline {
  sections: { _id: string; title: string; lessons: { _id: string; title: string; type: LessonType; durationMinutes: number | null; isPreview: boolean }[] }[];
  lessons: number;
  minutes: number;
  certificateEnabled: boolean;
}

export interface LearnView {
  product: { _id: string; name: string; slug: string; image: string | null; storeName: string | null; storeSlug: string | null };
  sections: { _id: string; title: string; lessons: { _id: string; title: string; type: LessonType; durationMinutes: number | null }[] }[];
  certificateEnabled: boolean;
  progress: { completedLessonIds: string[]; quizScores: Record<string, number>; lastLessonId: string | null; completedAt: string | null; certificateCode: string | null };
}

export interface LessonContent {
  _id: string;
  title: string;
  type: LessonType;
  text: string;
  durationMinutes: number | null;
  file?: { name: string; mimeType: string; url: string };
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
}

export interface MyCourse {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  deliveryFormat: 'course' | 'live_class';
  lessons: number;
  completed: number;
  completedAt: string | null;
  certificateCode: string | null;
  liveSession: { startsAt: string; durationMinutes: number; platform: string } | null;
}

export interface LiveAccess { name: string; startsAt: string; endsAt: string; durationMinutes: number; platform: string; meetingUrl: string; notes: string; ended: boolean }

export const apiGetCourseBuilder = (storeId: string, productId: string) => client.get<never, Ok<CourseBuilderData>>(`/api/courses/seller/${storeId}/${productId}`);
export const apiSaveCourse = (storeId: string, productId: string, body: { sections: CourseSectionInput[]; certificateEnabled: boolean }) =>
  client.put<never, Ok<{ sections: CourseSectionInput[]; certificateEnabled: boolean }>>(`/api/courses/seller/${storeId}/${productId}`, body);
export const apiGetCourseOutline = (idOrSlug: string) => client.get<never, Ok<CourseOutline>>(`/api/courses/outline/${idOrSlug}`);
export const apiGetPreviewLesson = (idOrSlug: string, lessonId: string) => client.get<never, Ok<LessonContent>>(`/api/courses/preview/${idOrSlug}/${lessonId}`);
export const apiGetLearnView = (idOrSlug: string) => client.get<never, Ok<LearnView>>(`/api/courses/learn/${idOrSlug}`);
export const apiGetLesson = (idOrSlug: string, lessonId: string) => client.get<never, Ok<LessonContent>>(`/api/courses/learn/${idOrSlug}/lessons/${lessonId}`);
export const apiCompleteLesson = (idOrSlug: string, lessonId: string) =>
  client.post<never, Ok<{ completedLessonIds: string[]; completedAt: string | null; certificateCode: string | null }>>(`/api/courses/learn/${idOrSlug}/lessons/${lessonId}/complete`, {});
export const apiSubmitQuiz = (idOrSlug: string, lessonId: string, answers: number[]) =>
  client.post<never, Ok<QuizResult>>(`/api/courses/learn/${idOrSlug}/lessons/${lessonId}/quiz`, { answers });
export const apiVerifyCertificate = (code: string) => client.get<never, Ok<CertificateData>>(`/api/courses/certificates/${encodeURIComponent(code)}`);
export const apiGetMyCourses = () => client.get<never, Ok<MyCourse[]>>('/api/courses/mine');
export const apiGetLiveAccess = (idOrSlug: string) => client.get<never, Ok<LiveAccess>>(`/api/courses/live/${idOrSlug}`);
export const apiGetLiveSeats = (idOrSlug: string) => client.get<never, Ok<{ capacity: number | null; left: number | null }>>(`/api/courses/live-seats/${idOrSlug}`);
