import { lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { SkeletonBox } from '@/components/comman/ui';
import { MarketingNav } from './MarketingNav';
import { MarketingKpis } from './MarketingKpis';
import { resolveMarketingView, type MarketingGroupId, type MarketingTabId, type MarketingView } from './marketingTabs';
import { PromotionStatsProvider, PromotionStatsRangeBar } from './PromotionStatsContext';
import { CouponsTab } from './CouponsTab';
import { DiscountsTab } from './DiscountsTab';
import { PlatformSalesTab } from './PlatformSalesTab';
import { BannersTab } from './BannersTab';
import { FeaturedTab } from './FeaturedTab';
import { AnnouncementTab } from './AnnouncementTab';
import { PromotionsTab } from './PromotionsTab';
import { GiftCardsTab } from './GiftCardsTab';

const StoreLoyalty = lazy(() => import('../loyalty/Loyalty').then(m => ({ default: m.StoreLoyalty })));

/**
 * Marketing = 4 groups (URL `?group=&tab=`; old `?tab=` links still resolve).
 * `defaultView` is used when the URL names nothing (the /loyalty route opens Advanced > Loyalty).
 */
export function StoreMarketing({ defaultView }: { defaultView?: MarketingView }) {
  usePageTitle('Marketing');
  const { storeId } = useStoreWorkspace();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { group, tab } = resolveMarketingView(searchParams, defaultView);

  const select = (g: MarketingGroupId, t: MarketingTabId) =>
    navigate(`/store/${storeId}/marketing?group=${g}&tab=${t}`, { replace: true });

  return (
    <>
      <StorePageHeader
        title="Marketing"
        subtitle="Drive traffic, recover sales, and reward customers."
        tabs={<MarketingNav group={group} tab={tab} onSelect={select} />}
      />

      {tab === 'loyalty' ? (
        <Suspense fallback={<div className="px-4 lg:px-7 pt-5"><SkeletonBox height={160} rounded="10px" /></div>}>
          <StoreLoyalty embedded />
        </Suspense>
      ) : (
        <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">
          <MarketingKpis storeId={storeId} />
          {(tab === 'coupons' || tab === 'discounts' || tab === 'platform') ? (
            <PromotionStatsProvider storeId={storeId}>
              <PromotionStatsRangeBar />
              {tab === 'coupons' && <CouponsTab />}
              {tab === 'discounts' && <DiscountsTab />}
              {tab === 'platform' && <PlatformSalesTab />}
            </PromotionStatsProvider>
          ) : null}
          {tab === 'banners' && <BannersTab />}
          {tab === 'featured' && <FeaturedTab />}
          {tab === 'announcement' && <AnnouncementTab />}
          {tab === 'promotions' && <PromotionsTab />}
          {tab === 'giftcards' && <GiftCardsTab />}
        </div>
      )}
    </>
  );
}
