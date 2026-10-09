import { useEffect, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { apiBookCourierShipment, apiListCouriers, type BookedShipment, type CourierOption } from '@/api/services/couriers';

interface Props {
  orderId: string;
  storeId: string;
  /** Already booked through a courier (from the order detail). */
  existing?: { courier: string | null; trackingNumber: string | null; labelUrl: string | null } | null;
  onBooked: (s: BookedShipment) => void;
}

/**
 * Optional courier booking. Renders nothing when no courier integration is configured, so manual
 * tracking (the default) is unchanged. After booking, the tracking number is handed back so the
 * seller can press "Mark as shipped" as usual.
 */
export function CourierBooking({ orderId, storeId, existing, onBooked }: Props) {
  const [couriers, setCouriers] = useState<CourierOption[] | null>(null);
  const [courier, setCourier] = useState('');
  const [weight, setWeight] = useState('0.5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState<BookedShipment | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiListCouriers()
      .then(res => {
        if (cancelled) return;
        const ok = (res.data ?? []).filter(c => c.configured);
        setCouriers(ok);
        if (ok[0]) setCourier(ok[0].id);
      })
      .catch(() => { if (!cancelled) setCouriers([]); });
    return () => { cancelled = true; };
  }, []);

  if (!couriers || couriers.length === 0) return null;

  const label = booked?.labelUrl ?? existing?.labelUrl ?? null;
  const tracking = booked?.trackingNumber ?? existing?.trackingNumber ?? null;

  const book = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiBookCourierShipment({ orderId, storeId, courier, weightKg: Number(weight) || undefined });
      setBooked(res.data);
      onBooked(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book this shipment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-bone bg-cream px-3 py-3 flex flex-col gap-2.5">
      <p className="text-[12.5px] font-semibold text-carbon">Book with a courier (optional)</p>
      {tracking ? (
        <p className="text-[12.5px] text-carbon">
          Booked. Tracking number <b>{tracking}</b>
          {label && <> · <a href={label} target="_blank" rel="noopener noreferrer" className="text-brand-orange underline">Print label</a></>}
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-slate flex flex-col gap-1">
            Courier
            <select value={courier} onChange={e => setCourier(e.target.value)} className="py-[8px] px-2 text-[13px] border border-bone rounded-lg bg-white text-charcoal">
              {couriers.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-slate flex flex-col gap-1">
            Weight (kg)
            <input value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" className="w-[90px] py-[8px] px-2 text-[13px] border border-bone rounded-lg bg-white text-charcoal" />
          </label>
          <Button variant="outline" size="sm" onClick={book} loading={busy} icon={<PackagePlus size={13} />}>Book shipment</Button>
        </div>
      )}
      {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      <p className="text-[11.5px] text-slate">Or skip this and enter your own tracking number below.</p>
    </div>
  );
}
