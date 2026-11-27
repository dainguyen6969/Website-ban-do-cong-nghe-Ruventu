import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-nav-menu-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const NavMenu = (await vite.ssrLoadModule('/src/storefront/components/NavMenu.jsx')).default;
after(() => vite.close());

test('catalog and Build PC keep direct navigation links and separately controlled closed disclosures', () => {
  const markup = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/category/linh-kien'] },
    React.createElement('ul', null,
      React.createElement(NavMenu, { label: 'Linh Kiện PC', to: '/category/linh-kien', className: 'catalog-nav-item' },
        React.createElement('a', { href: '/category/cpu' }, 'CPU')),
      React.createElement(NavMenu, { label: 'Build PC', to: '/build-pc' },
        React.createElement('a', { href: '/category/pc-build' }, 'PC build sẵn')))));

  assert.match(markup, /<li[^>]*><a[^>]*href="\/category\/linh-kien"[^>]*>Linh Kiện PC<\/a><button/);
  assert.match(markup, /<li[^>]*><a[^>]*href="\/build-pc"[^>]*>Build PC<\/a><button/);
  assert.match(markup, /aria-label="Danh mục Linh Kiện PC"/);
  assert.match(markup, /aria-label="Danh mục Build PC"/);
  const controls = [...markup.matchAll(/aria-controls="([^"]+)" aria-expanded="false"/g)].map(match => match[1]);
  assert.equal(new Set(controls).size, 2);
  for (const id of controls) assert(markup.includes(`<div id="${id}" class="mega-menu" hidden="">`));
  assert.match(markup, /href="\/category\/cpu">CPU<\/a>/);
  assert.match(markup, /href="\/category\/pc-build">PC build sẵn<\/a>/);
});
