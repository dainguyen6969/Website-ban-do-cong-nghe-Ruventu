import assert from 'node:assert/strict';
import test from 'node:test';
import { inCatalogScope, shuffleProducts, categoryTreeIds, componentCategoryIds } from './catalogModel.js';

test('category navigation uses real category names and never treats combo components as standalone categories', () => {
  const cpu = { loaiSanPham: 'DON', category: 'CPU' };
  const combo = { loaiSanPham: 'BO_PC', category: 'PC Build', title: 'PC CPU Intel' };
  assert.ok(inCatalogScope(cpu, 'cpu'));
  assert.ok(inCatalogScope(cpu, 'linh-kien'));
  assert.ok(inCatalogScope(combo, 'pc-build'));
  assert.equal(inCatalogScope(combo, 'cpu'), false);
  assert.equal(inCatalogScope(cpu, 'man-hinh'), false);
  assert.ok(inCatalogScope({ loaiSanPham: 'DON', category: 'Màn hình' }, 'man-hinh'));
  assert.ok(inCatalogScope({ loaiSanPham: 'DON', category: 'Phụ kiện' }, 'gaming-gear'));
  assert.equal(inCatalogScope({ loaiSanPham: 'DON', category: 'Phụ kiện' }, 'linh-kien'), false);
  assert.ok(inCatalogScope(cpu, 'gaming-gear'));
  assert.equal(inCatalogScope({ loaiSanPham: 'DON', category: 'Laptop' }, 'linh-kien'), false);
  assert.equal(inCatalogScope(cpu, 'khong-ton-tai'), false);
});

test('Gaming Gear includes standalone products from any category while PC builds stay separate', () => {
  for (const category of ['Màn hình', 'RAM', 'Mainboard', 'VGA', 'SSD', 'Phụ kiện', 'Laptop', 'Danh mục mới']) {
    assert.ok(inCatalogScope({ loaiSanPham: 'DON', category }, 'gaming-gear'), category);
  }
  assert.equal(inCatalogScope({ loaiSanPham: 'BO_PC', category: 'PC Build' }, 'gaming-gear'), false);
  assert.equal(inCatalogScope({ category: 'RAM' }, 'gaming-gear'), false);
});

test('homepage shuffle draws from the whole catalog without mutating or duplicating products', (t) => {
  const products = Array.from({ length: 20 }, (_, id) => ({ id }));
  t.mock.method(Math, 'random', () => 0);
  const shuffled = shuffleProducts(products);
  assert.deepEqual(products.map(product => product.id), Array.from({ length: 20 }, (_, id) => id));
  assert.deepEqual(shuffled.map(product => product.id), [...Array.from({ length: 19 }, (_, id) => id + 1), 0]);
  assert.equal(new Set(shuffled).size, products.length);
  assert.deepEqual(shuffleProducts([]), []);
  assert.deepEqual(shuffleProducts([products[0]]), [products[0]]);
});

test('database category IDs survive renames and include descendants without looping on cycles', () => {
  const categories = [
    { id: 1, tenDanhMuc: 'Tên đã đổi', duongDanUrl: 'ten-moi' },
    { id: 2, danhMucChaId: 1, duongDanUrl: 'con' },
    { id: 3, duongDanUrl: 'laptop' },
    { id: 4, danhMucChaId: 3, duongDanUrl: 'laptop-con' },
    { id: 5, danhMucChaId: 6 }, { id: 6, danhMucChaId: 5 },
  ];
  assert.deepEqual([...categoryTreeIds(categories, '1')], [1, 2]);
  assert.deepEqual([...categoryTreeIds(categories, 5)], [5, 6]);
  assert.deepEqual([...componentCategoryIds(categories)], [1, 2, 5, 6]);
});
