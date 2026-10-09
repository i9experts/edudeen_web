import { usePageTitle } from '@/hooks/usePageTitle';
import { SellerPageHeader } from '@/components/layouts/SellerLayout';
import { MapPin, Info } from 'lucide-react';
import { useShippingZones } from '@/hooks/shipping/useShippingZones';
import { shippingZoneLabel } from '@/api/services/shipping';
import { Button, SkeletonBox, EmptyState } from '@/components/comman/ui';

// ── Component ─────────────────────────────────────────────────────────────────
// Read-only by design: delivery zones and prices are set by Edudeen (admin),
// not per seller. This page just shows sellers what buyers are charged.
export function SellerShipping() {
  usePageTitle('Shipping');
  const { zones, loading, error, refetch } = useShippingZones();
  const liveZones = zones.filter(z => z.status === 'active');

  return (
    <>
      <SellerPageHeader
        title="Shipping"
        subtitle="Delivery zones and rates buyers see at checkout."
      />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">

        <div className="flex items-start gap-2 text-[12.5px] text-carbon bg-info-bg border border-[#bfdcf3] rounded-lg px-3 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px] text-brand-royal" />
          <span>Edudeen sets the delivery zones and prices for physical orders — you don’t need to configure anything here.</span>
        </div>

        <div className="bg-white border border-bone rounded-[10px] px-5 py-4 max-w-[320px]">
          <p className="text-[12px] font-medium text-slate uppercase tracking-[0.06em] mb-1">Live Zones</p>
          <p className="text-[28px] font-bold text-carbon leading-[1.15]">{loading ? '—' : liveZones.length}</p>
          <p className="text-xs text-slate mt-1">Used at checkout</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3].map(i => <SkeletonBox key={i} height={72} rounded="10px" />)}
          </div>
        ) : error ? (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-8 text-center">
            <p className="text-[13px] text-error mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
          </div>
        ) : liveZones.length === 0 ? (
          <EmptyState icon={<MapPin size={28} className="text-slate/50" />} title="No delivery zones yet" description="Edudeen hasn’t published any delivery zones yet. They’ll appear here once they’re live." />
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
                  {/* Shipping zones are a Pakistan-domestic geography feature — always
                      PKR-priced regardless of a store's own baseCurrency (see
                      checkout.service.ts's SHIPPING_ZONE_CURRENCY constant), so this
                      is intentionally never store-currency-dependent. */}
                  <span className="text-sm font-bold text-brand-orange shrink-0">Rs {zone.shippingPrice.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
