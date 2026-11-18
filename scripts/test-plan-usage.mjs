// Run: npm run test:rules
import assert from 'node:assert/strict';
import { promotionLimit, promotionUsageText, isAiBullet } from '../src/features/seller/store/Dashboard/Manage/planUsage.ts';

let n = 0;
const t = (name, fn) => { fn(); n += 1; console.log('ok  ', name); };

t('promotion limit from entitlements is kept', () => { assert.equal(promotionLimit(5), 5); assert.equal(promotionUsageText(2, 5), '2 / 5'); });
t('missing limit reads Unlimited, never undefined', () => {
  for (const bad of [undefined, null, NaN, 'x']) {
    assert.equal(promotionLimit(bad), -1);
    assert.equal(promotionUsageText(0, bad), '0 · Unlimited');
  }
  assert.ok(!promotionUsageText(undefined, undefined).includes('undefined'));
});
t('-1 is Unlimited and 0 is a real zero', () => { assert.equal(promotionUsageText(3, -1), '3 · Unlimited'); assert.equal(promotionUsageText(0, 0), '0 / 0'); });
t('AI bullet detection', () => { assert.ok(isAiBullet('100 AI credits / month')); assert.ok(!isAiBullet('Email campaigns')); assert.ok(!isAiBullet('Maintain')); });
console.log(`${n} passed`);
