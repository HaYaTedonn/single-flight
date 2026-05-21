import { test } from 'node:test';
import assert from 'node:assert/strict';
import { singleFlight } from '../index.js';

const defer = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

test('concurrent calls with same key run the underlying fn once', async () => {
  let calls = 0;
  const fn = singleFlight(async (id) => { calls++; return defer(20, `v:${id}`); });
  const [a, b, c] = await Promise.all([fn(1), fn(1), fn(1)]);
  assert.equal(calls, 1);
  assert.equal(a, 'v:1');
  assert.equal(b, 'v:1');
  assert.equal(c, 'v:1');
});

test('different keys run separately', async () => {
  let calls = 0;
  const fn = singleFlight(async (id) => { calls++; return defer(10, id); });
  await Promise.all([fn(1), fn(2), fn(2)]);
  assert.equal(calls, 2);
});

test('after settling, a new call runs again', async () => {
  let calls = 0;
  const fn = singleFlight(async () => { calls++; return defer(5, 'x'); });
  await fn();
  await fn();
  assert.equal(calls, 2);
});

test('cacheMs returns cached value without re-calling', async () => {
  let calls = 0;
  const fn = singleFlight(async () => { calls++; return calls; }, { cacheMs: 1000 });
  const a = await fn();
  const b = await fn();
  assert.equal(a, 1);
  assert.equal(b, 1); // cached
  assert.equal(calls, 1);
});

test('rejections are not cached and clear in-flight', async () => {
  let calls = 0;
  const fn = singleFlight(async () => { calls++; await defer(5); throw new Error('boom'); }, { cacheMs: 1000 });
  await assert.rejects(Promise.all([fn(), fn()])); // both share one in-flight
  assert.equal(calls, 1);
  await assert.rejects(fn()); // retried
  assert.equal(calls, 2);
});

test('inflight count and clear()', async () => {
  const fn = singleFlight(async (id) => defer(30, id));
  const p = Promise.all([fn(1), fn(2)]);
  assert.equal(fn.inflight, 2);
  fn.clear();
  assert.equal(fn.inflight, 0);
  await p;
});

test('custom key function', async () => {
  let calls = 0;
  const fn = singleFlight(async (obj) => { calls++; return defer(10, obj.id); }, { key: (o) => String(o.id) });
  await Promise.all([fn({ id: 1, t: 'a' }), fn({ id: 1, t: 'b' })]);
  assert.equal(calls, 1);
});
