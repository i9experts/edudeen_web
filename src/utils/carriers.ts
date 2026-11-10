/** Carriers a seller can choose when marking a parcel shipped. ONE place for names, tracking-link templates and display text. */

export const SELF_CARRIER = 'I deliver myself';
export const OTHER_CARRIER = 'Other';

export interface CarrierOption {
  value: string;
  label: string;
  /** Tracking-link template with {n}; null = no verified public template, the seller pastes the link. */
  urlTemplate: string | null;
}

// Only templates that match the courier adapters on the API (couriers/courier.adapters.ts) are filled in.
// The rest stay empty on purpose: a wrong auto-generated link is worse than none.
export const CARRIERS: CarrierOption[] = [
  { value: 'TCS',            label: 'TCS',              urlTemplate: 'https://www.tcsexpress.com/track/{n}' },
  { value: 'Leopards',       label: 'Leopards',         urlTemplate: 'https://www.leopardscourier.com/tracking?cn={n}' },
  { value: 'PostEx',         label: 'PostEx',           urlTemplate: 'https://postex.pk/tracking?cn={n}' },
  { value: 'M&P',            label: 'M&P',              urlTemplate: null },
  { value: 'Pakistan Post',  label: 'Pakistan Post',    urlTemplate: null },
  { value: 'Trax',           label: 'Trax',             urlTemplate: null },
  { value: SELF_CARRIER,     label: SELF_CARRIER,       urlTemplate: null },
  { value: OTHER_CARRIER,    label: 'Other (type name)', urlTemplate: null },
];

const SELF_NAMES = new Set(['i deliver myself', 'self delivery', 'self-delivery', 'self', 'own delivery']);
export const isSelfCarrier = (c?: string | null) => SELF_NAMES.has((c ?? '').trim().toLowerCase());

/** Dropdown value for a stored carrier string (e.g. a courier booking's label); unknown names map to Other. */
export function carrierChoiceFor(carrier?: string | null): string {
  const c = (carrier ?? '').trim().toLowerCase();
  if (!c) return '';
  if (isSelfCarrier(c)) return SELF_CARRIER;
  const hit = CARRIERS.find(o => o.value !== OTHER_CARRIER && o.value.toLowerCase() === c);
  return hit ? hit.value : OTHER_CARRIER;
}

/** https tracking link for a known carrier + number, or '' (no template / no number). */
export function trackingUrlFor(carrierValue: string, number: string): string {
  const n = number.trim();
  const tpl = CARRIERS.find(o => o.value === carrierValue)?.urlTemplate;
  return tpl && n ? tpl.replace('{n}', encodeURIComponent(n)) : '';
}

export const isHttpUrl = (u: string) => /^https?:\/\/\S+$/i.test(u.trim());

export interface ShipForm { carrier: string; otherName: string; number: string; url: string; expected: string; note: string }

/** Field errors for the ship form; empty object = valid. Mirrors API cleanTracking. */
export function shipFormErrors(f: ShipForm): Partial<Record<keyof ShipForm, string>> {
  const e: Partial<Record<keyof ShipForm, string>> = {};
  if (!f.carrier) { e.carrier = 'Choose a carrier.'; return e; }
  const name = (f.carrier === OTHER_CARRIER ? f.otherName : f.carrier).trim();
  if (!name) e.otherName = 'Type the carrier name.';
  else if (name.length > 60) e.otherName = 'Carrier name is too long (max 60).';
  if (!isSelfCarrier(f.carrier)) {
    if (!f.number.trim()) e.number = 'Enter the tracking number.';
    else if (f.number.trim().length > 60) e.number = 'Tracking number is too long (max 60).';
  }
  if (f.url.trim() && (!isHttpUrl(f.url) || f.url.trim().length > 500)) e.url = 'Link must start with http:// or https://';
  if (f.note.length > 300) e.note = 'Note is too long (max 300).';
  return e;
}

/** tracking object for PUT update-status (empty optional fields are left out). */
export function buildTrackingPayload(f: ShipForm) {
  const self = isSelfCarrier(f.carrier);
  const carrier = (f.carrier === OTHER_CARRIER ? f.otherName : f.carrier).trim();
  return {
    carrier,
    ...(!self || f.number.trim() ? { trackingNumber: f.number.trim() } : {}),
    ...(f.url.trim() ? { trackingUrl: f.url.trim() } : {}),
    ...(self && f.expected ? { expectedDeliveryDate: f.expected } : {}),
    ...(self && f.note.trim() ? { note: f.note.trim() } : {}),
  };
}

export interface TrackingLike {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  expectedDeliveryDate?: string | null;
  note?: string | null;
}

/** One readable line for a shipped parcel; never blank or "undefined". null = nothing to show. */
export function trackingLine(t?: TrackingLike | null): string | null {
  if (!t) return null;
  const carrier = (t.carrier ?? '').trim();
  const num = (t.trackingNumber ?? '').trim();
  const date = t.expectedDeliveryDate ? new Date(t.expectedDeliveryDate) : null;
  const dateText = date && !Number.isNaN(date.getTime()) ? `Expected by ${date.toLocaleDateString('en-PK', { dateStyle: 'medium' })}` : '';
  const parts = [isSelfCarrier(carrier) ? 'Delivered by the seller' : carrier, num, dateText].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
