import assert from 'node:assert/strict';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

let server, getSystemStatus, getCachedSystemStatus, saveTypography, saveMaintenance, ttl, token, account, now, requests, storage;
const status = { maintenance: false, canManage: false, fontFamily: 'Inter', fontSize: 14 };

before(async () => {
  server = await createServer({ cacheDir: 'node_modules/.vite-settings-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ getSystemStatus, getCachedSystemStatus, saveTypography, saveMaintenance, SYSTEM_STATUS_TTL_MS: ttl } = await server.ssrLoadModule('/src/settings/settingsApi.js'));
});
after(() => server.close());
beforeEach((t) => {
  token = '';
  account = null;
  now = Date.now();
  requests = [];
  t.mock.method(Date, 'now', () => now);
  globalThis.localStorage = { getItem: key => key === 'accessToken' ? token : key === 'user' ? JSON.stringify(account) : null };
  storage = new Map();
  globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  globalThis.window = new EventTarget();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ data: status }));
  });
});
afterEach(() => { delete globalThis.localStorage; delete globalThis.sessionStorage; delete globalThis.window; });

test('concurrent consumers and forced refreshes share one request; navigation/focus reuse cached status', async () => {
  const first = getSystemStatus({ force: true });
  assert.equal(getSystemStatus(), first);
  assert.equal(getSystemStatus({ force: true }), first);
  assert.deepEqual(await first, status);
  for (let i = 0; i < 20; i++) await getSystemStatus();
  assert.equal(requests.length, 1);
  now += ttl - 1;
  await getSystemStatus();
  assert.equal(requests.length, 1);
  now += 1;
  await getSystemStatus();
  assert.equal(requests.length, 2);
});

test('a settings change refreshes immediately without waiting for cache expiry', async () => {
  await getSystemStatus({ force: true });
  await getSystemStatus({ force: true });
  assert.equal(requests.length, 2);
});

test('login, account changes and logout do not reuse another session status', async () => {
  await getSystemStatus({ force: true });
  token = 'admin-token';
  await getSystemStatus();
  assert.equal(requests[1].options.headers.get('Authorization'), 'Bearer admin-token');
  token = 'customer-token';
  await getSystemStatus();
  assert.equal(requests[2].options.headers.get('Authorization'), 'Bearer customer-token');
  token = '';
  await getSystemStatus();
  assert.equal(requests.length, 4);
  assert.equal(requests[3].options.headers, undefined);
});

test('network failures have a cooldown; manual retry and later recovery still work', async (t) => {
  let count = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    count++;
    if (count === 1) throw new Error('offline');
    return new Response(JSON.stringify({ data: status }));
  });
  await assert.rejects(getSystemStatus({ force: true }), /offline/);
  await assert.rejects(getSystemStatus(), /offline/);
  assert.equal(count, 1);
  now += 30000;
  assert.deepEqual(await getSystemStatus(), status);
  assert.equal(count, 2);
  assert.deepEqual(await getSystemStatus({ force: true }), status);
  assert.equal(count, 3);
});

test('a module reload renders the warm system gate immediately and still validates live status', async t => {
  await getSystemStatus({ force: true });
  server.moduleGraph.invalidateAll();
  const reloaded = await server.ssrLoadModule('/src/settings/settingsApi.js');
  assert.deepEqual(reloaded.getCachedSystemStatus(), status);
  const Gate = (await server.ssrLoadModule('/src/settings/SystemAccessGate.jsx')).default;
  const AuthContext = (await server.ssrLoadModule('/src/auth/mockAuthContext.js')).default;
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(AuthContext.Provider, { value: { currentAccount: null } },
      React.createElement(Gate, null, React.createElement('p', null, 'Warm storefront')))));
  assert.match(markup, /Warm storefront/);
  assert.doesNotMatch(markup, /Đang kiểm tra hệ thống/);
  let resolve;
  t.mock.method(globalThis, 'fetch', () => new Promise(done => { resolve = done; }));
  const fresh = reloaded.getSystemStatus({ force: true });
  assert.deepEqual(reloaded.getCachedSystemStatus(), status);
  const updated = { ...status, maintenance: true };
  resolve(new Response(JSON.stringify({ data: updated })));
  assert.deepEqual(await fresh, updated);
  assert.deepEqual(reloaded.getCachedSystemStatus(), updated);
});

test('snapshots expire and reject corrupt, invalid or excessively long-lived data', async () => {
  await getSystemStatus({ force: true });
  const key = [...storage.keys()][0];
  const cached = storage.get(key);
  now += ttl;
  assert.equal(getCachedSystemStatus(), null);
  now -= ttl;
  for (const value of ['broken JSON', JSON.stringify({ ...JSON.parse(cached), expiresAt: now + ttl + 1 }),
    JSON.stringify({ ...JSON.parse(cached), status: { ...status, fontSize: 0 } }),
    JSON.stringify({ ...JSON.parse(cached), status: { ...status, canManage: true } })]) {
    storage.set(key, value);
    assert.equal(getCachedSystemStatus(), null);
  }
});

test('warm snapshots are scoped to account and role without persisting bearer credentials', async () => {
  token = 'private-bearer-token';
  account = { id: 1, role: 'admin', vaiTro: 'ADMIN' };
  await getSystemStatus({ force: true });
  assert.deepEqual(getCachedSystemStatus(), status);
  assert.equal([...storage.values()].join('').includes(token), false);
  account = { ...account, id: 2 };
  assert.equal(getCachedSystemStatus(), null);
  account = { ...account, id: 1, vaiTro: 'EMPLOYEE' };
  assert.equal(getCachedSystemStatus(), null);
  token = '';
  assert.equal(getCachedSystemStatus(), null);
});

test('explicit maintenance errors discard the warm open snapshot and preserve the public error code', async t => {
  await getSystemStatus({ force: true });
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ errors: [{ code: 'SYSTEM_MAINTENANCE' }] }), { status: 503 }));
  await assert.rejects(getSystemStatus({ force: true }), error => error.status === 503 && error.data.errors[0].code === 'SYSTEM_MAINTENANCE');
  assert.equal(getCachedSystemStatus(), null);
  await assert.rejects(getSystemStatus(), error => error.status === 503);
  assert.equal(fetch.mock.calls.length, 1);
});

test('saving maintenance or typography invalidates the snapshot and older in-flight results', async t => {
  token = 'admin-token';
  account = { id: 1, role: 'admin', vaiTro: 'ADMIN' };
  await getSystemStatus({ force: true });
  let resolveStatus;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (options?.method === 'PUT') return new Response(JSON.stringify({ data: { ...status, fontSize: 16 } }));
    return new Promise(resolve => { resolveStatus = resolve; });
  });
  const stale = getSystemStatus({ force: true });
  await saveTypography({ fontFamily: 'Inter', fontSize: 16 });
  assert.equal(getCachedSystemStatus(), null);
  resolveStatus(new Response(JSON.stringify({ data: status })));
  await stale;
  assert.equal(getCachedSystemStatus(), null);
  await saveMaintenance(true);
  assert.equal(getCachedSystemStatus(), null);
});

test('disabled browser storage does not fail live status requests', async () => {
  sessionStorage.getItem = () => { throw new Error('disabled'); };
  sessionStorage.setItem = () => { throw new Error('disabled'); };
  assert.equal(getCachedSystemStatus(), null);
  assert.deepEqual(await getSystemStatus({ force: true }), status);
});
