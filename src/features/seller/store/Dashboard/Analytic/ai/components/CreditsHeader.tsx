import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { apiPurchaseAddon } from '@/api/services/platformPlans';
import type { AiCreditsOverview } from '@/api/services/aiStudio';

interface CreditsHeaderProps {
  storeId: string;
  credits: AiCreditsOverview | null;
  loading: boolean;
  onCreditsChanged: () => void;
}

export function CreditsHeader({ storeId, credits, loading, onCreditsChanged }: CreditsHeaderProps) {
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  const balance = credits?.balance ?? 0;
  const allowance = credits?.monthlyAllowance ?? 0;
  const usedPct = allowance > 0 ? Math.min(100, Math.round(((credits?.usedThisMonth ?? 0) / allowance) * 100)) : 0;

  const handleBuyCredits = async () => {
    setBuying(true);
    setBuyError('');
    try {
      await apiPurchaseAddon(storeId, 'extra_ai_credits', 1);
      onCreditsChanged();
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Failed to purchase AI credits.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <div
      className="rounded-xl px-5 sm:px-7 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
      style={{ background: 'linear-gradient(135deg, #141413 0%, #2C2A28 100%)' }}
    >
      <div className="min-w-0">
        <p className="text-xl font-bold text-white mb-[6px] flex items-center gap-2">
          <Sparkles size={20} /> Edudeen AI Studio
        </p>
        <p className="text-[13px] text-[#b0aea8]">
          Your intelligent co-pilot for listings, pricing, content &amp; education.
        </p>
        <div className="mt-4 max-w-[280px]">
          <div className="flex justify-between mb-[6px]">
            <span className="text-[11px] text-[#b0aea8]">Monthly usage</span>
            {loading ? (
              <SkeletonBox height={11} width={60} rounded="3px" />
            ) : (
              <span className="text-[11px] font-semibold text-brand-orange">{credits?.usedThisMonth ?? 0} / {allowance}</span>
            )}
          </div>
          <div className="h-[6px] rounded-[3px] bg-[#3a3836]">
            <div className="h-full rounded-[3px] bg-brand-orange transition-[width] duration-300" style={{ width: `${usedPct}%` }} />
          </div>
        </div>
        {buyError && <p className="text-[11px] text-error mt-2">{buyError}</p>}
      </div>
      <div className="text-left sm:text-right shrink-0">
        {loading ? (
          <SkeletonBox height={48} width={100} rounded="8px" />
        ) : (
          <p className="text-[48px] sm:text-[56px] font-bold text-brand-orange leading-none">{balance}</p>
        )}
        <p className="text-[13px] text-[#b0aea8] mt-1">AI credits left this month</p>
        <Button variant="secondary" size="sm" loading={buying} onClick={handleBuyCredits} className="mt-3">
          Buy 500 Credits
        </Button>
      </div>
    </div>
  );
}
