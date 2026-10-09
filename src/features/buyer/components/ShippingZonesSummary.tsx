import { Truck } from 'lucide-react';
import { useShippingZones } from '@/hooks/shipping/useShippingZones';
import { shippingZoneLabel } from '@/api/services/shipping';

/**
 * Where a physical item can be delivered and what it costs — straight from
 * the delivery zones the Edudeen team sets up (Admin → Shipping Zones), the
 * same ones checkout charges. Prices are in PKR, like the zones themselves.
 */
export function ShippingZonesSummary({ sellerName }: { sellerName?: string | null }) {
  const { zones, loading, error } = useShippingZones();
  const live = zones.filter(z => !z.isDelete && z.status !== 'inactive');

  let body: React.ReactNode;
  if (loading) body = <span className="text-slate">Loading delivery options…</span>;
  else if (error) body = <span className="text-slate">Delivery cost is shown at checkout.</span>;
  else if (!live.length) body = <span>Delivery is arranged by {sellerName ?? 'the seller'} after you order.</span>;
  else {
    const cheapest = Math.min(...live.map(z => z.shippingPrice));
    body = (
      <>
        <span>{cheapest > 0 ? `From Rs ${cheapest.toLocaleString()}` : 'Free delivery available'} · exact cost for your address at checkout</span>
        <ul className="list-none p-0 m-0 mt-1.5 flex flex-col gap-0.5">
          {live.slice(0, 6).map(z => (
            <li key={z._id} className="flex justify-between gap-3">
              <span className="truncate">{shippingZoneLabel(z)}</span>
              <span className="shrink-0 tabular-nums text-charcoal">
                {z.shippingPrice > 0 ? `Rs ${z.shippingPrice.toLocaleString()}` : 'Free'}{z.estimatedDeliveryTime ? ` · ${z.estimatedDeliveryTime}` : ''}
              </span>
            </li>
          ))}
          {live.length > 6 && <li className="text-slate">+ {live.length - 6} more areas</li>}
        </ul>
      </>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-8 h-8 rounded-lg bg-brand-pale-orange flex items-center justify-center flex-shrink-0">
        <Truck size={15} className="text-brand-orange" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[12px] text-charcoal mb-[2px]">Shipping</div>
        <div className="text-[12px] text-slate break-words leading-[1.55]">{body}</div>
      </div>
    </div>
  );
}
