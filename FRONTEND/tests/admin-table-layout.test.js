import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-admin-table-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
after(() => server.close());

for (const page of ['catalog/products/pages/QuanLyPhienBan', 'inventory/pages/DanhSachSerial', 'purchasing/pages/DanhSachNhapHang', 'catalog/products/pages/DanhSachSanPham', 'catalog/combos/pages/ComboSanPham']) {
  test(`${page}: table scroll contains the table, never pagination`, async () => {
    const { default: Page } = await server.ssrLoadModule(`/src/features/admin/${page}.jsx`);
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Page)));
    const stack = [];
    let tables = 0;
    let footers = 0;
    for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)([^>]*)>/gi)) {
      const [, closing, name, attributes] = match;
      if (closing) { stack.pop(); continue; }
      const classes = attributes.match(/class="([^"]*)"/)?.[1].split(/\s+/) || [];
      if (classes.includes('admin-table-scroll')) {
        assert.match(attributes, /tabindex="0"/);
        assert.match(attributes, /role="region"/);
      }
      if (name === 'table' && classes.includes('admin-data-table')) {
        tables++;
        assert(stack.some(item => item.includes('admin-table-scroll')));
      }
      if (classes.includes('admin-table-footer')) {
        footers++;
        assert(!stack.some(item => item.includes('admin-table-scroll')), 'pagination would be clipped or move with the table');
      }
      if (!['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(name)) stack.push(classes);
    }
    assert.equal(tables, 1);
    assert.equal(footers, 1);
  });
}
