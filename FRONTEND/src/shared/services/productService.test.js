import assert from 'node:assert/strict';
import test, { after, beforeEach } from 'node:test';
import { createServer } from 'vite';
import axios from 'axios';

const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-public-products-test', server: { middlewareMode: true }, appType: 'custom' });
const { productService, toProductCard, toProductDetail } = await server.ssrLoadModule('/src/shared/services/productService.js');
const { categoryService } = await server.ssrLoadModule('/src/shared/services/categoryService.js');
after(() => server.close());
beforeEach(() => { productService.clearCache(); categoryService.clearCache(); });

test('catalog survives module reload, expires after five minutes and keeps filters separate', async (t) => {
  const storage = new Map();
  const previous = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const get = t.mock.method(axios, 'get', async () => ({ data: { data: { tongSoTrang: 1, danhSachSanPham: [{ id: 42, tenSanPham: 'Cached PC' }] } } }));
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  try {
    const first = JSON.parse(JSON.stringify(await productService.getAllProducts({ sort: 'moi_nhat' })));
    server.moduleGraph.invalidateAll();
    const reloaded = (await server.ssrLoadModule('/src/shared/services/productService.js')).productService;
    assert.deepEqual(reloaded.getCachedAllProducts(), first);
    assert.deepEqual(await reloaded.getAllProducts(), first);
    assert.equal(get.mock.calls.length, 1);
    assert.equal(reloaded.getCachedAllProducts({ keyword: 'RAM' }), null);
    await reloaded.getAllProducts({ keyword: 'RAM' });
    assert.equal(get.mock.calls.length, 2);
    assert.deepEqual(reloaded.getCachedAllProducts(), first, 'a filtered query must not overwrite the homepage');
    now += 5 * 60 * 1000;
    assert.equal(reloaded.getCachedAllProducts({ keyword: 'RAM' }), null);
    await reloaded.getAllProducts({ keyword: 'RAM' });
    assert.equal(get.mock.calls.length, 3);
  } finally { globalThis.sessionStorage = previous; }
});

test('catalog pages load at most two at a time and retain API ordering', async (t) => {
  let active = 0, maximum = 0;
  const get = t.mock.method(productService, 'getProducts', async ({ page }) => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return { data: { tongSoTrang: 6, danhSachSanPham: [{ id: page }] } };
  });
  const products = await productService.getAllProducts();
  assert.equal(maximum, 2);
  assert.equal(get.mock.calls.length, 6);
  assert.deepEqual(products.map(product => product.id), [0, 1, 2, 3, 4, 5]);
});

test('public metadata requests share cache until explicitly refreshed', async (t) => {
  let complete;
  const get = t.mock.method(axios, 'get', () => new Promise(resolve => { complete = resolve; }));
  const first = categoryService.getOptions();
  assert.equal(first, categoryService.getOptions());
  assert.match(get.mock.calls[0].arguments[0], /\/catalog\/options$/);
  complete({ data: { data: { danhMuc: [{ id: 1, tenDanhMuc: 'Tên cũ' }], thuongHieu: [] } } });
  await first;
  get.mock.mockImplementation(async () => ({ data: { data: { danhMuc: [{ id: 1, tenDanhMuc: 'Tên mới' }], thuongHieu: [] } } }));
  assert.equal((await categoryService.getOptions()).danhMuc[0].tenDanhMuc, 'Tên cũ');
  assert.equal((await categoryService.getOptions({ force: true })).danhMuc[0].tenDanhMuc, 'Tên mới');
  assert.equal(get.mock.calls.length, 2);
});

test('catalog filters retain stable category and brand IDs across list and detail responses', () => {
  assert.equal(toProductCard({ danhMucId: 2, thuongHieuId: 3 }).brandId, 3);
  assert.equal(toProductCard({ danhMuc: { id: 2 }, thuongHieu: { id: 3 } }).categoryId, 2);
  assert.equal(toProductCard({ thuongHieu: { id: 3 } }).brandId, 3);
});

test('laptop specs use the requested variant title and keep structured specs authoritative', () => {
  const laptop = {
    tenDanhMuc: 'Laptop gaming',
    phienBanMacDinhId: 501,
    danhSachPhienBan: [
      { id: 500, giaBanLe: 85990000, tenPhienBan: 'MSI Stealth (Ultra 9-386H/ RTX 5070 8GB/ 32GB/ 1TB/ 16" QHD+ OLED/ Win 11)' },
      { id: 501, giaBanLe: 34990000, tenPhienBan: 'MSI Cyborg (I5-13420H/ RTX 5050 8GB/ 16GB/ 512GB/ 15.6" FHD/ Win 11)' },
    ],
    thongSoKyThuat: { nguon_du_lieu: [{ ten: 'Nguồn tham khảo' }] },
  };
  assert.deepEqual(toProductCard(laptop).specs, [
    { label: 'CPU', value: 'I5-13420H' },
    { label: 'RAM', value: '16GB' },
    { label: 'Lưu trữ', value: '512GB' },
    { label: 'Màn hình', value: '15.6" FHD' },
  ]);
  assert.deepEqual(toProductCard({ ...laptop, phienBanMacDinhId: 999 }).specs, []);
  assert.deepEqual(toProductCard({ ...laptop, thongSoKyThuat: { CPU: 'CPU đã xác nhận' } }).specs, [
    { label: 'CPU', value: 'CPU đã xác nhận' },
  ]);
});

test('catalog filtering reads every API page and retains real IDs, category, price and availability', async () => {
  const original = productService.getProducts;
  const calls = [];
  try {
    productService.getProducts = async params => {
      calls.push(params);
      return { data: { tongSoTrang: 2, danhSachSanPham: [{ id: 583 + params.page, tenSanPham: 'Sản phẩm thật', tenDanhMuc: params.page ? 'CPU' : 'PC Build', loaiSanPham: params.page ? 'DON' : 'BO_PC', tenThuongHieu: 'Intel', giaThapNhat: 4190000, coTheBan: true }] } };
    };
    const result = await productService.getAllProducts({ keyword: 'Intel' });
    assert.deepEqual(calls, [{ keyword: 'Intel', page: 0, limit: 100 }, { keyword: 'Intel', page: 1, limit: 100 }]);
    assert.deepEqual(result.map(product => product.id), [583, 584]);
    assert.equal(result[1].category, 'CPU');
    assert.equal(result[1].brand, 'Intel');
    assert.equal(result[1].priceValue, 4190000);
    assert.equal(result[0].outOfStock, false);
    productService.clearCache();
    productService.getProducts = async () => ({ data: {} });
    await assert.rejects(productService.getAllProducts(), /không hợp lệ/);
  } finally { productService.getProducts = original; }
});

test('identical list, detail and variant requests reuse settled results until expiry', async (t) => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const requests = [];
  t.mock.method(axios, 'get', (url, config) => new Promise(resolve => requests.push({ url, config, resolve })));
  const first = productService.getProducts({ page: 0, limit: 100 });
  const duplicate = productService.getProducts({ limit: 100, page: 0 });
  const filtered = productService.getProducts({ page: 0, limit: 100, keyword: 'RAM' });
  const detail = productService.getProductDetail(346);
  const duplicateDetail = productService.getProductDetail('346');
  const variant = productService.getProductVariantDetail(346, 9);
  const duplicateVariant = productService.getProductVariantDetail(346, 9);
  assert.equal(first, duplicate);
  assert.equal(detail, duplicateDetail);
  assert.equal(variant, duplicateVariant);
  assert.notEqual(first, filtered);
  assert.equal(requests.length, 4);
  for (const request of requests) request.resolve({ data: { data: request.url.endsWith('/products') ? { danhSachSanPham: [] } : { url: request.url } } });
  await Promise.all([first, duplicate, filtered, detail, duplicateDetail, variant, duplicateVariant]);
  await productService.getProductDetail(346);
  assert.equal(requests.length, 4);
  now += 5 * 60 * 1000;
  const fresh = productService.getProductDetail(346);
  assert.equal(requests.length, 5);
  requests[4].resolve({ data: { data: { updatedStock: 3 } } });
  assert.deepEqual(await fresh, { data: { updatedStock: 3 } });
});

test('failed shared requests propagate the error and allow a later retry', async (t) => {
  let rejectRequest;
  const get = t.mock.method(axios, 'get', () => new Promise((_, reject) => { rejectRequest = reject; }));
  const first = productService.getProductDetail(999);
  const duplicate = productService.getProductDetail(999);
  const checks = [assert.rejects(first, /Network failed/), assert.rejects(duplicate, /Network failed/)];
  rejectRequest(new Error('Network failed'));
  await Promise.all(checks);
  assert.equal(get.mock.calls.length, 1);
  get.mock.mockImplementation(async () => ({ data: { data: { id: 999 } } }));
  assert.deepEqual(await productService.getProductDetail(999), { data: { id: 999 } });
  assert.equal(get.mock.calls.length, 2);
});

test('list and detail share product identity, lowest variant price, primary image and availability', () => {
  const listData = { id: 346, maSanPham: 'RV26-P0023', tenSanPham: 'ASUS ROG THOR', tenDanhMuc: 'PSU', tenThuongHieu: 'ASUS', loaiSanPham: 'DON', anhChinh: 'primary.jpg', giaThapNhat: 13990000, giaCaoNhat: 24490000, coTheBan: true };
  const detailData = {
    id: 346, maSanPham: listData.maSanPham, tenSanPham: listData.tenSanPham, loaiSanPham: 'DON',
    danhMuc: { tenDanhMuc: 'PSU' }, thuongHieu: { tenThuongHieu: 'ASUS' },
    anhSanPham: [{ id: 2, duongDanAnh: 'secondary.jpg', thuTuHienThi: 0 }, { id: 1, duongDanAnh: 'primary.jpg', laAnhChinh: true, thuTuHienThi: 1 }],
    danhSachPhienBan: [{ id: 373, giaBanLe: 24490000, tonCoTheBan: 10 }, { id: 374, giaBanLe: 13990000, tonCoTheBan: 99 }],
    moTa: 'Mô tả thật', thongSoKyThuat: { 'Công suất': '1200 W' },
  };
  const card = toProductCard(listData);
  const detail = toProductDetail(detailData);
  for (const key of ['id', 'maSanPham', 'title', 'name', 'category', 'brand', 'image', 'price', 'priceValue', 'priceFrom', 'outOfStock']) {
    assert.equal(detail[key], card[key], key);
  }
  assert.equal(detail.currentPrice, card.priceValue);
  assert.equal(detail.defaultVariantId, 374);
  assert.equal(detail.stock, 99);
  assert.deepEqual(detail.images, ['primary.jpg', 'secondary.jpg']);
  assert.deepEqual(detailData.danhSachPhienBan.map(variant => variant.id), [373, 374]);
  assert.equal(detailData.anhSanPham[0].duongDanAnh, 'secondary.jpg');
  const soldOutCheapest = toProductDetail({ ...detailData, danhSachPhienBan: [{ id: 1, giaBanLe: 0, tonCoTheBan: 0 }, { id: 2, giaBanLe: 10, tonCoTheBan: 2 }] });
  assert.equal(soldOutCheapest.currentPrice, 0);
  assert.equal(soldOutCheapest.stock, 0);
  assert.equal(soldOutCheapest.defaultVariantId, 1);
});

test('missing data stays empty and combo availability uses assembly capacity instead of physical stock', () => {
  const empty = toProductDetail({ id: 1, tenSanPham: 'Không ảnh', loaiSanPham: 'DON' });
  assert.equal(empty.image, '');
  assert.equal(empty.brand, '');
  assert.deepEqual(empty.images, []);
  assert.equal(empty.defaultVariantId, null);
  assert.equal(empty.outOfStock, true);
  const combo = toProductDetail({ id: 581, tenSanPham: 'PC', loaiSanPham: 'BO_PC', danhSachPhienBan: [{ id: 4, giaBanLe: 100, tonCoTheBan: null, soBoCoTheLap: 8, coTheBan: true }] });
  assert.equal(combo.outOfStock, false);
  assert.equal(combo.stock, 8);
  assert.equal(combo.soBoCoTheLap, 8);
  assert.equal(combo.priceFrom, false);
});

test('cards show at most four real highlights from the same cheapest variant as the detail', () => {
  const specs = { nguon_du_lieu: [{ url: 'https://example.com/source' }], phien_ban: {
    541: { thong_so_ky_thuat: { GPU: 'RTX 3050', VRAM: '6 GB' } },
    542: { thong_so_ky_thuat: { GPU: 'RX 6500 XT', VRAM: '4 GB', 'Xung nhịp': '2815 MHz', 'Giao tiếp': 'PCIe 4.0', 'Cổng kết nối': 'HDMI', 'Công suất nguồn đề xuất': '400 W' } },
  } };
  const list = toProductCard({ id: 459, tenDanhMuc: 'VGA', giaThapNhat: 4890000, phienBanMacDinhId: 542, thongSoKyThuat: specs });
  const detail = toProductDetail({ id: 459, danhMuc: { tenDanhMuc: 'VGA' }, danhSachPhienBan: [{ id: 541, giaBanLe: 6190000 }, { id: 542, giaBanLe: 4890000 }], thongSoKyThuat: specs });
  assert.equal(list.defaultVariantId, 542);
  assert.deepEqual(list.specs, detail.specs);
  assert.deepEqual(list.specs.map(row => row.label), ['GPU', 'VRAM', 'Xung nhịp', 'Giao tiếp']);
  assert.equal(list.specs[1].value, '4 GB');
  assert(!JSON.stringify(list.specs).includes('RTX 3050'));
  assert.deepEqual(toProductCard({ thongSoKyThuat: { nguon_du_lieu: 'https://example.com' } }).specs, []);
  assert.deepEqual(toProductCard({ thongSoKyThuat: '{broken' }).specs, []);
  assert.deepEqual(toProductCard({ thongSoKyThuat: { LED: false, USB: 0 } }).specs, [{ label: 'LED', value: 'Không' }, { label: 'USB', value: '0' }]);
});

test('preview variant selection uses its explicit highlights without leaking other variants or source metadata', () => {
  const product = { tenDanhMuc: 'Laptop', thongSoKyThuat: { phien_ban: {
    1: { thong_so_chinh: { CPU: 'Core i5', RAM: '16 GB', SSD: '512 GB', 'Màn hình': '14 inch', GPU: 'Iris Xe' } },
    2: { thong_so_chinh: { CPU: 'Core i7', RAM: '32 GB', SSD: '1 TB', 'Màn hình': '16 inch', source: 'https://example.com' },
      thong_so_ky_thuat: { 'Cổng kết nối đầy đủ': 'Không đưa vào bản xem nhanh' } },
  } }, danhSachPhienBan: [{ id: 1, giaBanLe: 100 }, { id: 2, giaBanLe: 200 }] };
  const first = toProductCard({ ...product, phienBanMacDinhId: 1 });
  const second = toProductCard({ ...product, phienBanMacDinhId: 2 });
  assert.deepEqual(first.specs.map(row => row.value), ['Core i5', '16 GB', '512 GB', '14 inch']);
  assert.deepEqual(second.specs.map(row => row.value), ['Core i7', '32 GB', '1 TB', '16 inch']);
  assert.doesNotMatch(JSON.stringify(second.specs), /Core i5|16 GB|512 GB|Cổng kết nối|example\.com/);
});
