import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-admin-product-api-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const api = await vite.ssrLoadModule('/src/features/admin/catalog/products/api/productApi.js');
after(() => vite.close());

test('admin detail excludes provenance and preserves real technical values without mutating source data', async t => {
  const source = [{ ten: 'Model tham khảo', url: 'https://example.com/product' }];
  const item = { id: 580, thong_so_ky_thuat: { nguon_du_lieu: source } };
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => 'test-token' };
  t.after(() => {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ data: item }), { status: 200 }));
  assert.deepEqual((await api.getProductDetail(580)).specs, []);
  item.thong_so_ky_thuat = { nguon_du_lieu: source, cong_suat: '650 W', LED: false, 'Cổng USB': 0 };
  const detail = await api.getProductDetail(580);
  assert.deepEqual(JSON.parse(JSON.stringify(detail.specs)), [
    { id: 1, name: 'Công suất', value: '650 W' },
    { id: 2, name: 'LED', value: 'Không' },
    { id: 3, name: 'Cổng USB', value: '0' },
  ]);
  assert.equal(item.thong_so_ky_thuat.nguon_du_lieu, source);
});
