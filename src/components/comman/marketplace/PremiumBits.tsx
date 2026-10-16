import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Crown } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { TokenStorage } from '@/api/services/auth';

/** Premium percentages are always shown rounded DOWN (19.8% reads "19%", never a promise of 20%). Seller-side math keeps the exact value. */
export function floorPct(n: number | null | undefined): number {
  return Math.floor((n ?? 0) + 1e-9);
}

/** "15% from the seller + 5% from Edudeen" - the plain-language breakdown of a combined Premium percent. */
export function premiumBreakdownText(seller?: number | null, platform?: number | null): string {
  const s = floorPct(seller);
  const p = floorPct(platform);
  if (s > 0 && p > 0) return `${s}% from the seller + ${p}% from Edudeen`;
  if (s > 0) return `${s}% from the seller`;
  return '';
}

/** Small "Premium price: 20% off" chip shown next to a member price (hover: "15% from the seller + 5% from Edudeen"). */
export function PremiumChip({ percent, seller, platform, label, className }: { percent?: number | null; seller?: number | null; platform?: number | null; label?: string; className?: string }) {
  const text = label ?? (floorPct(percent) > 0 ? `Premium price: ${floorPct(percent)}% off` : 'Premium price');
  const tip = premiumBreakdownText(seller, platform);
  return (
    <span title={tip || undefined} className={clsx('inline-flex items-center gap-[3px] px-[6px] py-[1px] rounded-full text-[12px] font-bold bg-[#fff6d6] text-[#8a6100] border border-[#f1d98a] whitespace-nowrap', className)}>
      <Crown size={10} className="shrink-0" aria-hidden /> {text}
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

/**
 * The member price of a variant converted for display (null when the member gets nothing better than `shownPrice`).
 * `list` is the ORIGINAL price to strike through (never the seller's normal sale price); seller / platform are the parts of `percent`.
 */
export function memberPriceOf(
  variant: { premiumPrice?: number; premiumDiscountPercent?: number; premiumSellerPercent?: number; premiumPlatformPercent?: number; listPrice?: number; currency?: string | null } | undefined | null,
  convert: (n: number, c?: string | null) => number,
  shownPrice: number | null,
): { price: number; percent: number; list: number | null; seller: number; platform: number } | null {
  if (!variant || variant.premiumPrice == null || !(variant.premiumPrice >= 0)) return null;
  const price = convert(variant.premiumPrice, variant.currency);
  if (shownPrice != null && price >= shownPrice) return null;
  return {
    price, percent: variant.premiumDiscountPercent ?? 0,
    list: variant.listPrice != null ? convert(variant.listPrice, variant.currency) : null,
    seller: variant.premiumSellerPercent ?? 0, platform: variant.premiumPlatformPercent ?? 0,
  };
}

/** Understated teaser: "Premium members save up to 20%" (seller% + Edudeen%; hover shows the breakdown). A link on its own page, plain text inside a card link. */
export function PremiumTeaser({ percent, seller, platform, link = false, className }: { percent?: number | null; seller?: number | null; platform?: number | null; link?: boolean; className?: string }) {
  const { showTeaser } = usePremiumView();
  if (!showTeaser || floorPct(percent) <= 0) return null;
  const text = `Premium members save up to ${floorPct(percent)}%`;
  const cls = clsx('inline-flex items-center gap-1 text-[12px] font-semibold text-[#8a6100]', className);
  const tip = premiumBreakdownText(seller, platform) || undefined;
  const inner = <><Crown size={11} className="shrink-0" aria-hidden /> {text}</>;
  return link
    ? <Link to="/premium" title={tip} className={clsx(cls, 'no-underline hover:underline')}>{inner}</Link>
    : <span title={tip} className={cls}>{inner}</span>;
}