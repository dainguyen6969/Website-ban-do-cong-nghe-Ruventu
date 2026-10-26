import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-catalog-page-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const CategoryPage = (await vite.ssrLoadModule('/src/storefront/pages/CategoryPage.jsx')).default;
const SearchPage = (await vite.ssrLoadModule('/src/storefront/pages/SearchPage.jsx')).default;
const MockAuthContext = (await vite.ssrLoadModule('/src/auth/mockAuthContext.js')).default;
const FontPreferenceContext = (await vite.ssrLoadModule('/src/typography/FontPreferenceContext.js')).default;
after(() => vite.close());

const render = path => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] },
  React.createElement(MockAuthContext.Provider, { value: { currentAccount: null, roles: [], logout() {} } },
  React.createElement(FontPreferenceContext.Provider, { value: { font: { name: 'Roboto', family: 'Roboto, sans-serif' }, selectFont() {} } },
  React.createElement(Routes, null,
    React.createElement(Route, { path: '/category/:slug', element: React.createElement(CategoryPage) }),
    React.createElement(Route, { path: '/search', element: React.createElement(SearchPage) }))))));

test('direct category navigation uses the same compact listing and filters as submenu search', () => {
  for (const path of ['/category/linh-kien', '/category/gaming-gear', '/category/man-hinh', '/category/laptop', '/search?q=CPU%20Intel']) {
    const markup = render(path);
    assert.match(markup, /class="search-page-wrapper"/);
    assert.match(markup, /class="search-main container"/);
    assert.match(markup, /KHOẢNG GIÁ/);
    assert.match(markup, /TÌNH TRẠNG/);
    assert.match(markup, /class="custom-sort-btn"/);
    assert.doesNotMatch(markup, /class="category-banner"/);
  }
  assert.match(render('/category/linh-kien'), /<h1 class="catalog-listing-title">LINH KIỆN PC<\/h1>/);
  assert.match(render('/search?q=CPU%20Intel'), /CPU Intel/);
});

test('special search phrases take priority over literal product matching and use the results layout', () => {
  for (const path of ['/search?q=ASUS%20sản%20phẩm%20tôi%20thích', '/search?mode=recommended', '/search?q=goi%20y%20cho%20toi']) {
    const markup = render(path);
    assert.match(markup, /Gợi ý dành cho bạn/);
    assert.match(markup, /class="search-main container"/);
    assert.doesNotMatch(markup, /Kết quả cho:/);
    assert.match(markup, /Gợi ý ngẫu nhiên/);
  }
  assert.doesNotMatch(render('/search?q=RTX%204090'), /Gợi ý dành cho bạn/);
});
