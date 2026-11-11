import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStoreCampaigns } from '@/hooks/store/useStoreCampaigns';
import { Megaphone, Building2, User } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox } from '@/components/comman/ui';
import { currencySymbol } from '@/utils/currency';
import { type JoinableCampaign } from '@/api/services/marketing';
import { PromotionStatsRow } from './PromotionStatsContext';

export function PlatformSalesTab() {
  const { storeId } = useStoreWorkspace();
  const { campaigns, loading: campaignsLoading, error: campaignsLoadError, toggle: toggleJoined } = useStoreCampaigns(storeId);
  const [toggleError, setCampaignsError] = useState('');
  const campaignsError = toggleError || campaignsLoadError;
  const [campaignBusyId, setCampaignBusyId] = useState<string | null>(null);

  async function toggleCampaign(campaign: JoinableCampaign) {
    setCampaignBusyId(campaign._id);
    setCampaignsError('');
    try {
      await toggleJoined(campaign);
    } catch (err) {
      setCampaignsError(err instanceof Error ? err.message : 'Failed to update campaign.');
    } finally {
      setCampaignBusyId(null);
    }
  }

  return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[15px] font-bold text-carbon">Platform Sale Campaigns</p>
          <p className="text-[12.5px] text-slate mt-0.5">
            Edudeen-wide sale events. Join one to get your products featured in the marketplace deals banner for its duration.
          </p>
        </div>

        {campaignsError && <p className="text-xs text-error">{campaignsError}</p>}

        {campaignsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonBox key={i} height={120} rounded="10px" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={28} className="text-brand-orange opacity-55" />}
            title="No active campaigns right now"
            description="When the Edudeen team launches a platform-wide sale, it'll show up here for you to join."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campaigns.map(c => (
              <div key={c._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-semibold text-carbon">{c.name}</p>
                  {c.isJoined && c.sponsorType !== 'platform' && (
                    <span className="px-2.5 py-[3px] rounded-[5px] text-[12px] font-semibold shrink-0 ml-2 bg-success-bg text-success">Joined</span>
                  )}
                </div>
                {c.description && <p className="text-xs text-slate mb-2">{c.description}</p>}
                <p className="text-[12px] text-slate mb-2">
                  {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                  {c.discountType && c.discountValue != null && (
                    <> · {c.discountType === 'percentage' ? `${c.discountValue}% off` : `${currencySymbol(c.currency ?? 'USD')}${c.discountValue} off`}</>
                  )}
                </p>
                <p className="text-[12px] text-graphite mb-2">
                  {(c.selectedProductCount ?? 0) > 0
                    ? `${c.selectedProductCount} of your products ${c.selectedProductCount === 1 ? 'is' : 'are'} in this sale.`
                    : 'None of your products are in this sale yet. Choose the ones you want.'}
                </p>
                {c.sponsorType === 'platform' ? (
                  <div className="flex items-start gap-1.5 mb-3 px-2.5 py-2 rounded-[7px] bg-success-bg">
                    <Building2 size={13} className="text-success shrink-0 mt-[1px]" />
                    <p className="text-[12px] text-success font-medium leading-snug">
                      Platform sponsored — Edudeen covers this discount. Your store is automatically included, no action needed.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-1.5 mb-3 px-2.5 py-2 rounded-[7px] bg-cream">
                    <User size={13} className="text-slate shrink-0 mt-[1px]" />
                    <p className="text-[12px] text-slate leading-snug">
                      Seller sponsored — this discount comes out of your own payout for orders placed during the sale.
                    </p>
                  </div>
                )}
                <div className="mb-3"><PromotionStatsRow kind="sale" id={c._id} /></div>
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/store/${storeId}/marketing/sale/${c._id}`}
                    className="w-full py-2 rounded-[7px] text-xs font-semibold text-center no-underline border border-transparent bg-brand-orange text-white hover:bg-brand-deep-orange transition-colors duration-150"
                  >
                    {(c.selectedProductCount ?? 0) > 0 ? 'Manage products' : 'Apply now'}
                  </Link>
                  {c.sponsorType !== 'platform' && c.isJoined && (
                    <button
                      onClick={() => toggleCampaign(c)}
                      disabled={campaignBusyId === c._id}
                      className="w-full py-2 rounded-[7px] text-xs font-semibold cursor-pointer transition-colors duration-150 border disabled:opacity-50 bg-white border-bone text-graphite hover:bg-cream"
                    >
                      {campaignBusyId === c._id ? 'Updating…' : 'Leave Campaign'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
