import { useEffect, useState } from 'react';
import client from '@/api/client';
import { TokenStorage } from '@/api/services/auth';
import { apiGetMyAddresses } from '@/api/services/address';
import { apiGetShippingZones, zonesForAddress } from '@/api/services/shipping';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';

/** Read-only answer from GET /api/checkout/delivery-info (same fee code checkout uses). */
export type DeliveryInfo =
  | { kind: 'digital' }
  | { kind: 'physical'; currency: 'PKR' | 'USD'; fee: number | null; estimate: string | null; freeShipping: boolean; cod: boolean };

export interface DeliveryInfoState {
  info: DeliveryInfo | null;
  loading: boolean;
  /** true when the lookup failed (show "Delivery info unavailable"). */
  error: boolean;
}

// The buyer's zone is "known" only when their default address matches exactly one zone, the same
// auto-select rule checkout applies; with 2+ matches the buyer picks at checkout, so we don't guess.
async function knownZoneId(): Promise<string | null> {
  if (!TokenStorage.isLoggedIn()) return null;
  const [addrRes, zoneRes] = await Promise.all([apiGetMyAddresses(), apiGetShippingZones()]);
  const addrs = (addrRes.data ?? []).filter(a => !a.isDelete);
  const addr = addrs.find(a => a.isDefault) ?? null;
  if (!addr) return null;
  const live = (zoneRes.data ?? []).filter(z => !z.isDelete && z.status !== 'inactive');
  const match = zonesForAddress(live, { city: addr.city, state: addr.state });
  return match.length === 1 ? match[0]._id : null;
}

/** Delivery facts for one product line. `enabled=false` skips every call. */
export function useDeliveryInfo(
  line: { productId?: string; variantId?: string; quantity?: number } | null,
  enabled = true,
): DeliveryInfoState {
  const { chargeCurrency } = useCurrencyPreference();
  const [state, setState] = useState<DeliveryInfoState>({ info: null, loading: !!line && enabled, error: false });
  const productId = line?.productId;
  const variantId = line?.variantId;
  const quantity = line?.quantity ?? 1;

  useEffect(() => {
    if (!enabled || !productId) { setState({ info: null, loading: false, error: false }); return; }
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: false }));
    (async () => {
      let zoneId: string | null = null;
      try { zoneId = await knownZoneId(); } catch { zoneId = null; /* no zone = "Calculated at checkout" */ }
      const res = await client.get<never, { data: DeliveryInfo }>('/api/checkout/delivery-info', {
        params: { productId, variantId, quantity, currency: chargeCurrency, ...(zoneId ? { zoneId } : {}) },
      });
      if (!cancelled) setState({ info: res.data ?? null, loading: false, error: false });
    })().catch(() => { if (!cancelled) setState({ info: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [enabled, productId, variantId, quantity, chargeCurrency]);

  return state;
}
