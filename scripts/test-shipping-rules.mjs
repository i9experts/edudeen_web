// Run: npm run test:rules
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shipByBadge } from '../src/features/seller/store/Dashboard/StoreSection/orders/shipByBadge.ts';
import { buildShippingPayload, summarizeShipping, dispatchDaysError, SHIPPING_KEYS } from '../src/features/seller/dashboard/shippingRules.ts';

import { shipFormErrors, buildTrackingPayload, trackingUrlFor, trackingLine } from '../src/utils/carriers.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };
const form = { fromCity: ' Lahore ', fromProvince: '', delOn: true, fee: '250', freeOver: '3000', wrapOn: false, wrapFee: '0', method: 'self', dispatchDays: '3' };

t('Shipping save sends only shipping keys', () => {
  const { storeId, ...rest } = buildShippingPayload('s1', form);
  assert.equal(storeId, 's1');
  assert.deepEqual(Object.keys(rest).sort(), [...SHIPPING_KEYS].sort());
  assert.equal(rest.dispatchDays, 3);
  assert.deepEqual(rest.shipFrom, { city: 'Lahore', province: null });
  assert.deepEqual(rest.deliverySettings, { enabled: true, fee: 250, freeOverAmount: 3000 });
});

t('Store Settings save sends no shipping keys', () => {
  const src = readFileSync(new URL('../src/features/seller/store/Dashboard/Manage/StoreSettings.tsx', import.meta.url), 'utf8');
  const m = src.match(/apiUpdateStore\(\{[^}]*codEnabled[^}]*\}\)/);
  assert.ok(m, 'main settings save call not found');
  for (const k of SHIPPING_KEYS) assert.ok(!m[0].includes(k), `settings save must not send ${k}`);
  assert.ok(!src.includes('DeliveryGiftCard'), 'Settings must not render the shipping card');
});

t('Shipping page save never sends settings keys', () => {
  const { storeId, ...rest } = buildShippingPayload('s1', form);
  for (const k of ['name', 'description', 'tagline', 'logo', 'codEnabled', 'productTypes']) assert.ok(!(k in rest));
});

t('summary: empty / own charge / standard', () => {
  assert.equal(summarizeShipping({}).empty, true);
  const s = summarizeShipping({ deliveryMethod: 'self', deliverySettings: { enabled: true, fee: 250, freeOverAmount: 3000 }, shipFrom: { city: 'Lahore' } });
  assert.deepEqual([s.empty, s.charge, s.freeOver, s.from], [false, 250, 3000, 'Lahore']);
  const e = summarizeShipping({ shipFrom: { city: 'Karachi' } });
  assert.deepEqual([e.charge, e.freeOver, e.method], [null, null, 'Edudeen standard delivery']);
});

t('carrier rules: courier needs number, self does not', () => {
  const base = { carrier: '', otherName: '', number: '', url: '', expected: '', note: '' };
  assert.ok(shipFormErrors({ ...base, carrier: 'TCS' }).number);
  assert.deepEqual(shipFormErrors({ ...base, carrier: 'I deliver myself' }), {});
  assert.ok(shipFormErrors({ ...base, carrier: 'Other' }).otherName);
  assert.ok(shipFormErrors({ ...base, carrier: 'TCS', number: '1', url: 'ftp://x' }).url);
  assert.equal(trackingUrlFor('TCS', '123'), 'https://www.tcsexpress.com/track/123');
  assert.equal(trackingUrlFor('Trax', '123'), '');
  assert.deepEqual(buildTrackingPayload({ ...base, carrier: 'I deliver myself', expected: '2026-12-01', note: ' hi ' }), { carrier: 'I deliver myself', expectedDeliveryDate: '2026-12-01', note: 'hi' });
  assert.equal(trackingLine({ carrier: 'I deliver myself' }), 'Delivered by the seller');
  assert.equal(trackingLine({ carrier: 'TCS', trackingNumber: '9' }), 'TCS · 9');
  assert.equal(trackingLine({}), null);
});

t('dispatch days: 0 and 8 rejected, 1..7 accepted', () => {
  for (const bad of ['0', '8', '', '2.5', '-1', 'x']) assert.ok(dispatchDaysError(bad), bad);
  for (const ok of ['1', '2', '7', ' 3 ']) assert.equal(dispatchDaysError(ok), null, ok);
});

t('ship-by label: date in Pakistan time, overdue gets a secondary line', () => {
  const now = new Date('2026-11-16T09:00:00Z').getTime();
  assert.equal(shipByBadge('2026-11-12T07:00:00Z', now).label, 'Ship by Thu 12 Nov');
  assert.deepEqual([shipByBadge('2026-11-12T07:00:00Z', now).tone, shipByBadge('2026-11-12T07:00:00Z', now).secondary], ['red', 'Overdue by 4d']);
  assert.equal(shipByBadge('2026-11-20T07:00:00Z', now).secondary, undefined);
  assert.equal(shipByBadge(null, now), null);
});

console.log(`${n} shipping tests passed`);
