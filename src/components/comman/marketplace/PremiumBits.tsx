import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Crown } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { TokenStorage } from '@/api/services/auth';

/** Small "Premium price" chip shown next to a member price. */
export function PremiumChip({ label = 'Premium price', className }: { label?: string; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-[3px] px-[6px] py-[1px] rounded-full text-[12px] font-bold bg-[#fff6d6] text-[#8a6100] border border-[#f1d98a] whitespace-nowrap', className)}>
      <Crown size={10} className="shrink-0" aria-hidden /> {label}
    </span>
  );
}

/** Small gold "Premium" member badge (next to a buyer's name). */
export function PremiumMemberBadge({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-[3px] px-[7px] py-[1px] rounded-full text-[12px] font-bold bg-[#fff6d6] text-[#8a6100] border border-[#f1d98a] whitespace-nowrap align-middle', className)}>
      <Crown size={10} className="shrink-0" aria-hidden /> Premium
    </span>
  );
}

/**
 * Premium state for price displays: members see member prices, guests / non-member buyers see a teaser.
 * Sellers and admins see neither (they cannot buy as members).
 */
export function usePremiumView() {
  const { isPremium, isBuyer, loading } = usePremium();
  const guest = !TokenStorage.isLoggedIn();
  return { isPremium, showTeaser: !isPremium && (guest || (isBuyer && !loading)) };
}

/** The member price of a variant converted for display, or null when it does not beat `shownPrice`. */
export function memberPriceOf(
  variant: { premiumPrice?: number; premiumDiscountPercent?: number; currency?: string | null } | undefined | null,
  convert: (n: number, c?: string | null) => number,
  shownPrice: number | null,
): { price: number; percent: number } | null {
  if (!variant || variant.premiumPrice == null || !(variant.premiumPrice >= 0)) return null;
  const price = convert(variant.premiumPrice, variant.currency);
  if (shownPrice != null && price >= shownPrice) return null;
  return { price, percent: variant.premiumDiscountPercent ?? 0 };
}

/** Understated teaser: "Premium members save 10%". A link on its own page, plain text inside a card link. */
export function PremiumTeaser({ percent, link = false, className }: { percent?: number | null; link?: boolean; className?: string }) {
  const { showTeaser } = usePremiumView();
  if (!showTeaser || !percent || percent <= 0) return null;
  const text = `Premium members save ${percent}%`;
  const cls = clsx('inline-flex items-center gap-1 text-[12px] font-semibold text-[#8a6100]', className);
  const inner = <><Crown size={11} className="shrink-0" aria-hidden /> {text}</>;
  return link
    ? <Link to="/premium" className={clsx(cls, 'no-underline hover:underline')}>{inner}</Link>
    : <span className={cls}>{inner}</span>;
}
