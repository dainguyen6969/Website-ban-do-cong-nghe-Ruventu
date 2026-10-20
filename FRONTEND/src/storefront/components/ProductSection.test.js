import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-product-section-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const ProductSection = (await vite.ssrLoadModule('/src/storefront/components/ProductSection.jsx')).default;
after(() => vite.close());

test('homepage sections show at most eight cards and retain the full catalog for category tabs', () => {
  const products = Array.from({ length: 20 }, (_, id) => ({ id, title: `Product ${id}`, category: id < 8 ? 'CPU' : 'RAM' }));
  const render = (items) => renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(ProductSection, { title: 'LINH KIỆN KHỦNG', products: items, categories: ['CPU', 'RAM'] })));
  const markup = render(products);
  assert.equal((markup.match(/class="product-card /g) || []).length, 8);
  assert.match(markup, />RAM<\/button>/);
  assert.doesNotMatch(markup, />Product 8<\/h4>/);
  assert.equal(products.length, 20);
  assert.equal((render(products.slice(0, 3)).match(/class="product-card /g) || []).length, 3);
  assert.match(render([]), /Chưa có sản phẩm nào/);
});
