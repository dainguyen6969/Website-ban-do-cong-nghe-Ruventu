import assert from 'node:assert/strict';
import { after, before, beforeEach, afterEach, test } from 'node:test';
import { createServer } from 'vite';

let server, apiRequest, subscribeOrderUpdates, subscribeAdminRealtime, setAdminRealtimeScope;
let sockets, requests, cleanup, now;
const purchaseScope = JSON.stringify([9, 'nhap_hang']);
const settle = () => new Promise((resolve) => setImmediate(resolve));

before(async () => {
  server = await createServer({
    configFile: false,
    cacheDir: 'node_modules/.vite-realtime-test',
    server: { middlewareMode: true, ws: false },
    appType: 'custom',
  });

  ({ subscribeOrderUpdates, subscribeAdminRealtime, setAdminRealtimeScope } =
    await server.ssrLoadModule('/src/features/admin/orders/api/orderRealtime.js'));

  ({ apiRequest } = await server.ssrLoadModule('/src/auth/backendAuth.js'));
});

after(async () => server.close());

beforeEach((t) => {
  sockets = [];
  requests = [];
  now = 0;

  t.mock.method(Date, 'now', () => now);
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ data: { ticket: 'one-use-ticket' } }), { status: 200 });
  });

  const storage = new Map([['accessToken', 'token']]);
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };

  globalThis.window = Object.assign(new EventTarget(), {
    location: { href: 'http://localhost:5173/admin/orders' },
  });

  setAdminRealtimeScope(purchaseScope);

  globalThis.WebSocket = class {
    static OPEN = 1;
    readyState = 0;
    sent = [];

    constructor(url) {
      this.url = url;
      sockets.push(this);
    }
    open() {
      this.readyState = 1;
      this.onopen?.();
    }
    message(data) {
      this.onmessage?.({ data });
    }
    send(data) {
      this.sent.push(data);
    }
    close() {
      if (this.readyState === 3) return;
      this.readyState = 3;
      this.onclose?.();
    }
  };
});

afterEach(() => {
  cleanup?.();
  cleanup = null;
  setAdminRealtimeScope('');
  delete globalThis.WebSocket;
  delete globalThis.localStorage;
  delete globalThis.window;
});

test('auth ticket, valid events, heartbeat and unmount cleanup', async (t) => {
  let updates = 0;
  cleanup = subscribeOrderUpdates(() => updates++);
  await settle();
  assert.equal(requests[0].options.headers.get('Authorization'), 'Bearer token');
  assert.equal(sockets[0].url.protocol, 'ws:');
  assert.equal(sockets[0].url.searchParams.get('ticket'), 'one-use-ticket');
  sockets[0].open();
  for (const data of [
    'bad JSON',
    'null',
    '{"type":"order-changed","orderId":-1}',
    '{"type":"order-changed","orderId":"1"}',
  ])
    sockets[0].message(data);
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

test('drop reconnects and ready resynchronizes missed events', async (t) => {
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

test('unavailable connection retries without throwing; pending ticket is aborted on unmount', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('offline');
  });
  cleanup = subscribeOrderUpdates(() => assert.fail('offline must not update'));
  await settle();
  assert.equal(sockets.length, 0);
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(sockets.length, 0);
  cleanup();
  let pending;
  t.mock.method(
    globalThis,
    'fetch',
    (url, options) =>
      new Promise((resolve) => {
        pending = { options, resolve };
      })
  );
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
  cleanup = subscribeAdminRealtime((event) => notifications.push(event));
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
  } finally {
    stopOrders();
  }
  assert.equal(sockets[0].readyState, 3);
});

test('mount cleanup and immediate remount send one ticket and one read', async () => {
  const aborted = new AbortController();
  const stillMounted = new AbortController();
  const path = '/api/v1/admin/orders?page=0';
  const first = apiRequest(path, { signal: aborted.signal });
  subscribeAdminRealtime(() => {})();
  aborted.abort();

  cleanup = subscribeAdminRealtime(() => {});
  const second = apiRequest(path, { signal: stillMounted.signal });
  await assert.rejects(first, { name: 'AbortError' });
  await second;
  await settle();

  assert.equal(requests.filter((request) => request.url.endsWith('realtime-ticket')).length, 1);
  assert.equal(requests.filter((request) => request.url.endsWith(path)).length, 1);
  assert.equal(sockets.length, 1);
});

test('scope starts one connection and clearing it closes the socket without retry', async (t) => {
  setAdminRealtimeScope('');
  cleanup = subscribeAdminRealtime(() => {});
  await settle();
  assert.equal(requests.length, 0);

  setAdminRealtimeScope(purchaseScope);
  await settle();
  assert.equal(requests.length, 1);
  sockets[0].open();

  setAdminRealtimeScope(purchaseScope);
  await settle();
  assert.equal(requests.length, 1);

  setAdminRealtimeScope('');
  t.mock.timers.tick(60000);
  await settle();
  assert.equal(sockets[0].readyState, 3);
  assert.equal(requests.length, 1);
});

test('ticket denial with a non-JSON 403 stops retries', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return new Response('<html>Forbidden</html>', { status: 403 });
  });

  const events = [];
  cleanup = subscribeAdminRealtime((event) => events.push(event));
  await settle();

  setAdminRealtimeScope(purchaseScope);
  t.mock.timers.tick(60000);
  await settle();
  assert.equal(requests.length, 1);
  assert.deepEqual(events, [{ type: 'access-denied', status: 403 }]);
  assert.equal(sockets.length, 0);
});

test('ticket retries through auth once and stops if the new token also gets 401', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/auth/refresh')) {
      return new Response(JSON.stringify({ data: { access_token: 'new-token' } }));
    }
    return new Response('{}', { status: 401 });
  });

  const events = [];
  cleanup = subscribeAdminRealtime((event) => events.push(event));
  await settle();
  t.mock.timers.tick(60000);
  await settle();

  assert.equal(requests.length, 3);
  assert.ok(requests[1].url.endsWith('/auth/refresh'));
  assert.equal(requests[2].options.headers.get('Authorization'), 'Bearer new-token');
  assert.deepEqual(events, [{ type: 'access-denied', status: 401 }]);
  assert.equal(sockets.length, 0);
});
