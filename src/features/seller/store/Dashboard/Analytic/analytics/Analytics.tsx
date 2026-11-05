import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { PremiumBuyersCard } from '@/features/seller/components/PremiumBuyersCard';
import { SellerAnalyticsView } from '@/features/seller/components/analytics/SellerAnalyticsView';

export function StoreAnalytics() {
  usePageTitle('Analytics');
  const { store, storeId } = useStoreWorkspace();

  return (
    <>
      <StorePageHeader
        title="Analytics"
        subtitle="Understand your store performance and growth trends."
      />

      <div className="px-7 pt-5 pb-8">
        <PremiumBuyersCard storeId={storeId} />
        <SellerAnalyticsView storeId={storeId} currency={store?.baseCurrency ?? null} />
      </div>
    </>
  );
}
