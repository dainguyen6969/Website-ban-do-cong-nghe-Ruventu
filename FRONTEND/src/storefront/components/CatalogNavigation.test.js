import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-navigation-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const CatalogNavigation = (await vite.ssrLoadModule('/src/storefront/components/CatalogNavigation.jsx')).default;
const { categoryService } = await vite.ssrLoadModule('/src/shared/services/categoryService.js');
after(() => vite.close());

test('all four compact menus retain categories and scope brand links to their group', t => {
  t.mock.method(categoryService, 'getCachedOptions', () => ({
    danhMuc: [
      { id: 1, tenDanhMuc: 'CPU', duongDanUrl: 'cpu' },
      { id: 2, tenDanhMuc: 'RAM', duongDanUrl: 'ram' },
      { id: 3, tenDanhMuc: 'Phụ kiện', duongDanUrl: 'phu-kien' },
      { id: 4, tenDanhMuc: 'Chuột', duongDanUrl: 'chuot', danhMucChaId: 3 },
      { id: 5, tenDanhMuc: 'Màn hình', duongDanUrl: 'man-hinh' },
      { id: 6, tenDanhMuc: 'Laptop', duongDanUrl: 'laptop' },
    ],
    thuongHieu: [{ id: 7, tenThuongHieu: 'ASUS' }],
  }));
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement('ul', null, React.createElement(CatalogNavigation))));
  assert.equal((markup.match(/catalog-nav-item/g) || []).length, 4);
  for (const slug of ['linh-kien', 'phu-kien', 'man-hinh', 'laptop']) {
    assert.match(markup, new RegExp(`href="/category/${slug}\\?thuong_hieu_id=7"`));
  }
  for (const slug of ['cpu', 'ram', 'chuot', 'man-hinh', 'laptop']) {
    assert.match(markup, new RegExp(`href="/category/${slug}"`));
  }
  assert.doesNotMatch(markup, /href="\/search\?thuong_hieu_id=/);
  assert.match(markup, /title="ASUS"/);
});
