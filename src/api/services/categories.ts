import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Category {
  _id:           string;
  name:          string;
  slug:          string;
  parentId:      string | null;
  image:         string | null;
  description:   string | null;
  sortOrder:     number;
  status:        string;
  isDelete:      boolean;
  createdBy:     string | null;
  createdByRole: 'admin' | 'seller' | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
  /** Active products in this category plus all of its descendants — attached server-side. */
  productCount?: number;
}

export interface CategoryPayload {
  name:        string;
  parentId?:   string;
  image?:      string;
  description?: string;
  sortOrder?:  number;
}

interface CategoryTreeListResponse { success: boolean; message: string; data: CategoryNode[] }
interface CategoryTreeNodeResponse { success: boolean; message: string; data: CategoryNode }
interface CategoryWithChildrenResponse { success: boolean; message: string; data: { category: Category; children: Category[] } }
interface CategoryCreateResponse { success: boolean; message: string; data: Category }

// ── API ───────────────────────────────────────────────────────────────────────

// No id → every root (main) category with its nested children.
// With id → that single category's subtree.
export function apiGetCategoryTree(): Promise<CategoryTreeListResponse>;
export function apiGetCategoryTree(id: string): Promise<CategoryTreeNodeResponse>;
export function apiGetCategoryTree(id?: string) {
  const url = id ? `${ENDPOINTS.CATEGORIES.TREE}?id=${id}` : ENDPOINTS.CATEGORIES.TREE;
  return client.get<never, CategoryTreeListResponse | CategoryTreeNodeResponse>(url);
}

export function apiGetCategoryById(id: string) {
  return client.get<never, CategoryWithChildrenResponse>(ENDPOINTS.CATEGORIES.GET_BY_ID(id));
}

// Main categories (no parentId) are admin-only server-side; sellers may only add subcategories.
export function apiAddCategory(payload: CategoryPayload) {
  return client.post<never, CategoryCreateResponse>(ENDPOINTS.CATEGORIES.ADD, payload);
}

// ── Admin taxonomy management ─────────────────────────────────────────────────

const ADMIN_CATEGORY_ENDPOINTS = {
  TREE:    '/api/categories/admin/tree',
  UPDATE:  (id: string) => `/api/categories/category/${id}`,
  DELETE:  (id: string) => `/api/categories/category/${id}`,
  REORDER: '/api/categories/reorder',
};

/** Mirrors UpdateCategoryDto — slug and parent can't change. */
export interface UpdateCategoryPayload {
  name?:        string;
  description?: string;
  image?:       string;
  isActive?:    boolean;
  sortOrder?:   number;
}

interface CategoryDeleteResponse {
  success: boolean; message: string;
  data: { reassigned: { products: number; stores: number } | null };
}

// Set once the server answers 404 (an API deploy older than the admin tree
// route) so the page stops re-requesting it on every refresh.
let adminTreeMissing = false;

/** Admin-only: every non-deleted category (inactive included), ordered by sortOrder.
 *  Falls back to the public tree (active categories only) on an older API. */
export async function apiAdminGetCategoryTree(): Promise<CategoryTreeListResponse> {
  if (!adminTreeMissing) {
    try {
      return await client.get<never, CategoryTreeListResponse>(ADMIN_CATEGORY_ENDPOINTS.TREE);
    } catch (err) {
      if ((err as { status?: number })?.status !== 404) throw err;
      adminTreeMissing = true;
    }
  }
  return apiGetCategoryTree();
}

export function apiAdminUpdateCategory(id: string, payload: UpdateCategoryPayload) {
  return client.patch<never, CategoryCreateResponse>(ADMIN_CATEGORY_ENDPOINTS.UPDATE(id), payload);
}

/** Soft delete. `reassignTo` (a same-level category) receives the products/stores still using it. */
export function apiAdminDeleteCategory(id: string, reassignTo?: string) {
  return client.delete<never, CategoryDeleteResponse>(ADMIN_CATEGORY_ENDPOINTS.DELETE(id), {
    params: reassignTo ? { reassignTo } : undefined,
  });
}

export function apiAdminReorderCategories(items: { id: string; sortOrder: number }[]) {
  return client.patch<never, { success: boolean; message: string; data: { updated: number } }>(
    ADMIN_CATEGORY_ENDPOINTS.REORDER, { items },
  );
}
