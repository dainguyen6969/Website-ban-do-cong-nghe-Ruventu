import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const vite = await createServer({ cacheDir: 'node_modules/.vite-combo-contents-test', server: { middlewareMode: true, ws: false }, appType: 'custom' });
const ComboContents = (await vite.ssrLoadModule('/src/shared/components/ui/ComboContents.jsx')).default;
after(() => vite.close());

test('unpublished component keeps its name and quantity without a broken public detail link', () => {
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null,
    React.createElement(ComboContents, { items: [
      { san_pham_id: 439, phien_ban_id: 1, ten_san_pham: 'Tản nhiệt', so_luong_trong_bo: 2, co_trang_chi_tiet: false },
      { san_pham_id: 352, phien_ban_id: 2, ten_san_pham: 'Vỏ máy tính', so_luong_trong_bo: 1, co_trang_chi_tiet: true },
    ] })));
  assert.match(html, /Tản nhiệt/);
  assert.match(html, /×2/);
  assert.doesNotMatch(html, /href="\/product\/439"/);
  assert.match(html, /href="\/product\/352"/);
  assert.match(html, /Linh kiện chưa có trang chi tiết công khai/);
});
