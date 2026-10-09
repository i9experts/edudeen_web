import { ShieldCheck, Baby } from 'lucide-react';
import { ageLabel } from '@/constants/learning';

export interface TrustInfo {
  scholarReviewed?: boolean;
  ageAppropriateMin?: number | null;
  ageAppropriateMax?: number | null;
}

/** Small trust pills set by the Edudeen review team. Renders nothing when there is nothing to show. */
export function TrustBadges({ trust, className = '' }: { trust?: TrustInfo | null; className?: string }) {
  if (!trust) return null;
  const ages = ageLabel(trust.ageAppropriateMin, trust.ageAppropriateMax);
  if (!trust.scholarReviewed && !ages) return null;
  const pill = 'inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-[2px] rounded-full bg-success-bg text-success';
  return (
    <span className={`flex flex-wrap gap-1.5 ${className}`}>
      {trust.scholarReviewed && <span className={pill}><ShieldCheck size={11} aria-hidden="true" /> Scholar reviewed</span>}
      {ages && <span className={pill}><Baby size={11} aria-hidden="true" /> {ages} checked</span>}
    </span>
  );
}
