import assert from 'node:assert/strict';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { createServer } from 'vite';

let server, subscribeOrderUpdates, subscribeAdminRealtime, sockets, requests, cleanup, now;
const settle = () => new Promise(resolve => setImmediate(resolve));

before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-realtime-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ subscribeOrderUpdates, subscribeAdminRealtime } = await server.ssrLoadModule('/src/features/admin/orders/api/orderRealtime.js'));
});
after(async () => server.close());
beforeEach(t => {
  sockets = [];
  requests = [];
  now = 0;
  t.mock.method(Date, 'now', () => now);
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ data: { ticket: 'one-use-ticket' } }), { status: 200 });
  });
  globalThis.localStorage = { getItem: () => 'token' };
  globalThis.window = { location: { href: 'http://localhost:5173/admin/orders' } };
  globalThis.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    constructor(url) { this.url = url; sockets.push(this); }
    open() { this.readyState = 1; this.onopen?.(); }
    message(data) { this.onmessage?.({ data }); }
    send(data) { this.sent.push(data); }
    close() { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.(); }
  };
});
afterEach(() => {
  cleanup?.();
  cleanup = null;
  delete globalThis.WebSocket;
  delete globalThis.localStorage;
  delete globalThis.window;
});

test('auth ticket, valid events, heartbeat and unmount cleanup', async t => {
  let updates = 0;
  cleanup = subscribeOrderUpdates(() => updates++);
  await settle();
  assert.equal(requests[0].options.headers.get('Authorization'), 'Bearer token');
  assert.equal(sockets[0].url.protocol, 'ws:');
  assert.equal(sockets[0].url.searchParams.get('ticket'), 'one-use-ticket');
  sockets[0].open();
  for (const data of ['bad JSON', 'null', '{"type":"order-changed","orderId":-1}', '{"type":"order-changed","orderId":"1"}']) sockets[0].message(data);
  assert.equal(updates, 0);
  sockets[0].message('{"type":"ready"}');
  sockets[0].message('{"type":"order-changed","orderId":1}');
  assert.equal(updates, 2);
  t.mock.timers.tick(15000);
  assert.deepEqual(sockets[0].sent, ['ping']);
  cleanup();
  t.mock.timers.tick(60000);
  await settle();
  assert.equal(sockets[0].readyState, 3);
  assert.equal(requests.length, 1);
});

test('drop reconnects and ready resynchronizes missed events', async t => {
  let updates = 0;
  cleanup = subscribeOrderUpdates(() => updates++);
  await settle();
  sockets[0].open();
  sockets[0].message('{"type":"ready"}');
  sockets[0].close();
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(sockets.length, 2);
  sockets[1].open();
  sockets[1].message('{"type":"ready"}');
  assert.equal(updates, 2);
  now += 60000;
  t.mock.timers.tick(60000);
  assert.equal(sockets[1].readyState, 3);
});

test('unavailable connection retries without throwing; pending ticket is aborted on unmount', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
  cleanup = subscribeOrderUpdates(() => assert.fail('offline must not update'));
  await settle();
  assert.equal(sockets.length, 0);
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(sockets.length, 0);
  cleanup();
  let pending;
  t.mock.method(globalThis, 'fetch', (url, options) => new Promise(resolve => { pending = { options, resolve }; }));
  cleanup = subscribeOrderUpdates(() => assert.fail('unmounted must not update'));
  await settle();
  cleanup();
  assert.equal(pending.options.signal.aborted, true);
  pending.resolve(new Response(JSON.stringify({ data: { ticket: 'late' } })));
  await settle();
  assert.equal(sockets.length, 0);
});

test('bell and order list share one connection, filter events and release independently', async () => {
  let updates = 0;
  const notifications = [];
  cleanup = subscribeAdminRealtime(event => notifications.push(event));
  const stopOrders = subscribeOrderUpdates(() => updates++);
  try {
    await settle();
    assert.equal(requests.length, 1);
    assert.equal(sockets.length, 1);
    sockets[0].open();
    sockets[0].message('{"type":"ready"}');
    sockets[0].message('{"type":"admin-notification","notification":{"category":"RECEIPT"}}');
    assert.equal(updates, 1);
    assert.equal(notifications[1].notification.category, 'RECEIPT');
    cleanup();
    assert.equal(sockets[0].readyState, 1);
    sockets[0].message('{"type":"order-changed","orderId":7}');
    assert.equal(updates, 2);
  } finally { stopOrders(); }
  assert.equal(sockets[0].readyState, 3);
});
