// ─── Edudeen Global TypeScript Types ────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ── Seller ────────────────────────────────────────────────────────────────────
export type SellerType = 'creator' | 'educator' | 'retailer' | 'brand_business' | 'freelancer' | 'mix';
export type PlanName = 'Starter' | 'Professional' | 'Business' | 'Enterprise';

export interface Store {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  description?: string;
  category: string;
  plan: PlanName;
  verified: boolean;
  rating: number;
  totalSales: number;
  memberSince: string;
  customDomain?: string;
  aiCredits: { used: number; total: number };
}

// ── Product ───────────────────────────────────────────────────────────────────
export type ProductType = 'physical_products' | 'digital_downloads' | 'educational_resources' | 'services_bookings' | 'subscriptions' | 'in_person_pos';
export type ProductStatus = 'Active' | 'Draft' | 'Unpublished' | 'Archived';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  type: ProductType;
  status: ProductStatus;
  category: string;
  subcategory?: string;
  tags: string[];
  images: ProductImage[];
  files?: ProductFile[];
  stock?: number | null; // null = unlimited (digital)
  sku?: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  seller: SellerSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
}

export interface ProductFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'ready';
}

export interface SellerSummary {
  id: string;
  name: string;
  slug: string;
  avatar?: string;
  rating: number;
  totalSales: number;
}

// ── Order ─────────────────────────────────────────────────────────────────────
export type OrderStatus = 'Paid' | 'Pending' | 'Processing' | 'Fulfilled' | 'Delivered' | 'Cancelled' | 'Refunded';

export interface Order {
  id: string;
  customer: CustomerSummary;
  product: string;
  productType: ProductType;
  amount: number;
  status: OrderStatus;
  date: string;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

// ── Customer ──────────────────────────────────────────────────────────────────
export type CustomerSegment = 'VIP' | 'Loyal' | 'Returning' | 'New' | 'At Risk';

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Customer extends CustomerSummary {
  orders: number;
  ltv: number;
  lastOrder: string;
  segment: CustomerSegment;
  joined: string;
  loyaltyPoints?: number;
}

// ── POS ───────────────────────────────────────────────────────────────────────
export type PaymentMethod = 'card' | 'cash' | 'tap' | 'split';

export interface POSProduct {
  name: string;
  price: number;
  emoji: string;
  sku: string;
  category: string;
  stock: number;
}

export interface CartItem extends POSProduct {
  qty: number;
  customPrice: number | null;
}

export interface POSTransaction {
  id: string;
  customer: string;
  items: number;
  total: number;
  method: PaymentMethod;
  time: string;
}

export interface HeldSale {
  id: string;
  customer: string;
  items: number;
  total: number;
  time: string;
}

export type DiscountType = 'pct' | 'fixed' | 'coupon';

export interface AppliedDiscount {
  type: DiscountType;
  value: number;
  label: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface RevenueDataPoint {
  day?: string;
  month?: string;
  revenue: number;
  orders?: number;
}

export interface TrafficSource {
  source: string;
  value: number;
}

export interface TopProduct {
  name: string;
  revenue: string;
  orders: number;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export type InventoryStatus = 'Active' | 'Low Stock' | 'Out of Stock' | 'Draft';

export interface InventoryItem {
  sku: string;
  name: string;
  type: ProductType;
  stock: number | '∞';
  status: InventoryStatus;
  price: number;
  sales: number;
}

// ── Marketing ─────────────────────────────────────────────────────────────────
export type CouponDiscountType = 'percentage' | 'fixed' | 'free_shipping';
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Fulfilled' | 'Paused';

export interface Coupon {
  id: string;
  code: string;
  type: CouponDiscountType;
  value: number;
  minimumOrder?: number;
  usageLimit?: number;
  usageCount: number;
  expires?: string;
  revenue: number;
  status: 'Active' | 'Paused' | 'Expired';
}

export interface EmailCampaign {
  id: string;
  name: string;
  status: CampaignStatus;
  date?: string;
  sent?: number;
  opened?: number;
  clicked?: number;
  revenue?: number;
}

// ── Categories ────────────────────────────────────────────────────────────────
export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  status: 'Active' | 'Draft';
  featured: boolean;
  productCount: number;
  subcategories: Subcategory[];
}

// ── Admin Moderation ──────────────────────────────────────────────────────────
export type ModerationItemType = 'Listing' | 'Seller' | 'Review';
export type RiskLevel = 'high' | 'medium' | 'low';

export interface ModerationItem {
  id: string;
  type: ModerationItemType;
  item: string;
  seller: string;
  reason: string;
  risk: RiskLevel;
  date: string;
}

// ── UI Utility Types ──────────────────────────────────────────────────────────
export type BadgeColor = 'gray' | 'orange' | 'green' | 'red' | 'yellow' | 'blue';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'dark' | 'danger';
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
