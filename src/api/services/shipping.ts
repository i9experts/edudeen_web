import client from '../client';
import { ENDPOINTS } from '../endpoints';

export interface ShippingZone {
  _id: string;
  country: string;
  /** Empty = the whole country. */
  province: string | null;
  /** Empty = the whole province (or country). */
  city: string | null;
  /** Always PKR. */
  shippingPrice: number;
  estimatedDeliveryTime: string | null;
  status: 'active' | 'inactive';
  isDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShippingZonesResponse {
  message: string;
  data: ShippingZone[];
}

export function apiGetShippingZones() {
  return client.get<never, ShippingZonesResponse>(ENDPOINTS.SHIPPING.GET_SHIPPING_ZONES);
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** "Karachi, Sindh" / "All of Punjab" / "All of Pakistan". */
export function shippingZoneLabel(z: Pick<ShippingZone, 'country' | 'province' | 'city'>): string {
  if (z.city) return [z.city, z.province].filter(Boolean).join(', ');
  if (z.province) return `All of ${z.province}`;
  return `All of ${z.country || 'the country'}`;
}

/** Zones that deliver to this city/state, most specific first: the city's own
 *  zone, then its province's, then country-wide ones. */
export function zonesForAddress(zones: ShippingZone[], addr: { city?: string | null; state?: string | null }): ShippingZone[] {
  const city = norm(addr.city);
  const state = norm(addr.state);
  const rank = (z: ShippingZone) => {
    if (z.city) return norm(z.city) === city ? 0 : -1;
    if (z.province) return norm(z.province) === state ? 1 : -1;
    return 2;
  };
  return zones
    .map(z => ({ z, r: rank(z) }))
    .filter(x => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.z.shippingPrice - b.z.shippingPrice)
    .map(x => x.z);
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface ShippingZonePayload {
  country: string;
  province?: string | null;
  city?: string | null;
  shippingPrice: number;
  estimatedDeliveryTime?: string | null;
  status?: 'active' | 'inactive';
}

const ADMIN_ZONES = '/api/checkout/admin/shipping-zones';

export function apiAdminListShippingZones() {
  return client.get<never, { success: boolean; data: ShippingZone[] }>(ADMIN_ZONES);
}

export function apiAdminCreateShippingZone(payload: ShippingZonePayload) {
  return client.post<never, { success: boolean; data: ShippingZone }>(ADMIN_ZONES, payload);
}

export function apiAdminUpdateShippingZone(id: string, payload: Partial<ShippingZonePayload>) {
  return client.patch<never, { success: boolean; data: ShippingZone }>(`${ADMIN_ZONES}/${id}`, payload);
}

export function apiAdminDeleteShippingZone(id: string) {
  return client.delete<never, { success: boolean }>(`${ADMIN_ZONES}/${id}`);
}
