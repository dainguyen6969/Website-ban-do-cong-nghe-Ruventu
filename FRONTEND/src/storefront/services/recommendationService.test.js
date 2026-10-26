import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-recommendations-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const { recommendationKeywords, isRecommendationQuery, selectRecommendedProducts, getRecommendedProducts, recommendationResultsUrl } = await vite.ssrLoadModule('/src/storefront/services/recommendationService.js');
const { productService, toProductCard, toProductDetail } = await vite.ssrLoadModule('/src/shared/services/productService.js');
after(() => vite.close());

test('recommendation phrases take priority within a query, with accents, punctuation and case variants', () => {
  for (const phrase of recommendationKeywords) {
    assert.equal(isRecommendationQuery(phrase), true, phrase);
    assert.equal(isRecommendationQuery(`ASUS ${phrase.toUpperCase()} RTX 4090`), true, phrase);
  }
  assert.equal(isRecommendationQuery('  GOI   Y CHO TOI!!!  '), true);
  assert.equal(isRecommendationQuery('de xuat cho toi'), true);
  for (const query of ['', 'Intel Core i5', 'ASUS RTX 4090', 'sản phẩm tốt', 'abcgoi y cho toi']) {
    assert.equal(isRecommendationQuery(query), false, query);
  }
});

test('both API mappings keep the real category ID for related products', () => {
  assert.equal(toProductCard({ danhMucId: 5, tenDanhMuc: 'VGA' }).categoryId, 5);
  assert.equal(toProductDetail({ danhMuc: { id: 5, tenDanhMuc: 'VGA' } }).categoryId, 5);
  assert.equal(toProductCard({}).categoryId, null);
});

test('recommendations exclude self before sampling, match category IDs, cap at 15 and preserve the source', t => {
  const products = Array.from({ length: 60 }, (_, id) => ({ id, categoryId: id < 40 ? 5 : 7 }));
  t.mock.method(Math, 'random', () => 0);
  const related = selectRecommendedProducts(products, { excludeId: '0', categoryId: '5', limit: 15 });
  assert.equal(related.length, 15);
  assert(related.every(product => product.id !== 0 && product.categoryId === 5));
  const random = selectRecommendedProducts(products, { excludeId: '59', limit: 15 });
  assert.equal(random.length, 15);
  assert(random.every(product => product.id !== 59));
  assert.notDeepEqual(random, products.slice(0, 15));
  assert.equal(new Set(random.map(product => product.id)).size, 15);
  assert.deepEqual(products.map(product => product.id), Array.from({ length: 60 }, (_, id) => id));
  assert.deepEqual(selectRecommendedProducts([{ id: 1 }], { excludeId: 1, limit: 15 }), []);
  assert.deepEqual(selectRecommendedProducts(products, { categoryId: 999, limit: 15 }), []);
  assert.equal(selectRecommendedProducts(products).length, 60);
});

test('recommendation data uses the existing public catalog with category and price/stock filters', async t => {
  const calls = [];
  t.mock.method(productService, 'getAllProducts', async params => {
    calls.push(params);
    return [{ id: 1, categoryId: 5 }, { id: 2, categoryId: 5 }, { id: 3, categoryId: 7 }];
  });
  const result = await getRecommendedProducts({ excludeId: '1', categoryId: 5, limit: 15, params: { gia_min: 100, ton_kho: true } });
  assert.deepEqual(calls, [{ gia_min: 100, ton_kho: true, danh_muc_id: 5 }]);
  assert.deepEqual(result.map(product => product.id), [2]);
  assert.equal((await getRecommendedProducts({ excludeId: 1 })).length, 2);
  t.mock.method(productService, 'getAllProducts', async () => { throw new Error('Mất kết nối'); });
  await assert.rejects(getRecommendedProducts(), /Mất kết nối/);
});

test('see-more URLs retain the exact category ID or recommended mode and self exclusion', () => {
  const product = { id: 459, categoryId: 5, category: 'VGA' };
  const related = new URL(recommendationResultsUrl(product, true), 'http://localhost');
  assert.equal(related.pathname, '/search');
  assert.equal(related.searchParams.get('danh_muc_id'), '5');
  assert.equal(related.searchParams.get('q'), 'VGA');
  assert.equal(related.searchParams.get('exclude'), '459');
  const recommended = new URL(recommendationResultsUrl(product), 'http://localhost');
  assert.equal(recommended.searchParams.get('mode'), 'recommended');
  assert.equal(isRecommendationQuery(recommended.searchParams.get('q')), true);
  assert.equal(recommended.searchParams.get('exclude'), '459');
});
