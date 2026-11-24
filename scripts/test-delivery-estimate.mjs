// Run: npm run test:rules
import assert from 'node:assert/strict';
import { deliveryEstimateLabel as f } from '../src/utils/deliveryEstimate.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };
const norm = s => s.replace(/,/g, '');

// 2026-11-27T20:00Z is already Saturday 01:00 in Karachi (UTC is still Friday).
const satKhi = new Date('2026-11-27T20:00:00Z');
t('Karachi date used, Sunday skipped, month rollover', () => {
  assert.equal(norm(f(2, { min: 1, max: 2 }, 'en', satKhi)), 'Tue 1 - Thu 3 Dec');
  assert.equal(norm(f(2, { min: 0, max: 0 }, 'en', satKhi)), 'Mon 30 Nov - Tue 1 Dec');
});
t('Same-month range shows month once', () => {
  const tue = new Date('2026-11-23T10:00:00Z'); // Mon 23 Nov in Karachi
  assert.equal(norm(f(3, { min: 0, max: 0 }, 'en', tue)), 'Tue 24 - Thu 26 Nov');
});
t('Single day collapses to one date', () => {
  const tue = new Date('2026-11-23T10:00:00Z');
  assert.equal(norm(f(1, { min: 0, max: 0 }, 'en', tue)), 'Tue 24 Nov');
});
t('Dispatch never lands on a Sunday', () => {
  const sat = new Date('2026-11-28T10:00:00Z');
  assert.ok(!norm(f(1, { min: 0, max: 0 }, 'en', sat)).startsWith('Sun'));
});
t('Missing/invalid input returns null (old text stays)', () => {
  assert.equal(f(null, { min: 1, max: 2 }, 'en'), null);
  assert.equal(f(2, null, 'en'), null);
  assert.equal(f(0, { min: 1, max: 2 }, 'en'), null);
  assert.equal(f(2, { min: 3, max: 1 }, 'en'), null);
  assert.equal(f(2, { min: NaN, max: 1 }, 'en'), null);
});
t('Urdu output is non-empty and differs from English', () => {
  const ur = f(2, { min: 1, max: 2 }, 'ur', satKhi);
  console.log('     ur:', ur);
  assert.ok(ur && ur !== f(2, { min: 1, max: 2 }, 'en', satKhi));
});
console.log(`${n} passed`);
