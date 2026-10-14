import { Star, BookOpen, Users, Store, BarChart2, Bell, Headphones, ShieldCheck, Wallet, Sparkles, Globe, Check, Heart, GraduationCap, type LucideIcon } from 'lucide-react';
import type { SellerPageIcon } from '@/api/services/publicPlatformConfig';

export const SELLER_PAGE_ICON_MAP: Record<SellerPageIcon, LucideIcon> = {
  star: Star, book: BookOpen, users: Users, store: Store, chart: BarChart2, bell: Bell, headphones: Headphones,
  shield: ShieldCheck, wallet: Wallet, sparkles: Sparkles, globe: Globe, check: Check, heart: Heart, graduation: GraduationCap,
};
export const SELLER_PAGE_ICON_KEYS = Object.keys(SELLER_PAGE_ICON_MAP) as SellerPageIcon[];
export const sellerIcon = (k?: string): LucideIcon => SELLER_PAGE_ICON_MAP[k as SellerPageIcon] ?? Star;
