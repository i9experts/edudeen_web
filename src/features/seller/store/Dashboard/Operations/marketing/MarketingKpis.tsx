import { useCallback, useEffect, useState } from 'react';
import { MetricCard, Button } from '@/components/comman/ui';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { formatPrice } from '@/utils/formatPrice';
import { apiGetMarketingKpis, type MarketingKpis as Kpis } from '@/api/services/marketing';

/** Read-only row: promotions running + what they did in the last 30 days (Pakistan time). */
export function MarketingKpis({ storeId }: { storeId: string }) {
  const [data, setData] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((quiet = false) => {
    if (!storeId) return;
    if (!quiet) { setLoading(true); setError(''); }
    apiGetMarketingKpis(storeId)
      .then(res => { setData(res.data); setError(''); })
      .catch(err => { if (!quiet) setError(err instanceof Error ? err.message : 'Could not load promotion numbers.'); })
      .finally(() => { if (!quiet) setLoading(false); });
  }, [storeId]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(['orders', 'marketing', 'promotions', 'catalog'], () => load(true), !!storeId);

  if (error) {
    return (
      <div className="bg-white border border-bone rounded-[10px] px-4 py-3 flex flex-wrap items-center gap-3">
        <p className="text-xs text-error">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => load()}>Retry</Button>
      </div>
    );
  }

  if (!loading && data && data.activePromotions.total === 0 && data.ordersWithPromotion === 0) {
    return (
      <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
        <p className="text-[14px] font-semibold text-carbon">No promotions yet</p>
        <p className="text-[12.5px] text-slate mt-0.5">Create a coupon, an automatic discount or join a platform sale. Results for the last 30 days will show here.</p>
      </div>
    );
  }

  const cur = data?.currency ?? 'PKR';
  const ap = data?.activePromotions;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        compact loading={loading}
        label="Active promotions"
        value={ap?.total ?? 0}
        sub={ap ? `${ap.coupons} coupons · ${ap.discounts} auto · ${ap.platformSales} sales` : undefined}
        info="Live coupons + automatic discounts + platform sales that include at least one of your products."
      />
      <MetricCard compact loading={loading} label="Orders with a promotion" value={data?.ordersWithPromotion ?? 0} sub="Last 30 days"
        info="Orders (not cancelled) where an item used a coupon, an automatic discount or a platform sale." />
      <MetricCard compact loading={loading} label="Discount given" value={formatPrice(data?.discountGiven ?? 0, cur)} sub="Last 30 days"
        info="Total discount buyers received on those orders (coupons, automatic discounts, platform sales)." />
      <MetricCard compact loading={loading} label="Revenue from promoted orders" value={formatPrice(data?.promotedRevenue ?? 0, cur)} sub="Last 30 days"
        info="Value of your items on orders that carried a promotion, after the discount." />
    </div>
  );
}
