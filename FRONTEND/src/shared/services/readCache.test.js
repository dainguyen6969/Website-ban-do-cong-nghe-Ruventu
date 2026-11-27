import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createReadCache, queryKey } from './readCache.js';

const originalStorage = globalThis.sessionStorage;
afterEach(() => { globalThis.sessionStorage = originalStorage; });

test('query keys ignore empty parameters and parameter order, retaining false and zero', () => {
  assert.equal(queryKey({ keyword: '', sort: 'moi_nhat', page: 0, stock: false }), queryKey({ stock: false, page: 0, sort: 'moi_nhat' }));
  assert.notEqual(queryKey({ page: 0 }), queryKey({ page: 1 }));
});

test('concurrent and completed reads share results per key, expire and retry errors', async t => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const cache = createReadCache({ ttl: 100 });
  let complete, calls = 0;
  const load = () => { calls++; return new Promise(resolve => { complete = resolve; }); };
  const first = cache.load('home', load);
  assert.equal(first, cache.load('home', load));
  complete(['home']);
  await first;
  await cache.load('category', async () => ['category']);
  assert.deepEqual(await cache.load('home', load), ['home']);
  assert.equal(calls, 1);
  now += 100;
  assert.equal(cache.peek('home'), null);
  await assert.rejects(cache.load('home', async () => { throw new Error('offline'); }), /offline/);
  assert.deepEqual(await cache.load('home', async () => ['fresh']), ['fresh']);
  assert.deepEqual(await cache.load('home', async () => ['forced'], { force: true }), ['forced']);
});

test('public snapshots survive reload, stay bounded and memory works without storage', async () => {
  const store = new Map();
  globalThis.sessionStorage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  const options = { ttl: 1000, storageKey: 'public', limit: 2 };
  const cache = createReadCache(options);
  for (const key of ['one', 'two', 'three']) await cache.load(key, async () => [key]);
  const reloaded = createReadCache(options);
  assert.equal(reloaded.peek('one'), null);
  assert.deepEqual(reloaded.peek('two'), ['two']);
  assert.deepEqual(reloaded.peek('three'), ['three']);
  store.set('public', 'invalid JSON');
  assert.equal(createReadCache(options).peek('three'), null);
  store.set('public', JSON.stringify([['three', { expiresAt: Date.now() + 1000, data: 'wrong shape' }]]));
  assert.equal(createReadCache({ ...options, validate: Array.isArray }).peek('three'), null);
  sessionStorage.getItem = sessionStorage.setItem = () => { throw new Error('blocked'); };
  const disabled = createReadCache(options);
  await disabled.load('home', async () => ['home']);
  assert.deepEqual(disabled.peek('home'), ['home']);
});

test('invalidation prevents old reads from restoring stale data or removing a newer request', async () => {
  const cache = createReadCache({ ttl: 1000 });
  let finishOld, finishNew;
  const old = cache.load('cart', () => new Promise(resolve => { finishOld = resolve; }));
  cache.clear();
  const current = cache.load('cart', () => new Promise(resolve => { finishNew = resolve; }));
  finishOld('old');
  await old;
  assert.equal(cache.peek('cart'), null);
  assert.equal(current, cache.load('cart', () => assert.fail('duplicate')));
  finishNew('new');
  await current;
  assert.equal(cache.peek('cart'), 'new');
});

test('aborting one page does not cancel another consumer or reuse aborted state', async () => {
  const cache = createReadCache({ ttl: 1000 });
  const controller = new AbortController();
  let complete;
  const first = cache.load('detail', () => new Promise(resolve => { complete = resolve; }), { signal: controller.signal });
  const second = cache.load('detail', () => assert.fail('duplicate'));
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  complete('detail');
  assert.equal(await second, 'detail');
  await assert.rejects(cache.load('detail', () => assert.fail('aborted'), { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(cache.peek('detail'), 'detail');
});
