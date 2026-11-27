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
const InfoSidebar = (await vite.ssrLoadModule('/src/storefront/components/ProductInfoSidebar.jsx')).default;
const Highlights = (await vite.ssrLoadModule('/src/storefront/components/ProductHighlights.jsx')).default;
const Preview = (await vite.ssrLoadModule('/src/storefront/components/ProductCardPreview.jsx')).default;
after(() => vite.close());

test('catalog cards expose an accessible preview without changing regular cards', () => {
  const product = { id: 7, title: 'CPU thật', price: '1.000.000 ₫', specs: [{ label: 'Socket', value: 'AM5' }] };
  const render = showPreview => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Card, { product, showPreview })));
  assert.doesNotMatch(render(false), /product-card__preview-toggle|product-card-preview/);
  const html = render(true);
  assert.match(html, /aria-expanded="false" aria-controls="([^"]+)"/);
  assert.match(html, /class="product-card-preview" hidden=""/);
  assert.equal((html.match(/<table/g) || []).length, 1);
  assert.match(html, /THÔNG SỐ &amp; PHIÊN BẢN/);
  assert.match(html, /XEM CHI TIẾT/);
  assert.match(html, /THÊM VÀO GIỎ HÀNG/);
});

test('preview only shows four highlights, exposes loading and explains missing specifications', () => {
  const render = specs => renderToStaticMarkup(React.createElement(Preview, {
    product: { id: 7, title: 'CPU thật', specs }, open: true, panelId: 'preview-7',
  }));
  const html = render(Array.from({ length: 6 }, (_, id) => ({ label: `Field ${id}`, value: `Value ${id}` })));
  assert.match(html, /role="status">Đang tải phiên bản/);
  assert.equal((html.match(/scope="row"/g) || []).length, 4);
  assert.doesNotMatch(html, /Field 4|Field 5|hidden=""/);
  assert.match(render([]), /Chưa có thông số nổi bật cho phiên bản này/);
});

test('product cards render four accessible specification rows and omit empty tables', () => {
  const product = { id: 459, title: 'Card màn hình', price: '4.890.000 ₫', specs: Array.from({ length: 6 }, (_, i) => ({ label: 'Thông số ' + i, value: 'Giá trị ' + i })) };
  const render = props => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Card, { product: props })));
  const html = render(product);
  assert.equal((html.match(/scope="row"/g) || []).length, 4);
  assert.match(html, /aria-label="Thông số nổi bật của Card màn hình"/);
  assert.doesNotMatch(html, /Thông số 4|Thông số 5/);
  assert.doesNotMatch(render({ ...product, specs: [] }), /<table/);
});

test('combo cards match standalone cards and keep assembly availability in the detail', () => {
  const product = { id: 581, title: 'PC thật', name: 'PC thật', price: '18.390.000 ₫',
    specs: [{ label: 'CPU', value: 'Intel Core i5' }], policies: [] };
  const render = component => renderToStaticMarkup(React.createElement(MemoryRouter, null, component));
  const combo = { ...product, loaiSanPham: 'BO_PC', soBoCoTheLap: 3,
    thanhPhan: [{ phien_ban_id: 1, ten_san_pham: 'Linh kiện cấu hình', so_luong_trong_bo: 1 }],
    variants: [{ id: 4, giaBanLe: 18390000, soBoCoTheLap: 3, coTheBan: true }] };
  const card = render(React.createElement(Card, { product: combo }));
  assert.equal(card, render(React.createElement(Card, { product: { ...product, loaiSanPham: 'DON' } })));
  assert.doesNotMatch(card, /Có thể lắp|XEM CẤU HÌNH|Linh kiện cấu hình|<details/);
  assert.match(card, /Intel Core i5/);
  assert.match(card, /XEM CHI TIẾT/);
  const detail = render(React.createElement(Sidebar, { product: combo, selectedVariantId: 4 }));
  assert.match(detail, /CÒN HÀNG — 3 BỘ/);
});

test('standalone demo pricing is labeled, accurate and leaves the actual price unchanged', () => {
  const product = Object.freeze({ id: 1, title: 'CPU demo', loaiSanPham: 'DON', priceValue: 900000, price: '900.000 ₫' });
  const render = props => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Card, { product: props })));
  const html = render(product);
  assert.match(html, /Dữ liệu demo · không phải ưu đãi thật/);
  assert.match(html, /<s class="product-card__demo-reference">1\.000\.000/);
  assert.match(html, /Tiết kiệm 10%/);
  assert.match(html, /Tiết kiệm mô phỏng 100\.000/);
  assert.match(html, /class="sale-price">900\.000/);
  assert.equal(product.priceValue, 900000);
  assert.equal(product.originalPrice, undefined);
  assert.match(render({ ...product, priceFrom: true }), /demo-reference">Từ 1\.000\.000/);
  for (const props of [
    { ...product, loaiSanPham: undefined },
    { ...product, loaiSanPham: 'UNKNOWN' },
    ...[0, -1, NaN, Infinity, undefined, '900000', Number.MAX_SAFE_INTEGER].map(priceValue => ({ ...product, priceValue })),
  ]) assert.doesNotMatch(render(props), /product-card__demo-pricing|Tiết kiệm 10%/);
});

test('PC build demo pricing uses the combo price independently of component discounts', () => {
  const combo = Object.freeze({ id: 590, title: 'PC combo demo', loaiSanPham: 'BO_PC', priceValue: 9000000, price: '9.000.000 ₫',
    thanhPhan: [{ phien_ban_id: 1, giaBanLe: 1000000, originalPrice: 2000000, discountPercent: 50, so_luong_trong_bo: 2 }] });
  const render = product => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Card, { product })));
  const html = render(combo);
  assert.match(html, /Dữ liệu demo · không phải ưu đãi thật/);
  assert.match(html, /demo-reference">10\.000\.000/);
  assert.match(html, /Tiết kiệm 10%/);
  assert.match(html, /Tiết kiệm mô phỏng 1\.000\.000/);
  assert.match(html, /class="sale-price">9\.000\.000/);
  assert.equal(html, render({ ...combo, thanhPhan: [{ phien_ban_id: 1, giaBanLe: 8000000, originalPrice: 9000000, discountPercent: 90 }] }));
  assert.equal(combo.priceValue, 9000000);
  assert.equal(combo.originalPrice, undefined);
});

test('highlight cards never exceed six even when a caller supplies more rows', () => {
  const rows = Array.from({ length: 10 }, (_, index) => ({ label: 'Thông số ' + index, value: String(index) }));
  const html = renderToStaticMarkup(React.createElement(Highlights, { product: { name: 'GPU', mainSpecs: rows, fullSpecs: rows } }));
  assert.equal((html.match(/class="product-highlights__item"/g) || []).length, 6);
  assert.match(html, /Xem tất cả thông số/);
  assert.doesNotMatch(html, /Thông số 6|Thông số 9/);
});

test('basic specs are removed and the left column only contains multiple variant choices', () => {
  const variants = [{ id: 1, tenPhienBan: 'Phiên bản A', giaBanLe: 100, tonCoTheBan: 2 }, { id: 2, tenPhienBan: 'Phiên bản B', giaBanLe: 200, tonCoTheBan: 3 }];
  const render = variants => renderToStaticMarkup(React.createElement(InfoSidebar, {
    product: { variants, specsSummary: [{ label: 'Thông số cũ', value: 'Không hiển thị' }] }, selectedVariantId: 1,
  }));
  assert.equal(render([]), '');
  assert.equal(render(variants.slice(0, 1)), '');
  const html = render(variants);
  assert.match(html, /Phiên bản A/);
  assert.match(html, /Phiên bản B/);
  assert.doesNotMatch(html, /THÔNG SỐ CƠ BẢN|Thông số cũ|<table|Chưa có thông số/);
});

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
  assert.match(card, /title="ASUS ROG THOR"/);
  const gallery = renderToStaticMarkup(React.createElement(Gallery, { images: [] }));
  assert.match(gallery, /Chưa có ảnh sản phẩm/);
  assert.doesNotMatch(gallery, /<img|nav-arrow|zoom-btn/);
  assert.doesNotMatch(detail, /tag-outline[^>]*>ASUS</);
});
