// Run: npm run test:rules  (Node 22.6+/24 strips the TypeScript types itself; no test runner needed)
import assert from 'node:assert/strict';
import { weightError, toggleRemember, weightTextError, weightToStored, weightFromStored, stockError, parseWeightKg, validatePrices, descriptionError, premiumConflict, maxCompareAtForPremium } from '../src/features/seller/store/Dashboard/StoreSection/products/priceRules.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };

// Store with a 10% Premium member discount and the admin's 5-point minimum gap (the live defaults).
const PREMIUM = { sellerPct: 10, gap: 5, symbol: 'Rs', currency: 'PKR' };
const conflict = (price, compareAt) => premiumConflict({ price, compareAt, ...PREMIUM });

t('450 / 473 is fine (inside the Premium limit)', () => {
  assert.deepEqual(validatePrices({ price: '450', compareAt: '473', currency: 'PKR' }), {});
  assert.equal(conflict(450, 473), null);
});
t('450 / 500 is a Premium conflict with an actionable message', () => {
  assert.deepEqual(validatePrices({ price: '450', compareAt: '500', currency: 'PKR' }), {});
  const c = conflict(450, 500);
  assert.ok(c);
  assert.match(c.short, /Discount too big with Premium member discount/);
  assert.match(c.short, /max compare-at for Rs 450 is Rs 473/);
  assert.equal(c.max, 473);
  assert.equal(conflict(450, c.max), null, 'the suggested maximum must itself be accepted');
});
t('450 / 520 is a Premium conflict', () => assert.ok(conflict(450, 520)));
t('maximum is never above the allowed sale for any price', () => {
  for (const price of [1, 7, 99, 450, 1234, 9999]) {
    const max = maxCompareAtForPremium(price, 10, 5, 'PKR');
    if (max != null) { assert.equal(conflict(price, max), null); assert.ok(max > price); }
  }
});
t('Premium % at or below the gap leaves no room: compare-at has to go', () => {
  const c = premiumConflict({ price: 450, compareAt: 460, sellerPct: 5, gap: 5, symbol: 'Rs', currency: 'PKR' });
  assert.ok(c); assert.equal(c.max, null);
});
t('no Premium discount = no conflict', () => assert.equal(premiumConflict({ price: 450, compareAt: 900, sellerPct: 0, gap: 5, symbol: 'Rs' }), null));
t('450 / 400 is invalid', () => assert.equal(validatePrices({ price: '450', compareAt: '400', currency: 'PKR' }).compareAt, 'Compare-at must be higher than price'));
t('450 / 450 is invalid', () => assert.equal(validatePrices({ price: '450', compareAt: '450', currency: 'PKR' }).compareAt, 'Compare-at must be higher than price'));
t('negative price', () => assert.equal(validatePrices({ price: '-5', currency: 'PKR' }).price, "Price can't be negative"));
t('price 0 needs the explicit Free choice', () => {
  assert.equal(validatePrices({ price: '0', currency: 'PKR' }).price, 'Enter a price');
  assert.equal(validatePrices({ price: '0', currency: 'PKR', free: true }).price, undefined);
});
t('empty price', () => assert.equal(validatePrices({ price: '  ' }).price, 'Enter a price'));
t('PKR must be whole rupees', () => {
  assert.match(validatePrices({ price: '450.75', currency: 'PKR' }).price, /whole rupees/);
  assert.match(validatePrices({ price: '450', compareAt: '500.5', currency: 'PKR' }).compareAt, /whole rupees/);
});
t('USD keeps 2 decimals, rejects 3', () => {
  assert.deepEqual(validatePrices({ price: '4.99', compareAt: '9.99', currency: 'USD' }), {});
  assert.match(validatePrices({ price: '4.999', currency: 'USD' }).price, /2 decimals/);
});
t('description: empty / whitespace / short / ok', () => {
  assert.equal(descriptionError(''), 'Add a description');
  assert.equal(descriptionError('     \n  '), 'Add a description');
  assert.match(descriptionError('Too short'), /at least 20 characters/);
  assert.equal(descriptionError('A worksheet pack for class two maths.'), null);
  assert.match(descriptionError(' '.repeat(30) + 'short'), /at least 20 characters/);
});

t('shipping weight: missing, abc, 0, huge, valid', () => {
  assert.equal(weightError('', 'kg'), 'Add shipping weight');
  assert.equal(weightError('abc', 'kg'), 'Shipping weight must be a number');
  assert.equal(weightError('0', 'kg'), 'Minimum weight is 1 g');
  assert.match(weightError('51', 'kg'), /more than 50 kg/);
  assert.match(weightError('60000', 'g'), /more than 50 kg/);
  assert.equal(weightError('0.6', 'kg'), null);
  assert.equal(weightError('600', 'g'), null);
});
t('weight kg/g normalizes to kilograms', () => {
  assert.equal(weightToStored('600', 'g'), '0.6 kg');
  assert.equal(weightToStored('0.25', 'kg'), '0.25 kg');
  assert.equal(parseWeightKg('0.6 kg'), 0.6);
  assert.equal(parseWeightKg('abc'), null);
  assert.deepEqual(weightFromStored('0.25 kg'), { value: '250', unit: 'g' });
  assert.deepEqual(weightFromStored('2 kg'), { value: '2', unit: 'kg' });
});
t('weight: negative, 0.4 g, 1 g, 1 mg-ish, text form', () => {
  assert.equal(weightError('-5', 'kg'), "Shipping weight can't be negative");
  assert.equal(weightError('-0.1', 'g'), "Shipping weight can't be negative");
  assert.equal(weightError('0.4', 'g'), 'Minimum weight is 1 g');
  assert.equal(weightError('1', 'g'), null);
  assert.equal(weightError('0.001', 'kg'), null);
  assert.equal(weightError('0.0004', 'kg'), 'Minimum weight is 1 g');
  assert.equal(weightToStored('1', 'g'), '0.001 kg');
  assert.equal(weightToStored('1.5', 'g'), '0.0015 kg'); // never rounded to a different value
  assert.equal(weightTextError('-5 kg'), "Shipping weight can't be negative");
  assert.equal(weightTextError('0.4 g'), 'Minimum weight is 1 g');
  assert.equal(weightTextError('500g'), null);
  assert.equal(weightTextError('abc'), 'Shipping weight must be a number');
  assert.deepEqual(weightFromStored('500g'), { value: '500', unit: 'g' });
  assert.deepEqual(weightFromStored('0.4 kg'), { value: '400', unit: 'g' });
  assert.deepEqual(weightFromStored(weightToStored('500', 'g')), { value: '500', unit: 'g' }); // save 500 g -> reload shows 500 g
});
t('toggle Free / Unlimited remembers the value', () => {
  let s = { value: '450', saved: '' };
  s = toggleRemember(s, true); assert.deepEqual(s, { value: '', saved: '450' });
  s = toggleRemember(s, false); assert.deepEqual(s, { value: '450', saved: '' });
  s = toggleRemember({ value: '', saved: '' }, true); s = toggleRemember(s, false); assert.deepEqual(s, { value: '', saved: '' });
  s = toggleRemember({ value: '9', saved: '' }, true); s = toggleRemember(s, true); assert.equal(s.saved, '9'); // double on keeps it
});
t('stock: 0 ok (warned elsewhere), negative, 2.5, huge, empty, unlimited', () => {
  assert.equal(stockError('0', false), null);
  assert.equal(stockError('-1', false), "Stock can't be negative");
  assert.equal(stockError('2.5', false), 'Stock must be a whole number');
  assert.match(stockError('100001', false), /more than 100,000/);
  assert.equal(stockError('', false), 'Add the stock quantity');
  assert.equal(stockError('', true), null);
  assert.equal(stockError('-9', true), null);
  assert.equal(stockError('12', false), null);
});
console.log(`\n${n} checks passed`);
