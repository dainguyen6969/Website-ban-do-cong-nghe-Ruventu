import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';
import axios from 'axios';

const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-public-products-test', server: { middlewareMode: true }, appType: 'custom' });
const { productService, toProductCard, toProductDetail } = await server.ssrLoadModule('/src/shared/services/productService.js');
after(() => server.close());

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
    productService.getProducts = async () => ({ data: {} });
    await assert.rejects(productService.getAllProducts(), /không hợp lệ/);
  } finally { productService.getProducts = original; }
});

test('identical concurrent list, detail and variant requests share one call and refresh after settlement', async (t) => {
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
  for (const request of requests) request.resolve({ data: { data: { url: request.url } } });
  await Promise.all([first, duplicate, filtered, detail, duplicateDetail, variant, duplicateVariant]);
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
