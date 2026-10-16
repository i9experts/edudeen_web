// Plain node check (run: node src/utils/countdown.spec.mjs) - mirrors the formatter rules in countdown.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src = readFileSync(new URL('./countdown.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: 'ES2022', target: 'ES2022' } }).outputText;
const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const H = 3_600_000, M = 60_000, S = 1000;

assert.equal(mod.formatCountdown(15 * 24 * H + 12 * H + 3 * M + 9 * S), '15d 12h 03m');
assert.equal(mod.formatCountdown(372 * H + 56 * M), '15d 12h 56m');
assert.equal(mod.formatCountdown(24 * H), '1d 0h 00m');
assert.equal(mod.formatCountdown(23 * H + 59 * M + 59 * S), '23:59:59');
assert.equal(mod.formatCountdown(5 * M + 7 * S), '00:05:07');
assert.equal(mod.formatCountdown(0), '');
assert.equal(mod.timeLeftText(new Date(Date.now() - 1000).toISOString()), 'ending now');
console.log('countdown ok');
