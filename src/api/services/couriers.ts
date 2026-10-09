import client from '../client';

export interface CourierOption { id: 'tcs' | 'leopards' | 'postex'; label: string; configured: boolean }

export interface BookedShipment {
  courier: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string | null;
  labelUrl: string | null;
  codAmount: number;
}

/** GET /api/couriers: which courier integrations are set up (manual tracking is always available). */
export function apiListCouriers() {
  return client.get<never, { success: boolean; data: CourierOption[] }>('/api/couriers');
}

/** POST /api/couriers/shipments: books the shipment and stores the tracking number. */
export function apiBookCourierShipment(payload: { orderId: string; storeId: string; courier: string; weightKg?: number }) {
  return client.post<never, { success: boolean; data: BookedShipment }>('/api/couriers/shipments', payload);
}
