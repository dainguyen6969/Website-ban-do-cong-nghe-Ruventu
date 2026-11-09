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
      { id: 8, tenDanhMuc: 'Chuột không dây', duongDanUrl: 'chuot-khong-day', danhMucChaId: '4' },
      { id: 9, tenDanhMuc: 'Chuột Bluetooth', duongDanUrl: 'chuot-bluetooth', danhMucChaId: 8 },
      { id: 10, tenDanhMuc: 'Ổ cứng', duongDanUrl: 'o-cung', danhMucChaId: 99 },
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
  assert.match(markup, /href="\/category\/o-cung"/);
  const branch = label => markup.match(new RegExp(`aria-label="Danh mục con của ${label}" aria-expanded="false" aria-controls="([^"]+)"`))?.[1];
  const mousePanel = branch('Chuột');
  const wirelessPanel = branch('Chuột không dây');
  assert.ok(mousePanel && wirelessPanel && mousePanel !== wirelessPanel);
  const mouseStart = markup.indexOf(`<ul id="${mousePanel}" class="catalog-subcategories" hidden="">`);
  const wirelessStart = markup.indexOf(`<ul id="${wirelessPanel}" class="catalog-subcategories" hidden="">`);
  assert.ok(mouseStart > -1 && wirelessStart > mouseStart);
  assert.match(markup.slice(mouseStart, wirelessStart), /href="\/category\/chuot-khong-day"/);
  assert.match(markup.slice(wirelessStart), /href="\/category\/chuot-bluetooth"/);
  assert.equal((markup.match(/href="\/category\/chuot-bluetooth"/g) || []).length, 1);
});
