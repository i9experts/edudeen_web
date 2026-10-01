import { Bell, Package, MessageSquare, Star, Sparkles, Megaphone } from 'lucide-react';

/** Shared by NotificationBell (dropdown) and NotificationsPanel (full page) —
 *  previously each hand-rolled an identical copy of this type→icon/color
 *  mapping, which risked silently drifting apart if one was edited alone. */
export function getNotificationIcon(type: string, size: number = 14) {
  const t = type.toLowerCase();
  if (t.includes('campaign')) return <Megaphone size={size} className="text-brand-green" />;
  if (t.includes('order')) return <Package size={size} className="text-brand-orange" />;
  if (t.includes('message') || t.includes('chat')) return <MessageSquare size={size} className="text-[#1a65a8]" />;
  if (t.includes('loyalty') || t.includes('points') || t.includes('tier')) return <Star size={size} className="text-[#d4af37]" />;
  if (t.includes('subscription') || t.includes('plan')) return <Sparkles size={size} className="text-[#7c3aed]" />;
  return <Bell size={size} className="text-slate" />;
}
