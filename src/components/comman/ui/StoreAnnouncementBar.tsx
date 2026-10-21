import { useEffect, useState } from 'react';
import { Info, Percent, Tag, AlertTriangle, Truck, PartyPopper, X, type LucideIcon } from 'lucide-react';
import { getDismissedBannerIds, dismissBanner } from '@/utils/dismissedBanners';

export type StoreAnnouncementType = 'info' | 'sale' | 'coupon' | 'warning' | 'shipping' | 'holiday';

interface StoreAnnouncementBarProps {
  storeId: string;
  message: string | null;
  type: StoreAnnouncementType;
  ctaLabel?: string | null;
  ctaLink?: string | null;
  className?: string;
}

const STYLE: Record<StoreAnnouncementType, { Icon: LucideIcon; bg: string; border: string; text: string }> = {
  info:     { Icon: Info,         bg: 'bg-brand-pale-orange', border: 'border-brand-orange/20', text: 'text-brand-deep-orange' },
  sale:     { Icon: Percent,      bg: 'bg-brand-pale-orange', border: 'border-brand-orange/20', text: 'text-brand-deep-orange' },
  coupon:   { Icon: Tag,          bg: 'bg-brand-pale-orange', border: 'border-brand-orange/20', text: 'text-brand-deep-orange' },
  warning:  { Icon: AlertTriangle, bg: 'bg-error-bg',         border: 'border-error-border',        text: 'text-error' },
  shipping: { Icon: Truck,        bg: 'bg-success-bg',        border: 'border-success/20',        text: 'text-success' },
  holiday:  { Icon: PartyPopper,  bg: 'bg-brand-pale-orange', border: 'border-brand-orange/20', text: 'text-brand-deep-orange' },
};

/** Per-store dismissible announcement bar — same dismiss-persistence UI pattern
 *  as the platform-wide `AnnouncementBanner`, but seller-controlled content and
 *  scoped by `storeId` so dismissing one store's message never hides another's. */
export function StoreAnnouncementBar({ storeId, message, type, ctaLabel, ctaLink, className }: StoreAnnouncementBarProps) {
  const id = `store:${storeId}:${message}`;
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedBannerIds());

  useEffect(() => { setDismissedIds(getDismissedBannerIds()); }, [id]);

  if (!message || dismissedIds.includes(id)) return null;
  const { Icon, bg, border, text } = STYLE[type] ?? STYLE.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${bg} border-b ${border} ${className ?? ''}`}>
      <Icon size={15} className={`${text} shrink-0`} />
      <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
        <p className={`text-[12.5px] font-medium ${text}`}>{message}</p>
        {ctaLabel && ctaLink && /^(https?:\/\/|\/(?!\/))/i.test(ctaLink.trim()) && (
          <a href={ctaLink} className={`text-[12.5px] font-semibold underline ${text}`}>{ctaLabel}</a>
        )}
      </div>
      <button
        onClick={() => { dismissBanner(id); setDismissedIds((d) => [...d, id]); }}
        aria-label="Dismiss announcement"
        className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-transparent border-0 cursor-pointer ${text}/70 hover:bg-white/50`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
