// Run: npm run test:rules
import assert from 'node:assert/strict';
import { runBulk, bulkSummary, isStopError } from '../src/utils/bulkRun.ts';

let n = 0;
const t = async (name, fn) => { await fn(); n += 1; console.log('ok  ', name); };
const err = (status, code, message) => Object.assign(new Error(message ?? 'x'), { response: { status, data: { code, message } } });

await t('every item gets its own call, in order, and failures do not block the rest', async () => {
  const calls = [];
  const r = await runBulk(['a', 'b', 'c'], async (x) => { calls.push(x); if (x === 'b') throw err(400, undefined, 'Already approved'); return { success: true }; });
  assert.deepEqual(calls, ['a', 'b', 'c']);
  assert.deepEqual(r.ok, ['a', 'c']);
  assert.deepEqual(r.failed, [{ item: 'b', message: 'Already approved' }]);
  assert.equal(r.stopped, null);
});

await t('a server approval request (staff two-person rule) is "waiting", not done', async () => {
  const r = await runBulk(['a', 'b'], async (x) => (x === 'a' ? { approvalRequired: true, requestId: '1' } : { success: true }));
  assert.deepEqual(r.waiting, ['a']);
  assert.deepEqual(r.ok, ['b']);
});

await t('cancelled password prompt stops the run and reports what was not attempted', async () => {
  let calls = 0;
  const r = await runBulk(['a', 'b', 'c', 'd'], async (x) => { calls++; if (x === 'b') throw err(403, 'REAUTH_REQUIRED'); return {}; });
  assert.equal(calls, 2);
  assert.deepEqual(r.ok, ['a']);
  assert.deepEqual(r.skipped, ['b', 'c', 'd']);
  assert.match(r.stopped, /Password/);
});

await t('missing staff rights stops after the first refusal', async () => {
  let calls = 0;
  const r = await runBulk([1, 2, 3], async () => { calls++; throw err(403, 'STAFF_FORBIDDEN', 'Your role does not include this action.'); });
  assert.equal(calls, 1);
  assert.equal(r.skipped.length, 3);
  assert.equal(isStopError(err(500)), null);
});

await t('summary names counts, waiting, failures and a stop', async () => {
  const r = await runBulk(['a', 'b'], async (x) => { if (x === 'b') throw err(400, undefined, 'nope'); return {}; });
  assert.equal(bulkSummary(r, (x) => x), '1 done, 1 failed (b: nope).');
});

console.log(`\n${n} bulk-run checks passed`);
