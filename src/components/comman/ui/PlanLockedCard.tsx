import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

/** True when an API error message says the feature/limit is blocked by the seller's platform plan. */
export function isPlanLockedError(message?: string | null): boolean {
  if (!message) return false;
  return /not included in your current platform plan|upgrade your platform plan|free trial has ended|not (available|included) on your (current )?plan|plan (limit|does not)/i.test(message);
}

interface PlanLockedCardProps {
  storeId?: string;
  /** What is locked, e.g. "Email campaigns". */
  feature?: string;
  className?: string;
}

/** Friendly replacement for a raw "not included in your plan" error. */
export function PlanLockedCard({ storeId, feature, className = '' }: PlanLockedCardProps) {
  return (
    <div role="status" className={`flex flex-col items-center text-center gap-2 bg-white border border-bone rounded-xl px-5 py-6 ${className}`}>
      <div className="size-10 rounded-full bg-brand-pale-orange flex items-center justify-center"><Lock size={18} className="text-brand-orange" /></div>
      <p className="text-[14px] font-bold text-carbon">Available on a higher plan</p>
      <p className="text-[12.5px] text-slate max-w-[380px] leading-[1.6]">
        {feature ? `${feature} is` : 'This feature is'} not included in your current plan. Upgrade to unlock it.
      </p>
      {storeId && (
        <Link to={`/store/${storeId}/plan-billing`} className="text-[13px] font-semibold text-brand-orange hover:underline">Upgrade</Link>
      )}
    </div>
  );
}
