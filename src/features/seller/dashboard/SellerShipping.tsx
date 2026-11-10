import { usePageTitle } from '@/hooks/usePageTitle';
import { formatPrice } from '@/utils/formatPrice';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { MapPin, Info, Truck } from 'lucide-react';
import { useShippingZones } from '@/hooks/shipping/useShippingZones';
import { shippingZoneLabel } from '@/api/services/shipping';
import { Button, SkeletonBox, EmptyState } from '@/components/comman/ui';
import { DeliveryGiftCard } from '@/features/seller/store/Dashboard/Manage/DeliveryGiftCard';
import { summarizeShipping } from './shippingRules';

// One home for every seller shipping setting. Edudeen still decides which cities
// can be delivered to (zones); the seller chooses how they deliver and their charges.
export function SellerShipping() {
  usePageTitle('Shipping');
  const { store, storeId, refetch } = useStoreWorkspace();
  const { zones, loading, error, refetch: refetchZones } = useShippingZones();
  const liveZones = zones.filter(z => z.status === 'active');
  const cur = store?.baseCurrency;
  const sum = summarizeShipping({ deliveryMethod: store?.deliveryMethod, deliverySettings: store?.deliverySettings, shipFrom: store?.shipFrom });
  const platform = store?.fulfillmentMode === 'platform';

  const goToForm = () => document.getElementById('shipping-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <StorePageHeader title="Shipping" subtitle="How you deliver, your charges, and where Edudeen delivers." />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5 min-w-0">

        {platform && (
          <div className="flex items-start gap-2 text-[12.5px] text-carbon bg-info-bg border border-[#bfdcf3] rounded-lg px-3 py-2.5">
            <Info size={14} className="shrink-0 mt-[1px] text-brand-royal" />
            <span>Edudeen ships your physical orders, so you don’t need to configure delivery here.</span>
          </div>
        )}

        {!store ? (
          <SkeletonBox height={84} rounded="10px" />
        ) : sum.empty ? (
          <EmptyState
            icon={<Truck size={28} className="text-slate/50" />}
            title="Shipping is not set up yet"
            description="Choose how you deliver and where you ship from."
            action={{ label: 'Set up shipping', onClick: goToForm }}
          />
        ) : (
          <div className="bg-white border border-bone rounded-[10px] px-4 sm:px-5 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="You deliver" value={sum.method} />
            <SummaryItem label="Ships from" value={sum.from || 'Not set'} />
            <SummaryItem label="Charge" value={sum.charge != null ? formatPrice(sum.charge, cur) : 'Edudeen standard'} />
            <SummaryItem label="Free over" value={sum.freeOver != null ? formatPrice(sum.freeOver, cur) : 'Off'} />
          </div>
        )}

        <div id="shipping-form" className="scroll-mt-24">
          {storeId && (
            <DeliveryGiftCard
              storeId={storeId}
              delivery={store?.deliverySettings}
              giftWrap={store?.giftWrap}
              shipFrom={store?.shipFrom}
              deliveryMethod={store?.deliveryMethod}
              dispatchDays={store?.dispatchDays}
              currency={cur}
              refetch={refetch}
            />
          )}
        </div>

        <div>
          <p className="text-[13.5px] font-semibold text-carbon mb-2">Delivery zones</p>
          {loading ? (
            <div className="flex flex-col gap-3.5">
              {[1, 2, 3].map(i => <SkeletonBox key={i} height={72} rounded="10px" />)}
            </div>
          ) : error ? (
            <div className="bg-white border border-bone rounded-[10px] px-5 py-8 text-center">
              <p className="text-[13px] text-error mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={refetchZones}>Try again</Button>
            </div>
          ) : liveZones.length === 0 ? (
            <p className="flex items-center gap-2 text-[12.5px] text-slate"><MapPin size={14} className="shrink-0" />Edudeen standard rates apply to all cities.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {liveZones.map(zone => (
                <div key={zone._id} className="bg-white border border-bone rounded-[10px] px-4 sm:px-[22px] py-[18px]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-carbon mb-[3px]">{shippingZoneLabel(zone)}</p>
                      <p className="text-xs text-slate">
                        {zone.country}{zone.estimatedDeliveryTime ? ` · Est. delivery ${zone.estimatedDeliveryTime}` : ''}
                      </p>
                    </div>
                    {/* Shipping zones are PKR-priced regardless of the store's currency (checkout SHIPPING_ZONE_CURRENCY). */}
                    <span className="text-sm font-bold text-brand-orange shrink-0">{formatPrice(zone.shippingPrice, 'PKR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] font-medium text-slate uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-[14px] font-semibold text-carbon break-words">{value}</p>
    </div>
  );
}
