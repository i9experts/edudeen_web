import { useEffect, useState } from 'react';
import { formatPrice } from '@/utils/formatPrice';
import { useUsdMoney } from '@/hooks/useUsdMoney';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { Plus, Rocket, X } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { EmptyState, SkeletonBox, Button } from '@/components/comman/ui';
import { apiListPromotionRequests, apiCancelPromotionRequest, apiGetSellerPromotionAnalytics, type PromotionRequest, type PromotionAnalyticsData } from '@/api/services/promotions';
import { PromotionRequestFormModal, PromotionPaymentModal, PLACEMENT_LABEL, PROMOTION_STATUS_STYLE } from './PromotionModals';

export function PromotionsTab() {
  const { storeId } = useStoreWorkspace();
  const usd = useUsdMoney();
  // Promotion Requests
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [promotionsError, setPromotionsError] = useState('');
  const [addingPromotion, setAddingPromotion] = useState(false);
  const [payingRequest, setPayingRequest] = useState<PromotionRequest | null>(null);
  const [promotionBusyId, setPromotionBusyId] = useState<string | null>(null);

  function refetchPromotionRequests() {
    if (!storeId) return;
    setPromotionsLoading(true);
    apiListPromotionRequests(storeId)
      .then(res => setPromotionRequests(res.data ?? []))
      .catch(err => setPromotionsError(err instanceof Error ? err.message : 'Failed to load promotion requests.'))
      .finally(() => setPromotionsLoading(false));
  }

  useEffect(() => {
    if (!storeId) return;
    refetchPromotionRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const [promotionAnalytics, setPromotionAnalytics] = useState<PromotionAnalyticsData | null>(null);

  useEffect(() => {
    if (!storeId) return;
    apiGetSellerPromotionAnalytics(storeId).then(res => setPromotionAnalytics(res.data)).catch(() => {});
  }, [storeId]);

  async function cancelPromotionRequest(r: PromotionRequest) {
    setPromotionBusyId(r._id);
    try {
      await apiCancelPromotionRequest(r._id);
      refetchPromotionRequests();
    } catch {
      // best-effort
    } finally {
      setPromotionBusyId(null);
    }
  }

  useLiveRefresh(['promotions', 'banners', 'store', 'marketing'], () => {
    if (!storeId) return;
    apiListPromotionRequests(storeId).then(res => setPromotionRequests(res.data ?? [])).catch(() => {});
    apiGetSellerPromotionAnalytics(storeId).then(res => setPromotionAnalytics(res.data)).catch(() => {});
  }, !!storeId);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-carbon">Promotion Requests</p>
            <p className="text-[12.5px] text-slate mt-0.5">
              Request a paid placement on the Homepage, Marketplace, Education Marketplace, or a Category page. Admin reviews before it goes live.
            </p>
          </div>
          <Button icon={<Plus size={14} />} onClick={() => setAddingPromotion(true)}>Request Promotion</Button>
        </div>

        {promotionAnalytics && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              ['Impressions', promotionAnalytics.impressions.toLocaleString()],
              ['Clicks', promotionAnalytics.clicks.toLocaleString()],
              ['CTR', `${promotionAnalytics.ctr.toFixed(1)}%`],
              ['Orders', promotionAnalytics.orders.toLocaleString()],
              ['Revenue', `${usd(promotionAnalytics.revenueUSD)}`],
            ].map(([label, value]) => (
              <div key={label} className="bg-white border border-bone rounded-[10px] px-3.5 py-3">
                <p className="text-[12px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{label}</p>
                <p className="text-[18px] font-bold text-carbon leading-[1.15]">{value}</p>
              </div>
            ))}
          </div>
        )}

        {promotionsError && <p className="text-xs text-error">{promotionsError}</p>}

        {promotionsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonBox key={i} height={140} rounded="10px" />)}</div>
        ) : promotionRequests.length === 0 ? (
          <EmptyState
            icon={<Rocket size={28} className="text-brand-orange opacity-55" />}
            title="No promotion requests yet"
            description="Request a paid placement to get featured on the marketplace or homepage."
            action={{ label: 'Request Promotion', onClick: () => setAddingPromotion(true), icon: <Plus size={14} /> }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {promotionRequests.map(r => {
              const st = PROMOTION_STATUS_STYLE[r.status] ?? PROMOTION_STATUS_STYLE.draft;
              return (
                <div key={r._id} className="bg-white border border-bone rounded-[10px] overflow-hidden">
                  <img loading="lazy" decoding="async" src={r.creativeUrl} alt="" className="w-full h-[100px] object-cover bg-cream" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-carbon">{PLACEMENT_LABEL[r.placement]}</span>
                      <span className="px-2.5 py-[3px] rounded-[5px] text-[12px] font-semibold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-[12px] text-slate">
                      {new Date(r.startAt).toLocaleDateString()} – {new Date(r.endAt).toLocaleDateString()} · {formatPrice(r.priceUSD, 'USD')}
                    </p>
                    {r.status === 'rejected' && r.rejectionReason && (
                      <p className="text-[12px] text-error bg-error-bg rounded-md px-2 py-1.5">{r.rejectionReason}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {r.status === 'approved' && r.paymentStatus !== 'paid' && (
                        <button onClick={() => setPayingRequest(r)} className="flex-1 py-[7px] bg-brand-orange border-0 rounded-[7px] text-xs font-semibold text-white cursor-pointer hover:bg-brand-deep-orange">
                          Pay {formatPrice(r.priceUSD, 'USD')}
                        </button>
                      )}
                      {['pending', 'approved', 'active'].includes(r.status) && (
                        <button onClick={() => cancelPromotionRequest(r)} disabled={promotionBusyId === r._id}
                          className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer hover:bg-cream disabled:opacity-50 flex items-center justify-center gap-1">
                          <X size={11} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    {addingPromotion && (
      <PromotionRequestFormModal
        storeId={storeId}
        onClose={() => setAddingPromotion(false)}
        onSaved={() => { setAddingPromotion(false); refetchPromotionRequests(); }}
      />
    )}

    {payingRequest && (
      <PromotionPaymentModal
        request={payingRequest}
        onClose={() => setPayingRequest(null)}
        onPaid={() => { setPayingRequest(null); refetchPromotionRequests(); }}
      />
    )}
    </>
  );
}
