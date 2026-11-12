// Run: npm run test:rules
import assert from 'node:assert/strict';
import { normalizeStorePhone, storeFieldError, STORE_IMAGE_RULES } from '../src/utils/storeProfileRules.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };

t('phone: mobile + landline normalise to +92, junk is refused', () => {
  assert.equal(normalizeStorePhone('0300 1234567'), '+923001234567');
  assert.equal(normalizeStorePhone('+92 300-1234567'), '+923001234567');
  assert.equal(normalizeStorePhone('(042) 3512 3456'), '+924235123456');
  for (const bad of ['abc', '', '12345', '+1 555 123 4567', '0300123', '3001234567', '+92 300 123 45x7']) assert.equal(normalizeStorePhone(bad), null, bad);
});

t('"abc" phone is an error (blocks Save); empty is fine', () => {
  assert.match(storeFieldError('contactPhone', 'abc', ''), /valid Pakistani phone/);
  assert.equal(storeFieldError('contactPhone', '', ''), null);
  assert.equal(storeFieldError('contactPhone', '0300 1234567', ''), null);
});

t('limits: name 60, tagline 100, description 1000', () => {
  assert.equal(storeFieldError('name', 'n'.repeat(60), ''), null);
  assert.match(storeFieldError('name', 'n'.repeat(61), ''), /60/);
  assert.match(storeFieldError('name', 'a', ''), /at least 2/);
  assert.match(storeFieldError('tagline', 't'.repeat(101), ''), /100/);
  assert.match(storeFieldError('description', 'd'.repeat(1001), ''), /1000/);
});

t('legacy values that are unchanged are not flagged', () => {
  const long = 'word '.repeat(600).trim();
  assert.equal(storeFieldError('description', long, long), null);
  assert.match(storeFieldError('description', long + ' more', long), /1000/);
  assert.equal(storeFieldError('contactPhone', 'call the office', 'call the office'), null);
  assert.equal(storeFieldError('contactEmail', 'old-address', 'old-address'), null);
});

t('e-mail format', () => {
  assert.match(storeFieldError('contactEmail', 'nope', ''), /valid e-mail/);
  assert.equal(storeFieldError('contactEmail', 'a@b.co', ''), null);
});

t('image rules shown to sellers', () => {
  assert.equal(STORE_IMAGE_RULES.logo.hint, 'Square, min 400x400, max 2MB');
  assert.equal(STORE_IMAGE_RULES.cover.hint, '1600x400 (4:1), max 5MB');
  assert.equal(STORE_IMAGE_RULES.cover.maxBytes, 5 * 1024 * 1024);
  assert.equal(STORE_IMAGE_RULES.logo.maxBytes, 2 * 1024 * 1024);
});

console.log(`${n} store profile tests passed`);
