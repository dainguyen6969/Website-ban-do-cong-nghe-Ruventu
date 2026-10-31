import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { createServer } from 'vite';

let server, getAvailableSerials, originalStorage;
before(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-serial-options-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
  ({ getAvailableSerials } = await server.ssrLoadModule('/src/features/admin/inventory/api/serialApi.js'));
});
after(() => server.close());
beforeEach(() => {
  originalStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => 'token' };
});
afterEach(() => { globalThis.localStorage = originalStorage; });

test('scrolling options include serials beyond the first backend page and retain filters', async t => {
  const calls = [];
  const signal = new AbortController().signal;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const params = new URL(url, 'http://localhost').searchParams;
    calls.push({ params, signal: options.signal });
    const page = Number(params.get('page'));
    const items = Array.from({ length: page === 0 ? 100 : 1 }, (_, index) => ({ id: page * 100 + index + 1, so_serial: `SN-${page * 100 + index + 1}` }));
    return new Response(JSON.stringify({ data: { items, pagination: { total_elements: 101, total_pages: 2 } } }));
  });
  const result = await getAvailableSerials(418, ' SN ', signal);
  assert.equal(result.items.length, 101);
  assert.equal(result.items.at(-1).serial, 'SN-101');
  assert.equal(result.totalItems, 101);
  assert.deepEqual(calls.map(call => call.params.get('page')), ['0', '1']);
  for (const call of calls) {
    assert.equal(call.params.get('phien_ban_id'), '418');
    assert.equal(call.params.get('trang_thai'), 'TRONG_KHO');
    assert.equal(call.params.get('so_serial'), 'SN');
    assert.equal(call.params.get('limit'), '100');
    assert.equal(call.signal, signal);
  }
});

test('empty results stop after one request and failed later pages do not return an incomplete list', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ data: { items: [], pagination: { total_elements: 0, total_pages: 0 } } }));
  });
  assert.deepEqual(await getAvailableSerials(418, ''), { items: [], totalItems: 0 });
  assert.equal(requests, 1);
  t.mock.method(globalThis, 'fetch', async url => new URL(url, 'http://localhost').searchParams.get('page') === '0'
    ? new Response(JSON.stringify({ data: { items: [{ id: 1, so_serial: 'SN-1' }], pagination: { total_elements: 101, total_pages: 2 } } }))
    : new Response(JSON.stringify({ message: 'Không thể tải serial' }), { status: 500 }));
  await assert.rejects(getAvailableSerials(418, ''), /Không thể tải serial/);
});
