import { Truck, Download, Banknote, Clock } from 'lucide-react';
import { shippingFeeLabel } from '@/utils/cartLabels';
import { useDeliveryInfo } from '@/hooks/shipping/useDeliveryInfo';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';

interface Props {
  productId?: string;
  variantId?: string;
  quantity: number;
  isPhysical: boolean;
  isCourse: boolean;
}

/**
 * Buy-box delivery rows. Everything comes from GET /api/checkout/delivery-info (the checkout's own fee code);
 * a row with no real data is hidden, an unknown fee says "Calculated at checkout".
 */
export function DeliveryBuyBox({ productId, variantId, quantity, isPhysical, isCourse }: Props) {
  const { info, city, loading, error } = useDeliveryInfo({ productId, variantId, quantity }, isPhysical && !!productId);

  const Row = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 text-[12px] text-charcoal">
      <span className="text-slate shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );

  if (!isPhysical) {
    return (
      <div className="mb-3">
        <Row icon={<Download size={14} />}>{isCourse ? 'Instant access after purchase' : 'Instant download after purchase'}</Row>
      </div>
    );
  }
  // Every state keeps the same reserved height (room for 3 rows) so the buttons below never jump when delivery info arrives.
  const reserve = 'mb-3 min-h-[88px] sm:min-h-[64px]';
  if (loading) return <div className={`${reserve} flex flex-col gap-2`} aria-hidden="true"><SkeletonBox width={190} height={12} /><SkeletonBox width={150} height={12} /></div>;
  if (error) return <div className={reserve}><Row icon={<Truck size={14} />}><span className="text-slate">Delivery info unavailable</span></Row></div>;
  if (!info || info.kind !== 'physical') return <div className={reserve} aria-hidden="true" />;

  return (
    <div className={`${reserve} flex flex-col gap-1.5`}>
      {info.fee == null && !info.estimate ? (
        // Fee not known yet: say who delivers and what the seller states; never a made-up date.
        <Row icon={<Truck size={14} />}>
          {info.dispatchDays
            ? <span>{`Delivery by seller - usually ships in 1-${info.dispatchDays} working day${info.dispatchDays === 1 ? '' : 's'}`}</span>
            : <span>Seller confirms delivery after order</span>}
          <span className="text-slate">{' · fee calculated at checkout'}</span>
        </Row>
      ) : (
        <Row icon={<Truck size={14} />}>
          <span>Delivery</span><span>{': '}</span>
          <span className={info.fee == null ? undefined : 'font-semibold'}>{shippingFeeLabel(info.fee, info.currency)}</span>
          {info.estimate ? <span className="text-slate">{` · ${info.estimate}`}</span> : null}
        </Row>
      )}
      {/* Seller-stated: handling (1 to N working days, the same range shown above) + the seller's days for this route. Only with a real city, route and dispatch time. */}
      {city && info.routeDays && info.dispatchDays ? (
        <Row icon={<Clock size={14} />}>
          <span>{'Delivery to '}</span><span translate="no">{city}</span><span>{': '}</span>
          <span className="font-semibold">{`${1 + info.routeDays.min}-${info.dispatchDays + info.routeDays.max} days`}</span>
        </Row>
      ) : null}
      {info.cod && <Row icon={<Banknote size={14} />}>Cash on Delivery available</Row>}
    </div>
  );
}
