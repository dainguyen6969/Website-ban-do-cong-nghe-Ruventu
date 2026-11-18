import assert from 'node:assert/strict';
import test, { after, afterEach, beforeEach } from 'node:test';
import axios from 'axios';
import { createServer } from 'vite';

const original = { storage: globalThis.localStorage, session: globalThis.sessionStorage, window: globalThis.window, fetch: globalThis.fetch, adapter: axios.defaults.adapter };
let tokens, session, transport;
axios.defaults.adapter = config => transport(config);
globalThis.window = new EventTarget();
const vite = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-storefront-requests-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const { productService } = await vite.ssrLoadModule('/src/shared/services/productService.js');
const { categoryService } = await vite.ssrLoadModule('/src/shared/services/categoryService.js');
const { cartService } = await vite.ssrLoadModule('/src/shared/services/cartService.js');
const { orderService } = await vite.ssrLoadModule('/src/shared/services/orderService.js');
const { pcBuilderService } = await vite.ssrLoadModule('/src/shared/services/pcBuilderService.js');
const { clearAuth } = await vite.ssrLoadModule('/src/auth/backendAuth.js');

beforeEach(() => {
  tokens = new Map(); session = new Map();
  const storage = store => ({ getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) });
  globalThis.localStorage = storage(tokens);
  globalThis.sessionStorage = storage(session);
  productService.clearCache(); categoryService.clearCache(); cartService.clearCache();
});
afterEach(() => { globalThis.fetch = original.fetch; });
after(async () => {
  await vite.close();
  axios.defaults.adapter = original.adapter;
  Object.assign(globalThis, { localStorage: original.storage, sessionStorage: original.session, window: original.window, fetch: original.fetch });
});

test('home -> detail -> filtered list -> home -> detail reuses public reads, including after reload', async t => {
  const calls = [];
  transport = async config => {
    calls.push(config);
    const data = config.url.endsWith('/catalog/options') ? { danhMuc: [], thuongHieu: [] }
      : config.url.endsWith('/products') ? { tongSoTrang: 3, danhSachSanPham: [{ id: 700 + config.params.page, tenSanPham: 'PC' }] }
      : { id: 700, tenSanPham: 'PC', danhSachPhienBan: [] };
    return { data: { data }, status: 200, headers: {}, config };
  };
  const home = await Promise.all([productService.getAllProducts(), categoryService.getOptions(), productService.getAllProducts({ keyword: '', sort: 'moi_nhat' })]);
  assert.deepEqual(home[0], home[2]);
  await productService.getProductDetail(700);
  await productService.getAllProducts({ keyword: 'PC' });
  const warmedCount = calls.length;
  assert.deepEqual(await productService.getAllProducts(), home[0]);
  await productService.getProductDetail('700');
  await categoryService.getOptions();
  assert.equal(calls.length, warmedCount);
  assert.equal(calls.filter(c => c.url.endsWith('/products/700')).length, 1);
  assert.equal(calls.filter(c => c.url.endsWith('/catalog/options')).length, 1);
  vite.moduleGraph.invalidateAll();
  const reloaded = (await vite.ssrLoadModule('/src/shared/services/productService.js')).productService;
  assert.deepEqual(await reloaded.getAllProducts(), JSON.parse(JSON.stringify(home[0])));
  assert.equal((await reloaded.getProductDetail(700)).data.id, 700);
  assert.equal(calls.length, warmedCount);
  assert([...session.keys()].every(key => !key.includes('accessToken')));
});

test('header, drawer and purchase sidebar share cart reads; mutations, expiry and auth changes refresh them', async t => {
  let now = Date.now(), gets = 0;
  t.mock.method(Date, 'now', () => now);
  transport = async config => {
    if (config.method === 'get') gets++;
    return { data: { data: { items: [], tongSoLuong: gets } }, status: 200, headers: {}, config };
  };
  const first = await Promise.all(Array.from({ length: 3 }, () => cartService.getCurrentCart()));
  assert.equal(gets, 1);
  assert.equal(first[0], first[1]);
  await cartService.getCurrentCart();
  assert.equal(gets, 1);
  await cartService.addItem(9, 1);
  await Promise.all([cartService.getCurrentCart(), cartService.getCurrentCart()]);
  assert.equal(gets, 2);
  now += 30 * 1000;
  await cartService.getCurrentCart();
  assert.equal(gets, 3);
  let authGets = 0;
  globalThis.fetch = async () => { authGets++; return Response.json({ data: { items: [], tongSoLuong: 20 } }); };
  tokens.set('accessToken', 'customer-a');
  assert.equal((await cartService.getCurrentCart()).data.data.tongSoLuong, 20);
  await cartService.getCurrentCart();
  assert.equal(authGets, 1);
  tokens.set('accessToken', 'customer-b');
  await cartService.getCurrentCart();
  assert.equal(authGets, 2);
  clearAuth();
  await cartService.getCurrentCart();
  assert.equal(gets, 4);
  assert.equal(session.size, 0, 'private cart data must not be persisted');
});

test('order reads cache per account and invalidate after mutations; cart and orders share a single auth refresh', async t => {
  tokens.set('accessToken', 'expired');
  let orderGets = 0, refreshes = 0, finishRefresh;
  transport = async config => {
    if (config.headers.Authorization === 'Bearer expired') {
      throw Object.assign(new Error('expired'), { config, response: { status: 401, data: {} } });
    }
    if (config.method === 'get') orderGets++;
    return { data: { data: { id: 10, items: [], pagination: {} } }, status: 200, headers: {}, config };
  };
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise(resolve => { finishRefresh = resolve; });
      return Response.json({ data: { access_token: 'renewed' } });
    }
    return options.headers.get('Authorization') === 'Bearer expired'
      ? Response.json({}, { status: 401 }) : Response.json({ data: { items: [] } });
  };
  const reads = Promise.all([orderService.getOrder(10), cartService.getCurrentCart()]);
  while (!finishRefresh) await new Promise(resolve => setImmediate(resolve));
  finishRefresh();
  await reads;
  assert.equal(refreshes, 1);
  // The token changed during refresh; warm the new session once.
  await orderService.getOrder(10);
  const warmed = orderGets;
  await orderService.getOrder(10);
  assert.equal(orderGets, warmed);
  await orderService.cancelOrder(10, 'test', 'same-key');
  await orderService.getOrder(10);
  assert.equal(orderGets, warmed + 1);
  tokens.set('accessToken', 'different-customer');
  await orderService.getOrder(10);
  assert.equal(orderGets, warmed + 2);
  assert.equal(session.size, 0, 'private orders must not be persisted');
});

test('Build PC reuses option/product reads while one cancelled consumer cannot cancel another', async t => {
  let complete, gets = 0;
  transport = config => {
    gets++;
    return new Promise(resolve => { complete = () => resolve({ data: { data: { items: [] } }, status: 200, config, headers: {} }); });
  };
  const controller = new AbortController();
  const first = pcBuilderService.products({ ma_hang_muc: 'CPU' }, controller.signal);
  const second = pcBuilderService.products({ ma_hang_muc: 'CPU' });
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  complete();
  await second;
  await pcBuilderService.products({ ma_hang_muc: 'CPU' });
  assert.equal(gets, 1);
});
