import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-product-pricing-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const Sidebar = (await vite.ssrLoadModule('/src/storefront/components/ProductPurchaseRightSidebar.jsx')).default;
const Gallery = (await vite.ssrLoadModule('/src/storefront/components/ProductGallery.jsx')).default;
const Card = (await vite.ssrLoadModule('/src/storefront/components/ProductCard.jsx')).default;
after(() => vite.close());

test('detail keeps the actual price without inventing a discount or model label', () => {
  const product = { id: 583, name: 'PC thật', currentPrice: 100, originalPrice: 100, variants: [], policies: [], specsSummary: [] };
  const render = (props, selectedVariantId) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Sidebar, { product: props, selectedVariantId })));
  assert.doesNotMatch(render(product), /TIẾT KIỆM/);
  assert.match(render({ ...product, originalPrice: 120 }), /TIẾT KIỆM/);
  assert.doesNotMatch(render({ ...product, originalPrice: 200, variants: [{ id: 1, giaBanLe: 100 }] }, 1), /TIẾT KIỆM/);
  const gallery = renderToStaticMarkup(React.createElement(Gallery, { images: ['image.jpg'], discountPercent: 0 }));
  assert.doesNotMatch(gallery, /discount-badge|ROG STRIX STANDARD/);
});

test('product title stays consistent while selected variant is labeled separately and price range is explicit', () => {
  const product = { id: 346, maSanPham: 'RV26-P0023', name: 'ASUS ROG THOR', title: 'ASUS ROG THOR', price: '13.990.000 ₫', priceFrom: true,
    currentPrice: 13990000, variants: [{ id: 373, tenPhienBan: '1600 W', giaBanLe: 24490000, tonCoTheBan: 10 }, { id: 374, tenPhienBan: '1200 W', giaBanLe: 13990000, tonCoTheBan: 99 }], policies: [] };
  const render = component => renderToStaticMarkup(React.createElement(MemoryRouter, null, component));
  const detail = render(React.createElement(Sidebar, { product, selectedVariantId: 374 }));
  assert.match(detail, /<h1[^>]*>ASUS ROG THOR<\/h1>/);
  assert.match(detail, /Phiên bản: 1200 W/);
  assert.match(detail, /RV26-P0023/);
  assert.match(detail, /13\.990\.000/);
  const card = render(React.createElement(Card, { product }));
  assert.match(card, /Từ 13\.990\.000/);
  assert.match(card, /Chưa có ảnh sản phẩm/);
  const gallery = renderToStaticMarkup(React.createElement(Gallery, { images: [] }));
  assert.match(gallery, /Chưa có ảnh sản phẩm/);
  assert.doesNotMatch(gallery, /<img|nav-arrow|zoom-btn/);
  assert.doesNotMatch(detail, /tag-outline[^>]*>ASUS</);
});
