// Run: npm run test:rules  (Node 22.6+/24 strips the TypeScript types itself; no test runner needed)
import assert from 'node:assert/strict';
import { soldLabel, dedupeInOrder, paymentTrust, paymentTrustSub, railSize, whatsappLink, GRADE_TILES, learnLevelPath } from '../src/features/buyer/components/home/homeRules.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };
const P = (...ids) => ids.map(_id => ({ _id }));

t('"X sold" only from 10 sales', () => {
  assert.equal(soldLabel(0), null);
  assert.equal(soldLabel(9), null);
  assert.equal(soldLabel(10), '10 sold');
  assert.equal(soldLabel(1234), '1234 sold');
  assert.equal(soldLabel(undefined), null);
  assert.equal(soldLabel(NaN), null);
});

t('rails show 8, 4 or all - never 5', () => {
  assert.deepEqual([0, 1, 3, 4, 5, 7, 8, 12].map(railSize), [0, 1, 3, 4, 4, 4, 8, 8]);
});

t('payment trust line names exactly the enabled methods', () => {
  assert.equal(paymentTrustSub([]), 'Pay securely through Edudeen');
  assert.equal(paymentTrustSub(['cod']), 'COD');
  assert.equal(paymentTrustSub(['cod', 'bank']), 'COD & bank transfer');
  assert.equal(paymentTrustSub(['cod', 'card', 'bank']), 'COD, Cards & bank transfer');
});

t('a product shows in only one home section, in render order', () => {
  const out = dedupeInOrder(['flash', 'best', 'free'], { flash: P('a', 'b'), best: P('b', 'c', 'd'), free: P('a', 'd', 'e') });
  assert.deepEqual(out.flash.map(p => p._id), ['a', 'b']);
  assert.deepEqual(out.best.map(p => p._id), ['c', 'd']);
  assert.deepEqual(out.free.map(p => p._id), ['e']);
});

t('cap is applied after removing duplicates (no holes) and seed ids are skipped', () => {
  const out = dedupeInOrder(['a', 'b'], { a: P('1', '2', '3'), b: P('1', '4', '5', '6') }, { a: 2, b: 2 }, ['2']);
  assert.deepEqual(out.a.map(p => p._id), ['1', '3']);
  assert.deepEqual(out.b.map(p => p._id), ['4', '5']);
});

t('missing lists and empty ids are tolerated', () => {
  const out = dedupeInOrder(['a', 'b'], { b: [{ _id: '' }, { _id: 'x' }] });
  assert.deepEqual(out.a, []);
  assert.deepEqual(out.b.map(p => p._id), ['x']);
});

t('payment trust lists only really enabled methods', () => {
  assert.deepEqual(paymentTrust(undefined, false, true), []);
  assert.deepEqual(paymentTrust({ card: true }, false, false), []); // Stripe key missing on the web build
  assert.deepEqual(paymentTrust({ card: true, bankTransfer: true, jazzcash: true }, true, true), ['cod', 'jazzcash', 'card', 'bank']);
  assert.deepEqual(paymentTrust({ easypaisa: true }, false, false), ['easypaisa']);
});

t('whatsapp link: digits only, leading 0 = Pakistan, junk = no link', () => {
  assert.equal(whatsappLink('+92 300-1234567'), 'https://wa.me/923001234567');
  assert.equal(whatsappLink('0300 1234567'), 'https://wa.me/923001234567');
  assert.equal(whatsappLink('0092 300 1234567'), 'https://wa.me/923001234567');
  assert.equal(whatsappLink('abc'), '');
  assert.equal(whatsappLink(''), '');
  assert.equal(whatsappLink(undefined), '');
});

t('grade tiles cover Nursery..Class 9-10 and Teachers, learn paths use dashes', () => {
  assert.deepEqual(GRADE_TILES.map(g => g.label), ['Nursery', 'KG', 'Class 1-5', 'Class 6-8', 'Class 9-10', 'Teachers']);
  assert.equal(learnLevelPath('primary_school'), '/learn/primary-school');
});

console.log(`\n${n} home rule checks passed`);
