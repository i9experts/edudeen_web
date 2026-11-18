import { Bell, Package, MessageSquare, Star, Sparkles, Megaphone, Wallet, RotateCcw, PackageX, UserPlus, Tag, ShieldCheck, HelpCircle, CreditCard, XCircle, AlertTriangle } from 'lucide-react';

/** Shared by NotificationBell (dropdown) and NotificationsPanel (full page) —
 *  previously each hand-rolled an identical copy of this type→icon/color
 *  mapping, which risked silently drifting apart if one was edited alone. */
export function getNotificationIcon(type: string, size: number = 14) {
  const t = type.toLowerCase();
  // Bad news first (before the category icons): removal / rejection / suspension / deletion = red, needs-changes = amber warning.
  if (/(reject|removed|suspend|deleted|declin|failed|banned|takedown)/.test(t)) return <XCircle size={size} className="text-[#c0392b]" />;
  if (/(fix_requested|needs_change|needs_review|changes_requested)/.test(t)) return <AlertTriangle size={size} className="text-[#d98e04]" />;
  if (t.includes('campaign') || t.includes('promotion')) return <Megaphone size={size} className="text-brand-green" />;
  if (t.includes('payout')) return <Wallet size={size} className="text-brand-green" />;
  if (t.includes('return') || t.includes('refund')) return <RotateCcw size={size} className="text-brand-orange" />;
  if (t.includes('wishlist')) return <Tag size={size} className="text-[#c2255c]" />;   // before 'stock': wishlist_back_in_stock
  if (t.includes('stock')) return <PackageX size={size} className="text-[#c0392b]" />;
  if (t.includes('review')) return <Star size={size} className="text-[#d4af37]" />;
  if (t.includes('follower')) return <UserPlus size={size} className="text-[#1a65a8]" />;
  if (t.includes('payment')) return <CreditCard size={size} className="text-brand-orange" />;
  if (t.includes('wishlist') || t.includes('cart') || t.includes('coupon') || t.includes('referral')) return <Tag size={size} className="text-[#c2255c]" />;
  if (t.includes('store') || t.includes('listing') || t.includes('product_published') || t.includes('product_scheduled')) return <ShieldCheck size={size} className="text-brand-green" />;
  if (t.includes('question') || t.includes('quote') || t.includes('support')) return <HelpCircle size={size} className="text-[#1a65a8]" />;
  if (t.includes('order')) return <Package size={size} className="text-brand-orange" />;
  if (t.includes('message') || t.includes('chat')) return <MessageSquare size={size} className="text-[#1a65a8]" />;
  if (t.includes('loyalty') || t.includes('points') || t.includes('tier')) return <Star size={size} className="text-[#d4af37]" />;
  if (t.includes('subscription') || t.includes('plan')) return <Sparkles size={size} className="text-[#7c3aed]" />;
  return <Bell size={size} className="text-slate" />;
}
