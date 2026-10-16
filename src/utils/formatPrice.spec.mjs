// Plain node check: node src/utils/formatPrice.spec.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const load = async (f) => { const js = ts.transpileModule(readFileSync(new URL(f, import.meta.url), 'utf8'), { compilerOptions: { module: 'ES2022', target: 'ES2022' } }).outputText; return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64')); };
const fp = await load('./formatPrice.ts');
assert.equal(fp.formatPrice(1440, 'PKR'), 'Rs 1,440');
assert.equal(fp.formatPrice(1440.6, 'PKR'), 'Rs 1,441');
assert.equal(fp.formatPrice(12.5, 'USD'), '$12.50');
assert.equal(fp.formatPrice(1234.5, 'USD'), '$1,234.50');
assert.match(fp.formatPrice(1440, 'PKR', 'ur-PK'), /^Rs [0-9,\u066c]+$/); // Latin digits even in Urdu mode
assert.equal(fp.formatPrice(null, 'USD'), '—');
assert.equal(fp.formatPriceCompact(8000, 'PKR'), 'Rs 8K');
const sm = await load('./saleMath.ts');
assert.equal(sm.variantSalePct({ price: 80, compareAtPrice: 100 }), 20);
assert.equal(sm.variantSalePct({ price: 100, campaignPrice: 60 }), 40);
assert.equal(sm.variantSalePct({ price: 100 }), 0);
assert.equal(sm.maxSalePct([{ pct: 10 }, { pct: 35 }, { pct: 20 }]), 35);
assert.equal(sm.upToLabel(0), null);
assert.equal(sm.upToLabel(35), 'Up to 35% off');
console.log('formatPrice + saleMath ok');
